using API.Dtos;
using API.Models;
using API.Models.Identity;

namespace API.Interfaces
{
    public interface IChatClient
    {
        Task ReceiveNewMessage(Message message);
        Task ReceiveMessageList(IEnumerable<MessageRequestDto> messages);
        Task NotifyTypingToUser(string senderUserName);
        Task Notify(ApplicationUser user);
        Task OnlineUsers(IEnumerable<OnlineUserDto> users);
    }
}