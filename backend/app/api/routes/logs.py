"""
Logs API — retrieves AI interaction logs for the dashboard.
"""
from __future__ import annotations

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.models.log import AIInteractionLog
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["Logs & Monitoring"])


class LogEntry(BaseModel):
    id: str
    user_id: Optional[str]
    session_id: Optional[str]
    prompt: str
    output: Optional[str]
    input_risk_score: float
    output_risk_score: float
    risk_level: str
    status: str
    prompt_injection_detected: bool
    jailbreak_detected: bool
    pii_detected_input: bool
    pii_detected_output: bool
    secrets_detected: bool
    toxic_content_detected: bool
    hallucination_detected: bool
    model_used: Optional[str]
    latency_ms: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class LogsResponse(BaseModel):
    items: list[LogEntry]
    total: int
    page: int
    page_size: int
    pages: int


class StatsResponse(BaseModel):
    total_interactions: int
    blocked_count: int
    flagged_count: int
    injection_attempts: int
    pii_detections: int
    avg_risk_score: float
    risk_distribution: dict[str, int]


@router.get("", response_model=LogsResponse)
async def list_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = []
    if status:
        filters.append(AIInteractionLog.status == status)
    if risk_level:
        filters.append(AIInteractionLog.risk_level == risk_level)
    if user_id:
        filters.append(AIInteractionLog.user_id == user_id)
    if since:
        filters.append(AIInteractionLog.created_at >= since)

    # Count
    count_q = select(func.count()).select_from(AIInteractionLog)
    if filters:
        count_q = count_q.where(and_(*filters))
    total = (await db.execute(count_q)).scalar_one()

    # Fetch page
    q = select(AIInteractionLog).order_by(desc(AIInteractionLog.created_at))
    if filters:
        q = q.where(and_(*filters))
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    return LogsResponse(
        items=[LogEntry.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, -(-total // page_size)),
    )


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    since: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = []
    if since:
        filters.append(AIInteractionLog.created_at >= since)

    base_q = select(AIInteractionLog)
    if filters:
        base_q = base_q.where(and_(*filters))

    rows = (await db.execute(base_q)).scalars().all()

    total = len(rows)
    blocked = sum(1 for r in rows if r.status == "blocked")
    flagged = sum(1 for r in rows if r.status == "flagged")
    injections = sum(1 for r in rows if r.prompt_injection_detected)
    pii = sum(1 for r in rows if r.pii_detected_input or r.pii_detected_output)
    avg_risk = sum(r.input_risk_score for r in rows) / total if total else 0.0

    risk_dist = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for r in rows:
        if r.risk_level in risk_dist:
            risk_dist[r.risk_level] += 1

    return StatsResponse(
        total_interactions=total,
        blocked_count=blocked,
        flagged_count=flagged,
        injection_attempts=injections,
        pii_detections=pii,
        avg_risk_score=round(avg_risk, 4),
        risk_distribution=risk_dist,
    )


@router.get("/{log_id}", response_model=LogEntry)
async def get_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException, status as http_status
    result = await db.execute(select(AIInteractionLog).where(AIInteractionLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Log not found")
    return LogEntry.model_validate(log)
