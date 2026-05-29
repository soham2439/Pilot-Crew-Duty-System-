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

            return dutyLogs.Select(d => new DutyLogResponseDto
            {
                Id = d.Id,
                DutyCode = d.DutyCode,
                FlightNumber = d.FlightNumber,
                Origin = d.Origin,
                Destination = d.Destination,
                DepartureTime = d.DepartureTime,
                ArrivalTime = d.ArrivalTime,
                AircraftType = d.AircraftType,
                Remarks = d.Remarks
            });
        }

        public async Task<DutyLogResponseDto?> GetByIdAsync(int id)
        {
            var dutyLog = await _repository.GetByIdAsync(id);

            if (dutyLog == null)
            {
                return null;
            }

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
                Remarks = dutyLog.Remarks
            };
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
                Remarks = dto.Remarks
            };

            var createdDutyLog = await _repository.CreateAsync(dutyLog);

            return new DutyLogResponseDto
            {
                Id = createdDutyLog.Id,
                DutyCode = createdDutyLog.DutyCode,
                FlightNumber = createdDutyLog.FlightNumber,
                Origin = createdDutyLog.Origin,
                Destination = createdDutyLog.Destination,
                DepartureTime = createdDutyLog.DepartureTime,
                ArrivalTime = createdDutyLog.ArrivalTime,
                AircraftType = createdDutyLog.AircraftType,
                Remarks = createdDutyLog.Remarks
            };
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
    }
}