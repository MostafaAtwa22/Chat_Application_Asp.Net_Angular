namespace API.Interfaces
{
    public interface IVideoClient
    {
        Task ReceiveUserConnected(string userId);
        Task ReceiveOffer(string userId, string offer);
        Task ReceiveAnswer(string userId, string answer);
        Task ReceiveIceCandidate(string userId, string candidate);
        Task CallEnd();
    }
}
