using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using backend_dotnet.Data;
using backend_dotnet.DTOs.Ai;
using backend_dotnet.DTOs.DutyLog;
using backend_dotnet.Helpers;
using backend_dotnet.Interfaces;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AiController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly IDutyLogService _dutyLogService;
        private readonly AiDutyActionService _aiDutyActionService;
        private readonly ApplicationDbContext _context;

        public AiController(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            IDutyLogService dutyLogService,
            AiDutyActionService aiDutyActionService,
            ApplicationDbContext context)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _dutyLogService = dutyLogService;
            _aiDutyActionService = aiDutyActionService;
            _context = context;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat(AiChatRequestDto request)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int? userId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : null;
            var role = User.FindFirstValue(ClaimTypes.Role) ?? "Pilot";
            var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

            IEnumerable<DutyLogResponseDto> duties;
            if (isAdmin)
            {
                duties = await _dutyLogService.GetAllAsync();
            }
            else if (userId.HasValue)
            {
                duties = await _dutyLogService.GetByPilotIdAsync(userId.Value);
            }
            else
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "User id is missing from token"
                });
            }

            var registryLogs = await _context.RegistryLogs
                .OrderByDescending(r => r.Timestamp)
                .Take(40)
                .ToListAsync();

            string userName = "Captain";
            if (userId.HasValue)
            {
                var userRecord = await _context.Users.FindAsync(userId.Value);
                if (userRecord != null)
                {
                    userName = userRecord.Name;
                }
            }

            var contextJson = JsonSerializer.Serialize(new
            {
                role,
                pilotId = userId,
                userName,
                duties = duties.Select(d => new
                {
                    d.Id,
                    d.DutyCode,
                    d.FlightNumber,
                    d.Origin,
                    d.Destination,
                    departureTime = d.DepartureTime.ToString("yyyy-MM-dd HH:mm:ss"),
                    arrivalTime = d.ArrivalTime.ToString("yyyy-MM-dd HH:mm:ss"),
                    d.AircraftType,
                    d.Remarks,
                    d.PilotId,
                    d.PilotName
                }),
                registry = registryLogs.Select(r => new
                {
                    r.Id,
                    r.Action,
                    r.DutyId,
                    r.FlightNumber,
                    r.ActorName,
                    timestamp = r.Timestamp.ToString("yyyy-MM-dd HH:mm:ss"),
                    r.Details
                })
            }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            var aiBaseUrl = _configuration["Ai:BaseUrl"] ?? "http://localhost:8000";
            var client = _httpClientFactory.CreateClient();

            using var response = await client.PostAsJsonAsync(
                $"{aiBaseUrl.TrimEnd('/')}/chat",
                new { prompt = request.Prompt, context = contextJson }
            );

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                return StatusCode((int)response.StatusCode, new ApiResponse<string>
                {
                    Success = false,
                    Message = $"AI upstream error: {errorContent}"
                });
            }

            var upstreamBody = await response.Content.ReadFromJsonAsync<AiUpstreamResponseDto>();
            var aiText = upstreamBody?.Response ?? "No response generated.";
            var actions = upstreamBody?.Actions ?? new List<AiActionDto>();

            var (actionResults, dutiesChanged) = await _aiDutyActionService.ExecuteAsync(actions, userId, isAdmin);

            var finalResponse = aiText;
            if (actionResults.Count > 0)
            {
                finalResponse += "\n\n" + string.Join("\n", actionResults);
            }

            return Ok(new ApiResponse<AiChatResponseDto>
            {
                Success = true,
                Message = "AI response generated",
                Data = new AiChatResponseDto
                {
                    Response = finalResponse,
                    DutiesChanged = dutiesChanged,
                    ActionResults = actionResults,
                    Actions = actions
                }
            });
        }
    }
}
