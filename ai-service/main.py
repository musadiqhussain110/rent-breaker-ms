from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler


app = FastAPI(title="rent-breaker-ai-service", version="1.0.0")
CONTENT_WEIGHT = 0.65
COLLABORATIVE_WEIGHT = 0.25
BEHAVIOR_WEIGHT = 0.10

MIN_DAYS = 3.0
BASE_DAYS = 60.0
USAGE_FACTOR = 0.01
BREAKDOWN_FACTOR = 4.0
FREQUENCY_FACTOR = 2.0
UPTIME_FACTOR = 0.8


class RecommendationUser(BaseModel):
    id: str
    role: str
    preferredLocation: Optional[str] = None


class RecommendationRequest(BaseModel):
    user: RecommendationUser
    machines: List[Dict[str, Any]] = Field(default_factory=list)
    rentals: List[Dict[str, Any]] = Field(default_factory=list)
    maintenance: List[Dict[str, Any]] = Field(default_factory=list)
    customerRentals: List[Dict[str, Any]] = Field(default_factory=list)
    behaviorEvents: List[Dict[str, Any]] = Field(default_factory=list)
    limit: int = 5


class PredictiveMaintenanceRequest(BaseModel):
    machines: List[Dict[str, Any]] = Field(default_factory=list)
    maintenance: List[Dict[str, Any]] = Field(default_factory=list)


class DemandForecastRequest(BaseModel):
    rentals: List[Dict[str, Any]] = Field(default_factory=list)
    location: Optional[str] = None
    machineType: Optional[str] = None
    horizonMonths: int = 1


def _safe_float(v: Any, fallback: float = 0.0) -> float:
    try:
        if v is None:
            return fallback
        return float(v)
    except (TypeError, ValueError):
        return fallback


def _parse_dt(raw: Any) -> Optional[datetime]:
    if not raw:
        return None
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, str):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _machine_features(machine: Dict[str, Any], maintenance_cost_by_machine: Dict[str, float]) -> List[float]:
    return [
        _safe_float(machine.get("dailyRate"), 0),
        _safe_float(machine.get("uptimePercent"), 100),
        _safe_float(machine.get("utilizationScore"), 0),
        _safe_float(machine.get("usageHours"), 0),
        _safe_float(machine.get("breakdownCount"), 0),
        _safe_float(maintenance_cost_by_machine.get(str(machine.get("_id")), 0), 0),
    ]


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "service": "ai", "modeling": ["content-based", "collaborative", "random-forest"]}


@app.post("/recommendations/machines")
def recommend_machines(payload: RecommendationRequest) -> Dict[str, Any]:
    machines = payload.machines or []
    if not machines:
        return {"items": [], "explanations": []}

    maintenance_cost_by_machine: Dict[str, float] = defaultdict(float)
    for m in payload.maintenance:
        machine_id = str(m.get("machine"))
        maintenance_cost_by_machine[machine_id] += _safe_float(m.get("cost"), 0)

    machine_index = {str(m.get("_id")): idx for idx, m in enumerate(machines)}
    matrix = np.array([_machine_features(m, maintenance_cost_by_machine) for m in machines], dtype=float)
    scaler = StandardScaler()
    matrix_scaled = scaler.fit_transform(matrix) if len(machines) > 1 else matrix

    user_pref_vector = np.zeros(matrix_scaled.shape[1], dtype=float)
    user_machine_counter = Counter()
    for r in payload.customerRentals:
        machine_id = str(r.get("machine"))
        if machine_id in machine_index:
            user_machine_counter[machine_id] += 1
            user_pref_vector += matrix_scaled[machine_index[machine_id]]
    if user_machine_counter:
        user_pref_vector = user_pref_vector / max(len(user_machine_counter), 1)

    if np.allclose(user_pref_vector, 0):
        # Fallback preference from explicit location and low price/high uptime
        user_pref_vector = np.array([
            -1.0,  # lower price preferred
            1.0,   # higher uptime preferred
            0.5,
            0.0,
            -0.5,  # lower breakdown preferred
            -0.5,  # lower maintenance cost preferred
        ])

    content_scores = cosine_similarity([user_pref_vector], matrix_scaled)[0]

    collaborative_counter = Counter()
    for r in payload.rentals:
        collaborative_counter[str(r.get("machine"))] += 1
    max_popularity = max(collaborative_counter.values(), default=1)

    behavior_boost_by_machine = Counter()
    for ev in payload.behaviorEvents:
        machine_id = str(ev.get("machine"))
        et = ev.get("eventType")
        if not machine_id:
            continue
        if et == "request_machine":
            behavior_boost_by_machine[machine_id] += 3
        elif et == "view_machine":
            behavior_boost_by_machine[machine_id] += 1
        elif et == "rent_machine":
            behavior_boost_by_machine[machine_id] += 4

    scored = []
    preferred_location = (payload.user.preferredLocation or "").lower().strip()

    for idx, machine in enumerate(machines):
        machine_id = str(machine.get("_id"))
        pop_score = collaborative_counter[machine_id] / max_popularity
        behavior_score = behavior_boost_by_machine[machine_id] / max(max(behavior_boost_by_machine.values(), default=1), 1)
        loc = str(machine.get("location") or "").lower().strip()
        location_boost = 0.1 if preferred_location and loc == preferred_location else 0.0
        combined = (
            (CONTENT_WEIGHT * float(content_scores[idx]))
            + (COLLABORATIVE_WEIGHT * pop_score)
            + (BEHAVIOR_WEIGHT * behavior_score)
            + location_boost
        )

        maintenance_cost = _safe_float(maintenance_cost_by_machine.get(machine_id), 0)
        explanation = (
            f"{machine.get('name', 'Machine')} has {_safe_float(machine.get('uptimePercent'), 100):.1f}% uptime, "
            f"maintenance cost {maintenance_cost:.2f}, and daily rate {_safe_float(machine.get('dailyRate'), 0):.2f}."
        )

        scored.append({
            "machineId": machine_id,
            "score": round(combined, 4),
            "explanation": explanation,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[: max(1, min(payload.limit, 20))]
    return {"items": top}


@app.post("/predictive-maintenance")
def predictive_maintenance(payload: PredictiveMaintenanceRequest) -> Dict[str, Any]:
    if not payload.machines:
        return {"predictions": []}

    maintenance_by_machine = defaultdict(list)
    for entry in payload.maintenance:
        maintenance_by_machine[str(entry.get("machine"))].append(entry)

    features = []
    targets = []
    rows = []
    for machine in payload.machines:
        machine_id = str(machine.get("_id"))
        history = maintenance_by_machine.get(machine_id, [])
        avg_cost = float(np.mean([_safe_float(h.get("cost"), 0) for h in history])) if history else 0.0
        freq = len(history)
        usage_hours = _safe_float(machine.get("usageHours"), 0)
        breakdown = _safe_float(machine.get("breakdownCount"), 0)
        uptime = _safe_float(machine.get("uptimePercent"), 100)
        feature = [usage_hours, breakdown, freq, avg_cost, uptime]
        # synthetic target: risk proxy in days until likely maintenance event
        target = max(
            MIN_DAYS,
            BASE_DAYS
            - (usage_hours * USAGE_FACTOR)
            - (breakdown * BREAKDOWN_FACTOR)
            - (freq * FREQUENCY_FACTOR)
            - ((100 - uptime) * UPTIME_FACTOR),
        )
        features.append(feature)
        targets.append(target)
        rows.append((machine_id, machine))

    model = RandomForestRegressor(n_estimators=80, random_state=42)
    X = np.array(features, dtype=float)
    y = np.array(targets, dtype=float)
    model.fit(X, y)
    predicted_days = model.predict(X)

    predictions = []
    for i, (machine_id, machine) in enumerate(rows):
        days_to_maintenance = max(1, int(round(predicted_days[i])))
        risk_score = round(max(0.0, min(1.0, 1 - (days_to_maintenance / 60.0))), 3)
        severity = "high" if risk_score >= 0.7 else "medium" if risk_score >= 0.4 else "low"
        predictions.append(
            {
                "machineId": machine_id,
                "machineName": machine.get("name"),
                "riskScore": risk_score,
                "severity": severity,
                "estimatedDaysToMaintenance": days_to_maintenance,
            }
        )

    predictions.sort(key=lambda x: x["riskScore"], reverse=True)
    return {"predictions": predictions}


@app.post("/demand-forecast")
def demand_forecast(payload: DemandForecastRequest) -> Dict[str, Any]:
    monthly_counts: Dict[str, int] = Counter()

    for rental in payload.rentals:
        start = _parse_dt(rental.get("startDate")) or _parse_dt(rental.get("createdAt"))
        if not start:
            continue
        key = start.strftime("%Y-%m")
        monthly_counts[key] += 1

    if not monthly_counts:
        return {"forecast": [], "insight": "Insufficient rental history."}

    months_sorted = sorted(monthly_counts.keys())
    X = []
    y = []
    for idx, month in enumerate(months_sorted):
        dt = datetime.strptime(month, "%Y-%m")
        X.append([idx, dt.month, dt.year])
        y.append(monthly_counts[month])

    model = RandomForestRegressor(n_estimators=120, random_state=42)
    model.fit(np.array(X, dtype=float), np.array(y, dtype=float))

    horizon = max(1, min(payload.horizonMonths, 6))
    last_idx = len(months_sorted) - 1
    forecast = []
    baseline = y[-1]

    for step in range(1, horizon + 1):
        next_dt = datetime.strptime(months_sorted[-1], "%Y-%m")
        year = next_dt.year + ((next_dt.month - 1 + step) // 12)
        month = ((next_dt.month - 1 + step) % 12) + 1
        x_row = np.array([[last_idx + step, month, year]], dtype=float)
        predicted = max(0.0, float(model.predict(x_row)[0]))
        growth_pct = ((predicted - baseline) / baseline * 100.0) if baseline else 0.0
        forecast.append(
            {
                "monthOffset": step,
                "predictedDemand": round(predicted, 2),
                "growthPercentVsLastMonth": round(growth_pct, 2),
            }
        )

    top_growth = max(forecast, key=lambda x: x["growthPercentVsLastMonth"])
    insight = (
        f"Demand likely peaks at +{top_growth['growthPercentVsLastMonth']}% in {top_growth['monthOffset']} month(s); "
        "consider price increase and fleet planning."
    )
    return {"forecast": forecast, "insight": insight}
