"""
DLP (Data Loss Prevention) Engine — detects PII, secrets, and confidential data.
Uses regex patterns; optionally integrates Microsoft Presidio for PII detection.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
import structlog

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# PII Patterns
# ---------------------------------------------------------------------------

PII_PATTERNS: list[tuple[str, str, str]] = [
    # (entity_type, regex, replacement_placeholder)
    ("EMAIL", r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "[EMAIL]"),
    (
        "PHONE_US",
        r"\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b",
        "[PHONE]",
    ),
    (
        "SSN",
        r"\b(?!000|666|9\d\d)\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b",
        "[SSN]",
    ),
    ("CREDIT_CARD", r"\b(?:\d[ -]?){13,16}\b", "[CREDIT_CARD]"),
    ("IP_ADDRESS", r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "[IP_ADDRESS]"),
    (
        "DATE_OF_BIRTH",
        r"\b(0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b",
        "[DOB]",
    ),
    (
        "PASSPORT",
        r"\b[A-Z]{1,2}[0-9]{6,9}\b",
        "[PASSPORT]",
    ),
]

# ---------------------------------------------------------------------------
# Secret / Credential Patterns (inspired by TruffleHog & Gitleaks)
# ---------------------------------------------------------------------------

SECRET_PATTERNS: list[tuple[str, str]] = [
    ("OPENAI_KEY", r"sk-[a-zA-Z0-9]{20,60}"),
    ("AWS_ACCESS_KEY", r"AKIA[0-9A-Z]{16}"),
    ("AWS_SECRET_KEY", r"(?i)aws.{0,20}secret.{0,20}['\"][0-9a-zA-Z/+]{40}['\"]"),
    ("GITHUB_TOKEN", r"(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}"),
    ("STRIPE_KEY", r"sk_(live|test)_[0-9a-zA-Z]{24,}"),
    ("SENDGRID_KEY", r"SG\.[a-zA-Z0-9\-_]{22,}\.[a-zA-Z0-9\-_]{43,}"),
    ("SLACK_TOKEN", r"xox[baprs]-[0-9a-zA-Z\-]{10,72}"),
    ("GENERIC_SECRET", r"(?i)(secret|password|passwd|token|api.?key)\s*[=:]\s*['\"][^'\"]{8,}['\"]"),
    ("BEARER_TOKEN", r"(?i)bearer\s+[a-zA-Z0-9\-_.~+/]+=*"),
    ("PRIVATE_KEY", r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
]


@dataclass
class DLPFinding:
    entity_type: str
    start: int
    end: int
    original: str
    replacement: str


@dataclass
class DLPScanResult:
    has_violations: bool
    risk_score: float
    pii_detected: bool = False
    secrets_detected: bool = False
    findings: list[dict] = field(default_factory=list)
    redacted_text: Optional[str] = None


class DLPEngine:
    """
    Scans text for PII and secrets.
    Provides redaction capability to mask sensitive data.
    """

    def __init__(self, custom_terms: Optional[list[str]] = None):
        self._pii_compiled = [
            (entity_type, re.compile(pattern), replacement)
            for entity_type, pattern, replacement in PII_PATTERNS
        ]
        self._secret_compiled = [
            (secret_type, re.compile(pattern))
            for secret_type, pattern in SECRET_PATTERNS
        ]
        self._custom_terms = custom_terms or []

    def scan(self, text: str, redact: bool = True) -> DLPScanResult:
        findings: list[dict] = []
        pii_detected = False
        secrets_detected = False
        redacted = text

        # Scan for PII
        for entity_type, pattern, replacement in self._pii_compiled:
            for match in pattern.finditer(text):
                findings.append(
                    {
                        "type": "pii",
                        "entity": entity_type,
                        "start": match.start(),
                        "end": match.end(),
                        "value": match.group(0)[:6] + "***",  # partial reveal
                    }
                )
                pii_detected = True

        # Scan for secrets
        for secret_type, pattern in self._secret_compiled:
            for match in pattern.finditer(text):
                findings.append(
                    {
                        "type": "secret",
                        "entity": secret_type,
                        "start": match.start(),
                        "end": match.end(),
                        "value": "[REDACTED]",
                    }
                )
                secrets_detected = True

        # Scan for custom confidential terms
        for term in self._custom_terms:
            if term.lower() in text.lower():
                findings.append(
                    {"type": "confidential", "entity": "CUSTOM_TERM", "value": term}
                )

        # Compute risk score
        risk_score = 0.0
        if pii_detected:
            risk_score = max(risk_score, 0.6 + min(len(findings) * 0.05, 0.3))
        if secrets_detected:
            risk_score = max(risk_score, 0.9)

        # Redact
        if redact and findings:
            redacted = self._redact(text)

        logger.info(
            "dlp_scan_complete",
            pii_detected=pii_detected,
            secrets_detected=secrets_detected,
            finding_count=len(findings),
        )

        return DLPScanResult(
            has_violations=bool(findings),
            risk_score=round(risk_score, 4),
            pii_detected=pii_detected,
            secrets_detected=secrets_detected,
            findings=findings,
            redacted_text=redacted if (redact and findings) else None,
        )

    def _redact(self, text: str) -> str:
        """Replace all detected sensitive data with placeholders."""
        redacted = text
        for entity_type, pattern, replacement in self._pii_compiled:
            redacted = pattern.sub(replacement, redacted)
        for secret_type, pattern in self._secret_compiled:
            redacted = pattern.sub(f"[{secret_type}]", redacted)
        return redacted
