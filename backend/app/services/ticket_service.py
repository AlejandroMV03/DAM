from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.services.customer_service import obtener_o_crear_cliente
from app.services.inventory_service import registrar_movimiento
from app.utils.dates import a_hora_local, ahora_local, rango_datetime


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


def preparar_conceptos_ticket(conceptos: list[schemas.ConceptoTicketCrear], db: Session):
    conceptos_preparados = []
    reservas_productos = {}

    for concepto in conceptos:
        cantidad = int(concepto.cantidad or 1)

        if concepto.tipo == "producto":
            producto = (
                db.query(models.Producto)
                .filter(models.Producto.id == concepto.producto_id)
                .with_for_update()
                .first()
            )
            if not producto or not producto.activo:
                raise HTTPException(status_code=404, detail="Producto del ticket no encontrado o inactivo")
            cantidad_reservada = reservas_productos.get(producto.id, 0)
            stock_disponible = int(producto.stock or 0) - cantidad_reservada
            if stock_disponible < cantidad:
                raise HTTPException(
                    status_code=422,
                    detail=f"Stock insuficiente para {producto.nombre}. Disponible: {max(stock_disponible, 0)}",
                )
            reservas_productos[producto.id] = cantidad_reservada + cantidad

            categoria_producto = (
                db.query(models.CategoriaProducto)
                .filter(models.CategoriaProducto.id == producto.categoria_producto_id)
                .first()
            )
            precio = int(producto.precio)
            subtotal = precio * cantidad

            conceptos_preparados.append(
                {
                    "tipo": "producto",
                    "servicio": None,
                    "categoria": None,
                    "producto": producto,
                    "categoria_producto": categoria_producto,
                    "nombre": producto.nombre,
                    "categoria_nombre": categoria_producto.nombre if categoria_producto else concepto.categoria_producto_nombre,
                    "precio": precio,
                    "cantidad": cantidad,
                    "subtotal": subtotal,
                }
            )
            continue

        servicio = db.query(models.Servicio).filter(models.Servicio.id == concepto.servicio_id).first()
        if not servicio:
            raise HTTPException(status_code=404, detail="Servicio del ticket no encontrado")

        categoria = None
        if servicio.categoria_id:
            categoria = db.query(models.Categoria).filter(models.Categoria.id == servicio.categoria_id).first()
        elif concepto.categoria_id:
            categoria = db.query(models.Categoria).filter(models.Categoria.id == concepto.categoria_id).first()

        categoria_nombre = (
            concepto.categoria_nombre
            or (categoria.nombre if categoria else None)
            or servicio.categoria
        )
        precio = int(servicio.precio)
        subtotal = precio * cantidad

        conceptos_preparados.append(
            {
                "tipo": "servicio",
                "servicio": servicio,
                "categoria": categoria,
                "producto": None,
                "categoria_producto": None,
                "nombre": servicio.nombre,
                "categoria_nombre": categoria_nombre,
                "precio": precio,
                "cantidad": cantidad,
                "subtotal": subtotal,
            }
        )

    return conceptos_preparados


def crear_ticket_pagado(datos: schemas.TicketCrear, usuario: models.Usuario, db: Session):
    if datos.usuario_id != usuario.id:
        raise HTTPException(status_code=403, detail="La sesion no coincide con el cajero del ticket")

    conceptos = construir_conceptos(datos, db)
    if not conceptos:
        raise HTTPException(status_code=422, detail="El ticket requiere al menos un concepto")

    conceptos_preparados = preparar_conceptos_ticket(conceptos, db)
    total_calculado = sum(concepto["subtotal"] for concepto in conceptos_preparados)
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
        fecha_hora=ahora_local(),
    )
    db.add(nuevo_ticket)
    db.flush()

    for concepto in conceptos_preparados:
        producto = concepto["producto"]
        servicio = concepto["servicio"]
        categoria_producto = concepto["categoria_producto"]

        if producto:
            stock_anterior = int(producto.stock or 0)
            stock_nuevo = stock_anterior - concepto["cantidad"]
            producto.stock = stock_nuevo
            registrar_movimiento(
                db,
                producto,
                "venta",
                concepto["cantidad"],
                stock_anterior,
                stock_nuevo,
                f"Venta en ticket #{nuevo_ticket.id}",
                nuevo_ticket.id,
            )

        detalle = models.TicketDetalle(
            ticket_id=nuevo_ticket.id,
            tipo=concepto["tipo"],
            categoria_id=servicio.categoria_id if servicio else None,
            servicio_id=servicio.id if servicio else None,
            producto_id=producto.id if producto else None,
            categoria_producto_id=categoria_producto.id if categoria_producto else None,
            categoria_producto_nombre=concepto["categoria_nombre"] if producto else None,
            nombre=concepto["nombre"],
            nombre_servicio=concepto["nombre"],
            categoria_servicio=concepto["categoria_nombre"] if servicio else None,
            precio_cobrado=concepto["precio"],
            cantidad=concepto["cantidad"],
            subtotal=concepto["subtotal"],
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
        producto = None
        categoria_producto = None
        if detalle.servicio_id:
            servicio = db.query(models.Servicio).filter(models.Servicio.id == detalle.servicio_id).first()
        if detalle.categoria_id:
            categoria = db.query(models.Categoria).filter(models.Categoria.id == detalle.categoria_id).first()
        if detalle.producto_id:
            producto = db.query(models.Producto).filter(models.Producto.id == detalle.producto_id).first()
        if detalle.categoria_producto_id:
            categoria_producto = (
                db.query(models.CategoriaProducto)
                .filter(models.CategoriaProducto.id == detalle.categoria_producto_id)
                .first()
            )

        es_producto = (detalle.tipo or "servicio") == "producto"
        if es_producto:
            categoria_nombre = detalle.categoria_producto_nombre or (
                categoria_producto.nombre if categoria_producto else None
            )
        else:
            categoria_nombre = detalle.categoria_servicio or (categoria.nombre if categoria else None) or (
                servicio.categoria if servicio else None
            )
        nombre = detalle.nombre or detalle.nombre_servicio or (
            producto.nombre if producto else servicio.nombre if servicio else "Concepto"
        )
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
                "producto_id": detalle.producto_id,
                "categoria_producto_id": detalle.categoria_producto_id,
                "categoria_producto_nombre": categoria_nombre if es_producto else None,
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
        "fecha_hora": a_hora_local(ticket.fecha_hora).isoformat() if ticket.fecha_hora else None,
        "total": int(ticket.total),
        "metodo_pago": ticket.metodo_pago,
        "estado": ticket.estado or "pagado",
    }
