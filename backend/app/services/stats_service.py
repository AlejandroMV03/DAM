from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.utils.dates import a_hora_local, hoy_local, parsear_fecha, rango_datetime, validar_rango_fechas


MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
DIAS_CORTOS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]


def obtener_rango_estadisticas(periodo: str, fecha_inicio: Optional[str], fecha_fin: Optional[str]) -> tuple[date, date]:
    hoy = hoy_local()
    periodo_normalizado = periodo.lower()

    if periodo_normalizado == "dia":
        dia = parsear_fecha(fecha_inicio, "fechaInicio") or hoy
        return validar_rango_fechas(dia.isoformat(), dia.isoformat())

    if periodo_normalizado == "semana":
        inicio = parsear_fecha(fecha_inicio, "fechaInicio") or (hoy - timedelta(days=hoy.weekday()))
        fin = min(inicio + timedelta(days=6), hoy)
        return validar_rango_fechas(inicio.isoformat(), fin.isoformat())

    if periodo_normalizado == "mes":
        referencia = parsear_fecha(fecha_inicio, "fechaInicio") or hoy
        inicio = referencia.replace(day=1)
        fin = hoy if referencia.year == hoy.year and referencia.month == hoy.month else (
            referencia.replace(year=referencia.year + 1, month=1, day=1) - timedelta(days=1)
            if referencia.month == 12
            else referencia.replace(month=referencia.month + 1, day=1) - timedelta(days=1)
        )
        return validar_rango_fechas(inicio.isoformat(), fin.isoformat())

    if periodo_normalizado == "anio":
        referencia = parsear_fecha(fecha_inicio, "fechaInicio") or hoy
        inicio = referencia.replace(month=1, day=1)
        fin = hoy if referencia.year == hoy.year else referencia.replace(month=12, day=31)
        return validar_rango_fechas(inicio.isoformat(), fin.isoformat())

    if periodo_normalizado == "rango":
        return validar_rango_fechas(fecha_inicio, fecha_fin)

    raise HTTPException(status_code=422, detail="Periodo no valido")


def construir_series(periodo: str, inicio: date, fin: date):
    periodo_normalizado = periodo.lower()
    puntos = []

    if periodo_normalizado == "dia":
        for hora in range(24):
            clave = f"{hora:02d}:00"
            puntos.append({"clave": clave, "label": clave, "ventas": 0, "tickets": 0})
        return puntos

    if periodo_normalizado == "anio":
        mes_actual = inicio.replace(day=1)
        fin_mes = fin.replace(day=1)
        while mes_actual <= fin_mes:
            clave = mes_actual.strftime("%Y-%m")
            puntos.append(
                {
                    "clave": clave,
                    "label": f"{MESES_CORTOS[mes_actual.month - 1]} {mes_actual.year}",
                    "ventas": 0,
                    "tickets": 0,
                }
            )
            mes_actual = (
                mes_actual.replace(year=mes_actual.year + 1, month=1)
                if mes_actual.month == 12
                else mes_actual.replace(month=mes_actual.month + 1)
            )
        return puntos

    dia = inicio
    while dia <= fin:
        if periodo_normalizado == "semana":
            label = f"{DIAS_CORTOS[dia.weekday()]} {dia.day}"
        else:
            label = f"{dia.day} {MESES_CORTOS[dia.month - 1]}"
        puntos.append({"clave": dia.isoformat(), "label": label, "ventas": 0, "tickets": 0})
        dia += timedelta(days=1)

    return puntos


def clave_ticket_por_periodo(periodo: str, fecha: datetime) -> str:
    if periodo == "dia":
        return f"{fecha.hour:02d}:00"
    if periodo == "anio":
        return fecha.strftime("%Y-%m")
    return fecha.date().isoformat()


def construir_estadisticas(
    periodo: str,
    fecha_inicio: Optional[str],
    fecha_fin: Optional[str],
    db: Session,
):
    inicio, fin = obtener_rango_estadisticas(periodo, fecha_inicio, fecha_fin)
    inicio_dt, fin_dt = rango_datetime(inicio.isoformat(), fin.isoformat())

    tickets = (
        db.query(models.Ticket)
        .filter(models.Ticket.fecha_hora >= inicio_dt, models.Ticket.fecha_hora < fin_dt)
        .order_by(models.Ticket.fecha_hora.asc())
        .all()
    )

    puntos = construir_series(periodo, inicio, fin)
    indice_puntos = {punto["clave"]: punto for punto in puntos}
    servicios = defaultdict(lambda: {"nombre": "", "servicio": "", "categoria": "", "cantidad": 0, "total": 0})
    productos = defaultdict(lambda: {"nombre": "", "producto": "", "categoria": "Producto", "cantidad": 0, "total": 0})
    categorias_productos = defaultdict(lambda: {"nombre": "", "categoria": "", "cantidad": 0, "total": 0})
    ventas_por_dia = defaultdict(lambda: {"fecha": "", "total": 0, "tickets": 0})

    ingresos_totales = 0
    total_servicios = 0
    total_productos = 0

    for ticket in tickets:
        total = int(ticket.total or 0)
        ingresos_totales += total
        fecha = a_hora_local(ticket.fecha_hora)

        if fecha:
            clave = clave_ticket_por_periodo(periodo, fecha)
            if clave in indice_puntos:
                indice_puntos[clave]["ventas"] += total
                indice_puntos[clave]["tickets"] += 1

            clave_dia = fecha.date().isoformat()
            ventas_por_dia[clave_dia]["fecha"] = clave_dia
            ventas_por_dia[clave_dia]["total"] += total
            ventas_por_dia[clave_dia]["tickets"] += 1

        detalles = db.query(models.TicketDetalle).filter(models.TicketDetalle.ticket_id == ticket.id).all()

        for detalle in detalles:
            servicio = None
            producto = None
            categoria_producto = None
            if detalle.servicio_id:
                servicio = db.query(models.Servicio).filter(models.Servicio.id == detalle.servicio_id).first()
            if detalle.producto_id:
                producto = db.query(models.Producto).filter(models.Producto.id == detalle.producto_id).first()
            if detalle.categoria_producto_id:
                categoria_producto = (
                    db.query(models.CategoriaProducto)
                    .filter(models.CategoriaProducto.id == detalle.categoria_producto_id)
                    .first()
                )

            es_producto = (detalle.tipo or "servicio") == "producto"
            nombre = detalle.nombre or detalle.nombre_servicio or (
                producto.nombre if producto else servicio.nombre if servicio else "Concepto"
            )
            if es_producto:
                categoria = (
                    detalle.categoria_producto_nombre
                    or (categoria_producto.nombre if categoria_producto else None)
                    or "Producto"
                )
            else:
                categoria = detalle.categoria_servicio or (servicio.categoria if servicio else "General")
            cantidad = int(detalle.cantidad or 1)
            total_detalle = int(detalle.subtotal or detalle.precio_cobrado or 0)

            if es_producto:
                total_productos += total_detalle
                productos[nombre]["nombre"] = nombre
                productos[nombre]["producto"] = nombre
                productos[nombre]["cantidad"] += cantidad
                productos[nombre]["total"] += total_detalle
                productos[nombre]["categoria"] = categoria
                categorias_productos[categoria]["nombre"] = categoria
                categorias_productos[categoria]["categoria"] = categoria
                categorias_productos[categoria]["cantidad"] += cantidad
                categorias_productos[categoria]["total"] += total_detalle
            else:
                total_servicios += total_detalle
                servicios[nombre]["nombre"] = nombre
                servicios[nombre]["servicio"] = nombre
                servicios[nombre]["categoria"] = categoria
                servicios[nombre]["cantidad"] += cantidad
                servicios[nombre]["total"] += total_detalle

    servicios_ordenados = sorted(servicios.values(), key=lambda item: (item["cantidad"], item["total"]), reverse=True)[:8]
    productos_ordenados = sorted(productos.values(), key=lambda item: (item["cantidad"], item["total"]), reverse=True)[:8]
    categorias_productos_ordenadas = sorted(
        categorias_productos.values(),
        key=lambda item: (item["cantidad"], item["total"]),
        reverse=True,
    )[:8]
    productos_stock_bajo = (
        db.query(models.Producto)
        .filter(models.Producto.activo == True, models.Producto.stock <= models.Producto.stock_minimo)
        .order_by(models.Producto.stock.asc(), models.Producto.nombre.asc())
        .limit(8)
        .all()
    )
    stock_bajo = [
        {
            "id": producto.id,
            "nombre": producto.nombre,
            "stock": int(producto.stock or 0),
            "stock_minimo": int(producto.stock_minimo or 0),
        }
        for producto in productos_stock_bajo
    ]
    mejor_dia = max(ventas_por_dia.values(), key=lambda item: item["total"], default=None)
    cantidad_tickets = len(tickets)
    ventas = [punto["ventas"] for punto in puntos]
    labels = [punto["label"] for punto in puntos]
    promedio = round(ingresos_totales / cantidad_tickets) if cantidad_tickets else 0

    return {
        "periodo": periodo,
        "fechaInicio": inicio.isoformat(),
        "fechaFin": fin.isoformat(),
        "labels": labels,
        "ventas": ventas,
        "puntos": puntos,
        "total": ingresos_totales,
        "totalServicios": total_servicios,
        "totalProductos": total_productos,
        "tickets": cantidad_tickets,
        "promedio": promedio,
        "serviciosMasVendidos": servicios_ordenados,
        "productosMasVendidos": productos_ordenados,
        "categoriasProductosMasVendidas": categorias_productos_ordenadas,
        "stockBajo": stock_bajo,
        "servicioMasVendido": servicios_ordenados[0] if servicios_ordenados else None,
        "productoMasVendido": productos_ordenados[0] if productos_ordenados else None,
        "mejorDiaVenta": mejor_dia,
        "ingresos_totales": ingresos_totales,
        "total_servicios": total_servicios,
        "total_productos": total_productos,
        "cantidad_tickets": cantidad_tickets,
        "promedio_venta": promedio,
        "servicios_mas_vendidos": servicios_ordenados,
        "productos_mas_vendidos": productos_ordenados,
        "categorias_productos_mas_vendidas": categorias_productos_ordenadas,
        "stock_bajo": stock_bajo,
    }
