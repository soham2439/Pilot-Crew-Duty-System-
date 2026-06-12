namespace backend_dotnet.DTOs.Ai
{
    public class AiUpstreamResponseDto
    {
        public string Response { get; set; } = string.Empty;

        public List<AiActionDto> Actions { get; set; } = new();
    }
}
