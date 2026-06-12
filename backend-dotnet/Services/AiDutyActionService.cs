using System.Globalization;
using System.Text.Json;
using backend_dotnet.DTOs.Ai;
using backend_dotnet.DTOs.DutyLog;
using backend_dotnet.Interfaces;

namespace backend_dotnet.Services
{
    public class AiDutyActionService
    {
        private readonly IDutyLogService _dutyLogService;

        public AiDutyActionService(IDutyLogService dutyLogService)
        {
            _dutyLogService = dutyLogService;
        }

        public async Task<(List<string> Results, bool Changed)> ExecuteAsync(
            IEnumerable<AiActionDto> actions,
            int? userId,
            bool isAdmin)
        {
            var results = new List<string>();
            var changed = false;

            foreach (var action in actions)
            {
                var type = action.Type?.Trim().ToLowerInvariant() ?? string.Empty;

                switch (type)
                {
                    case "create":
                        if (action.Payload == null)
                        {
                            results.Add("Skipped create: missing payload.");
                            continue;
                        }

                        var createDto = MapCreateDto(action.Payload, userId, isAdmin);
                        var created = await _dutyLogService.CreateAsync(createDto);
                        changed = true;
                        results.Add($"Created duty #{created.Id} ({created.DutyCode}).");
                        break;

                    case "update":
                        if (!action.Id.HasValue || action.Payload == null)
                        {
                            results.Add("Skipped update: missing id or payload.");
                            continue;
                        }

                        if (!await CanMutateDutyAsync(action.Id.Value, userId, isAdmin))
                        {
                            results.Add($"Not allowed to update duty #{action.Id.Value}.");
                            continue;
                        }

                        var updateDto = MapUpdateDto(action.Payload, userId, isAdmin);
                        var updated = await _dutyLogService.UpdateAsync(action.Id.Value, updateDto);
                        if (updated)
                        {
                            changed = true;
                            results.Add($"Updated duty #{action.Id.Value}.");
                        }
                        else
                        {
                            results.Add($"Duty #{action.Id.Value} not found.");
                        }

                        break;

                    case "delete":
                        if (!action.Id.HasValue)
                        {
                            results.Add("Skipped delete: missing id.");
                            continue;
                        }

                        if (!await CanMutateDutyAsync(action.Id.Value, userId, isAdmin))
                        {
                            results.Add($"Not allowed to delete duty #{action.Id.Value}.");
                            continue;
                        }

                        var deleted = await _dutyLogService.DeleteAsync(action.Id.Value);
                        if (deleted)
                        {
                            changed = true;
                            results.Add($"Deleted duty #{action.Id.Value}.");
                        }
                        else
                        {
                            results.Add($"Duty #{action.Id.Value} not found.");
                        }

                        break;

                    case "highlight_duty":
                        // Frontend-only interactive action, handled by UI
                        break;

                    default:
                        results.Add($"Unknown action type: {action.Type}");
                        break;
                }
            }

            return (results, changed);
        }

        private async Task<bool> CanMutateDutyAsync(int dutyId, int? userId, bool isAdmin)
        {
            if (isAdmin)
            {
                return true;
            }

            if (!userId.HasValue)
            {
                return false;
            }

            var duty = await _dutyLogService.GetByIdAsync(dutyId);
            return duty != null && duty.PilotId == userId.Value;
        }

        private static CreateDutyLogDto MapCreateDto(
            Dictionary<string, object> payload,
            int? userId,
            bool isAdmin)
        {
            return new CreateDutyLogDto
            {
                DutyCode = GetString(payload, "dutyCode") ?? "FDUT",
                FlightNumber = GetString(payload, "flightNumber") ?? "TBD",
                Origin = GetString(payload, "origin") ?? "TBD",
                Destination = GetString(payload, "destination") ?? "TBD",
                DepartureTime = GetDateTime(payload, "departureTime"),
                ArrivalTime = GetDateTime(payload, "arrivalTime"),
                AircraftType = GetString(payload, "aircraftType") ?? "A320",
                Remarks = GetString(payload, "remarks") ?? string.Empty,
                PilotId = isAdmin ? GetNullableInt(payload, "pilotId") ?? userId : userId
            };
        }

        private static UpdateDutyLogDto MapUpdateDto(
            Dictionary<string, object> payload,
            int? userId,
            bool isAdmin)
        {
            return new UpdateDutyLogDto
            {
                DutyCode = GetString(payload, "dutyCode") ?? "FDUT",
                FlightNumber = GetString(payload, "flightNumber") ?? "TBD",
                Origin = GetString(payload, "origin") ?? "TBD",
                Destination = GetString(payload, "destination") ?? "TBD",
                DepartureTime = GetDateTime(payload, "departureTime"),
                ArrivalTime = GetDateTime(payload, "arrivalTime"),
                AircraftType = GetString(payload, "aircraftType") ?? "A320",
                Remarks = GetString(payload, "remarks") ?? string.Empty,
                PilotId = isAdmin ? GetNullableInt(payload, "pilotId") ?? userId : userId
            };
        }

        private static string? GetString(Dictionary<string, object> payload, string key)
        {
            if (!payload.TryGetValue(key, out var value) || value is null)
            {
                return null;
            }

            if (value is JsonElement element)
            {
                return element.ValueKind == JsonValueKind.String ? element.GetString() : element.ToString();
            }

            return value.ToString();
        }

        private static int? GetNullableInt(Dictionary<string, object> payload, string key)
        {
            if (!payload.TryGetValue(key, out var value) || value is null)
            {
                return null;
            }

            if (value is JsonElement element && element.TryGetInt32(out var parsed))
            {
                return parsed;
            }

            return int.TryParse(value.ToString(), out var number) ? number : null;
        }

        private static DateTime GetDateTime(Dictionary<string, object> payload, string key)
        {
            var text = GetString(payload, key);
            if (string.IsNullOrWhiteSpace(text))
            {
                return DateTime.UtcNow;
            }

            if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
            {
                return DateTime.SpecifyKind(parsed, DateTimeKind.Unspecified);
            }

            return DateTime.UtcNow;
        }
    }
}
