using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.DTOs.Ai
{
    public class AiChatRequestDto
    {
        [Required]
        [MinLength(1)]
        [MaxLength(4000)]
        public string Prompt { get; set; } = string.Empty;

        [MaxLength(4000)]
        public string? Context { get; set; }
    }
}
