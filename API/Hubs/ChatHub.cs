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
        public static readonly ConcurrentDictionary<string, OnlineUserDto> _onlineUsers = new();

        public ChatHub(UserManager<ApplicationUser> userManager, ApplicationDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }
        public async Task SendMessage(MessageRequestDto message)
        {
            try
            {
                var senderUserName = Context.User!.Identity!.Name;
                var receiverId = message.ReceiverId;

                // Validate input
                if (string.IsNullOrEmpty(receiverId))
                {
                    throw new HubException("Receiver ID cannot be null or empty");
                }

                if (string.IsNullOrEmpty(message.Content))
                {
                    throw new HubException("Message content cannot be null or empty");
                }

                // Get sender by username
                var sender = await _userManager.FindByNameAsync(senderUserName);
                if (sender == null)
                {
                    throw new HubException("Sender not found");
                }

                // Verify receiver exists
                var receiver = await _userManager.FindByIdAsync(receiverId);
                if (receiver == null)
                {
                    throw new HubException($"Receiver with ID '{receiverId}' not found");
                }

                var newMessage = new Message
                {
                    SenderId = sender.Id,
                    ReceiverId = receiverId,
                    IsReaded = false,
                    SendingTime = DateTime.UtcNow,
                    Content = message.Content
                };

                await _context.Messages.AddAsync(newMessage);
                await _context.SaveChangesAsync();

                await Clients.User(receiverId).ReceiveNewMessage(newMessage);
            }
            catch (HubException)
            {
                // Re-throw HubExceptions as they are expected
                throw;
            }
            catch (Exception ex)
            {
                // Log unexpected exceptions and throw a generic HubException
                Console.WriteLine($"Error in SendMessage: {ex.Message}");
                throw new HubException("An error occurred while sending the message");
            }
        }

        public async Task LoadMessages(string receivedId, int pageNumber = 1)
        {
            try
            {
                int pageSize = 10;
                var userName = Context!.User!.Identity!.Name;

                // Validate input
                if (string.IsNullOrEmpty(receivedId))
                {
                    throw new HubException("Received user ID cannot be null or empty");
                }

                var currentUser = await _userManager.FindByNameAsync(userName!);
                if (currentUser is null)
                {
                    throw new HubException("Current user not found");
                }

                // Verify the other user exists
                var otherUser = await _userManager.FindByIdAsync(receivedId);
                if (otherUser == null)
                {
                    throw new HubException($"User with ID '{receivedId}' not found");
                }

                // Load messages between current user and the specified user
                List<MessageReponseDto> messages = await _context.Messages
                    .Where(x => (x.ReceiverId == currentUser.Id && x.SenderId == receivedId) ||
                               (x.ReceiverId == receivedId && x.SenderId == currentUser.Id))
                    .OrderByDescending(x => x.SendingTime)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .OrderBy(x => x.SendingTime)
                    .Select(x => new MessageReponseDto
                    {
                        Id = x.Id,
                        Content = x.Content,
                        SendingTime = x.SendingTime,
                        ReceiverId = x.ReceiverId,
                        SenderId = x.SenderId
                    }).ToListAsync();

                // Mark messages as read (only messages received by current user)
                var messageIds = messages.Where(m => m.ReceiverId == currentUser.Id).Select(m => m.Id).ToList();
                if (messageIds.Any())
                {
                    var messagesToUpdate = await _context.Messages
                        .Where(m => messageIds.Contains(m.Id) && !m.IsReaded)
                        .ToListAsync();

                    foreach (var msg in messagesToUpdate)
                    {
                        msg.IsReaded = true;
                    }

                    if (messagesToUpdate.Any())
                    {
                        await _context.SaveChangesAsync();
                    }
                }

                await Clients.User(currentUser.Id).ReceiveMessageList(messages);
            }
            catch (HubException)
            {
                // Re-throw HubExceptions as they are expected
                throw;
            }
            catch (Exception ex)
            {
                // Log unexpected exceptions and throw a generic HubException
                Console.WriteLine($"Error in LoadMessages: {ex.Message}");
                throw new HubException("An error occurred while loading messages");
            }
        }

        public async Task NotifyTyping(string receiverUserName)
        {
            var senderUserName = Context.User?.Identity?.Name;
            if (string.IsNullOrEmpty(senderUserName)) return;

            var connectionId = _onlineUsers.Values.FirstOrDefault(x => x.UserName == receiverUserName)?.ConnectionId;
            if (connectionId != null)
                await Clients.Client(connectionId).NotifyTypingToUser(senderUserName);
        }

        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            var receivedId = httpContext?.Request.Query["senderId"].ToString();
            var userName = Context?.User!.Identity?.Name;
            var currentUser = await _userManager.FindByNameAsync(userName!);
            var connectionId = Context?.ConnectionId;

            if (_onlineUsers.ContainsKey(userName!))
                _onlineUsers[userName!].ConnectionId = connectionId!;
            else
            {
                var user = new OnlineUserDto
                {
                    ConnectionId = connectionId!,
                    FullName = currentUser?.FullName!,
                    UserName = userName!,
                    ProfilePicture = currentUser?.ImageProfile!
                };
                _onlineUsers.TryAdd(userName!, user); 

                await Clients.AllExcept(connectionId!).Notify(currentUser!);
            }

            if (!string.IsNullOrEmpty(receivedId))
                await LoadMessages(receivedId);

            await Clients.All.OnlineUsers(await GetAllUsers());
        }

        private async Task<IEnumerable<OnlineUserDto>> GetAllUsers()
        {
            var userName = Context.User!.GetUserName();

            var onlineUserSet = new HashSet<string>(_onlineUsers.Keys);

            var users = await _userManager.Users.Select(u => new OnlineUserDto
            {
                UserId = u.Id,
                UserName = u.UserName!,
                FullName = u.FullName!,
                ProfilePicture = u.ImageProfile!,
                IsOnline = onlineUserSet.Contains(u.UserName!),
                UnReadCount = _context.Messages.Count(x => x.ReceiverId == userName && x.SenderId == u.Id && !x.IsReaded)
            }).OrderByDescending(u => u.IsOnline)
            .ToListAsync();

            return users;
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userName = Context.User!.Identity!.Name;

            _onlineUsers.TryRemove(userName!, out _);
            await Clients.All.OnlineUsers(await GetAllUsers());
        }
    }
} 