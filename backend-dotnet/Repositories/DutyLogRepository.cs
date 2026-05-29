using Microsoft.EntityFrameworkCore;
using backend_dotnet.Data;
using backend_dotnet.Interfaces;
using backend_dotnet.Models;

namespace backend_dotnet.Repositories
{
    public class DutyLogRepository : IDutyLogRepository
    {
        private readonly ApplicationDbContext _context;

        public DutyLogRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<DutyLog>> GetAllAsync()
        {
            return await _context.DutyLogs.ToListAsync();
        }

        public async Task<DutyLog?> GetByIdAsync(int id)
        {
            return await _context.DutyLogs.FindAsync(id);
        }

        public async Task<DutyLog> CreateAsync(DutyLog dutyLog)
        {
            _context.DutyLogs.Add(dutyLog);

            await _context.SaveChangesAsync();

            return dutyLog;
        }

        public async Task UpdateAsync(DutyLog dutyLog)
        {
            _context.DutyLogs.Update(dutyLog);

            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(DutyLog dutyLog)
        {
            _context.DutyLogs.Remove(dutyLog);

            await _context.SaveChangesAsync();
        }
    }
}