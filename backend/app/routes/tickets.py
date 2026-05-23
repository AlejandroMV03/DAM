from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.services.ticket_service import aplicar_filtros_tickets, crear_ticket_pagado, serializar_ticket


router = APIRouter(prefix="/api", tags=["tickets"])


@router.post("/tickets", status_code=201)
def procesar_cobro(
    datos: schemas.TicketCrear,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    try:
        nuevo_ticket = crear_ticket_pagado(datos, usuario, db)
        db.commit()
        db.refresh(nuevo_ticket)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo registrar el cobro") from exc

    return {
        "mensaje": "Cobro registrado con exito",
        "ticket_id": nuevo_ticket.id,
    }


@router.get("/tickets", response_model=list[schemas.TicketRespuesta])
def obtener_tickets(
    fecha_inicio: Optional[str] = Query(default=None, alias="fechaInicio"),
    fecha_fin: Optional[str] = Query(default=None, alias="fechaFin"),
    cliente: Optional[str] = Query(default=None),
    folio: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    consulta = aplicar_filtros_tickets(
        db.query(models.Ticket),
        fecha_inicio,
        fecha_fin,
        cliente,
        folio,
    )
    tickets = consulta.order_by(models.Ticket.fecha_hora.desc()).limit(500).all()
    return [serializar_ticket(ticket, db) for ticket in tickets]


@router.get("/tickets/{ticket_id}", response_model=schemas.TicketRespuesta)
def obtener_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    return serializar_ticket(ticket, db)

