using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.DTOs.Auth
{
    public class LoginRequestDto
    {
        [Required]
        [EmailAddress]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        [MaxLength(100)]
        public string PasswordHash { get; set; } = string.Empty;
    }
}
