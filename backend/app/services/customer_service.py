from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas


def obtener_o_crear_cliente(datos: schemas.TicketCrear, db: Session):
    if datos.cliente_id:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == datos.cliente_id).first()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return cliente

    if not datos.cliente:
        return None

    cliente_existente = (
        db.query(models.Cliente)
        .filter(func.lower(models.Cliente.nombre) == datos.cliente.nombre.lower())
        .first()
    )

    if cliente_existente:
        if datos.cliente.telefono and cliente_existente.telefono != datos.cliente.telefono:
            cliente_existente.telefono = datos.cliente.telefono
        return cliente_existente

    cliente = models.Cliente(
        nombre=datos.cliente.nombre,
        telefono=datos.cliente.telefono,
        correo=datos.cliente.correo,
    )
    db.add(cliente)
    db.flush()
    return cliente

