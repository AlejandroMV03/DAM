from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models


def buscar_categoria_por_nombre(db: Session, nombre: str):
    return (
        db.query(models.Categoria)
        .filter(func.lower(models.Categoria.nombre) == nombre.strip().lower())
        .first()
    )


def serializar_servicio(servicio: models.Servicio, db: Session):
    categoria = None
    if servicio.categoria_id:
        categoria = db.query(models.Categoria).filter(models.Categoria.id == servicio.categoria_id).first()

    categoria_nombre = categoria.nombre if categoria else servicio.categoria

    return {
        "id": servicio.id,
        "nombre": servicio.nombre,
        "categoria_id": servicio.categoria_id,
        "categoria": categoria_nombre,
        "categoria_nombre": categoria_nombre,
        "precio": int(servicio.precio),
        "activo": servicio.activo,
    }

