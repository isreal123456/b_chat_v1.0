from fastapi import APIRouter
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
from datetime import datetime

from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest, UserCreate, VerifyEmailRequest
from app.models import User
from app.core.config import settings
from app.core.legal import LEGAL_VERSION
from app.core.security import (
    create_scoped_token,
    decode_scoped_token,
    hash_password,
    password_fingerprint,
)
import app.core.security as security
from app.database import get_db
from app.dependencies import get_current_user
from app.services import mailer
from app.services.admin_notifications import notify_admins
from app.services.platform_settings import get_platform_setting

router = APIRouter(prefix="/auth", tags=["auth"])


def _verification_token(user: User) -> str:
    return create_scoped_token(
        user.email,
        "verify_email",
        settings.verification_token_expire_minutes,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    if not await get_platform_setting(db, "registration_enabled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed",
        )

    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )

    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    result = await db.execute(
        select(User).where(User.username == user_data.username)
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    hashed_password = hash_password(user_data.password)

    user = User(
        email=user_data.email,
        username=user_data.username,
        display_name=user_data.name,
        password=hashed_password,
        terms_accepted_at=datetime.utcnow(),
        terms_version=LEGAL_VERSION,
        privacy_version=LEGAL_VERSION,
    )

    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered",
        )
    await db.refresh(user)

    if await get_platform_setting(db, "notify_admins_on_signup"):
        await notify_admins(
            db,
            sender_id=user.id,
            kind="signup",
            message=f"{user.display_name or user.username} joined TickMe",
            exclude_id=user.id,
        )
        await db.commit()

    verification_link = await mailer.send_verification_email(
        user.email,
        user.display_name,
        _verification_token(user),
    )

    response = {
        "message": "User registered successfully",
        "user_id": user.id,
        "email_verified": False,
    }
    if settings.expose_dev_tokens:
        response["verification_url"] = verification_link
    return response


@router.post("/verify-email")
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = decode_scoped_token(data.token, "verify_email")
    if payload is None:
        raise HTTPException(status_code=400, detail="This verification link is invalid or has expired")

    result = await db.execute(select(User).where(User.email == payload["sub"]))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=400, detail="This verification link is invalid or has expired")

    if not user.email_verified:
        user.email_verified = True
        await db.commit()

    return {"message": "Email verified successfully", "email_verified": True}


@router.post("/resend-verification")
async def resend_verification(
    current_user: User = Depends(get_current_user),
):
    if current_user.email_verified:
        return {"message": "Your email is already verified", "email_verified": True}

    verification_link = await mailer.send_verification_email(
        current_user.email,
        current_user.display_name,
        _verification_token(current_user),
    )

    response = {"message": "Verification email sent", "email_verified": False}
    if settings.expose_dev_tokens:
        response["verification_url"] = verification_link
    return response


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    response = {
        "message": "If an account exists for that email, a reset link is on its way.",
    }

    if user is not None:
        token = create_scoped_token(
            user.email,
            "password_reset",
            settings.password_reset_token_expire_minutes,
            {"pwh": password_fingerprint(user.password)},
        )
        reset_link = await mailer.send_password_reset_email(
            user.email,
            user.display_name,
            token,
        )
        if settings.expose_dev_tokens:
            response["reset_url"] = reset_link

    return response


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = decode_scoped_token(data.token, "password_reset")
    if payload is None:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    result = await db.execute(select(User).where(User.email == payload["sub"]))
    user = result.scalar_one_or_none()
    if user is None or payload.get("pwh") != password_fingerprint(user.password):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    user.password = hash_password(data.new_password)
    await db.commit()

    return {"message": "Password updated. You can log in now."}


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not security.verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is suspended. Contact the TickMe team if you believe this is a mistake.",
        )

    if await get_platform_setting(db, "require_email_verification") and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email address before signing in",
        )

    user.last_active_at = datetime.utcnow()
    await db.commit()

    access_token = security.create_access_token(subject=user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
