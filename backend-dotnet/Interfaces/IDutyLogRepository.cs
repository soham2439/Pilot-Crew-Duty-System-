using backend_dotnet.Models;

namespace backend_dotnet.Interfaces
{
    public interface IDutyLogRepository
    {
        Task<IEnumerable<DutyLog>> GetAllAsync();

        Task<DutyLog?> GetByIdAsync(int id);

        Task<DutyLog> CreateAsync(DutyLog dutyLog);

        Task UpdateAsync(DutyLog dutyLog);

        Task DeleteAsync(DutyLog dutyLog);
    }
}