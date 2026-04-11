"""
Admin API — manage users, API keys, and security policies.
"""
from __future__ import annotations

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import get_db
from app.core.security import get_password_hash, generate_api_key, hash_api_key
from app.middleware.auth import get_current_admin, get_current_user
from app.models.user import User
from app.models.policy import APIKey, SecurityPolicy

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---- API Key management ----

class CreateAPIKeyRequest(BaseModel):
    name: str
    expires_at: Optional[datetime] = None


class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CreateAPIKeyResponse(APIKeyResponse):
    api_key: str  # Only shown once at creation


@router.post("/api-keys", response_model=CreateAPIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: CreateAPIKeyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)
    key_prefix = raw_key[:10]

    api_key = APIKey(
        user_id=current_user.id,
        name=payload.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        expires_at=payload.expires_at,
    )
    db.add(api_key)
    await db.flush()

    return CreateAPIKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        key_prefix=key_prefix,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
        expires_at=api_key.expires_at,
        last_used_at=api_key.last_used_at,
        api_key=raw_key,
    )


@router.get("/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == current_user.id).order_by(APIKey.created_at.desc())
    )
    return [APIKeyResponse.model_validate(k) for k in result.scalars().all()]


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == current_user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    key.is_active = False


# ---- Policy management ----

class PolicyRules(BaseModel):
    block_pii: bool = True
    block_secrets: bool = True
    block_injection: bool = True
    block_jailbreak: bool = True
    block_toxic: bool = True
    custom_terms: list[str] = []
    max_prompt_length: int = 10000


class CreatePolicyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    rules: PolicyRules
    action: str = "block"  # block | sanitize | flag


class PolicyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_active: bool
    rules: dict
    action: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: CreatePolicyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    policy = SecurityPolicy(
        name=payload.name,
        description=payload.description,
        rules=payload.rules.model_dump(),
        action=payload.action,
    )
    db.add(policy)
    await db.flush()
    return PolicyResponse.model_validate(policy)


@router.get("/policies", response_model=list[PolicyResponse])
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SecurityPolicy).order_by(SecurityPolicy.created_at.desc()))
    return [PolicyResponse.model_validate(p) for p in result.scalars().all()]


@router.patch("/policies/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: str,
    payload: CreatePolicyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(SecurityPolicy).where(SecurityPolicy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    policy.name = payload.name
    policy.description = payload.description
    policy.rules = payload.rules.model_dump()
    policy.action = payload.action
    return PolicyResponse.model_validate(policy)


# ---- User management (admin only) ----

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    full_name: Optional[str] = None


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
    if payload.full_name is not None:
        user.full_name = payload.full_name

    return UserResponse.model_validate(user)
