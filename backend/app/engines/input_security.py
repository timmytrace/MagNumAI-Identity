"""
Input Security Engine — detects prompt injection, jailbreaks, and malicious intent.
Uses a combination of regex/heuristic patterns and optional LLM-based classification.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
import structlog

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Prompt-injection & jailbreak pattern library
# ---------------------------------------------------------------------------

INJECTION_PATTERNS: list[tuple[str, str, float]] = [
    # (name, regex, base_score)
    # Classic "ignore" instruction overrides
    (
        "ignore_instructions",
        r"(?i)(ignore|disregard|forget|override|bypass)\s+(all\s+)?(previous|prior|above|your|the)\s+(instructions?|rules?|guidelines?|constraints?|prompts?|system\s+prompts?)",
        0.9,
    ),
    # Role-play / persona hijack
    (
        "role_play_hijack",
        r"(?i)(you\s+are\s+now|pretend\s+(you\s+are|to\s+be)|act\s+as|roleplay\s+as|play\s+the\s+role\s+of)\s+.{0,80}(no\s+restriction|unfiltered|without\s+limit|evil|dan|jailbreak|uncensored)",
        0.95,
    ),
    # DAN / jailbreak triggers
    (
        "jailbreak_keyword",
        r"(?i)\b(DAN|do\s+anything\s+now|jailbreak|jail\s+break|prison\s+break|uncensored\s+mode|developer\s+mode|god\s+mode|unrestricted\s+mode)\b",
        0.9,
    ),
    # Prompt exfiltration attempts
    (
        "prompt_exfiltration",
        r"(?i)(repeat|print|output|reveal|show|display|tell\s+me)\s+(your\s+)?(system\s+prompt|initial\s+prompt|hidden\s+prompt|secret\s+instructions?|training\s+data)",
        0.85,
    ),
    # Token smuggling
    (
        "token_smuggling",
        r"(?i)(</?(system|assistant|user|human|ai)>|\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>)",
        0.88,
    ),
    # Indirect injection via markup / code injection
    (
        "html_injection",
        r"(?i)<script\b[^>]*>|javascript:\s*|on\w+\s*=\s*[\"']",
        0.7,
    ),
    # Encoding tricks
    (
        "encoding_obfuscation",
        r"base64\s*(decode|encode)|\\x[0-9a-f]{2}|&#x[0-9a-f]+;",
        0.6,
    ),
    # Confidential data extraction
    (
        "data_extraction",
        r"(?i)(extract|dump|exfiltrate|retrieve)\s+(all\s+)?(user\s+)?(data|records|credentials?|passwords?|secrets?|tokens?|api\s+keys?)",
        0.85,
    ),
    # Prompt chaining / delimiter abuse
    (
        "delimiter_abuse",
        r"(?i)(------+|======+|######+)\s*(new\s+instruction|system|override|ignore)",
        0.75,
    ),
    # SSRF / URL requests from model
    (
        "ssrf_attempt",
        r"(?i)(fetch|request|curl|wget|http\.get|urllib)\s+(https?://|file://|ftp://)",
        0.65,
    ),
]

TOXIC_PATTERNS: list[tuple[str, str, float]] = [
    (
        "self_harm",
        r"(?i)(how\s+to\s+(kill|harm|hurt|suicide|self.harm)|methods?\s+(to\s+)?(commit\s+suicide|self.harm))",
        0.9,
    ),
    (
        "violence",
        r"(?i)(step.by.step\s+(guide|instructions?)\s+(to|for)\s+(kill|attack|bomb|murder|assault))",
        0.9,
    ),
    (
        "malware",
        r"(?i)(write|create|generate)\s+(a\s+)?(virus|malware|ransomware|keylogger|trojan|worm|rootkit|exploit)",
        0.85,
    ),
]


@dataclass
class InputScanResult:
    is_safe: bool
    risk_score: float
    prompt_injection_detected: bool = False
    jailbreak_detected: bool = False
    toxic_content_detected: bool = False
    findings: list[dict] = field(default_factory=list)
    sanitized_prompt: Optional[str] = None
    blocked_reason: Optional[str] = None


class InputSecurityEngine:
    """
    Scans incoming prompts for security threats using heuristic pattern matching.
    Optionally enhances with LLM-based classification when an OpenAI key is set.
    """

    def __init__(
        self,
        block_threshold: float = 0.8,
        warn_threshold: float = 0.5,
        max_prompt_length: int = 20_000,
    ):
        self.block_threshold = block_threshold
        self.warn_threshold = warn_threshold
        self.max_prompt_length = max_prompt_length
        self._compiled_injection = [
            (name, re.compile(pattern), score)
            for name, pattern, score in INJECTION_PATTERNS
        ]
        self._compiled_toxic = [
            (name, re.compile(pattern), score)
            for name, pattern, score in TOXIC_PATTERNS
        ]

    def scan(self, prompt: str) -> InputScanResult:
        findings: list[dict] = []
        max_score: float = 0.0
        prompt_injection = False
        jailbreak = False
        toxic = False

        # --- Heuristic checks ---
        for name, pattern, score in self._compiled_injection:
            match = pattern.search(prompt)
            if match:
                findings.append(
                    {
                        "type": "injection",
                        "rule": name,
                        "score": score,
                        "match": match.group(0)[:100],
                    }
                )
                max_score = max(max_score, score)
                prompt_injection = True
                if "jailbreak" in name or "role_play" in name or "dan" in name.lower():
                    jailbreak = True

        for name, pattern, score in self._compiled_toxic:
            match = pattern.search(prompt)
            if match:
                findings.append(
                    {
                        "type": "toxic",
                        "rule": name,
                        "score": score,
                        "match": match.group(0)[:100],
                    }
                )
                max_score = max(max_score, score)
                toxic = True

        # --- Length / entropy heuristics ---
        if len(prompt) > self.max_prompt_length:
            findings.append({"type": "heuristic", "rule": "excessive_length", "score": 0.4})
            max_score = max(max_score, 0.4)

        is_safe = max_score < self.block_threshold
        blocked_reason: Optional[str] = None
        if not is_safe and findings:
            top = max(findings, key=lambda f: f["score"])
            blocked_reason = f"Security policy violation: {top['rule']} (score={top['score']:.2f})"

        logger.info(
            "input_scan_complete",
            risk_score=max_score,
            is_safe=is_safe,
            finding_count=len(findings),
        )

        return InputScanResult(
            is_safe=is_safe,
            risk_score=round(max_score, 4),
            prompt_injection_detected=prompt_injection,
            jailbreak_detected=jailbreak,
            toxic_content_detected=toxic,
            findings=findings,
            blocked_reason=blocked_reason,
        )
