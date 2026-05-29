using backend_dotnet.DTOs.DutyLog;

namespace backend_dotnet.Interfaces
{
    public interface IDutyLogService
    {
        Task<IEnumerable<DutyLogResponseDto>> GetAllAsync();

        Task<IEnumerable<DutyLogResponseDto>> GetByPilotIdAsync(int pilotId);

        Task<DutyLogResponseDto?> GetByIdAsync(int id);

        Task<DutyLogResponseDto> CreateAsync(CreateDutyLogDto dto);

        Task<bool> UpdateAsync(int id, UpdateDutyLogDto dto);

        Task<bool> DeleteAsync(int id);
    }
}
