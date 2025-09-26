using System.Collections.Concurrent;
using API.Data;
using API.Dtos;
using API.Extensions;
using API.Models;
using API.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;
        public static readonly ConcurrentDictionary<string, OnlineUserDto> _onlineUsers = new();

        public ChatHub(UserManager<ApplicationUser> userManager, ApplicationDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        public async Task SendMessage(MessageRequsetDto message)
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

            await Clients.User(receivedId).SendAsync("ReceiveNewMessage", newMessage);
        }

        public async Task NotifyTyping(string recieiverUserName)
        {
            var senderUserName = Context.User!.Identity!.Name;
            if (senderUserName is null)
                return;

            var connectionId = _onlineUsers.Values.FirstOrDefault(x => x.UserName == recieiverUserName)?.ConnectionId;

            if (connectionId is null)
                await Clients.Client(connectionId!).SendAsync("NotifyTypingToUser", senderUserName);
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

                await Clients.AllExcept(connectionId!).SendAsync("Notify", currentUser);
            }
            await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
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
            await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
        }
    }
}