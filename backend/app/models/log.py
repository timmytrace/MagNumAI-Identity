import uuid
from datetime import datetime
from sqlalchemy import String, Text, Float, Boolean, DateTime, ForeignKey, JSON, func, Enum
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.core.database import Base


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InteractionStatus(str, enum.Enum):
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    SANITIZED = "sanitized"
    FLAGGED = "flagged"


class AIInteractionLog(Base):
    __tablename__ = "ai_interaction_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    session_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    api_key_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)

    # Request data
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_sanitized: Mapped[str] = mapped_column(Text, nullable=True)

    # Response data
    output: Mapped[str] = mapped_column(Text, nullable=True)
    output_sanitized: Mapped[str] = mapped_column(Text, nullable=True)

    # Security analysis
    input_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    output_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[str] = mapped_column(
        String(20), default=RiskLevel.LOW.value, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default=InteractionStatus.ALLOWED.value, index=True
    )

    # Detection flags
    prompt_injection_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    jailbreak_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    pii_detected_input: Mapped[bool] = mapped_column(Boolean, default=False)
    pii_detected_output: Mapped[bool] = mapped_column(Boolean, default=False)
    secrets_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    toxic_content_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    hallucination_detected: Mapped[bool] = mapped_column(Boolean, default=False)

    # Detailed findings
    findings: Mapped[dict] = mapped_column(JSON, nullable=True)
    policy_violations: Mapped[list] = mapped_column(JSON, nullable=True)

    # Metadata
    model_used: Mapped[str] = mapped_column(String(100), nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
