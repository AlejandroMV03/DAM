from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.auth import create_access_token, hash_password, normalizar_pin, verify_password, verify_plain_password
from app.database import get_db
from app.dependencies import obtener_usuario_actual


router = APIRouter(prefix="/api", tags=["auth"])


class LoginRequest(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    pin_acceso: str = Field(..., min_length=4, max_length=32)

    @field_validator("nombre", "pin_acceso", mode="before")
    @classmethod
    def validar_texto_plano(cls, valor):
        if not isinstance(valor, str):
            raise ValueError("El usuario y el PIN deben enviarse como texto")
        return valor


@router.post("/login")
def iniciar_sesion(credenciales: LoginRequest, db: Session = Depends(get_db)):
    if not isinstance(credenciales.nombre, str) or not isinstance(credenciales.pin_acceso, str):
        raise HTTPException(status_code=422, detail="El usuario y el PIN deben enviarse como texto")

    nombre = credenciales.nombre.strip()
    try:
        pin_ingresado = normalizar_pin(credenciales.pin_acceso)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    usuario = (
        db.query(models.Usuario)
        .filter(func.lower(models.Usuario.nombre) == nombre.lower())
        .first()
    )

    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario incorrecto")

    pin_valido = False
    requiere_migracion = False
    requiere_limpieza_pin = False

    if isinstance(usuario.password_hash, str) and usuario.password_hash.strip():
        pin_valido = verify_password(pin_ingresado, usuario.password_hash)
        requiere_migracion = pin_valido and usuario.password_hash.startswith("$2")

    if not pin_valido and verify_plain_password(pin_ingresado, usuario.pin_acceso):
        pin_valido = True
        requiere_migracion = True

    if pin_valido and isinstance(usuario.pin_acceso, str) and usuario.pin_acceso.strip():
        requiere_limpieza_pin = True

    if not pin_valido:
        raise HTTPException(status_code=401, detail="Contrasena incorrecta")

    if requiere_migracion or requiere_limpieza_pin:
        if requiere_migracion:
            usuario.password_hash = hash_password(pin_ingresado)
        usuario.pin_acceso = None
        db.commit()
        db.refresh(usuario)

    token, expira = create_access_token(str(usuario.id))

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": expira.isoformat(),
        "usuario": {"id": usuario.id, "nombre": usuario.nombre},
    }


@router.get("/me")
def obtener_sesion(usuario: models.Usuario = Depends(obtener_usuario_actual)):
    return {"id": usuario.id, "nombre": usuario.nombre}

