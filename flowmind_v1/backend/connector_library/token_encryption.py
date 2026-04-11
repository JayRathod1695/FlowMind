from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from config import TOKEN_ENCRYPTION_KEY


_FERNET: Fernet | None = None


def _get_fernet() -> Fernet:
    global _FERNET
    if _FERNET is not None:
        return _FERNET

    if not TOKEN_ENCRYPTION_KEY:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY is required")
    try:
        _FERNET = Fernet(TOKEN_ENCRYPTION_KEY.encode("utf-8"))
        return _FERNET
    except Exception as error:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY is invalid") from error


def encrypt(plaintext_token: str) -> str:
    token_value = plaintext_token.strip()
    if not token_value:
        raise ValueError("Token cannot be empty")
    encrypted_value = _get_fernet().encrypt(token_value.encode("utf-8"))
    return encrypted_value.decode("utf-8")


def decrypt(encrypted_token: str) -> str:
    token_value = encrypted_token.strip()
    if not token_value:
        raise ValueError("Encrypted token cannot be empty")
    try:
        decrypted_value = _get_fernet().decrypt(token_value.encode("utf-8"))
    except InvalidToken as error:
        raise RuntimeError("Encrypted token is invalid") from error
    return decrypted_value.decode("utf-8")
