using Microsoft.AspNetCore.Mvc;
using backend_dotnet.Data;
using backend_dotnet.Models;
using BCrypt.Net;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using backend_dotnet.DTOs.Auth;
using backend_dotnet.Helpers;

namespace backend_dotnet.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(
            ApplicationDbContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email.ToLower() == normalizedEmail);

            if (emailExists)
            {
                return Conflict(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Email already exists"
                });
            }

            var user = new User
            {
                Name = request.Name.Trim(),
                Email = request.Email.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.PasswordHash),
                Role = string.IsNullOrWhiteSpace(request.Role) ? "Pilot" : request.Role.Trim()
            };

            _context.Users.Add(user);

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "User registered successfully"
            });
        }

        [HttpPost("login")]
        public IActionResult Login(LoginRequestDto loginUser)
        {
            var email = loginUser.Email.Trim().ToLowerInvariant();
            var user = _context.Users
                .FirstOrDefault(u => u.Email.ToLower() == email);

            if (user == null)
            {
                return Unauthorized("Invalid email");
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(
                loginUser.PasswordHash,
                user.PasswordHash
            );

            if (!isPasswordValid)
            {
                return Unauthorized("Invalid password");
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!)
            );

            var creds = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: creds
            );

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token)
            });
        }
    }
} 
