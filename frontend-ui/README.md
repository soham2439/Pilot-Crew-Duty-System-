# Pilot Crew Duty Frontend (Angular 17)

## Quick Start

1. `cd frontend-ui`
2. `npm install`
3. `npm start`

Angular dev server runs with proxy config to `http://localhost:5107` for `/api/*`.

## Implemented

- Standalone Angular 17 architecture with modular feature folders
- Core cockpit layout: sidebar nav, main content area, split-screen AI sidebar
- Dashboard metrics and duty log data table
- CRUD modal flow for duty logs (create/edit/delete)
- Strict validation:
  - Destination cannot equal Origin
  - Arrival must be later than Departure
- `DutyLogService` mapped to backend endpoints:
  - `GET /api/dutylogs`
  - `GET /api/dutylogs/{id}` (available via service extension)
  - `POST /api/dutylogs`
  - `PUT /api/dutylogs/{id}`
  - `DELETE /api/dutylogs/{id}`
- `AiService` wired to `/api/ai/chat` (backend endpoint not currently present in discovered controllers)
- Global auth + error interceptors, loading spinners, and resilient API error messages
