"""Transactional email delivery.

When SMTP is not configured the message is logged instead of sent, and the
action link is returned to the caller so development flows stay usable.
"""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def build_action_url(path: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}{path if path.startswith('/') else f'/{path}'}"


def _deliver(message: EmailMessage) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
        if settings.smtp_use_tls:
            client.starttls()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)


async def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.smtp_configured:
        logger.info("SMTP not configured. Email to %s: %s\n%s", to, subject, body)
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    try:
        await asyncio.to_thread(_deliver, message)
        return True
    except Exception:
        logger.exception("Could not deliver email to %s", to)
        return False


async def send_verification_email(to: str, display_name: str, token: str) -> str:
    link = build_action_url(f"/verify-email?token={token}")
    body = (
        f"Hi {display_name or 'there'},\n\n"
        "Confirm your email address to finish setting up TickMe:\n"
        f"{link}\n\n"
        f"This link expires in {settings.verification_token_expire_minutes // 60} hours. "
        "If you did not create an account, you can ignore this email."
    )
    await send_email(to, "Verify your TickMe email", body)
    return link


async def send_password_reset_email(to: str, display_name: str, token: str) -> str:
    link = build_action_url(f"/reset-password?token={token}")
    body = (
        f"Hi {display_name or 'there'},\n\n"
        "Use this link to choose a new TickMe password:\n"
        f"{link}\n\n"
        f"The link expires in {settings.password_reset_token_expire_minutes} minutes. "
        "If you did not request a reset, no action is needed."
    )
    await send_email(to, "Reset your TickMe password", body)
    return link
