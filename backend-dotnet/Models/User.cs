using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string Role { get; set; } = "Pilot";

        public ICollection<DutyLog> DutyLogs { get; set; } = new List<DutyLog>();
    }
}
