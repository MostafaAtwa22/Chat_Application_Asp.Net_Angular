namespace API.Dtos
{
    public class OnlineUserDto
    {
        public string Id { get; set; } = string.Empty;
        public string ConnectionId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string ProfilePicture { get; set; } = string.Empty;
        public bool IsOnline { get; set; }
        public int UnReadCount { get; set; }
    }
}