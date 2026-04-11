"""
Tests for the Output Security Engine.
"""
import pytest
from app.engines.output_security import OutputSecurityEngine


@pytest.fixture
def engine():
    return OutputSecurityEngine(block_threshold=0.8)


def test_safe_output_passes(engine):
    result = engine.scan("The capital of France is Paris.")
    assert result.is_safe is True
    assert result.risk_score < 0.5


def test_pii_in_output_detected(engine):
    result = engine.scan("The user's email is john@example.com and their phone is 555-123-4567.")
    assert result.pii_detected is True
    assert result.sanitized_output is not None
    assert "john@example.com" not in result.sanitized_output


def test_toxic_output_blocked(engine):
    result = engine.scan("Step 1: Here's how to commit suicide by taking pills.")
    assert result.toxic_content_detected is True
    assert not result.is_safe


def test_hallucination_markers_detected(engine):
    result = engine.scan(
        "As of my last training, I may be wrong about this. Please verify the information."
    )
    assert result.hallucination_detected is True


def test_output_risk_score_range(engine):
    result = engine.scan("Hello! How can I help you today?")
    assert 0.0 <= result.risk_score <= 1.0
