"""
Tests for the Security utility functions.
"""
import pytest
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    hash_api_key,
)


def test_password_hash_and_verify():
    password = "SecurePass123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)


def test_wrong_password_fails():
    hashed = get_password_hash("correct-password")
    assert not verify_password("wrong-password", hashed)


def test_access_token_create_and_decode():
    token = create_access_token("user-123")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"


def test_refresh_token_type():
    token = create_refresh_token("user-456")
    payload = decode_token(token)
    assert payload is not None
    assert payload["type"] == "refresh"


def test_invalid_token_returns_none():
    result = decode_token("not.a.valid.token")
    assert result is None


def test_api_key_generation():
    key = generate_api_key()
    assert key.startswith("msk_")
    assert len(key) > 20


def test_api_key_hashing_deterministic():
    key = "msk_testkey123"
    h1 = hash_api_key(key)
    h2 = hash_api_key(key)
    assert h1 == h2


def test_different_keys_different_hashes():
    h1 = hash_api_key("msk_key1")
    h2 = hash_api_key("msk_key2")
    assert h1 != h2
