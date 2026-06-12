using System;
using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models
{
    public class RegistryLog
    {
        [Key]
        public int Id { get; set; }

        public string Action { get; set; } = string.Empty; // "created", "updated", "deleted", "assigned", "unassigned"

        public int? DutyId { get; set; }

        public string FlightNumber { get; set; } = string.Empty;

        public string ActorName { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string Details { get; set; } = string.Empty;
    }
}
