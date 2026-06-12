# LangChain + LangGraph AI Service

This service powers backend endpoint `POST /api/ai/chat` from `backend-dotnet`.

---

## ✅ Easy Start (Recommended)

From the **project root folder**, run the startup script:

```powershell
.\start-ai-service.ps1
```

This will automatically stop any conflicting process on port 8000 and start the service.
**Keep this terminal window open** while using the app.

---

## Manual Start (Step-by-Step)

Open a **new terminal** and run these commands **one at a time**:

```powershell
# 1. Navigate to the AI service folder
cd "ai-langgraph-service"

# 2. Create a virtual environment (only needed ONCE)
python -m venv .venv

# 3. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Install dependencies (only needed ONCE or after requirements.txt changes)
pip install -r requirements.txt

# 5. Start the server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

> ⚠️ You MUST keep this terminal open. Closing it stops the AI service.

---

## Running the Full App

You need **3 terminals running at the same time**:

| Terminal | Command | Port |
|----------|---------|------|
| 1 - AI Service | `.\start-ai-service.ps1` (from root) | `:8000` |
| 2 - .NET Backend | `cd backend-dotnet && dotnet run` | `:5107` |
| 3 - Angular Frontend | `cd frontend-ui && npm start` | `:4200` |

Then open: **http://localhost:4200**

---

## Endpoints

- `GET  /health` → Returns `{"status": "ok"}` if running
- `POST /chat`
  - Body: `{ "prompt": string, "context"?: string }`
  - Response: `{ "response": string, "actions": [] }`

---

## Integration Path

```
Angular (port 4200)
  → proxy.conf.json → /api/*
    → ASP.NET Core (port 5107)  [AiController]
      → forwards to Python AI service (port 8000)
```
