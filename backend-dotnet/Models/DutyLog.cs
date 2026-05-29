using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend_dotnet.Models
{
    public class DutyLog
    {
        [Key]
        public int Id { get; set; }

        public string DutyCode { get; set; } = string.Empty;

        public string FlightNumber { get; set; } = string.Empty;

        public string Origin { get; set; } = string.Empty;

        public string Destination { get; set; } = string.Empty;
         
        [Column(TypeName = "timestamp without time zone")]
        public DateTime DepartureTime { get; set; }

        [Column(TypeName = "timestamp without time zone")]         
        public DateTime ArrivalTime { get; set; }

        public string AircraftType { get; set; } = string.Empty;

        public string Remarks { get; set; } = string.Empty;
    }
}