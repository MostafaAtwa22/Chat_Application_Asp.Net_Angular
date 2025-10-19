using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs
{
    [Authorize]
    public class VideoChatHub : Hub<IVideoClient>
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.All.ReceiveUserConnected(Context.UserIdentifier!);
            await base.OnConnectedAsync();
        }

        public async Task SendOffer(string receiverId, string offer)
        {
            await Clients.User(receiverId).ReceiveOffer(Context.UserIdentifier!, offer);
        }

        public async Task SendAnswer(string receiverId, string answer)
        {
            await Clients.User(receiverId).ReceiveAnswer(Context.UserIdentifier!, answer);
        }

        public async Task SendIceCandidate(string receiverId, string candidate)
        {
            await Clients.User(receiverId).ReceiveIceCandidate(Context.UserIdentifier!, candidate);
        }

        public async Task EndCall(string receiverId)
        {
            await Clients.User(receiverId).CallEnd();
        }
    }
}