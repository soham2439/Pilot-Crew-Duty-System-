"""Natural-language duty assistant — parses prompts and returns responses + CRUD actions."""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from typing import Any, Optional

try:
    import nltk
    # Define tokenization with lowercase normalization
    _nltk_tokenize = nltk.tokenize.word_tokenize
    def word_tokenize(text: str) -> list[str]:
        return [w.lower() for w in _nltk_tokenize(text)]
except Exception:
    def word_tokenize(text: str) -> list[str]:
        return [w.strip(".,?!;:-_\"'") for w in text.lower().split() if w.strip(".,?!;:-_\"'")]


CITY_TO_IATA: dict[str, str] = {
    "dubai": "DXB",
    "doha": "DOH",
    "chennai": "MAA",
    "mumbai": "BOM",
    "delhi": "DEL",
    "london": "LHR",
    "singapore": "SIN",
    "abu dhabi": "AUH",
    "riyadh": "RUH",
    "jeddah": "JED",
    "cairo": "CAI",
    "istanbul": "IST",
}

MONTHS: dict[str, int] = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}

DUTY_CODES = {"FDUT", "DOFF", "VAC", "SICK", "AVBL"}

WEATHER_DB = {
    "DXB": {"condition": "Sunny", "temp": 39, "wind": "11kt N", "visibility": "10km+", "metar": "OMDB 180800Z 35011KT 9999 FEW030 39/22 Q1008 NOSIG"},
    "DOH": {"condition": "Clear", "temp": 37, "wind": "9kt NE", "visibility": "10km+", "metar": "OTBD 180800Z 04009KT 9999 SKC 37/24 Q1007 NOSIG"},
    "MAA": {"condition": "Scattered Clouds", "temp": 31, "wind": "14kt SW", "visibility": "8km", "metar": "VOMM 180800Z 22014KT 8000 FEW025 SCT100 31/26 Q1005 NOSIG"},
    "BOM": {"condition": "Monsoon Rain", "temp": 28, "wind": "18kt W", "visibility": "4km", "metar": "VABB 180800Z 26018KT 4000 RA SCT015 BKN080 28/25 Q1004 TEMPO 3000"},
    "DEL": {"condition": "Haze", "temp": 42, "wind": "5kt NW", "visibility": "3km", "metar": "VIDP 180800Z 31005KT 3000 HZ NSC 42/20 Q1006 NOSIG"},
    "LHR": {"condition": "Showers", "temp": 17, "wind": "12kt WSW", "visibility": "10km", "metar": "EGLL 180800Z 24012KT 9999 -SHRA BKN020 17/11 Q1013 NOSIG"},
    "SIN": {"condition": "Thunderstorms", "temp": 30, "wind": "8kt S", "visibility": "6km", "metar": "WSSS 180800Z 18008KT 6000 TSRA FEW018CB BKN080 30/25 Q1009 TEMPO 3000"},
    "AUH": {"condition": "Sunny", "temp": 38, "wind": "10kt N", "visibility": "10km+", "metar": "OMAA 180800Z 36010KT 9999 SKC 38/21 Q1008 NOSIG"},
    "RUH": {"condition": "Clear", "temp": 41, "wind": "15kt NE", "visibility": "10km+", "metar": "OERK 180800Z 05015KT 9999 SKC 41/12 Q1006 NOSIG"},
    "JED": {"condition": "Clear", "temp": 36, "wind": "12kt NW", "visibility": "10km+", "metar": "OEJN 180800Z 31012KT 9999 SKC 36/23 Q1007 NOSIG"},
    "CAI": {"condition": "Sunny", "temp": 34, "wind": "7kt N", "visibility": "10km+", "metar": "HECA 180800Z 36007KT 9999 SKC 34/18 Q1012 NOSIG"},
    "IST": {"condition": "Clear", "temp": 26, "wind": "14kt NE", "visibility": "10km+", "metar": "LTFM 180800Z 04014KT 9999 SKC 26/15 Q1015 NOSIG"},
}



def parse_context(context: Optional[str]) -> tuple[str, list[dict[str, Any]], Optional[int], str]:
    role = "Pilot"
    duties: list[dict[str, Any]] = []
    pilot_id: Optional[int] = None
    user_name = "Captain"

    if not context:
        return role, duties, pilot_id, user_name

    try:
        parsed = json.loads(context)
        role = parsed.get("role", role)
        duties = parsed.get("duties", [])
        pilot_id = parsed.get("pilotId")
        user_name = parsed.get("userName", user_name)
    except json.JSONDecodeError:
        pass

    return role, duties, pilot_id, user_name


def parse_registry(context: Optional[str]) -> list[dict[str, Any]]:
    if not context:
        return []
    try:
        parsed = json.loads(context)
        return parsed.get("registry", [])
    except Exception:
        return []


def _calculate_flight_hours(duties: list[dict[str, Any]], target_month: Optional[int] = None) -> float:
    total_hours = 0.0
    for item in duties:
        if str(item.get("dutyCode", "")).upper() == "FDUT":
            dep = _duty_dt(item)
            arr = _parse_duty_time(item.get("arrivalTime"))
            if dep and arr:
                if target_month is None or dep.month == target_month:
                    total_hours += (arr - dep).total_seconds() / 3600.0
    return total_hours


def _calculate_aircraft_usage(duties: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    usage = {}
    for item in duties:
        if str(item.get("dutyCode", "")).upper() == "FDUT":
            ac = str(item.get("aircraftType", "")).strip().upper()
            if not ac or ac == "-":
                continue
            dep = _duty_dt(item)
            arr = _parse_duty_time(item.get("arrivalTime"))
            hours = 0.0
            if dep and arr:
                hours = (arr - dep).total_seconds() / 3600.0
            stats = usage.setdefault(ac, {"count": 0, "hours": 0.0})
            stats["count"] += 1
            stats["hours"] += hours
    return usage


def _calculate_statistics(duties: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {"FDUT": 0, "DOFF": 0, "VAC": 0, "SICK": 0, "AVBL": 0}
    completed_count = 0
    now = datetime.now()
    for item in duties:
        code = str(item.get("dutyCode", "")).upper()
        if code in counts:
            counts[code] += 1
        arr = _parse_duty_time(item.get("arrivalTime"))
        if arr and arr < now:
            completed_count += 1
    total = len(duties)
    completion_rate = (completed_count / total * 100.0) if total > 0 else 0.0
    return {
        "counts": counts,
        "total": total,
        "completed": completed_count,
        "completionRate": completion_rate
    }


def _detect_short_rest_periods(duties: list[dict[str, Any]]) -> list[str]:
    violations = []
    sorted_duties = sorted(
        [d for d in duties if _duty_dt(d) is not None],
        key=lambda x: _duty_dt(x)
    )
    for i in range(len(sorted_duties) - 1):
        d1 = sorted_duties[i]
        d2 = sorted_duties[i+1]
        
        if str(d1.get("dutyCode")).upper() in {"SICK", "VAC"} or str(d2.get("dutyCode")).upper() in {"SICK", "VAC"}:
            continue
            
        arr1 = _parse_duty_time(d1.get("arrivalTime"))
        dep2 = _duty_dt(d2)
        if arr1 and dep2:
            rest_hours = (dep2 - arr1).total_seconds() / 3600.0
            if rest_hours < 10.0:
                f1 = d1.get("flightNumber") or d1.get("dutyCode")
                f2 = d2.get("flightNumber") or d2.get("dutyCode")
                violations.append(
                    f"Rest period gap between {f1} (arr: {arr1.strftime('%d %b %H:%M')}) "
                    f"and {f2} (dep: {dep2.strftime('%d %b %H:%M')}) is only {rest_hours:.1f} hours (minimum required: 10 hrs)."
                )
    return violations


def _calculate_weekly_worked_hours(duties: list[dict[str, Any]], now: datetime) -> float:
    start_of_week = now - timedelta(days=now.weekday())
    end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59)
    total_hours = 0.0
    for item in duties:
        code = str(item.get("dutyCode", "")).upper()
        if code in {"DOFF", "VAC", "SICK"}:
            continue
        dep = _duty_dt(item)
        arr = _parse_duty_time(item.get("arrivalTime"))
        if dep and arr and start_of_week <= dep <= end_of_week:
            total_hours += (arr - dep).total_seconds() / 3600.0
    return total_hours


def _parse_duty_time(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).replace("Z", "").replace("T", " ").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _duty_dt(item: dict[str, Any]) -> Optional[datetime]:
    return _parse_duty_time(item.get("departureTime"))


def _resolve_location(text: str) -> str:
    cleaned = text.strip().upper()
    if len(cleaned) == 3 and cleaned.isalpha():
        return cleaned
    key = text.strip().lower()
    return CITY_TO_IATA.get(key, cleaned[:3] if cleaned else "TBD")


def _extract_date(prompt: str, reference: datetime) -> Optional[datetime]:
    prompt_lower = prompt.lower()

    if "yesterday" in prompt_lower:
        return (reference - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    if "today" in prompt_lower:
        return reference.replace(hour=0, minute=0, second=0, microsecond=0)

    if "tomorrow" in prompt_lower:
        return (reference + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    # Weekdays parsing (on Monday, next Friday, last Tuesday, etc.)
    weekdays = {
        "monday": 0, "mon": 0,
        "tuesday": 1, "tue": 1, "tues": 1,
        "wednesday": 2, "wed": 2,
        "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
        "friday": 4, "fri": 4,
        "saturday": 5, "sat": 5,
        "sunday": 6, "sun": 6
    }
    for w_name, w_idx in weekdays.items():
        if re.search(r"\b" + w_name + r"\b", prompt_lower):
            is_next = re.search(r"\bnext\s+" + w_name + r"\b", prompt_lower) is not None
            is_last = re.search(r"\blast\s+" + w_name + r"\b", prompt_lower) is not None
            ref_w_idx = reference.weekday()
            
            if is_next:
                days_ahead = w_idx - ref_w_idx + 7
            elif is_last:
                days_ahead = w_idx - ref_w_idx - 7
            else:
                days_ahead = w_idx - ref_w_idx
                if days_ahead < 0:
                    days_ahead += 7
            target_date = reference + timedelta(days=days_ahead)
            return target_date.replace(hour=0, minute=0, second=0, microsecond=0)

    month_day = re.search(
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december|"
        r"jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b",
        prompt_lower,
    )
    if month_day:
        month = MONTHS[month_day.group(1)]
        day = int(month_day.group(2))
        year = reference.year
        if month < reference.month - 6:
            year += 1
        return datetime(year, month, day)

    day_month = re.search(
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|"
        r"jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b",
        prompt_lower,
    )
    if day_month:
        day = int(day_month.group(1))
        month = MONTHS[day_month.group(2)]
        year = reference.year
        if month < reference.month - 6:
            year += 1
        return datetime(year, month, day)

    iso = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", prompt)
    if iso:
        return datetime(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))

    return None


def _extract_times(prompt: str, base_date: datetime) -> tuple[Optional[datetime], Optional[datetime]]:
    times = re.findall(r"\b(\d{1,2}):(\d{2})\b", prompt)
    if len(times) >= 2:
        dep_h, dep_m = int(times[0][0]), int(times[0][1])
        arr_h, arr_m = int(times[1][0]), int(times[1][1])
        departure = base_date.replace(hour=dep_h, minute=dep_m)
        arrival = base_date.replace(hour=arr_h, minute=arr_m)
        if arrival <= departure:
            arrival += timedelta(days=1)
        return departure, arrival
    if len(times) == 1:
        dep_h, dep_m = int(times[0][0]), int(times[0][1])
        departure = base_date.replace(hour=dep_h, minute=dep_m)
        return departure, None
    return None, None


def _format_duty(item: dict[str, Any]) -> str:
    dep = item.get("departureTime", "")
    arr = item.get("arrivalTime", "")
    return (
        f"[#{item.get('id', '?')}] {item.get('dutyCode', '???')} "
        f"{item.get('flightNumber', '')} {item.get('origin', '')}->{item.get('destination', '')} "
        f"{dep} - {arr}"
        + (f" ({item.get('aircraftType')})" if item.get("aircraftType") else "")
        + (f" — {item.get('remarks')}" if item.get("remarks") else "")
    )


def _duties_on_date(duties: list[dict[str, Any]], target: datetime) -> list[dict[str, Any]]:
    matched = []
    for item in duties:
        dt = _duty_dt(item)
        if dt and dt.date() == target.date():
            matched.append(item)
    return matched


def _find_by_code_and_date(
    duties: list[dict[str, Any]], duty_code: str, target: datetime
) -> list[dict[str, Any]]:
    return [
        item
        for item in _duties_on_date(duties, target)
        if str(item.get("dutyCode", "")).upper() == duty_code.upper()
    ]


def _find_by_location(duties: list[dict[str, Any]], location_text: str) -> list[dict[str, Any]]:
    code = _resolve_location(location_text)
    location_lower = location_text.lower()
    matched = []
    for item in duties:
        origin = str(item.get("origin", "")).upper()
        destination = str(item.get("destination", "")).upper()
        remarks = str(item.get("remarks", "")).lower()
        if (
            origin == code
            or destination == code
            or location_lower in remarks
            or location_lower in origin.lower()
            or location_lower in destination.lower()
        ):
            matched.append(item)
    if "turnaround" in location_lower:
        matched = [item for item in matched if item.get("origin") == item.get("destination")]
    return matched


def _extract_duty_code(prompt: str) -> Optional[str]:
    upper = prompt.upper()
    for code in DUTY_CODES:
        if re.search(rf"\b{code}\b", upper):
            return code
    return None


def _extract_flight_number(prompt: str) -> Optional[str]:
    match = re.search(r"\b([A-Z]{2}\d{2,4})\b", prompt.upper())
    return match.group(1) if match else None


def _extract_aircraft(prompt: str) -> Optional[str]:
    match = re.search(r"\b(A\d{3}|B\d{3}|E\d{3}|787|777|320|737)\b", prompt.upper())
    if not match:
        return None
    value = match.group(1)
    if value.isdigit() or len(value) == 3 and value[0].isalpha() and value[1:].isdigit():
        if not value.startswith(("A", "B", "E")):
            return f"A{value}" if value == "320" else value
    return value


def _date_range_last_week(reference: datetime) -> tuple[datetime, datetime]:
    end = reference.replace(hour=23, minute=59, second=59, microsecond=0)
    start = (reference - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
    return start, end


def _date_range_this_month(reference: datetime) -> tuple[datetime, datetime]:
    start = reference.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if reference.month == 12:
        end = reference.replace(year=reference.year + 1, month=1, day=1) - timedelta(seconds=1)
    else:
        end = reference.replace(month=reference.month + 1, day=1) - timedelta(seconds=1)
    return start, end


def _filter_by_range(duties: list[dict[str, Any]], start: datetime, end: datetime) -> list[dict[str, Any]]:
    matched = []
    for item in duties:
        dt = _duty_dt(item)
        if dt and start <= dt <= end:
            matched.append(item)
    return sorted(matched, key=lambda x: _duty_dt(x) or datetime.min)


def _default_create_payload(
    origin: str,
    destination: str,
    departure: datetime,
    arrival: datetime,
    duty_code: str = "FDUT",
    flight_number: str = "TBD",
    aircraft_type: str = "A320",
    remarks: str = "",
) -> dict[str, Any]:
    return {
        "dutyCode": duty_code,
        "flightNumber": flight_number,
        "origin": origin,
        "destination": destination,
        "departureTime": departure.strftime("%Y-%m-%d %H:%M:%S"),
        "arrivalTime": arrival.strftime("%Y-%m-%d %H:%M:%S"),
        "aircraftType": aircraft_type,
        "remarks": remarks,
    }


def _filter_duties_by_relative_range(tokens: list[str], duties: list[dict[str, Any]], now: datetime) -> Optional[tuple[str, list[dict[str, Any]], datetime, datetime]]:
    tokens_set = set(tokens)
    start, end = None, None
    range_name = ""
    
    if "today" in tokens_set:
        range_name = "today"
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    elif "tomorrow" in tokens_set:
        range_name = "tomorrow"
        start = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=0)
    elif "yesterday" in tokens_set:
        range_name = "yesterday"
        start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = (now - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=0)
    elif "next" in tokens_set and ("week" in tokens_set or "wk" in tokens_set):
        range_name = "next week"
        start = (now - timedelta(days=now.weekday()) + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    elif ("last" in tokens_set or "past" in tokens_set or "previous" in tokens_set) and ("week" in tokens_set or "wk" in tokens_set):
        range_name = "last week"
        start = (now - timedelta(days=now.weekday()) - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    elif "this" in tokens_set and ("week" in tokens_set or "wk" in tokens_set):
        range_name = "this week"
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    elif "next" in tokens_set and "month" in tokens_set:
        range_name = "next month"
        if now.month == 12:
            start = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1, day=1) - timedelta(seconds=1)
        else:
            end = start.replace(month=start.month + 1, day=1) - timedelta(seconds=1)
    elif ("last" in tokens_set or "past" in tokens_set or "previous" in tokens_set) and "month" in tokens_set:
        range_name = "last month"
        if now.month == 1:
            start = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1, day=1) - timedelta(seconds=1)
        else:
            end = start.replace(month=start.month + 1, day=1) - timedelta(seconds=1)
    elif "this" in tokens_set and "month" in tokens_set:
        range_name = "this month"
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end = now.replace(year=now.year + 1, month=1, day=1) - timedelta(seconds=1)
        else:
            end = now.replace(month=now.month + 1, day=1) - timedelta(seconds=1)
            
    if start and end:
        matched = _filter_by_range(duties, start, end)
        return range_name, matched, start, end
    return None


def process_prompt(prompt: str, context: Optional[str], reference: Optional[datetime] = None) -> dict[str, Any]:
    """Return { response: str, actions: list[dict] }."""
    now = reference or datetime.now()
    role, duties, _pilot_id, user_name = parse_context(context)
    registry = parse_registry(context)
    prompt_lower = prompt.lower()
    actions: list[dict[str, Any]] = []

    # Use NLTK word_tokenize for robust token parsing
    tokens = word_tokenize(prompt)
    tokens_set = set(tokens)

    # Pre-calculate greeting based on time of day
    greeting = "Good morning"
    if 12 <= now.hour < 17:
        greeting = "Good afternoon"
    elif 17 <= now.hour < 22:
        greeting = "Good evening"
    elif now.hour >= 22 or now.hour < 5:
        greeting = "Good night"

    # --- 1.2 Query: Weather Briefing ---
    if "weather" in prompt_lower or "metar" in prompt_lower or "conditions" in prompt_lower:
        airport_code = None
        # Try to find 3-letter IATA code directly
        iata_match = re.search(r"\b([A-Za-z]{3})\b", prompt)
        if iata_match and iata_match.group(1).upper() in WEATHER_DB:
            airport_code = iata_match.group(1).upper()
        else:
            # Check for city name mapping
            for city, code in CITY_TO_IATA.items():
                if city in prompt_lower:
                    airport_code = code
                    break
        
        # Fallback to destination of the next flight in duties
        if not airport_code:
            future_duties = [
                item for item in duties
                if (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            ]
            future_duties.sort(key=lambda x: _duty_dt(x) or datetime.max)
            next_flight = next((d for d in future_duties if str(d.get("dutyCode", "")).upper() == "FDUT"), None)
            if next_flight:
                airport_code = next_flight.get("destination")
        
        if airport_code and airport_code in WEATHER_DB:
            w = WEATHER_DB[airport_code]
            response_text = (
                f"🌦️ **Airport Weather Briefing for {airport_code}**:\n\n"
                f"* **Condition**: {w['condition']}\n"
                f"* **Temperature**: {w['temp']}°C\n"
                f"* **Winds**: {w['wind']}\n"
                f"* **Visibility**: {w['visibility']}\n\n"
                f"**Raw METAR**:\n`{w['metar']}`"
            )
            return {
                "response": response_text,
                "actions": [{"type": "navigate_weather", "payload": {"airport": airport_code}}]
            }
        elif airport_code:
            return {
                "response": f"Sorry, I don't have weather reports for airport {airport_code}. Currently I support weather briefings for: {', '.join(WEATHER_DB.keys())}.",
                "actions": []
            }
        else:
            return {
                "response": "Please specify an airport code (e.g. DXB, LHR) or ask 'weather for my next flight'. Supported airports: " + ", ".join(WEATHER_DB.keys()),
                "actions": []
            }

    # --- 1. Query: briefing / daily briefing ---
    if any(k in prompt_lower for k in ["briefing", "daily briefing", "contextual briefing"]) or tokens_set.intersection({"hi", "hello", "hey", "greetings", "greet"}):
        if str(role).lower() == "admin":
            unassigned_count = len([d for d in duties if not d.get("pilotId")])
            total_count = len(duties)
            active_pilots = len(set(d.get("pilotName") for d in duties if d.get("pilotName")))
            
            response_text = (
                f"💼 **{greeting}, Controller {user_name}.**\n\n"
                f"Welcome to the Operations Controller Assistant dashboard. Here is your operational status brief:\n\n"
                f"* **Total Duties**: {total_count} flight & standby tasks\n"
                f"* **Needs Assignment**: **{unassigned_count}** unassigned duties remaining\n"
                f"* **Active Pilots**: {active_pilots} crew members assigned\n"
                f"* **Audit Timeline**: {len(registry)} historical changes logged\n\n"
                f"You can ask me to assign a pilot, create a flight, check roster overlaps, or inspect logs."
            )
            return {
                "response": response_text,
                "actions": []
            }
        else:
            future_duties = [
                item for item in duties
                if (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            ]
            future_duties.sort(key=lambda x: _duty_dt(x) or datetime.max)
            
            next_duty_str = "None"
            next_duty_id = None
            countdown_str = ""
            aircraft_str = ""
            if future_duties:
                item = future_duties[0]
                next_duty_id = item.get("id")
                next_duty_str = f"{item.get('dutyCode')} {item.get('flightNumber')} from {item.get('origin')} to {item.get('destination')}"
                dep_time = _duty_dt(item)
                if dep_time:
                    hours_diff = (dep_time - now).total_seconds() / 3600
                    if hours_diff > 0:
                        countdown_str = f" (starts in {round(hours_diff)}h)"
                aircraft_str = item.get("aircraftType", "")

            start_of_week = now - timedelta(days=now.weekday())
            end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59)
            week_duties = _filter_by_range(duties, start_of_week, end_of_week)
            week_count = len(week_duties)
            
            doffs = [
                item for item in duties
                if str(item.get("dutyCode", "")).upper() == "DOFF"
                and (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            ]
            doffs.sort(key=lambda x: _duty_dt(x) or datetime.max)
            next_doff_str = f"{_duty_dt(doffs[0]).date()}" if doffs else "None scheduled"

            warnings = []
            rest_violations = _detect_short_rest_periods(duties)
            warnings.extend(rest_violations)
            
            weekly_hours = _calculate_weekly_worked_hours(duties, now)
            if weekly_hours > 40.0:
                warnings.append(f"High Workload: You have worked/scheduled {weekly_hours:.1f} hours this week (exceeding standard 40 hrs limit).")
            else:
                warnings.append(f"Workload Status: You have {weekly_hours:.1f} active hours scheduled this week.")
                
            delays_count = len([item for item in duties if "delay" in str(item.get("remarks", "")).lower()])
            if delays_count > 0:
                warnings.append(f"Alert: {delays_count} flights in your roster are marked as delayed.")

            warnings_formatted = ""
            if warnings:
                warnings_formatted = "\n\n⚠️ **Operational Alerts & Workload Warning:**\n- " + "\n- ".join(warnings)

            response_text = (
                f"🤖 **{greeting}, Captain {user_name}.**\n\n"
                f"Here is your daily AI Briefing:\n\n"
                f"* **Next Duty**: {next_duty_str}{countdown_str}\n"
                f"* **Aircraft**: {aircraft_str if aircraft_str else 'N/A'}\n"
                f"* **Weekly Schedule**: {week_count} duty/duties scheduled this week\n"
                f"* **Upcoming Day Off**: {next_doff_str}"
                f"{warnings_formatted}\n\n"
                f"How may I assist you today?"
            )
            return {
                "response": response_text,
                "actions": [{"type": "highlight_duty", "id": next_duty_id}] if next_duty_id else []
            }

    # --- 1.5 Mutation: assign or unassign pilot ---
    if "assign" in prompt_lower or "unassign" in prompt_lower:
        assign_match = re.search(r"\bassign\s+(?:pilot\s+)?(\d+)\s+to\s+(?:flight|duty|#)?\s*([a-zA-Z0-9#]+)\b", prompt_lower)
        if assign_match:
            pilot_id = int(assign_match.group(1))
            target_raw = assign_match.group(2).replace("#", "").upper()
            duty_id = None
            if target_raw.isdigit():
                duty_id = int(target_raw)
            else:
                matching_duties = [d for d in duties if str(d.get("flightNumber", "")).upper() == target_raw]
                if len(matching_duties) == 1:
                    duty_id = matching_duties[0].get("id")
                elif len(matching_duties) > 1:
                    lines = [_format_duty(item) for item in matching_duties[:5]]
                    return {
                        "response": f"Multiple duties found for flight {target_raw}. Please specify by ID:\n- " + "\n- ".join(lines),
                        "actions": [],
                    }
            
            if duty_id is not None:
                duty = next((d for d in duties if d.get("id") == duty_id), None)
                if duty:
                    actions.append({"type": "update", "id": duty_id, "payload": {"pilotId": pilot_id}})
                    return {
                        "response": f"Assigned pilot #{pilot_id} to duty: {_format_duty(duty)}",
                        "actions": actions,
                    }
                else:
                    return {"response": f"Duty #{duty_id} not found.", "actions": []}
            return {"response": f"Could not identify the duty or flight '{target_raw}' to assign the pilot to.", "actions": []}

        unassign_match = re.search(r"\bunassign\s+(?:pilot\s+)?(?:from\s+)?(?:flight|duty|#)?\s*([a-zA-Z0-9#]+)\b", prompt_lower)
        if unassign_match:
            target_raw = unassign_match.group(1).replace("#", "").upper()
            duty_id = None
            if target_raw.isdigit():
                duty_id = int(target_raw)
            else:
                matching_duties = [d for d in duties if str(d.get("flightNumber", "")).upper() == target_raw]
                if len(matching_duties) == 1:
                    duty_id = matching_duties[0].get("id")
                elif len(matching_duties) > 1:
                    lines = [_format_duty(item) for item in matching_duties[:5]]
                    return {
                        "response": f"Multiple duties found for flight {target_raw}. Please specify by ID:\n- " + "\n- ".join(lines),
                        "actions": [],
                    }
            
            if duty_id is not None:
                duty = next((d for d in duties if d.get("id") == duty_id), None)
                if duty:
                    actions.append({"type": "update", "id": duty_id, "payload": {"pilotId": None}})
                    return {
                        "response": f"Unassigned pilot from duty: {_format_duty(duty)}",
                        "actions": actions,
                    }
                else:
                    return {"response": f"Duty #{duty_id} not found.", "actions": []}
            return {"response": f"Could not identify the duty or flight '{target_raw}' to unassign the pilot.", "actions": []}

    # --- 2. Mutation: delete ---
    if tokens_set.intersection({"delete", "remove"}):
        id_match = re.search(r"\b(?:delete|remove)\s+(?:duty|flight|#)?\s*(\d+)\b", prompt_lower)
        if id_match:
            duty_id = int(id_match.group(1))
            matching_duty = next((d for d in duties if d.get("id") == duty_id), None)
            if matching_duty:
                actions.append({"type": "delete", "id": duty_id})
                return {
                    "response": f"Deleted duty: {_format_duty(matching_duty)}",
                    "actions": actions,
                }

        flight_num = _extract_flight_number(prompt)
        if flight_num:
            matching_duties = [d for d in duties if str(d.get("flightNumber", "")).upper() == flight_num.upper()]
            if len(matching_duties) == 1:
                item = matching_duties[0]
                actions.append({"type": "delete", "id": item.get("id")})
                return {
                    "response": f"Deleted duty: {_format_duty(item)}",
                    "actions": actions,
                }
            elif len(matching_duties) > 1:
                lines = [_format_duty(item) for item in matching_duties[:5]]
                return {
                    "response": f"Multiple duties found for flight {flight_num}. Please specify the date or ID:\n- " + "\n- ".join(lines),
                    "actions": [],
                }

        location_match = re.search(
            r"\b(?:my\s+)?([a-zA-Z ]+?)\s+(?:turnaround\s+)?duty\b", prompt_lower
        )
        candidates = duties
        if location_match:
            loc = location_match.group(1).strip()
            if loc not in {"a", "the", "my"}:
                candidates = _find_by_location(duties, loc)

        target_date = _extract_date(prompt, now)
        if target_date:
            candidates = _duties_on_date(candidates, target_date) or candidates

        code = _extract_duty_code(prompt)
        if code:
            candidates = [item for item in candidates if str(item.get("dutyCode", "")).upper() == code]

        if len(candidates) == 1:
            item = candidates[0]
            actions.append({"type": "delete", "id": item.get("id")})
            return {
                "response": f"Deleted duty: {_format_duty(item)}",
                "actions": actions,
            }
        if len(candidates) > 1:
            lines = [_format_duty(item) for item in candidates[:5]]
            return {
                "response": "Multiple duties match. Please be more specific:\n- " + "\n- ".join(lines),
                "actions": [],
            }
        return {"response": "Could not find a matching duty to delete.", "actions": []}

    # --- 3. Mutation: convert duty code ---
    if tokens_set.intersection({"convert", "change", "switch", "update"}) and tokens_set.intersection({"to"}):
        target_code = None
        convert_match = re.search(r"\bto\s+(fdut|doff|vac|sick|avbl)\b", prompt_lower)
        if convert_match:
            target_code = convert_match.group(1).upper()

        source_code = _extract_duty_code(prompt.replace(convert_match.group(0) if convert_match else "", ""))
        target_date = _extract_date(prompt, now)

        if target_code and target_date:
            pool = _find_by_code_and_date(duties, source_code, target_date) if source_code else _duties_on_date(duties, target_date)
            if len(pool) == 1:
                item = pool[0]
                payload = {
                    "dutyCode": target_code,
                    "flightNumber": item.get("flightNumber", "TBD"),
                    "origin": item.get("origin", ""),
                    "destination": item.get("destination", ""),
                    "departureTime": item.get("departureTime"),
                    "arrivalTime": item.get("arrivalTime"),
                    "aircraftType": item.get("aircraftType", "A320"),
                    "remarks": item.get("remarks", ""),
                }
                if target_code in {"SICK", "DOFF", "VAC", "AVBL"}:
                    payload["flightNumber"] = "-"
                    payload["origin"] = "-"
                    payload["destination"] = "-"
                    payload["aircraftType"] = "-"
                actions.append({"type": "update", "id": item.get("id"), "payload": payload})
                return {
                    "response": f"Converted duty on {target_date.date()} from {item.get('dutyCode')} to {target_code}.",
                    "actions": actions,
                }
            if len(pool) > 1:
                lines = [_format_duty(item) for item in pool[:5]]
                return {
                    "response": "Multiple duties match that date. Specify the duty code:\n- " + "\n- ".join(lines),
                    "actions": [],
                }

    # --- 4. Mutation: replace DOFF with FDUT ---
    if tokens_set.intersection({"replace"}):
        target_date = _extract_date(prompt, now)
        old_code = "DOFF" if "doff" in prompt_lower else (_extract_duty_code(prompt) or "DOFF")
        new_code = _extract_duty_code(re.sub(r"\breplace\b.*?\bwith\b", "with", prompt_lower, count=1)) or "FDUT"
        flight = _extract_flight_number(prompt) or "TBD"
        route = re.search(r"\bfrom\s+([a-zA-Z ]+?)\s+to\s+([a-zA-Z ]+?)(?:\s+on|\s+\d|\s*$)", prompt_lower)
        origin = _resolve_location(route.group(1)) if route else "DXB"
        destination = _resolve_location(route.group(2)) if route else "DOH"
        if not route:
            tokens_route = re.findall(r"\b([A-Z]{3})\b", prompt.upper())
            if len(tokens_route) >= 2:
                origin, destination = tokens_route[-2], tokens_route[-1]

        if target_date:
            pool = _find_by_code_and_date(duties, old_code, target_date)
            departure, arrival = _extract_times(prompt, target_date)
            if not departure:
                departure = target_date.replace(hour=8, minute=0)
            if not arrival:
                arrival = departure + timedelta(hours=2)

            if len(pool) == 1:
                item = pool[0]
                payload = _default_create_payload(
                    origin, destination, departure, arrival, new_code, flight, _extract_aircraft(prompt) or "A320"
                )
                actions.append({"type": "update", "id": item.get("id"), "payload": payload})
                return {
                    "response": (
                        f"Replaced {old_code} on {target_date.date()} with "
                        f"{new_code} {flight} {origin}->{destination}."
                    ),
                    "actions": actions,
                }

    # --- 5. Mutation: update duration ---
    if tokens_set.intersection({"update", "change", "set"}) and tokens_set.intersection({"duration", "hours", "hour"}):
        hours_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b", prompt_lower)
        if hours_match:
            hours = float(hours_match.group(1))
            target_date = _extract_date(prompt, now) or (now - timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            pool = _duties_on_date(duties, target_date)
            if len(pool) == 1:
                item = pool[0]
                dep = _duty_dt(item) or target_date.replace(hour=8, minute=0)
                arr = dep + timedelta(hours=hours)
                payload = {
                    "dutyCode": item.get("dutyCode", "FDUT"),
                    "flightNumber": item.get("flightNumber", "TBD"),
                    "origin": item.get("origin", ""),
                    "destination": item.get("destination", ""),
                    "departureTime": dep.strftime("%Y-%m-%d %H:%M:%S"),
                    "arrivalTime": arr.strftime("%Y-%m-%d %H:%M:%S"),
                    "aircraftType": item.get("aircraftType", "A320"),
                    "remarks": item.get("remarks", ""),
                }
                actions.append({"type": "update", "id": item.get("id"), "payload": payload})
                return {
                    "response": f"Updated duty on {target_date.date()} duration to {hours} hours (arrival {arr.strftime('%H:%M')}).",
                    "actions": actions,
                }

    # --- 6. Mutation: add duty ---
    if tokens_set.intersection({"add", "create", "insert", "schedule"}) and tokens_set.intersection({"duty", "flight", "flights", "fdut", "roster"}):
        route = re.search(
            r"\bfrom\s+([a-zA-Z ]+?)\s+to\s+([a-zA-Z ]+?)(?:\s+on|\s+\d|\s*$)", prompt_lower
        )
        origin = _resolve_location(route.group(1)) if route else "DXB"
        destination = _resolve_location(route.group(2)) if route else "DOH"
        if not route:
            tokens_route = re.findall(r"\b([A-Z]{3})\b", prompt.upper())
            if len(tokens_route) >= 2:
                origin, destination = tokens_route[0], tokens_route[1]

        target_date = _extract_date(prompt, now) or now.replace(hour=0, minute=0, second=0, microsecond=0)
        departure, arrival = _extract_times(prompt, target_date)
        if not departure:
            departure = target_date.replace(hour=8, minute=0)
        if not arrival:
            arrival = departure + timedelta(hours=2)

        payload = _default_create_payload(
            origin,
            destination,
            departure,
            arrival,
            _extract_duty_code(prompt) or "FDUT",
            _extract_flight_number(prompt) or "TBD",
            _extract_aircraft(prompt) or "A320",
        )
        actions.append({"type": "create", "payload": payload})
        return {
            "response": (
                f"Added {payload['dutyCode']} duty {payload['flightNumber']} "
                f"{origin}->{destination} on {departure.strftime('%Y-%m-%d %H:%M')} - {arrival.strftime('%H:%M')}."
            ),
            "actions": actions,
        }

    # --- 6.1. Query: Specific Flight queries (e.g. flight AA123, is AA123 delayed, etc.) ---
    flight_num = _extract_flight_number(prompt)
    if flight_num and not tokens_set.intersection({"delete", "remove", "update", "change", "add", "create", "insert", "replace", "assign", "unassign"}):
        matching = [d for d in duties if str(d.get("flightNumber", "")).upper() == flight_num.upper()]
        if matching:
            lines = []
            res_actions = [{"type": "navigate_roster"}]
            for item in matching:
                dep = item.get("departureTime", "")
                arr = item.get("arrivalTime", "")
                origin = item.get("origin", "")
                dest = item.get("destination", "")
                ac = item.get("aircraftType", "")
                remarks = item.get("remarks", "")
                code = item.get("dutyCode", "")
                
                status = "Scheduled"
                if "delay" in str(remarks).lower():
                    status = "Delayed ⚠️"
                elif _parse_duty_time(arr) and _parse_duty_time(arr) < now:
                    status = "Completed"
                    
                lines.append(
                    f"✈️ **Flight {flight_num.upper()}** ({code}):\n"
                    f"  * Route: {origin} -> {dest}\n"
                    f"  * Departure: {dep}\n"
                    f"  * Arrival: {arr}\n"
                    f"  * Aircraft: {ac}\n"
                    f"  * Status: {status}\n"
                    f"  * Remarks: {remarks or 'None'}"
                )
                if item.get("id") is not None:
                    res_actions.append({"type": "highlight_duty", "id": item.get("id")})
            return {
                "response": "\n\n".join(lines),
                "actions": res_actions
            }
        else:
            return {
                "response": f"I couldn't find flight {flight_num.upper()} in your roster context.",
                "actions": []
            }

    # --- 6.2. Query: Free/Available on a specific date (e.g. am I free on Monday?) ---
    target_date = _extract_date(prompt, now)
    if target_date and tokens_set.intersection({"free", "available", "off", "doff", "idle", "vacation", "vac"}):
        matched = _duties_on_date(duties, target_date)
        if not matched:
            return {
                "response": f"Yes, you have no duties scheduled on {target_date.date().strftime('%A, %d %B %Y')}. You are free!",
                "actions": []
            }
        
        doff_or_vac = [d for d in matched if str(d.get("dutyCode", "")).upper() in {"DOFF", "VAC"}]
        if len(doff_or_vac) == len(matched):
            codes = ", ".join(set(str(d.get("dutyCode")).upper() for d in doff_or_vac))
            return {
                "response": f"Yes, you have {codes} scheduled on {target_date.date().strftime('%A, %d %B %Y')}. You are off duty!",
                "actions": []
            }
        
        flights = [d for d in matched if str(d.get("dutyCode")).upper() == "FDUT"]
        lines = [_format_duty(item) for item in flights]
        return {
            "response": f"No, you are not free on {target_date.date().strftime('%A, %d %B %Y')}. You have the following flight duty/duties:\n- " + "\n- ".join(lines),
            "actions": [{"type": "navigate_roster"}]
        }

    # --- 6.3. Query: Specific date/day query (e.g. what is my duty on Monday / June 15) ---
    if target_date and not tokens_set.intersection({"add", "create", "insert", "delete", "remove", "convert", "change", "switch", "update", "replace", "duration"}):
        matched = _duties_on_date(duties, target_date)
        res_actions = [{"type": "navigate_roster"}]
        if not matched:
            return {
                "response": f"You have no duties scheduled on {target_date.date().strftime('%A, %d %B %Y')}.",
                "actions": res_actions
            }
        lines = [_format_duty(item) for item in matched]
        if len(matched) == 1 and matched[0].get("id") is not None:
            res_actions.append({"type": "highlight_duty", "id": matched[0].get("id")})
        return {
            "response": f"On {target_date.date().strftime('%A, %d %B %Y')}, you have {len(matched)} duties:\n- " + "\n- ".join(lines),
            "actions": res_actions
        }

    # --- 6.4. Query: General duties / schedule / roster / flights queries (when no specific relative range or date matched) ---
    is_general_query = tokens_set.intersection({"show", "list", "get", "view", "what", "tell", "describe", "any", "my", "me", "flying", "go"}) or "what is" in prompt_lower or "what are" in prompt_lower or "tell me" in prompt_lower
    is_general_target = tokens_set.intersection({"duty", "duties", "roster", "schedule", "flight", "flights", "work"})
    if is_general_query and is_general_target and not tokens_set.intersection({"add", "create", "insert", "delete", "remove", "convert", "change", "switch", "update", "replace", "next", "upcoming", "doff", "day-off"}):
        if not duties:
            return {
                "response": "You have no duties scheduled in your roster.",
                "actions": [{"type": "navigate_roster"}]
            }
        sorted_duties = sorted([d for d in duties if _duty_dt(d)], key=lambda x: _duty_dt(x))
        if not sorted_duties:
            sorted_duties = duties
        lines = [_format_duty(item) for item in sorted_duties]
        res_actions = [{"type": "navigate_roster"}]
        future_duties = [
            item for item in sorted_duties
            if (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
        ]
        if future_duties:
            res_actions.append({"type": "highlight_duty", "id": future_duties[0].get("id")})
        elif sorted_duties:
            res_actions.append({"type": "highlight_duty", "id": sorted_duties[0].get("id")})
        return {
            "response": f"Here is your roster schedule ({len(sorted_duties)} duties found):\n- " + "\n- ".join(lines),
            "actions": res_actions
        }

    # --- 7. Query: relative range (this week, next week, last week, this month, next month, last month) ---
    range_result = _filter_duties_by_relative_range(tokens, duties, now)
    if range_result and tokens_set.intersection({"show", "list", "get", "duties", "duty", "my", "schedule", "flight", "flights", "roster"}):
        range_name, matched, start, end = range_result
        actions = [{"type": "navigate_roster"}]
        if not matched:
            return {
                "response": f"No duties found for {range_name} (between {start.strftime('%Y-%m-%d')} and {end.strftime('%Y-%m-%d')}).",
                "actions": actions
            }
        lines = [_format_duty(item) for item in matched]
        if matched[0].get("id") is not None:
            actions.append({"type": "highlight_duty", "id": matched[0].get("id")})
        return {
            "response": f"Your duties for {range_name} ({len(matched)} entries between {start.strftime('%Y-%m-%d')} and {end.strftime('%Y-%m-%d')}):\n- " + "\n- ".join(lines),
            "actions": actions,
        }

    # --- 8. Query: next day-off ---
    if tokens_set.intersection({"doff", "day-off"}) or "day off" in prompt_lower or "days off" in prompt_lower:
        doffs = [
            item
            for item in duties
            if str(item.get("dutyCode", "")).upper() == "DOFF"
            and (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
        ]
        doffs.sort(key=lambda x: _duty_dt(x) or datetime.max)
        if not doffs:
            return {"response": "No upcoming day-off (DOFF) entries found in your roster.", "actions": []}
        next_doff = doffs[0]
        doff_id = next_doff.get("id")
        return {
            "response": f"Your next day-off is on {_duty_dt(next_doff).date() if _duty_dt(next_doff) else 'unknown date'}.",
            "actions": [{"type": "highlight_duty", "id": doff_id}] if doff_id is not None else [],
        }

    # --- 9. Query: what am I doing on [date] ---
    if tokens_set.intersection({"schedule", "doing", "plan", "duties", "duty", "flight", "flights"}) or "what am i" in prompt_lower or "what do i" in prompt_lower or "on" in tokens_set:
        target = _extract_date(prompt, now)
        if target:
            matched = _duties_on_date(duties, target)
            if not matched:
                return {"response": f"No duties scheduled on {target.date()}.", "actions": []}
            lines = [_format_duty(item) for item in matched]
            res_actions = []
            if len(matched) == 1 and matched[0].get("id") is not None:
                res_actions.append({"type": "highlight_duty", "id": matched[0].get("id")})
            return {
                "response": f"On {target.date()} you have:\n- " + "\n- ".join(lines),
                "actions": res_actions,
            }

    # --- 10. Query: Flight Hours Report ---
    if tokens_set.intersection({"hours", "hour", "duration"}) and tokens_set.intersection({"flight", "fly", "flown", "flying", "overall"}):
        this_month_hours = _calculate_flight_hours(duties, now.month)
        total_hours = _calculate_flight_hours(duties)
        res = (
            f"📊 **Flight Hours Report**:\n\n"
            f"* **This Month ({now.strftime('%B')})**: **{this_month_hours:.1f}** hours flown.\n"
            f"* **Total Flight Hours**: **{total_hours:.1f}** hours flown.\n\n"
            f"Your flight limit is 100 hours per calendar month."
        )
        return {
            "response": res,
            "actions": [{"type": "navigate_analytics"}]
        }

    # --- 11. Query: Aircraft Usage ---
    if tokens_set.intersection({"aircraft", "plane", "planes", "fleet", "usage", "breakdown"}) or any(ac in prompt_lower for ac in ["a320", "b737", "b787", "b777"]):
        usage = _calculate_aircraft_usage(duties)
        lines = []
        for ac, stats in usage.items():
            lines.append(f"* **{ac}**: {stats['count']} flight(s) ({stats['hours']:.1f} hours)")
        res_text = "✈️ **Aircraft Usage Breakdown**:\n\n" + ("\n".join(lines) if lines else "No flight duties recorded.")
        return {
            "response": res_text,
            "actions": [{"type": "navigate_analytics"}]
        }

    # --- 12. Query: Statistics / Completed percentage ---
    if tokens_set.intersection({"statistics", "stats", "completion", "completed", "percentage", "rate"}):
        stats = _calculate_statistics(duties)
        res = (
            f"📈 **Roster Statistics & Insights**:\n\n"
            f"* **Roster Completion Rate**: **{stats['completionRate']:.1f}%**\n"
            f"* **Completed Duties**: {stats['completed']} of {stats['total']}\n"
            f"* **Roster breakdown**:\n"
            f"  * Flight Duties (FDUT): {stats['counts']['FDUT']}\n"
            f"  * Days Off (DOFF): {stats['counts']['DOFF']}\n"
            f"  * Vacation Leave (VAC): {stats['counts']['VAC']}\n"
            f"  * Sick Leave (SICK): {stats['counts']['SICK']}\n"
            f"  * Available Standby (AVBL): {stats['counts']['AVBL']}"
        )
        return {
            "response": res,
            "actions": [{"type": "navigate_analytics"}]
        }

    # --- 13. Query: Delayed Summary ---
    if tokens_set.intersection({"delay", "delayed", "delays"}):
        delays = [item for item in duties if "delay" in str(item.get("remarks", "")).lower()]
        lines = [_format_duty(item) for item in delays]
        res = (
            f"⚠️ **Delayed Duties Summary**:\n\n"
            f"You have **{len(delays)}** delayed duty/duties on your roster:\n"
            + ("\n- ".join([""] + lines) if lines else "No delayed duties found.")
        )
        return {
            "response": res,
            "actions": [{"type": "navigate_analytics"}]
        }

    # --- 14. Query: Timeline Registry Timeline search ---
    if tokens_set.intersection({"registry", "timeline", "history", "audit", "changes", "modified", "updated", "created", "deleted", "assigned", "unassigned"}):
        registry_list = registry
        flight_match = re.search(r"\b([A-Z]{2}\d{2,4})\b", prompt.upper())
        if flight_match:
            flight_num = flight_match.group(1)
            registry_list = [r for r in registry_list if str(r.get("flightNumber")).upper() == flight_num]
            
        lines = []
        for r in registry_list[:15]:
            ts = r.get("timestamp", "")
            lines.append(f"* [{ts}] **{r.get('action').upper()}**: {r.get('details')} (Actor: *{r.get('actorName')}*)")
            
        res = (
            f"📜 **Registry Action Timeline**:\n\n"
            + ("\n".join(lines) if lines else "No matching events found in the timeline registry.")
        )
        return {
            "response": res,
            "actions": [{"type": "navigate_registry"}]
        }

    # --- 15. Query: sick leaves this year ---
    if tokens_set.intersection({"sick", "sickness"}) and (tokens_set.intersection({"how", "count", "number", "many", "amount", "total"}) or "sick leave" in prompt_lower):
        year = now.year
        sick = [
            item
            for item in duties
            if str(item.get("dutyCode", "")).upper() == "SICK"
            and (_duty_dt(item) and _duty_dt(item).year == year)
        ]
        return {
            "response": f"You have taken {len(sick)} sick leave(s) in {year}.",
            "actions": [],
        }

    # --- 16. Query: next duty ---
    if ((tokens_set.intersection({"next", "upcoming"}) and tokens_set.intersection({"duty", "flight", "flights", "roster", "schedule", "work"})) 
            or "flying next" in prompt_lower or "what's next" in prompt_lower or "what is next" in prompt_lower):
        if not duties:
            return {
                "response": "You have no upcoming duties scheduled in your roster.",
                "actions": []
            }
        future = [
            item
            for item in duties
            if (_duty_dt(item) or datetime.min) >= now.replace(hour=0, minute=0, second=0, microsecond=0)
        ]
        future.sort(key=lambda x: _duty_dt(x) or datetime.max)
        if future:
            item = future[0]
            duty_id = item.get("id")
            return {
                "response": f"Your next upcoming duty is: {_format_duty(item)}",
                "actions": [{"type": "highlight_duty", "id": duty_id}] if duty_id is not None else [],
            }
        else:
            return {
                "response": "No upcoming duties found in your roster.",
                "actions": []
            }

    # --- 17. Query: conflict checks / overlaps ---
    if tokens_set.intersection({"conflict", "conflicts", "overlap", "overlapping", "violation", "violations", "warn", "warning", "warnings"}):
        violations = _detect_short_rest_periods(duties)
        
        # Overlaps calculation
        overlaps = []
        sorted_d = sorted([d for d in duties if _duty_dt(d)], key=lambda x: _duty_dt(x))
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
        
        lines = []
        if overlaps:
            lines.append("**Scheduling Conflicts/Overlaps:**")
            lines.extend([f"- {o}" for o in overlaps])
        if violations:
            lines.append("**Rest Period Violations (<10h):**")
            lines.extend([f"- {v}" for v in violations])
            
        if not lines:
            return {"response": "All checks passed! No roster risks, overlaps, or rest compliance violations detected.", "actions": []}
        return {"response": "\n".join(lines), "actions": []}

    # --- 18. Navigation Tabs ---
    is_open_or_go = tokens_set.intersection({"open", "go", "show", "navigate", "switch", "view"})
    if is_open_or_go and tokens_set.intersection({"analytics", "chart", "charts", "graph", "graphs", "statistics", "stats"}):
        return {
            "response": "Sure! I am opening the Analytics & Insights tab for you now.",
            "actions": [{"type": "navigate_analytics"}]
        }
    if is_open_or_go and tokens_set.intersection({"timeline", "registry", "history", "audit", "logs", "log"}):
        return {
            "response": "Opening the Registry Timeline log now to show all changes.",
            "actions": [{"type": "navigate_registry"}]
        }
    if is_open_or_go and tokens_set.intersection({"roster", "schedule", "duties", "duty", "flights", "flight"}):
        return {
            "response": "Navigating to your Roster Overview now.",
            "actions": [{"type": "navigate_roster"}]
        }


    # Fallback response
    return {
        "response": (
            "I can help with duty queries and updates. Try:\n"
            "- Show my duties next week\n"
            "- Show my duties for last week\n"
            "- Add a duty from Dubai to Doha on March 12 05:00 07:00\n"
            "- When is my next day-off?\n"
            "- Convert my FDUT on March 12 to SICK\n"
            "- How many sick leaves have I taken this year?"
        ),
        "actions": [],
    }
