"""
AI Security Gateway — the core proxy endpoint.
Receives user prompts, runs security checks, forwards to LLM, validates output.
"""
from __future__ import annotations

import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

try:
    import openai as _openai_module
    _OPENAI_AVAILABLE = True
except ImportError:
    _openai_module = None  # type: ignore[assignment]
    _OPENAI_AVAILABLE = False

from app.core.database import get_db
from app.core.config import get_settings
from app.engines.input_security import InputSecurityEngine
from app.engines.output_security import OutputSecurityEngine
from app.engines.dlp import DLPEngine
from app.models.log import AIInteractionLog, RiskLevel, InteractionStatus
from app.middleware.auth import verify_api_key, get_current_user
from app.models.policy import APIKey
from app.models.user import User

router = APIRouter(prefix="/gateway", tags=["AI Security Gateway"])
settings = get_settings()

# Singleton engines (initialized once)
_input_engine = InputSecurityEngine(
    block_threshold=settings.RISK_SCORE_BLOCK_THRESHOLD,
    warn_threshold=settings.RISK_SCORE_WARN_THRESHOLD,
)
_dlp_engine = DLPEngine()
_output_engine = OutputSecurityEngine(
    block_threshold=settings.RISK_SCORE_BLOCK_THRESHOLD,
    dlp_engine=_dlp_engine,
)


def _risk_level(score: float) -> str:
    if score >= 0.8:
        return RiskLevel.CRITICAL.value
    if score >= 0.6:
        return RiskLevel.HIGH.value
    if score >= 0.4:
        return RiskLevel.MEDIUM.value
    return RiskLevel.LOW.value


class GatewayRequest(BaseModel):
    prompt: str
    model: str = "gpt-4o-mini"
    system_prompt: Optional[str] = None
    session_id: Optional[str] = None
    scan_output: bool = True


class SecurityAnalysis(BaseModel):
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
    findings: list[dict]
    blocked_reason: Optional[str] = None


class GatewayResponse(BaseModel):
    request_id: str
    output: Optional[str] = None
    sanitized_output: Optional[str] = None
    security: SecurityAnalysis
    latency_ms: float


async def _call_llm(prompt: str, model: str, system_prompt: Optional[str]) -> Optional[str]:
    """Call OpenAI API if key is configured and library is available."""
    if not settings.OPENAI_API_KEY or not _OPENAI_AVAILABLE or _openai_module is None:
        return None
    try:
        client = _openai_module.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        response = await client.chat.completions.create(
            model=model, messages=messages, max_tokens=2048
        )
        return response.choices[0].message.content
    except Exception:
        return None


@router.post("/analyze", response_model=GatewayResponse)
async def analyze_prompt(
    payload: GatewayRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    api_key: APIKey = Depends(verify_api_key),
):
    """
    Main gateway endpoint: scan input → (optionally) forward to LLM → scan output → log → return.
    """
    start_time = time.monotonic()
    request_id = str(uuid.uuid4())
    all_findings: list[dict] = []

    # --- Input DLP scan ---
    input_dlp = _dlp_engine.scan(payload.prompt, redact=False)
    effective_prompt = payload.prompt

    # --- Input security scan ---
    input_scan = _input_engine.scan(payload.prompt)
    all_findings.extend(input_scan.findings)

    # Determine initial status
    if not input_scan.is_safe:
        # Block the request
        latency = (time.monotonic() - start_time) * 1000
        risk_level = _risk_level(input_scan.risk_score)
        log = AIInteractionLog(
            id=uuid.UUID(request_id),
            user_id=str(api_key.user_id),
            session_id=payload.session_id,
            api_key_id=str(api_key.id),
            prompt=payload.prompt,
            input_risk_score=input_scan.risk_score,
            output_risk_score=0.0,
            risk_level=risk_level,
            status=InteractionStatus.BLOCKED.value,
            prompt_injection_detected=input_scan.prompt_injection_detected,
            jailbreak_detected=input_scan.jailbreak_detected,
            pii_detected_input=input_dlp.pii_detected,
            pii_detected_output=False,
            secrets_detected=input_dlp.secrets_detected,
            toxic_content_detected=input_scan.toxic_content_detected,
            hallucination_detected=False,
            findings=all_findings,
            policy_violations=[input_scan.blocked_reason] if input_scan.blocked_reason else [],
            model_used=payload.model,
            latency_ms=latency,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(log)
        return GatewayResponse(
            request_id=request_id,
            output=None,
            security=SecurityAnalysis(
                input_risk_score=input_scan.risk_score,
                output_risk_score=0.0,
                risk_level=risk_level,
                status=InteractionStatus.BLOCKED.value,
                prompt_injection_detected=input_scan.prompt_injection_detected,
                jailbreak_detected=input_scan.jailbreak_detected,
                pii_detected_input=input_dlp.pii_detected,
                pii_detected_output=False,
                secrets_detected=input_dlp.secrets_detected,
                toxic_content_detected=input_scan.toxic_content_detected,
                hallucination_detected=False,
                findings=all_findings,
                blocked_reason=input_scan.blocked_reason,
            ),
            latency_ms=round(latency, 2),
        )

    # If DLP violations in input, sanitize before forwarding
    if input_dlp.has_violations and input_dlp.redacted_text:
        effective_prompt = _dlp_engine.scan(payload.prompt, redact=True).redacted_text or payload.prompt

    # --- Call LLM ---
    llm_output = await _call_llm(effective_prompt, payload.model, payload.system_prompt)

    # --- Output scan ---
    output_scan = None
    output_risk_score = 0.0
    pii_out = False
    toxic_out = False
    hallucination_out = False
    sanitized_output = llm_output

    if llm_output and payload.scan_output:
        output_scan = _output_engine.scan(llm_output)
        output_risk_score = output_scan.risk_score
        pii_out = output_scan.pii_detected
        toxic_out = output_scan.toxic_content_detected
        hallucination_out = output_scan.hallucination_detected
        all_findings.extend([{"source": "output", **f} for f in output_scan.findings])
        if output_scan.sanitized_output:
            sanitized_output = output_scan.sanitized_output
        if not output_scan.is_safe:
            sanitized_output = None  # block the output

    combined_risk = max(input_scan.risk_score, output_risk_score)
    risk_level = _risk_level(combined_risk)
    final_status = (
        InteractionStatus.BLOCKED.value
        if (output_scan and not output_scan.is_safe)
        else (
            InteractionStatus.SANITIZED.value
            if (input_dlp.has_violations or (output_scan and output_scan.sanitized_output))
            else InteractionStatus.ALLOWED.value
        )
    )

    latency = (time.monotonic() - start_time) * 1000

    # --- Log interaction ---
    log = AIInteractionLog(
        id=uuid.UUID(request_id),
        user_id=str(api_key.user_id),
        session_id=payload.session_id,
        api_key_id=str(api_key.id),
        prompt=payload.prompt,
        prompt_sanitized=effective_prompt if effective_prompt != payload.prompt else None,
        output=llm_output,
        output_sanitized=sanitized_output if sanitized_output != llm_output else None,
        input_risk_score=input_scan.risk_score,
        output_risk_score=output_risk_score,
        risk_level=risk_level,
        status=final_status,
        prompt_injection_detected=input_scan.prompt_injection_detected,
        jailbreak_detected=input_scan.jailbreak_detected,
        pii_detected_input=input_dlp.pii_detected,
        pii_detected_output=pii_out,
        secrets_detected=input_dlp.secrets_detected,
        toxic_content_detected=toxic_out,
        hallucination_detected=hallucination_out,
        findings=all_findings,
        model_used=payload.model,
        latency_ms=latency,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)

    return GatewayResponse(
        request_id=request_id,
        output=sanitized_output,
        security=SecurityAnalysis(
            input_risk_score=input_scan.risk_score,
            output_risk_score=output_risk_score,
            risk_level=risk_level,
            status=final_status,
            prompt_injection_detected=input_scan.prompt_injection_detected,
            jailbreak_detected=input_scan.jailbreak_detected,
            pii_detected_input=input_dlp.pii_detected,
            pii_detected_output=pii_out,
            secrets_detected=input_dlp.secrets_detected,
            toxic_content_detected=toxic_out,
            hallucination_detected=hallucination_out,
            findings=all_findings,
            blocked_reason=output_scan.blocked_reason if output_scan else None,
        ),
        latency_ms=round(latency, 2),
    )


@router.post("/scan/input", tags=["AI Security Gateway"])
async def scan_input_only(
    payload: GatewayRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scan a prompt without forwarding to LLM. Useful for testing policies."""
    input_scan = _input_engine.scan(payload.prompt)
    dlp_scan = _dlp_engine.scan(payload.prompt, redact=False)
    return {
        "is_safe": input_scan.is_safe and not dlp_scan.has_violations,
        "input_risk_score": input_scan.risk_score,
        "dlp_risk_score": dlp_scan.risk_score,
        "prompt_injection_detected": input_scan.prompt_injection_detected,
        "jailbreak_detected": input_scan.jailbreak_detected,
        "pii_detected": dlp_scan.pii_detected,
        "secrets_detected": dlp_scan.secrets_detected,
        "toxic_content_detected": input_scan.toxic_content_detected,
        "findings": input_scan.findings + dlp_scan.findings,
        "blocked_reason": input_scan.blocked_reason,
    }
