from datetime import datetime, timedelta, timezone
from pathlib import Path
import base64
import hashlib
import os
import secrets
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from jose import ExpiredSignatureError, JWTError, jwt


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    if ENVIRONMENT in {"production", "prod"}:
        raise RuntimeError("Falta JWT_SECRET_KEY en variables de entorno de produccion")
    JWT_SECRET_KEY = secrets.token_urlsafe(32)
PASSWORD_HASH_PREFIX = "$dam-bcrypt-sha256$"
BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))


def normalizar_password(password: str) -> str:
    if not isinstance(password, str):
        raise ValueError("La contrasena debe ser texto")

    password_limpio = password.strip()
    if not password_limpio:
        raise ValueError("La contrasena no puede estar vacia")

    return password_limpio


def normalizar_pin(pin: str, max_length: int = 32) -> str:
    pin_limpio = normalizar_password(pin)
    if len(pin_limpio) > max_length:
        raise ValueError("El PIN debe ser corto")
    return pin_limpio


def _bcrypt_secret(password: str) -> bytes:
    digest = hashlib.sha256(normalizar_password(password).encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    password_seguro = _bcrypt_secret(password)
    hashed = bcrypt.hashpw(password_seguro, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")
    return f"{PASSWORD_HASH_PREFIX}{hashed}"


def verify_password(password: str, password_hash: str) -> bool:
    if not isinstance(password_hash, str) or not password_hash:
        return False

    try:
        if password_hash.startswith(PASSWORD_HASH_PREFIX):
            hash_guardado = password_hash[len(PASSWORD_HASH_PREFIX):].encode("utf-8")
            return bcrypt.checkpw(_bcrypt_secret(password), hash_guardado)

        if password_hash.startswith("$2"):
            password_bytes = normalizar_password(password).encode("utf-8")
            if len(password_bytes) > 72:
                return False
            return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))
    except (TypeError, ValueError, bcrypt.BcryptError):
        return False

    return False


def verify_plain_password(password: str, plain_password: Optional[str]) -> bool:
    if not isinstance(plain_password, str) or not plain_password.strip():
        return False

    try:
        password_limpio = normalizar_password(password)
    except ValueError:
        return False

    return secrets.compare_digest(password_limpio, plain_password.strip())


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> tuple[str, datetime]:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire}
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


def decode_credentials(credentials: Optional[HTTPAuthorizationCredentials]) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesion requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesion expirada",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesion invalida",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
