using backend_dotnet.DTOs.DutyLog;
using backend_dotnet.Interfaces;
using backend_dotnet.Models;

namespace backend_dotnet.Services
{
    public class DutyLogService : IDutyLogService
    {
        private readonly IDutyLogRepository _repository;

        public DutyLogService(IDutyLogRepository repository)
        {
            _repository = repository;
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

            return ToDto(createdDutyLog);
        }

        public async Task<bool> UpdateAsync(int id, UpdateDutyLogDto dto)
        {
            var dutyLog = await _repository.GetByIdAsync(id);

            if (dutyLog == null)
            {
                return false;
            }

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

            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var dutyLog = await _repository.GetByIdAsync(id);

            if (dutyLog == null)
            {
                return false;
            }

            await _repository.DeleteAsync(dutyLog);

            return true;
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
