using System.ComponentModel.DataAnnotations;
using API.Models.Identity;

namespace API.Models
{
    public class Message
    {
        [Key]
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime SendingTime { get; set; }
        public bool IsRead { get; set; }

        public string SenderId { get; set; } = string.Empty;
        public ApplicationUser Sender { get; set; } = default!;
        
        public string ReceiverId { get; set; } = string.Empty;
        public ApplicationUser Receiver { get; set; } = default!;
    }
}