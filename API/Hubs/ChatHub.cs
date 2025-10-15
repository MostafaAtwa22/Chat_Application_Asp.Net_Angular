using System.Collections.Concurrent;
using API.Data;
using API.Dtos;
using API.Extensions;
using API.Interfaces;
using API.Models;
using API.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace API.Hubs
{
    [Authorize]
    public class ChatHub : Hub<IChatClient>
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;
        // Safe dictionary for multi-thread
        public static readonly ConcurrentDictionary<string, OnlineUserDto> _onlineUsers = new();

        public ChatHub(UserManager<ApplicationUser> userManager, ApplicationDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        public async Task SendMessage(MessageRequestDto message)
        {
            var senderUserName = Context.User!.Identity!.Name;
            var receiverId = message.ReceiverId;

            // Validate input
            if (string.IsNullOrEmpty(receiverId))
                throw new HubException("Receiver ID cannot be null or empty");

            if (string.IsNullOrEmpty(message.Content))
                throw new HubException("Message content cannot be null or empty");

            // Get sender by username
            var sender = await _userManager.FindByNameAsync(senderUserName!);
            if (sender == null)
                throw new HubException("Sender not found");

            // Verify receiver exists
            var receiver = await _userManager.FindByIdAsync(receiverId);
            if (receiver == null)
                throw new HubException($"Receiver with ID '{receiverId}' not found");

            var newMessage = new Message
            {
                SenderId = sender.Id,
                ReceiverId = receiverId,
                Sender = sender,
                Receiver = receiver,
                IsRead = false,
                SendingTime = DateTime.UtcNow,
                Content = message.Content
            };

            await _context.Messages.AddAsync(newMessage);
            await _context.SaveChangesAsync();

            await Clients.User(receiverId).ReceiveNewMessage(newMessage);
        }

        public async Task LoadMessages(string receivedId, int pageNumber = 1)
        {
            int pageSize = 10;
            var userName = Context!.User!.Identity!.Name;

            if (string.IsNullOrEmpty(receivedId))
                throw new HubException("Received user ID cannot be null or empty");

            var currentUser = await _userManager.FindByNameAsync(userName!);
            if (currentUser is null)
                throw new HubException("Current user not found");

            var otherUser = await _userManager.FindByIdAsync(receivedId);
            if (otherUser == null)
                throw new HubException($"User with ID '{receivedId}' not found");

            // 1) Load the page of messages between users (same as before)
            var messages = await _context.Messages
                .Where(x => (x.ReceiverId == currentUser.Id && x.SenderId == receivedId) ||
                            (x.ReceiverId == receivedId && x.SenderId == currentUser.Id))
                .OrderByDescending(x => x.SendingTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .OrderBy(x => x.SendingTime)
                .Select(x => new MessageResponseDto
                {
                    Id = x.Id,
                    Content = x.Content,
                    SendingTime = x.SendingTime,
                    ReceiverId = x.ReceiverId,
                    SenderId = x.SenderId,
                    IsRead = x.IsRead
                }).ToListAsync();

            // 2) Mark unread messages (that were received by current user from the other user) as read in batch
            var unreadToMark = await _context.Messages
                .Where(m => m.ReceiverId == currentUser.Id && m.SenderId == receivedId && !m.IsRead)
                .ToListAsync();

            if (unreadToMark.Any())
            {
                foreach (var m in unreadToMark)
                    m.IsRead = true;

                await _context.SaveChangesAsync();
            }
            await Task.Delay(1000);

            // 3) Send the messages back to the requesting user
            await Clients.User(currentUser.Id).ReceiveMessageList(messages);
        }

        public async Task NotifyTyping(string receiverUserName)
        {
            var senderUserName = Context.User?.Identity?.Name;
            if (senderUserName is null) 
                throw new HubException("Sender not found");

            var connectionId = _onlineUsers.Values.FirstOrDefault(x => x.UserName == receiverUserName)?.ConnectionId;
            if (connectionId != null)
                await Clients.Client(connectionId).NotifyTypingToUser(senderUserName);
        }

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();

            // ✅ جلب الـ receivedId من query string (يُرسل من Angular)
            var receivedId = httpContext?.Request.Query["senderId"].ToString();

            var userId = Context.User!.GetUserId().ToString();
            var userName = Context?.User!.Identity?.Name;
            var currentUser = await _userManager.FindByIdAsync(userId);
            var connectionId = Context?.ConnectionId;

            if (_onlineUsers.ContainsKey(userId))
                _onlineUsers.AddOrUpdate(userId,
                    _ => new OnlineUserDto { ConnectionId = connectionId! },
                    (_, existing) => { existing.ConnectionId = connectionId!; return existing; });
            else
            {
                var user = new OnlineUserDto
                {
                    Id = userId,
                    ConnectionId = connectionId!,
                    FullName = currentUser?.FullName!,
                    UserName = userName!,
                    ProfilePicture = currentUser?.ImageProfile!,
                };
                _onlineUsers.TryAdd(userId, user);

                await Clients.AllExcept(connectionId!).Notify(currentUser!);
            }

            // ✅ تحقق من receivedId قبل استدعاء LoadMessages
            if (!string.IsNullOrEmpty(receivedId))
                await LoadMessages(receivedId);

            await Clients.All.OnlineUsers(await GetAllUsers());
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User!.GetUserId().ToString();
            _onlineUsers.TryRemove(userId, out _);
            await Clients.All.OnlineUsers(await GetAllUsers());
        }

        private async Task<IEnumerable<OnlineUserDto>> GetAllUsers()
        {
            var userId = Context.User!.GetUserId();

            var onlineUserSet = new HashSet<string>(_onlineUsers.Keys); // fast the search O(1)

            var users = await _userManager.Users.Select(u => new OnlineUserDto
            {
                Id = u.Id,
                UserName = u.UserName!,
                FullName = u.FullName!,
                ProfilePicture = u.ImageProfile!,
                IsOnline = onlineUserSet.Contains(u.Id),
                UnReadCount = _context.Messages.Count(
                    x => x.ReceiverId == userId.ToString() &&
                    x.SenderId == u.Id && !x.IsRead)
            }).OrderByDescending(u => u.IsOnline)
            .ToListAsync();

            return users;
        }
    }
} 