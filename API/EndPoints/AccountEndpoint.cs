using System.ComponentModel.DataAnnotations;
using API.Dtos;
using API.Extensions;
using API.Models.Identity;
using API.Response;
using API.Services;
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
                async (HttpContext httpContext,
                [FromServices] UserManager<ApplicationUser> userManager,
                [FromForm] RegisterDto request) =>
            {
                // Manual model validation
                var validationContext = new ValidationContext(request);
                var validationResults = new List<ValidationResult>();
                bool isValid = Validator.TryValidateObject(request, validationContext, validationResults, true);

                if (!isValid)
                {
                    var errorMessages = validationResults.Select(vr => vr.ErrorMessage);
                    return Results.BadRequest(
                        Response<string>.Failure(string.Join("; ", errorMessages))
                    );
                }

                if (request.Password != request.ConfirmPassword)
                {
                    return Results.BadRequest(
                        Response<string>.Failure("Passwords do not match")
                    );
                }

                var userFromDb = await userManager.FindByEmailAsync(request.Email);
                if (userFromDb is not null)
                {
                    return Results.BadRequest(
                        Response<string>.Failure("User already exists.")
                    );
                }
                
                string pictureUrl = string.Empty;
                if (request.ProfileImage != null && request.ProfileImage.Length > 0)
                {
                    var pictureFileName = await FileUpload.Upload(request.ProfileImage);
                    pictureUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}/uploads/{pictureFileName}";
                }
                
                var user = new ApplicationUser
                {
                    UserName = request.UserName,
                    Email = request.Email,
                    FullName = request.FullName,
                    ImageProfile = pictureUrl 
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
            }).DisableAntiforgery();

            group.MapPost("/login", async ([FromServices]UserManager<ApplicationUser> userManager,
            [FromServices]TokenService tokenService, [FromBody]LoginDto loginDto) =>
            {
                var validationContext = new ValidationContext(loginDto);
                var validationResults = new List<ValidationResult>();
                bool isValid = Validator.TryValidateObject(loginDto, validationContext, validationResults, true);

                if (!isValid)
                {
                    var errorMessages = validationResults.Select(vr => vr.ErrorMessage);
                    return Results.BadRequest(
                        Response<string>.Failure(string.Join("; ", errorMessages))
                    );
                }

                var user = await userManager.FindByEmailAsync(loginDto.Email);
                if (user is null)
                    return Results.BadRequest(Response<string>.Failure("Use is not exists"));

                var res = await userManager.CheckPasswordAsync(user, loginDto.Password);

                if (!res)
                    return Results.BadRequest(Response<string>.Failure("Some thing is wrong in email/passowrd"));

                var token = tokenService.GenerateToken(user.Id, user.UserName!);

                return Results.Ok(Response<string>.Success(token, "Login done successfully"));
            });

            group.MapPost("/me", async (HttpContext httpContext,
                [FromServices] UserManager<ApplicationUser> userManager) =>
            {
                // Check if user is authenticated first
                if (!httpContext.User.Identity.IsAuthenticated)
                {
                    return Results.Unauthorized();
                }

                var currentLoggedInUserId = httpContext.User.GetUserId();
                
                // Check if user ID is available (remove .ToString() since it should already be string)
                if (string.IsNullOrEmpty(currentLoggedInUserId))
                {
                    return Results.Unauthorized();
                }

                // Get the user from the database
                var user = await userManager.FindByIdAsync(currentLoggedInUserId);
                if (user == null)
                {
                    return Results.NotFound("User not found");
                }

                return Results.Ok(Response<ApplicationUser>.Success(user, "User fetched successfully."));
            }).RequireAuthorization();
            return group;
        }
    }
}