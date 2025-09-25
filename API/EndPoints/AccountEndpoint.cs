using System.Linq;
using System.Threading.Tasks;
using API.Dtos;
using API.Models.Identity;
using API.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.EndPoints
{
    public static class AccountEndpoint
    {
        public static RouteGroupBuilder MapAccountEndpoint(this WebApplication app)
        {
            var group = app.MapGroup("/api/account").WithTags("account");

            group.MapPost("/register",
            async ([FromServices] UserManager<ApplicationUser> userManager,
                [FromBody] RegisterDto request) =>
            {
                var userFromDb = await userManager.FindByEmailAsync(request.Email);
                if (userFromDb is not null)
                {
                    return Results.BadRequest(
                        Response<string>.Failure("User already exists.")
                    );
                }

                var user = new ApplicationUser
                {
                    UserName = request.UserName,
                    Email = request.Email,
                    FullName = request.FullName
                };

                var result = await userManager.CreateAsync(user, request.Password);
                if (!result.Succeeded)
                {
                    var errorMessages = string.Join("; ",
                        result.Errors.Select(e => e.Description));

                    return Results.BadRequest(
                        Response<string>.Failure(errorMessages)
                    );
                }

                return Results.Ok(
                    Response<string>.Success(user.Email!, "User registered successfully.")
                );
            });
            return group;
        }
    }
}
