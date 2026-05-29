using Microsoft.AspNetCore.Mvc;
using backend_dotnet.Interfaces;
using backend_dotnet.DTOs.DutyLog;
using Microsoft.AspNetCore.Authorization;
using backend_dotnet.Helpers;

namespace backend_dotnet.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class DutyLogsController : ControllerBase
    {
        private readonly IDutyLogService _service;

public DutyLogsController(IDutyLogService service)
{
    _service = service;
}

        // GET: api/dutylogs
        [HttpGet]
public async Task<ActionResult> GetDutyLogs()
{
    var dutyLogs = await _service.GetAllAsync();

    return Ok(new ApiResponse<IEnumerable<DutyLogResponseDto>>
    {
        Success = true,
        Message = "Duty logs fetched successfully",
        Data = dutyLogs
    });
}

        // GET: api/dutylogs/1
        [HttpGet("{id}")]
public async Task<ActionResult> GetDutyLog(int id)
{
    var dutyLog = await _service.GetByIdAsync(id);

    if (dutyLog == null)
    {
        return NotFound(new ApiResponse<string>
        {
            Success = false,
            Message = "Duty log not found"
        });
    }

    return Ok(new ApiResponse<DutyLogResponseDto>
    {
        Success = true,
        Message = "Duty log fetched successfully",
        Data = dutyLog
    });
}

        // POST: api/dutylogs
        [HttpPost]
public async Task<ActionResult> CreateDutyLog(CreateDutyLogDto dto)
{
    var createdDutyLog = await _service.CreateAsync(dto);

    return CreatedAtAction(
        nameof(GetDutyLog),
        new { id = createdDutyLog.Id },
        new ApiResponse<DutyLogResponseDto>
        {
            Success = true,
            Message = "Duty log created successfully",
            Data = createdDutyLog
        }
    );
}

        // PUT: api/dutylogs/1
        [HttpPut("{id}")]
public async Task<ActionResult> UpdateDutyLog(int id, UpdateDutyLogDto dto)
{
    var updated = await _service.UpdateAsync(id, dto);

    if (!updated)
    {
        return NotFound(new ApiResponse<string>
        {
            Success = false,
            Message = "Duty log not found"
        });
    }

    return Ok(new ApiResponse<string>
    {
        Success = true,
        Message = "Duty log updated successfully"
    });
}

        [HttpDelete("{id}")]
public async Task<ActionResult> DeleteDutyLog(int id)
{
    var deleted = await _service.DeleteAsync(id);

    if (!deleted)
    {
        return NotFound(new ApiResponse<string>
        {
            Success = false,
            Message = "Duty log not found"
        });
    }

    return Ok(new ApiResponse<string>
    {
        Success = true,
        Message = "Duty log deleted successfully"
    });
}
    }
}