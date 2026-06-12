namespace backend_dotnet.DTOs.Ai
{
    public class AiActionDto
    {
        public string Type { get; set; } = string.Empty;

        public int? Id { get; set; }

        public Dictionary<string, object>? Payload { get; set; }
    }
}
