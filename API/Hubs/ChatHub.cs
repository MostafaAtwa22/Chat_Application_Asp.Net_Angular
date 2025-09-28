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
            var senderId = Context.User!.Identity!.Name;
            var receivedId = message.ReceiverId;

            var newMessage = new Message
            {
                Sender = await _userManager.FindByNameAsync(senderId),
                Receiver = await _userManager.FindByNameAsync(receivedId),
                IsReaded = false,
                SendingTime = DateTime.UtcNow,
                Content = message.Content
            };

            await _context.Messages.AddAsync(newMessage);
            await _context.SaveChangesAsync();

            await Clients.User(receivedId).ReceiveNewMessage(newMessage);
        }

        public async Task LoadMessages(string receivedId, int pageNumber = 1)
        {
            int pageSize = 10;
            var userName = Context!.User!.Identity!.Name;

            var currentUser = await _userManager.FindByNameAsync(userName!);
            if (currentUser is null)
                return;

            List<MessageReponseDto> messages = await _context.Messages
                .Where(x => x.ReceiverId == currentUser!.Id && x.SenderId == receivedId
                || x.ReceiverId == receivedId && x.SenderId == currentUser!.Id)
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

            foreach (var message in messages)
            {
                var msg = await _context.Messages.FirstOrDefaultAsync(x => x.Id == message.Id);
                if (msg is not null && msg.ReceiverId == currentUser.Id)
                {
                    msg.IsReaded = true;
                    await _context.SaveChangesAsync();
                }
            }

            await Clients.User(currentUser.Id).ReceiveMessageList(messages);
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