# ============================================================
#  Pilot Crew Duty System - AI LangGraph Service Starter
#  Run this from the project root directory
# ============================================================

$aiDir = Join-Path $PSScriptRoot "ai-langgraph-service"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Pilot Crew AI Service Startup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any existing process on port 8000
$existing = netstat -ano | Select-String "0.0.0.0:8000 " | ForEach-Object {
    ($_.ToString().Trim() -split "\s+")[-1]
} | Select-Object -First 1

if ($existing) {
    Write-Host "[1/2] Stopping existing process on port 8000 (PID: $existing)..." -ForegroundColor Yellow
    Stop-Process -Id $existing -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} else {
    Write-Host "[1/2] No existing process on port 8000." -ForegroundColor Green
}

# Step 2: Start the service using global Python
Write-Host "[2/2] Starting AI service on http://localhost:8000 ..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  > Press Ctrl+C to stop the service" -ForegroundColor DarkGray
Write-Host "  > Keep this window open while using the app" -ForegroundColor DarkGray
Write-Host ""

Set-Location $aiDir
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
