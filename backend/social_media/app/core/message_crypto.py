import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _get_cipher() -> Fernet:
    key = settings.message_encryption_key
    if not key:
        key = base64.urlsafe_b64encode(
            hashlib.sha256(settings.secret_key.encode("utf-8")).digest()
        ).decode("ascii")
    return Fernet(key.encode("ascii"))


def encrypt_message(content: str) -> str:
    return _get_cipher().encrypt(content.encode("utf-8")).decode("ascii")


def decrypt_message(content: str) -> str:
    try:
        return _get_cipher().decrypt(content.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, ValueError) as exc:
        raise ValueError("Unable to decrypt message content") from exc