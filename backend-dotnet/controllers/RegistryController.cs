using backend_dotnet.Data;
using backend_dotnet.Helpers;
using backend_dotnet.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RegistryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RegistryController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetRegistry()
        {
            var logs = await _context.RegistryLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(100)
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<RegistryLog>>
            {
                Success = true,
                Message = "Registry logs retrieved successfully",
                Data = logs
            });
        }
    }
}
