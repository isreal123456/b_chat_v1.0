from fastapi import APIRouter
from email.message import EmailMessage
import smtplib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select

from app.schemas.auth import UserCreate, PasswordResetRequest, PasswordResetConfirm
from app.models import User
from app.core.security import hash_password
import app.core.security as security
from app.database import get_db
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


def send_password_reset_email(email: str, token: str) -> None:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise RuntimeError("SMTP is not configured")
    message = EmailMessage()
    message["Subject"] = "Reset your bchat password"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        "Use this link to reset your bchat password. It expires in "
        f"{settings.password_reset_token_expire_minutes} minutes:\n\n"
        f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}\n\n"
        "If you did not request this, you can ignore this email."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    if user:
        token = security.create_password_reset_token(user.email)
        try:
            send_password_reset_email(user.email, token)
        except Exception:
            # Keep the response identical for unknown addresses and mail failures.
            pass
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    email = security.decode_password_reset_token(request.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    user.password = hash_password(request.password)
    await db.commit()
    return {"message": "Password reset successfully. You can now log in."}

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):

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
        password=hashed_password
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

    return {
        "message": "User registered successfully",
        "user_id": user.id
    }

@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result =await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not security.verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = security.create_access_token(subject=user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

