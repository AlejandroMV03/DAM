from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app import models, schemas
from app.database import get_db
from app.dependencies import obtener_usuario_actual


router = APIRouter(prefix="/api", tags=["clientes"])


@router.get("/clientes/buscar", response_model=list[schemas.ClienteRespuesta])
def buscar_cliente(
    nombre: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    return (
        db.query(models.Cliente)
        .filter(models.Cliente.nombre.ilike(f"%{nombre.strip()}%"))
        .order_by(models.Cliente.nombre.asc())
        .limit(10)
        .all()
    )


@router.post("/clientes", response_model=schemas.ClienteRespuesta, status_code=201)
def crear_cliente(
    cliente: schemas.ClienteCrear,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    nuevo_cliente = models.Cliente(
        nombre=cliente.nombre,
        telefono=cliente.telefono,
        correo=cliente.correo,
    )

    try:
        db.add(nuevo_cliente)
        db.commit()
        db.refresh(nuevo_cliente)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar el cliente") from exc

    return nuevo_cliente

