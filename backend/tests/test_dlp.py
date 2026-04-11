"""
Tests for the DLP Engine.
"""
import pytest
from app.engines.dlp import DLPEngine


@pytest.fixture
def dlp():
    return DLPEngine()


def test_clean_text_no_violations(dlp):
    result = dlp.scan("The quick brown fox jumps over the lazy dog.")
    assert not result.has_violations
    assert result.risk_score == 0.0


def test_email_detected(dlp):
    result = dlp.scan("Contact me at john.doe@example.com for details.")
    assert result.pii_detected is True
    assert any(f["entity"] == "EMAIL" for f in result.findings)


def test_phone_detected(dlp):
    result = dlp.scan("Call me at (555) 123-4567 anytime.")
    assert result.pii_detected is True


def test_openai_key_detected(dlp):
    result = dlp.scan("My API key is sk-abcdefghijklmnopqrstuvwxyz1234567890")
    assert result.secrets_detected is True
    assert any(f["entity"] == "OPENAI_KEY" for f in result.findings)


def test_aws_key_detected(dlp):
    result = dlp.scan("AWS Access Key: AKIAIOSFODNN7EXAMPLE")
    assert result.secrets_detected is True
    assert any(f["entity"] == "AWS_ACCESS_KEY" for f in result.findings)


def test_private_key_detected(dlp):
    result = dlp.scan("-----BEGIN RSA PRIVATE KEY----- some data -----END RSA PRIVATE KEY-----")
    assert result.secrets_detected is True


def test_redaction_replaces_email(dlp):
    text = "Send to user@test.com please."
    result = dlp.scan(text, redact=True)
    assert result.redacted_text is not None
    assert "user@test.com" not in result.redacted_text
    assert "[EMAIL]" in result.redacted_text


def test_high_risk_score_for_secrets(dlp):
    result = dlp.scan("API Key: sk-abcdefghijklmnopqrstuvwxyz1234567890")
    assert result.risk_score >= 0.9


def test_custom_terms(dlp):
    custom_dlp = DLPEngine(custom_terms=["Project Phoenix", "Operation Blackbird"])
    result = custom_dlp.scan("This is about Project Phoenix.")
    assert result.has_violations is True
    assert any(f["type"] == "confidential" for f in result.findings)
