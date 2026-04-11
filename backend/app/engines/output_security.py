"""
Output Security Engine — validates LLM responses for safety before returning to users.
Checks for: PII leakage, toxic/harmful content, and basic hallucination markers.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
import structlog

from app.engines.dlp import DLPEngine

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Hallucination markers — indicators that a model may be fabricating content
# ---------------------------------------------------------------------------

HALLUCINATION_MARKERS: list[tuple[str, float]] = [
    (r"(?i)\b(as\s+of\s+my\s+last\s+training|i\s+cannot\s+browse|i\s+don['\u2019]t\s+have\s+access\s+to\s+real.?time)\b", 0.2),
    (r"(?i)\b(i\s+may\s+be\s+(wrong|incorrect|mistaken)|please\s+verify|double.?check\s+this)\b", 0.3),
    (r"(?i)(according\s+to\s+my\s+knowledge|based\s+on\s+my\s+training)", 0.15),
    # Confident but likely fabricated specifics
    (r"\b\d{4}\b.*\b(won|awarded|discovered|published|founded)\b", 0.25),
]

# ---------------------------------------------------------------------------
# Toxicity patterns
# ---------------------------------------------------------------------------

TOXICITY_PATTERNS: list[tuple[str, str, float]] = [
    ("hate_speech", r"(?i)\b(hate|kill|murder|rape|lynch)\s+(all\s+)?(those|them|people|jews|muslims|blacks|whites|women|men)\b", 0.95),
    ("self_harm_output", r"(?i)(step\s+\d+|here['\u2019]s\s+how).{0,50}(suicide|self.harm|cut\s+yourself)", 0.95),
    ("threat", r"(?i)\b(i\s+will\s+(kill|hurt|destroy|attack)|you\s+(will\s+)?(die|suffer|pay))\b", 0.85),
    ("sexual_minor", r"(?i)(child|minor|underage).{0,30}(sexual|nude|naked|porn)", 0.99),
]


@dataclass
class OutputScanResult:
    is_safe: bool
    risk_score: float
    pii_detected: bool = False
    toxic_content_detected: bool = False
    hallucination_detected: bool = False
    findings: list[dict] = field(default_factory=list)
    sanitized_output: Optional[str] = None
    blocked_reason: Optional[str] = None


class OutputSecurityEngine:
    """
    Scans LLM outputs for safety violations.
    """

    def __init__(self, block_threshold: float = 0.8, dlp_engine: Optional[DLPEngine] = None):
        self.block_threshold = block_threshold
        self._dlp = dlp_engine or DLPEngine()
        self._hallucination_compiled = [
            (re.compile(p), s) for p, s in HALLUCINATION_MARKERS
        ]
        self._toxicity_compiled = [
            (name, re.compile(p), s) for name, p, s in TOXICITY_PATTERNS
        ]

    def scan(self, output: str) -> OutputScanResult:
        findings: list[dict] = []
        max_score: float = 0.0
        pii_detected = False
        toxic = False
        hallucination = False

        # --- DLP scan ---
        dlp_result = self._dlp.scan(output, redact=True)
        if dlp_result.has_violations:
            pii_detected = dlp_result.pii_detected
            for f in dlp_result.findings:
                findings.append({"source": "dlp", **f})
            max_score = max(max_score, dlp_result.risk_score)

        # --- Toxicity scan ---
        for name, pattern, score in self._toxicity_compiled:
            match = pattern.search(output)
            if match:
                findings.append(
                    {"type": "toxic", "rule": name, "score": score, "match": match.group(0)[:80]}
                )
                max_score = max(max_score, score)
                toxic = True

        # --- Hallucination scoring ---
        hallucination_score: float = 0.0
        for pattern, score in self._hallucination_compiled:
            if pattern.search(output):
                hallucination_score = max(hallucination_score, score)

        if hallucination_score > 0.2:
            findings.append({"type": "hallucination", "score": hallucination_score})
            hallucination = True
            max_score = max(max_score, hallucination_score)

        is_safe = max_score < self.block_threshold
        blocked_reason: Optional[str] = None
        if not is_safe and findings:
            top = max(findings, key=lambda f: f.get("score", 0))
            rule = top.get("rule") or top.get("entity") or top.get("type", "unknown")
            blocked_reason = f"Output policy violation: {rule} (score={top.get('score', 0):.2f})"

        sanitized: Optional[str] = None
        if dlp_result.has_violations and dlp_result.redacted_text:
            sanitized = dlp_result.redacted_text

        logger.info(
            "output_scan_complete",
            risk_score=max_score,
            is_safe=is_safe,
            finding_count=len(findings),
        )

        return OutputScanResult(
            is_safe=is_safe,
            risk_score=round(max_score, 4),
            pii_detected=pii_detected,
            toxic_content_detected=toxic,
            hallucination_detected=hallucination,
            findings=findings,
            sanitized_output=sanitized,
            blocked_reason=blocked_reason,
        )
