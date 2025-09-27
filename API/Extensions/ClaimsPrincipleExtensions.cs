using System.Security.Claims;

namespace API.Extensions
{
    public static class ClaimsPrincipleExtensions
    {
        public static string GetUserName(this ClaimsPrincipal user)
            => user.FindFirstValue(ClaimTypes.Name) ??
                throw new BadHttpRequestException("Can't get the userName");
        
        public static string GetUserId(this ClaimsPrincipal principal)
        {
            return principal.FindFirstValue(ClaimTypes.NameIdentifier) 
                ?? principal.FindFirstValue("sub") 
                ?? principal.FindFirstValue("uid")
                ?? principal.FindFirstValue("id")
                ?? principal.FindFirstValue("client_id")
                ?? throw new Exception("User ID not found in claims");
        }
    }
}