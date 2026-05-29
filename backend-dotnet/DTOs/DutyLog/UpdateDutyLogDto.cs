using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.DTOs.DutyLog
{
    public class UpdateDutyLogDto
    {
        [Required]
        public string DutyCode { get; set; } = string.Empty;

        [Required]
        public string FlightNumber { get; set; } = string.Empty;

        [Required]
        public string Origin { get; set; } = string.Empty;

        [Required]
        public string Destination { get; set; } = string.Empty;

        [Required]
        public DateTime DepartureTime { get; set; }

        [Required]
        public DateTime ArrivalTime { get; set; }

        [Required]
        public string AircraftType { get; set; } = string.Empty;

        public string Remarks { get; set; } = string.Empty;

        public int? PilotId { get; set; }
    }
}
