using backend_dotnet.Data;
using backend_dotnet.DTOs.DutyLog;
using backend_dotnet.Interfaces;
using backend_dotnet.Models;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace backend_dotnet.Services
{
    public class DutyLogService : IDutyLogService
    {
        private readonly IDutyLogRepository _repository;
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DutyLogService(
            IDutyLogRepository repository,
            ApplicationDbContext context,
            IHttpContextAccessor httpContextAccessor)
        {
            _repository = repository;
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<IEnumerable<DutyLogResponseDto>> GetAllAsync()
        {
            var dutyLogs = await _repository.GetAllAsync();

            return dutyLogs.Select(ToDto);
        }

        public async Task<IEnumerable<DutyLogResponseDto>> GetByPilotIdAsync(int pilotId)
        {
            var dutyLogs = await _repository.GetByPilotIdAsync(pilotId);

            return dutyLogs.Select(ToDto);
        }

        public async Task<DutyLogResponseDto?> GetByIdAsync(int id)
        {
            var dutyLog = await _repository.GetByIdAsync(id);

            if (dutyLog == null)
            {
                return null;
            }

            return ToDto(dutyLog);
        }

        public async Task<DutyLogResponseDto> CreateAsync(CreateDutyLogDto dto)
        {
            var dutyLog = new DutyLog
            {
                DutyCode = dto.DutyCode,
                FlightNumber = dto.FlightNumber,
                Origin = dto.Origin,
                Destination = dto.Destination,
                DepartureTime = dto.DepartureTime,
                ArrivalTime = dto.ArrivalTime,
                AircraftType = dto.AircraftType,
                Remarks = dto.Remarks,
                PilotId = dto.PilotId
            };

            var createdDutyLog = await _repository.CreateAsync(dutyLog);

            string assignDetails = "";
            if (dto.PilotId.HasValue)
            {
                var pilot = _context.Users.Find(dto.PilotId.Value);
                if (pilot != null)
                {
                    assignDetails = $" Assigned to pilot {pilot.Name}.";
                    await LogRegistryAsync("assigned", createdDutyLog.Id, createdDutyLog.FlightNumber, $"Assigned to pilot {pilot.Name} on creation.");
                }
            }
            await LogRegistryAsync("created", createdDutyLog.Id, createdDutyLog.FlightNumber, $"Created {createdDutyLog.DutyCode} duty.{assignDetails}");

            return ToDto(createdDutyLog);
        }

        public async Task<bool> UpdateAsync(int id, UpdateDutyLogDto dto)
        {
            var dutyLog = await _repository.GetByIdAsync(id);

            if (dutyLog == null)
            {
                return false;
            }

            var oldPilotId = dutyLog.PilotId;
            var oldPilotName = dutyLog.Pilot?.Name;

            dutyLog.DutyCode = dto.DutyCode;
            dutyLog.FlightNumber = dto.FlightNumber;
            dutyLog.Origin = dto.Origin;
            dutyLog.Destination = dto.Destination;
            dutyLog.DepartureTime = dto.DepartureTime;
            dutyLog.ArrivalTime = dto.ArrivalTime;
            dutyLog.AircraftType = dto.AircraftType;
            dutyLog.Remarks = dto.Remarks;
            dutyLog.PilotId = dto.PilotId;

            await _repository.UpdateAsync(dutyLog);

            if (oldPilotId != dto.PilotId)
            {
                if (oldPilotId == null && dto.PilotId != null)
                {
                    var pilot = _context.Users.Find(dto.PilotId.Value);
                    var pilotName = pilot?.Name ?? "Unknown";
                    await LogRegistryAsync("assigned", id, dto.FlightNumber, $"Assigned to pilot {pilotName}.");
                }
                else if (oldPilotId != null && dto.PilotId == null)
                {
                    await LogRegistryAsync("unassigned", id, dto.FlightNumber, $"Unassigned pilot {oldPilotName}.");
                }
                else if (oldPilotId != null && dto.PilotId != null)
                {
                    var pilot = _context.Users.Find(dto.PilotId.Value);
                    var pilotName = pilot?.Name ?? "Unknown";
                    await LogRegistryAsync("assigned", id, dto.FlightNumber, $"Reassigned from {oldPilotName} to {pilotName}.");
                }
            }

            await LogRegistryAsync("updated", id, dto.FlightNumber, $"Updated duty details.");

            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var dutyLog = await _repository.GetByIdAsync(id);

            if (dutyLog == null)
            {
                return false;
            }

            var flightNum = dutyLog.FlightNumber;
            await _repository.DeleteAsync(dutyLog);

            await LogRegistryAsync("deleted", id, flightNum, $"Deleted duty.");

            return true;
        }

        private string GetActorName()
        {
            try
            {
                var user = _httpContextAccessor.HttpContext?.User;
                var userIdClaim = user?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(userIdClaim, out var userId))
                {
                    var dbUser = _context.Users.Find(userId);
                    if (dbUser != null)
                    {
                        return dbUser.Name;
                    }
                }
                var email = user?.FindFirstValue(ClaimTypes.Name);
                if (!string.IsNullOrEmpty(email))
                {
                    return email;
                }
            }
            catch { }
            return "System / Copilot";
        }

        private async Task LogRegistryAsync(string action, int? dutyId, string flightNumber, string details)
        {
            try
            {
                var actor = GetActorName();
                var log = new RegistryLog
                {
                    Action = action,
                    DutyId = dutyId,
                    FlightNumber = flightNumber,
                    ActorName = actor,
                    Timestamp = DateTime.UtcNow,
                    Details = details
                };
                _context.RegistryLogs.Add(log);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to write registry log: {ex.Message}");
            }
        }

        private static DutyLogResponseDto ToDto(DutyLog dutyLog)
        {
            return new DutyLogResponseDto
            {
                Id = dutyLog.Id,
                DutyCode = dutyLog.DutyCode,
                FlightNumber = dutyLog.FlightNumber,
                Origin = dutyLog.Origin,
                Destination = dutyLog.Destination,
                DepartureTime = dutyLog.DepartureTime,
                ArrivalTime = dutyLog.ArrivalTime,
                AircraftType = dutyLog.AircraftType,
                Remarks = dutyLog.Remarks,
                PilotId = dutyLog.PilotId,
                PilotName = dutyLog.Pilot?.Name
            };
        }
    }
}
