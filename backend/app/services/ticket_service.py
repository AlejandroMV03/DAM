from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.services.customer_service import obtener_o_crear_cliente
from app.utils.dates import rango_datetime


def aplicar_filtros_tickets(
    consulta,
    fecha_inicio: Optional[str],
    fecha_fin: Optional[str],
    cliente: Optional[str],
    folio: Optional[str],
):
    inicio_dt, fin_dt = rango_datetime(fecha_inicio, fecha_fin)
    consulta = consulta.filter(models.Ticket.fecha_hora >= inicio_dt, models.Ticket.fecha_hora < fin_dt)

    if cliente and cliente.strip():
        consulta = consulta.filter(models.Ticket.nombre_cliente.ilike(f"%{cliente.strip()}%"))

    if folio and folio.strip():
        folio_limpio = "".join(caracter for caracter in folio if caracter.isdigit())
        if not folio_limpio:
            raise HTTPException(status_code=422, detail="El folio debe contener numeros")
        consulta = consulta.filter(models.Ticket.id == int(folio_limpio))

    return consulta


def construir_conceptos(datos: schemas.TicketCrear, db: Session):
    conceptos = list(datos.conceptos)
    if conceptos or not datos.servicio_id:
        return conceptos

    servicio_legacy = db.query(models.Servicio).filter(models.Servicio.id == datos.servicio_id).first()
    if not servicio_legacy:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    categoria_legacy = None
    if servicio_legacy.categoria_id:
        categoria_legacy = db.query(models.Categoria).filter(models.Categoria.id == servicio_legacy.categoria_id).first()

    return [
        schemas.ConceptoTicketCrear(
            tipo="servicio",
            categoria_id=servicio_legacy.categoria_id,
            categoria_nombre=categoria_legacy.nombre if categoria_legacy else servicio_legacy.categoria,
            servicio_id=servicio_legacy.id,
            nombre=servicio_legacy.nombre,
            precio=int(servicio_legacy.precio),
            cantidad=1,
            subtotal=int(datos.total or servicio_legacy.precio),
        )
    ]


def crear_ticket_pagado(datos: schemas.TicketCrear, usuario: models.Usuario, db: Session):
    if datos.usuario_id != usuario.id:
        raise HTTPException(status_code=403, detail="La sesion no coincide con el cajero del ticket")

    conceptos = construir_conceptos(datos, db)
    if not conceptos:
        raise HTTPException(status_code=422, detail="El ticket requiere al menos un concepto")

    total_calculado = sum(concepto.subtotal or concepto.precio * concepto.cantidad for concepto in conceptos)
    if datos.total and datos.total != total_calculado:
        raise HTTPException(status_code=422, detail="El total no coincide con los conceptos del ticket")

    cliente = obtener_o_crear_cliente(datos, db)
    nuevo_ticket = models.Ticket(
        usuario_id=usuario.id,
        cliente_id=cliente.id if cliente else None,
        nombre_cliente=cliente.nombre if cliente else datos.cliente.nombre if datos.cliente else None,
        cajero_nombre=usuario.nombre,
        total=total_calculado,
        metodo_pago=datos.metodo_pago,
        estado="pagado",
    )
    db.add(nuevo_ticket)
    db.flush()

    for concepto in conceptos:
        servicio = None
        categoria = None
        if concepto.servicio_id:
            servicio = db.query(models.Servicio).filter(models.Servicio.id == concepto.servicio_id).first()
            if not servicio:
                raise HTTPException(status_code=404, detail="Servicio del ticket no encontrado")
            if servicio.categoria_id:
                categoria = db.query(models.Categoria).filter(models.Categoria.id == servicio.categoria_id).first()
        elif concepto.categoria_id:
            categoria = db.query(models.Categoria).filter(models.Categoria.id == concepto.categoria_id).first()

        categoria_nombre = (
            concepto.categoria_nombre
            or (categoria.nombre if categoria else None)
            or (servicio.categoria if servicio else None)
        )
        nombre_concepto = concepto.nombre or (servicio.nombre if servicio else "Concepto")
        subtotal = concepto.subtotal or concepto.precio * concepto.cantidad

        detalle = models.TicketDetalle(
            ticket_id=nuevo_ticket.id,
            tipo=concepto.tipo,
            categoria_id=concepto.categoria_id or (servicio.categoria_id if servicio else None),
            servicio_id=concepto.servicio_id,
            nombre=nombre_concepto,
            nombre_servicio=nombre_concepto,
            categoria_servicio=categoria_nombre,
            precio_cobrado=concepto.precio,
            cantidad=concepto.cantidad,
            subtotal=subtotal,
        )
        db.add(detalle)

    return nuevo_ticket


def serializar_ticket(ticket: models.Ticket, db: Session):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == ticket.usuario_id).first()
    cliente = None
    if ticket.cliente_id:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == ticket.cliente_id).first()

    detalles = (
        db.query(models.TicketDetalle)
        .filter(models.TicketDetalle.ticket_id == ticket.id)
        .order_by(models.TicketDetalle.id.asc())
        .all()
    )

    usuario_nombre = ticket.cajero_nombre or (usuario.nombre if usuario else None)
    cliente_nombre = ticket.nombre_cliente or (cliente.nombre if cliente else None)
    conceptos = []

    for detalle in detalles:
        servicio = None
        categoria = None
        if detalle.servicio_id:
            servicio = db.query(models.Servicio).filter(models.Servicio.id == detalle.servicio_id).first()
        if detalle.categoria_id:
            categoria = db.query(models.Categoria).filter(models.Categoria.id == detalle.categoria_id).first()

        categoria_nombre = detalle.categoria_servicio or (categoria.nombre if categoria else None) or (
            servicio.categoria if servicio else None
        )
        nombre = detalle.nombre or detalle.nombre_servicio or (servicio.nombre if servicio else "Concepto")
        precio = int(detalle.precio_cobrado or 0)
        cantidad = int(detalle.cantidad or 1)
        subtotal = int(detalle.subtotal or precio * cantidad)

        conceptos.append(
            {
                "id": detalle.id,
                "tipo": detalle.tipo or "servicio",
                "categoria_id": detalle.categoria_id,
                "categoria_nombre": categoria_nombre,
                "servicio_id": detalle.servicio_id,
                "nombre": nombre,
                "precio": precio,
                "cantidad": cantidad,
                "subtotal": subtotal,
            }
        )

    primer_concepto = conceptos[0] if conceptos else None

    return {
        "id": ticket.id,
        "usuario_id": ticket.usuario_id,
        "usuario_nombre": usuario_nombre,
        "cliente_id": ticket.cliente_id,
        "cliente_nombre": cliente_nombre,
        "cliente_telefono": cliente.telefono if cliente else None,
        "servicio_id": primer_concepto["servicio_id"] if primer_concepto else None,
        "servicio_nombre": primer_concepto["nombre"] if primer_concepto else None,
        "categoria_servicio": primer_concepto["categoria_nombre"] if primer_concepto else None,
        "precio_servicio": primer_concepto["precio"] if primer_concepto else int(ticket.total),
        "conceptos": conceptos,
        "subtotal": sum(concepto["subtotal"] for concepto in conceptos) if conceptos else int(ticket.total),
        "fecha_hora": ticket.fecha_hora.isoformat() if ticket.fecha_hora else None,
        "total": int(ticket.total),
        "metodo_pago": ticket.metodo_pago,
        "estado": ticket.estado or "pagado",
    }

