# LangChain + LangGraph AI Service

This service powers backend endpoint `POST /api/ai/chat` from `backend-dotnet`.

## Run locally

1. `cd ai-langgraph-service`
2. `python -m venv .venv`
3. Activate venv
4. `pip install -r requirements.txt`
5. (Optional) set `OPENAI_API_KEY` for real LLM responses
6. `uvicorn app:app --host 0.0.0.0 --port 8000 --reload`

## Endpoints

- `GET /health`
- `POST /chat`
  - body:
    - `prompt: string`
    - `context?: string`
  - response:
    - `response: string`

## Integration path

- Frontend calls: `POST /api/ai/chat` (Angular `AiService`)
- ASP.NET Core `AiController` forwards request to this service (`Ai:BaseUrl` in `appsettings.json`)
