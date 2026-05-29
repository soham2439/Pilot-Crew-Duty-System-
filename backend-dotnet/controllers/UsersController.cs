using backend_dotnet.Data;
using backend_dotnet.DTOs.Auth;
using backend_dotnet.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("pilots")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> GetPilots()
        {
            var pilots = await _context.Users
                .Where(u => u.Role.ToLower() == "pilot")
                .OrderBy(u => u.Name)
                .Select(u => new UserSummaryDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<UserSummaryDto>>
            {
                Success = true,
                Message = "Pilots fetched successfully",
                Data = pilots
            });
        }
    }
}
