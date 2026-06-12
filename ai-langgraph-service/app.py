import os
import json
import re
import contextvars
from datetime import datetime, timedelta
from typing import Any, Optional, TypedDict

from dotenv import load_dotenv
load_dotenv()


from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from langgraph.graph import END, StateGraph

from duty_assistant import process_prompt, parse_context, parse_registry

try:
    from langchain_openai import ChatOpenAI
    from langchain_core.tools import tool
except Exception:  # pragma: no cover
    ChatOpenAI = None
    tool = None

try:
    from langchain_ollama import ChatOllama
except Exception:
    ChatOllama = None


# Context variables for tool execution (coroutine-safe)
roster_context_var = contextvars.ContextVar("roster_context", default="")
actions_var = contextvars.ContextVar("actions", default=[])

SESSION_MEMORY = {}


# --- AI COPILOT TOOLS ---

if tool is not None:
    @tool
    def get_next_duty() -> str:
        """Get the pilot's next upcoming duty and highlight it."""
        context = roster_context_var.get()
        try:
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            now = datetime.now()
            from duty_assistant import _duty_dt, _format_duty
            future = [
                item for item in duties
                if (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            ]
            future.sort(key=lambda x: _duty_dt(x) or datetime.max)
            if future:
                actions = actions_var.get()
                actions.append({"type": "highlight_duty", "id": future[0].get("id")})
                actions_var.set(actions)
                return f"Your next upcoming duty is: {_format_duty(future[0])}"
        except Exception as e:
            return f"Error finding next duty: {e}"
        return "No upcoming duties found."

    @tool
    def get_week_schedule() -> str:
        """Get duties scheduled for the current week."""
        context = roster_context_var.get()
        try:
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            now = datetime.now()
            from duty_assistant import _format_duty, _filter_by_range
            start = now - timedelta(days=now.weekday())
            end = start + timedelta(days=6, hours=23, minutes=59)
            week_duties = _filter_by_range(duties, start, end)
            if week_duties:
                lines = [_format_duty(item) for item in week_duties]
                return "This week's schedule:\n- " + "\n- ".join(lines)
        except Exception as e:
            return f"Error: {e}"
        return "No duties scheduled for this week."

    @tool
    def get_month_schedule() -> str:
        """Get duties scheduled for the current calendar month."""
        context = roster_context_var.get()
        try:
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            now = datetime.now()
            from duty_assistant import _date_range_this_month, _filter_by_range, _format_duty
            start, end = _date_range_this_month(now)
            month_duties = _filter_by_range(duties, start, end)
            if month_duties:
                lines = [_format_duty(item) for item in month_duties]
                return "This month's schedule:\n- " + "\n- ".join(lines)
        except Exception as e:
            return f"Error: {e}"
        return "No duties scheduled for this month."

    @tool
    def calculate_flight_hours() -> str:
        """Calculate total flight hours for this calendar month and direct pilot to analytics page."""
        context = roster_context_var.get()
        try:
            from duty_assistant import _calculate_flight_hours
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            now = datetime.now()
            month_hours = _calculate_flight_hours(duties, now.month)
            total_hours = _calculate_flight_hours(duties)
            
            actions = actions_var.get()
            actions.append({"type": "navigate_analytics"})
            actions_var.set(actions)
            return f"Flight hours: {month_hours:.1f} hours flown this month. Total overall hours: {total_hours:.1f} hours."
        except Exception as e:
            return f"Error calculating flight hours: {e}"

    @tool
    def calculate_statistics() -> str:
        """Calculate roster statistics and completed duties percentage."""
        context = roster_context_var.get()
        try:
            from duty_assistant import _calculate_statistics
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            stats = _calculate_statistics(duties)
            
            actions = actions_var.get()
            actions.append({"type": "navigate_analytics"})
            actions_var.set(actions)
            return json.dumps(stats)
        except Exception as e:
            return f"Error calculating statistics: {e}"

    @tool
    def get_registry() -> str:
        """Get the timeline registry history of recent edits and additions."""
        context = roster_context_var.get()
        try:
            from duty_assistant import parse_registry
            registry = parse_registry(context)
            lines = []
            for r in registry[:15]:
                lines.append(f"[{r.get('timestamp')}] {r.get('action').upper()}: {r.get('details')} (Actor: {r.get('actorName')})")
            
            actions = actions_var.get()
            actions.append({"type": "navigate_registry"})
            actions_var.set(actions)
            return "Roster modification log registry:\n" + ("\n".join(lines) if lines else "No changes logged in timeline.")
        except Exception as e:
            return f"Error retrieving registry: {e}"

    @tool
    def find_day_off() -> str:
        """Find the pilot's next scheduled day off (DOFF)."""
        context = roster_context_var.get()
        try:
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            now = datetime.now()
            from duty_assistant import _duty_dt
            doffs = [
                item for item in duties
                if str(item.get("dutyCode", "")).upper() == "DOFF"
                and (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            ]
            doffs.sort(key=lambda x: _duty_dt(x) or datetime.max)
            if doffs:
                next_doff = doffs[0]
                actions = actions_var.get()
                actions.append({"type": "highlight_duty", "id": next_doff.get("id")})
                actions_var.set(actions)
                return f"Your next day off is on {_duty_dt(next_doff).date()}."
        except Exception as e:
            return f"Error: {e}"
        return "No upcoming days off scheduled."

    @tool
    def find_aircraft_usage() -> str:
        """Calculate flight count and hours per aircraft type and view analytics."""
        context = roster_context_var.get()
        try:
            from duty_assistant import _calculate_aircraft_usage
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            usage = _calculate_aircraft_usage(duties)
            
            actions = actions_var.get()
            actions.append({"type": "navigate_analytics"})
            actions_var.set(actions)
            return json.dumps(usage)
        except Exception as e:
            return f"Error: {e}"

    @tool
    def navigate_page(page: str) -> str:
        """Navigate pilot console to a tab page.
        Args:
            page: Tab page to navigate to (dashboard, roster, analytics, registry).
        """
        actions = actions_var.get()
        actions.append({"type": f"navigate_{page.lower()}"})
        actions_var.set(actions)
        return f"Navigating display console to '{page}' page."

    @tool
    def highlight_duty(duty_id: int) -> str:
        """Scroll to and highlight a specific duty card by its ID.
        Args:
            duty_id: The database ID of the duty to highlight.
        """
        actions = actions_var.get()
        actions.append({"type": "highlight_duty", "id": duty_id})
        actions_var.set(actions)
        return f"Duty card #{duty_id} has been highlighted on the screen."

    @tool
    def create_duty(payload_json: str) -> str:
        """Create a new duty log entry.
        Args:
            payload_json: JSON string with duty details (dutyCode, flightNumber, origin, destination, departureTime, arrivalTime, aircraftType, remarks).
        """
        try:
            payload = json.loads(payload_json)
            actions = actions_var.get()
            actions.append({"type": "create", "payload": payload})
            actions_var.set(actions)
            return "Command scheduled: Create new duty log."
        except Exception as e:
            return f"Failed to parse payload: {e}"

    @tool
    def update_duty(duty_id: int, payload_json: str) -> str:
        """Update fields of an existing duty log.
        Args:
            duty_id: Numerical ID of the duty log to update.
            payload_json: JSON string containing fields to update.
        """
        try:
            payload = json.loads(payload_json)
            actions = actions_var.get()
            actions.append({"type": "update", "id": duty_id, "payload": payload})
            actions_var.set(actions)
            return f"Command scheduled: Update duty #{duty_id}."
        except Exception as e:
            return f"Failed to parse payload: {e}"

    @tool
    def delete_duty(duty_id: int) -> str:
        """Delete a duty log.
        Args:
            duty_id: Numerical ID of the duty log to delete.
        """
        actions = actions_var.get()
        actions.append({"type": "delete", "id": duty_id})
        actions_var.set(actions)
        return f"Command scheduled: Delete duty #{duty_id}."

    @tool
    def assign_pilot(duty_id: int, pilot_id: int) -> str:
        """Assign pilot to a duty log.
        Args:
            duty_id: Duty ID to update.
            pilot_id: Pilot user ID to assign.
        """
        actions = actions_var.get()
        actions.append({"type": "update", "id": duty_id, "payload": {"pilotId": pilot_id}})
        actions_var.set(actions)
        return f"Command scheduled: Assign pilot #{pilot_id} to duty #{duty_id}."

    @tool
    def unassign_pilot(duty_id: int) -> str:
        """Unassign pilot from a duty log.
        Args:
            duty_id: Duty ID to update.
        """
        actions = actions_var.get()
        actions.append({"type": "update", "id": duty_id, "payload": {"pilotId": None}})
        actions_var.set(actions)
        return f"Command scheduled: Unassign pilot from duty #{duty_id}."

    @tool
    def detect_conflicts() -> str:
        """Scan roster and list flight duties that have overlapping timelines."""
        context = roster_context_var.get()
        try:
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            from duty_assistant import _duty_dt, _parse_duty_time
            sorted_d = sorted([d for d in duties if _duty_dt(d)], key=lambda x: _duty_dt(x))
            overlaps = []
            for i in range(len(sorted_d)):
                for j in range(i + 1, len(sorted_d)):
                    d1 = sorted_d[i]
                    d2 = sorted_d[j]
                    dep1 = _duty_dt(d1)
                    arr1 = _parse_duty_time(d1.get("arrivalTime"))
                    dep2 = _duty_dt(d2)
                    arr2 = _parse_duty_time(d2.get("arrivalTime"))
                    if dep1 and arr1 and dep2 and arr2:
                        if dep2 < arr1:
                            f1 = d1.get("flightNumber") or d1.get("dutyCode")
                            f2 = d2.get("flightNumber") or d2.get("dutyCode")
                            overlaps.append(f"Overlap: {f1} and {f2} conflict.")
            return "Conflicts list:\n- " + ("\n- ".join(overlaps) if overlaps else "No scheduling conflicts detected.")
        except Exception as e:
            return f"Error: {e}"

    @tool
    def detect_short_rest_periods() -> str:
        """Scan roster and list rest gaps that are less than 10 hours."""
        context = roster_context_var.get()
        try:
            from duty_assistant import _detect_short_rest_periods
            parsed = json.loads(context)
            duties = parsed.get("duties", [])
            violations = _detect_short_rest_periods(duties)
            return "Rest period warnings:\n- " + ("\n- ".join(violations) if violations else "All rest gaps are compliant (>=10 hrs).")
        except Exception as e:
            return f"Error: {e}"

    tools = [
        get_next_duty,
        get_week_schedule,
        get_month_schedule,
        calculate_flight_hours,
        calculate_statistics,
        get_registry,
        find_day_off,
        find_aircraft_usage,
        navigate_page,
        highlight_duty,
        create_duty,
        update_duty,
        delete_duty,
        assign_pilot,
        unassign_pilot,
        detect_conflicts,
        detect_short_rest_periods
    ]
else:
    tools = []


# --- DTO SCHEMAS ---

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    context: Optional[str] = Field(default=None, max_length=16000)


class AiAction(BaseModel):
    type: str
    id: Optional[int] = None
    payload: Optional[dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    actions: list[AiAction] = Field(default_factory=list)


class ChatState(TypedDict):
    prompt: str
    context: Optional[str]
    response: str
    actions: list[dict[str, Any]]


# Globally cached model instances
_cached_openai_model = None
_cached_ollama_model = None

def get_model():
    global _cached_openai_model, _cached_ollama_model
    
    use_ollama = os.getenv("USE_OLLAMA", "false").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")
    
    if use_ollama or not api_key:
        if ChatOllama is not None:
            if _cached_ollama_model is None:
                ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")
                ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
                print(f"Initializing ChatOllama with model {ollama_model} at {ollama_base_url}...")
                _cached_ollama_model = ChatOllama(model=ollama_model, base_url=ollama_base_url, temperature=0.2)
            return _cached_ollama_model
        elif api_key and ChatOpenAI is not None:
            if _cached_openai_model is None:
                print("USE_OLLAMA is true or api_key missing, but ChatOllama is not available. Falling back to ChatOpenAI.")
                _cached_openai_model = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
            return _cached_openai_model
    elif api_key and ChatOpenAI is not None:
        if _cached_openai_model is None:
            print("Initializing ChatOpenAI with gpt-4o-mini...")
            _cached_openai_model = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
        return _cached_openai_model
        
    return None


def build_graph():
    async def generate_response(state: ChatState) -> ChatState:
        prompt = state["prompt"]
        context = state.get("context")

        roster_context_var.set(context or "")
        actions_var.set([])

        # First run rule-based local assistant
        local_result = process_prompt(prompt, context)
        if not local_result.get("response", "").startswith("I can help"):
            state["response"] = local_result.get("response")
            state["actions"] = local_result.get("actions", [])
            return state

        # Get model from cache
        model = get_model()

        if model is not None:
            try:
                role, duties, pilot_id = parse_context(context)
                
                # Fetch/init session context memory
                session_key = pilot_id if pilot_id is not None else 0
                mem = SESSION_MEMORY.setdefault(session_key, {
                    "lastHighlightedDutyId": None,
                    "lastViewedPage": "dashboard",
                    "lastAircraft": None
                })

                model_with_tools = model.bind_tools(tools)

                system_message = (
                    "You are an Aviation Operations Copilot for a pilot crew duty console.\n"
                    "Use the provided roster context and registry logs to answer questions or execute screen actions.\n"
                    "Be clear, precise, and operational.\n"
                    f"Roster context JSON: {context or 'N/A'}\n"
                    f"Session Memory:\n"
                    f"- Last Highlighted Duty ID: {mem.get('lastHighlightedDutyId')}\n"
                    f"- Last Viewed Page: {mem.get('lastViewedPage')}\n"
                    f"- Last Aircraft: {mem.get('lastAircraft')}\n\n"
                    "If the user asks to modify or view 'it' or 'that flight', use the Last Highlighted Duty ID as target.\n"
                    "If you determine that an action must occur (like highlighting a card or switching views), invoke the corresponding tool!"
                )

                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ]

                # Run first generation (async)
                ai_msg = await model_with_tools.ainvoke(messages)

                # Tool-execution loop
                if ai_msg.tool_calls:
                    tool_map = {t.name: t for t in tools}
                    messages.append(ai_msg)
                    for tool_call in ai_msg.tool_calls:
                        tool_name = tool_call["name"]
                        tool_args = tool_call["args"]
                        if tool_name in tool_map:
                            t = tool_map[tool_name]
                            tool_result = t.invoke(tool_args)
                            messages.append({
                                "role": "tool",
                                "content": str(tool_result),
                                "tool_call_id": tool_call["id"]
                            })
                    # Re-run generation with tool outputs to get final verbal response (async)
                    final_msg = await model_with_tools.ainvoke(messages)
                    content = final_msg.content
                else:
                    content = ai_msg.content

                state["response"] = content if isinstance(content, str) else str(content)
                state["actions"] = actions_var.get()

                # Update session memory
                for action in state["actions"]:
                    if action["type"] == "highlight_duty" and action.get("id"):
                        mem["lastHighlightedDutyId"] = action["id"]
                    elif action["type"].startswith("navigate_"):
                        mem["lastViewedPage"] = action["type"].replace("navigate_", "")

                return state
            except Exception as e:
                print(f"LLM agent workflow failed: {e}. Falling back to local helper.")
                state["response"] = local_result.get("response")
                state["actions"] = local_result.get("actions", [])
                return state

        # If no LLM model initialized, fallback to local rule helper
        state["response"] = local_result.get("response")
        state["actions"] = local_result.get("actions", [])
        return state

    graph = StateGraph(ChatState)
    graph.add_node("generate_response", generate_response)
    graph.set_entry_point("generate_response")
    graph.add_edge("generate_response", END)
    return graph.compile()


app = FastAPI(title="Pilot Crew LangGraph Service", version="2.0.0")
workflow = build_graph()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = await workflow.ainvoke(
            {"prompt": request.prompt, "context": request.context, "response": "", "actions": []}
        )
        actions = [AiAction(**item) for item in result.get("actions", [])]
        return ChatResponse(response=result.get("response", "No response generated."), actions=actions)
    except Exception as ex:  # pragma: no cover
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(ex))
