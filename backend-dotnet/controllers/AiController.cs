using System.Net.Http.Json;
using backend_dotnet.DTOs.Ai;
using backend_dotnet.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AiController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public AiController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat(AiChatRequestDto request)
        {
            var aiBaseUrl = _configuration["Ai:BaseUrl"] ?? "http://localhost:8000";
            var client = _httpClientFactory.CreateClient();

            using var response = await client.PostAsJsonAsync(
                $"{aiBaseUrl.TrimEnd('/')}/chat",
                new { prompt = request.Prompt, context = request.Context }
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

            var upstreamBody = await response.Content.ReadFromJsonAsync<AiChatResponseDto>();
            var aiText = upstreamBody?.Response ?? "No response generated.";

            return Ok(new ApiResponse<AiChatResponseDto>
            {
                Success = true,
                Message = "AI response generated",
                Data = new AiChatResponseDto
                {
                    Response = aiText
                }
            });
        }
    }
}
