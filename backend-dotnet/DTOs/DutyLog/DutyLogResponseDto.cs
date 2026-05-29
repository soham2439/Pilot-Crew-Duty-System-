namespace backend_dotnet.DTOs.DutyLog
{
    public class DutyLogResponseDto
    {
        public int Id { get; set; }

        public string DutyCode { get; set; } = string.Empty;

        public string FlightNumber { get; set; } = string.Empty;

        public string Origin { get; set; } = string.Empty;

        public string Destination { get; set; } = string.Empty;

        public DateTime DepartureTime { get; set; }

        public DateTime ArrivalTime { get; set; }

        public string AircraftType { get; set; } = string.Empty;

        public string Remarks { get; set; } = string.Empty;
    }
}