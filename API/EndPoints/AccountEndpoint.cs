using System.ComponentModel.DataAnnotations;
using API.Dtos;
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

            return group;
        }
    }
}