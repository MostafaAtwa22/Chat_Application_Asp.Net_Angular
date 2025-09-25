using Microsoft.AspNetCore.Identity;

namespace API.Models.Identity
{
    public class ApplicationUser : IdentityUser
    {
        public string? FullName { get; set; } = string.Empty;
        public string? ImageProfile { get; set; } = string.Empty;
    }
}