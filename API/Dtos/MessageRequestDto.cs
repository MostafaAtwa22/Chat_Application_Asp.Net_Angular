namespace API.Dtos
{
        public class MessageRequestDto
        {
                public int Id { get; set; }
                public string Content { get; set; } = string.Empty;
                public DateTime SendingTime { get; set; }
                public bool IsRead { get; set; }
                public string SenderId { get; set; } = string.Empty;
                public string ReceiverId { get; set; } = string.Empty;
        }
}