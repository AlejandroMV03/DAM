from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.utils.dates import a_hora_local


def buscar_categoria_producto_por_nombre(db: Session, nombre: str):
    return (
        db.query(models.CategoriaProducto)
        .filter(func.lower(models.CategoriaProducto.nombre) == nombre.strip().lower())
        .first()
    )


def obtener_categoria_producto_activa(db: Session, categoria_id: int):
    categoria = (
        db.query(models.CategoriaProducto)
        .filter(models.CategoriaProducto.id == categoria_id)
        .first()
    )
    if not categoria or not categoria.activa:
        raise HTTPException(status_code=404, detail="Categoria de producto no encontrada o inactiva")
    return categoria


def serializar_categoria_producto(categoria: models.CategoriaProducto):
    return {
        "id": categoria.id,
        "nombre": categoria.nombre,
        "descripcion": categoria.descripcion,
        "activa": categoria.activa,
    }


def serializar_producto(producto: models.Producto, db: Session):
    categoria = (
        db.query(models.CategoriaProducto)
        .filter(models.CategoriaProducto.id == producto.categoria_producto_id)
        .first()
    )
    categoria_nombre = categoria.nombre if categoria else None

    return {
        "id": producto.id,
        "categoria_producto_id": producto.categoria_producto_id,
        "categoria_producto_nombre": categoria_nombre,
        "nombre": producto.nombre,
        "descripcion": producto.descripcion,
        "precio": int(producto.precio),
        "stock": int(producto.stock or 0),
        "stock_minimo": int(producto.stock_minimo or 0),
        "stock_bajo": int(producto.stock or 0) <= int(producto.stock_minimo or 0),
        "activo": producto.activo,
    }


def serializar_movimiento(movimiento: models.MovimientoInventario, db: Session):
    producto = db.query(models.Producto).filter(models.Producto.id == movimiento.producto_id).first()
    creado = a_hora_local(movimiento.created_at)

    return {
        "id": movimiento.id,
        "producto_id": movimiento.producto_id,
        "producto_nombre": producto.nombre if producto else None,
        "tipo_movimiento": movimiento.tipo_movimiento,
        "cantidad": int(movimiento.cantidad),
        "stock_anterior": int(movimiento.stock_anterior),
        "stock_nuevo": int(movimiento.stock_nuevo),
        "motivo": movimiento.motivo,
        "ticket_id": movimiento.ticket_id,
        "created_at": creado.isoformat() if creado else None,
    }


def registrar_movimiento(
    db: Session,
    producto: models.Producto,
    tipo_movimiento: str,
    cantidad: int,
    stock_anterior: int,
    stock_nuevo: int,
    motivo: Optional[str] = None,
    ticket_id: Optional[int] = None,
):
    if stock_nuevo < 0:
        raise HTTPException(status_code=422, detail="El stock no puede quedar negativo")

    movimiento = models.MovimientoInventario(
        producto_id=producto.id,
        tipo_movimiento=tipo_movimiento,
        cantidad=cantidad,
        stock_anterior=stock_anterior,
        stock_nuevo=stock_nuevo,
        motivo=motivo,
        ticket_id=ticket_id,
    )
    db.add(movimiento)
    return movimiento


def obtener_producto_para_movimiento(db: Session, producto_id: int):
    producto = (
        db.query(models.Producto)
        .filter(models.Producto.id == producto_id)
        .with_for_update()
        .first()
    )
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


def aplicar_entrada_inventario(db: Session, producto_id: int, cantidad: int, motivo: Optional[str] = None):
    producto = obtener_producto_para_movimiento(db, producto_id)
    stock_anterior = int(producto.stock or 0)
    stock_nuevo = stock_anterior + cantidad
    producto.stock = stock_nuevo
    registrar_movimiento(db, producto, "entrada", cantidad, stock_anterior, stock_nuevo, motivo or "Entrada de inventario")
    return producto


def aplicar_ajuste_inventario(db: Session, producto_id: int, stock_nuevo: int, motivo: Optional[str] = None):
    producto = obtener_producto_para_movimiento(db, producto_id)
    stock_anterior = int(producto.stock or 0)
    producto.stock = stock_nuevo
    registrar_movimiento(
        db,
        producto,
        "ajuste",
        stock_nuevo - stock_anterior,
        stock_anterior,
        stock_nuevo,
        motivo or "Ajuste manual de inventario",
    )
    return producto
