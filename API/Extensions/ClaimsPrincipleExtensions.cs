using System.Security.Claims;

namespace API.Extensions
{
    public static class ClaimsPrincipleExtensions
    {
        public static string GetUserName(this ClaimsPrincipal user)
            => user.FindFirstValue(ClaimTypes.Name) ??
                throw new BadHttpRequestException("Can't get the userName");
        
        public static Guid GetUserId(this ClaimsPrincipal user)
            => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ??
                throw new BadHttpRequestException("Can't get the userId"));
    }
}