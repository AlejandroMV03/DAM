from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.services.inventory_service import (
    aplicar_ajuste_inventario,
    aplicar_entrada_inventario,
    buscar_categoria_producto_por_nombre,
    obtener_categoria_producto_activa,
    registrar_movimiento,
    serializar_categoria_producto,
    serializar_movimiento,
    serializar_producto,
)


router = APIRouter(prefix="/api", tags=["inventario"])


@router.get("/categorias-productos", response_model=list[schemas.CategoriaProductoRespuesta])
def obtener_categorias_productos(
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(models.CategoriaProducto)
    if not incluir_inactivas:
        consulta = consulta.filter(models.CategoriaProducto.activa == True)
    categorias = consulta.order_by(models.CategoriaProducto.nombre.asc()).all()
    return [serializar_categoria_producto(categoria) for categoria in categorias]


@router.post("/categorias-productos", response_model=schemas.CategoriaProductoRespuesta, status_code=201)
def crear_categoria_producto(
    categoria: schemas.CategoriaProductoCrear,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    existente = buscar_categoria_producto_por_nombre(db, categoria.nombre)
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe una categoria de producto con ese nombre")

    nueva_categoria = models.CategoriaProducto(
        nombre=categoria.nombre,
        descripcion=categoria.descripcion,
        activa=categoria.activa,
    )

    try:
        db.add(nueva_categoria)
        db.commit()
        db.refresh(nueva_categoria)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar la categoria de producto") from exc

    return serializar_categoria_producto(nueva_categoria)


@router.put("/categorias-productos/{categoria_id}", response_model=schemas.CategoriaProductoRespuesta)
def actualizar_categoria_producto(
    categoria_id: int,
    categoria_actualizada: schemas.CategoriaProductoActualizar,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    categoria = db.query(models.CategoriaProducto).filter(models.CategoriaProducto.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria de producto no encontrada")

    duplicada = buscar_categoria_producto_por_nombre(db, categoria_actualizada.nombre)
    if duplicada and duplicada.id != categoria_id:
        raise HTTPException(status_code=409, detail="Ya existe otra categoria de producto con ese nombre")

    categoria.nombre = categoria_actualizada.nombre
    categoria.descripcion = categoria_actualizada.descripcion
    categoria.activa = categoria_actualizada.activa

    try:
        db.commit()
        db.refresh(categoria)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar la categoria de producto") from exc

    return serializar_categoria_producto(categoria)


@router.delete("/categorias-productos/{categoria_id}")
def eliminar_categoria_producto(
    categoria_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    categoria = db.query(models.CategoriaProducto).filter(models.CategoriaProducto.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria de producto no encontrada")

    categoria.activa = False

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo desactivar la categoria de producto") from exc

    return {"mensaje": "Categoria de producto desactivada correctamente"}


@router.get("/productos", response_model=list[schemas.ProductoRespuesta])
def obtener_productos(
    categoria_id: Optional[int] = Query(default=None, alias="categoriaId"),
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(models.Producto)
    if categoria_id:
        consulta = consulta.filter(models.Producto.categoria_producto_id == categoria_id)
    if not incluir_inactivos:
        consulta = consulta.filter(models.Producto.activo == True)
    productos = consulta.order_by(models.Producto.nombre.asc()).all()
    return [serializar_producto(producto, db) for producto in productos]


@router.get("/productos/buscar", response_model=list[schemas.ProductoRespuesta])
def buscar_productos(
    nombre: str = Query(default=""),
    categoria_id: Optional[int] = Query(default=None, alias="categoriaId"),
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(models.Producto)
    if nombre.strip():
        consulta = consulta.filter(models.Producto.nombre.ilike(f"%{nombre.strip()}%"))
    if categoria_id:
        consulta = consulta.filter(models.Producto.categoria_producto_id == categoria_id)
    if not incluir_inactivos:
        consulta = consulta.filter(models.Producto.activo == True)
    productos = consulta.order_by(models.Producto.nombre.asc()).limit(30).all()
    return [serializar_producto(producto, db) for producto in productos]


@router.post("/productos", response_model=schemas.ProductoRespuesta, status_code=201)
def crear_producto(
    producto: schemas.ProductoCrear,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    categoria = obtener_categoria_producto_activa(db, producto.categoria_producto_id)
    duplicado = (
        db.query(models.Producto)
        .filter(
            func.lower(models.Producto.nombre) == producto.nombre.lower(),
            models.Producto.categoria_producto_id == producto.categoria_producto_id,
            models.Producto.activo == True,
        )
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=409, detail="Ya existe un producto activo con ese nombre en la categoria")

    nuevo_producto = models.Producto(
        categoria_producto_id=categoria.id,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        precio=producto.precio,
        stock=producto.stock,
        stock_minimo=producto.stock_minimo,
        activo=producto.activo,
    )

    try:
        db.add(nuevo_producto)
        db.flush()
        if producto.stock > 0:
            registrar_movimiento(
                db,
                nuevo_producto,
                "entrada",
                producto.stock,
                0,
                producto.stock,
                "Stock inicial",
            )
        db.commit()
        db.refresh(nuevo_producto)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar el producto") from exc

    return serializar_producto(nuevo_producto, db)


@router.put("/productos/{producto_id}", response_model=schemas.ProductoRespuesta)
def actualizar_producto(
    producto_id: int,
    producto_actualizado: schemas.ProductoActualizar,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).with_for_update().first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    categoria = obtener_categoria_producto_activa(db, producto_actualizado.categoria_producto_id)
    stock_anterior = int(producto.stock or 0)

    producto.categoria_producto_id = categoria.id
    producto.nombre = producto_actualizado.nombre
    producto.descripcion = producto_actualizado.descripcion
    producto.precio = producto_actualizado.precio
    producto.stock = producto_actualizado.stock
    producto.stock_minimo = producto_actualizado.stock_minimo
    producto.activo = producto_actualizado.activo

    try:
        if producto_actualizado.stock != stock_anterior:
            registrar_movimiento(
                db,
                producto,
                "ajuste",
                producto_actualizado.stock - stock_anterior,
                stock_anterior,
                producto_actualizado.stock,
                "Ajuste desde edicion de producto",
            )
        db.commit()
        db.refresh(producto)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar el producto") from exc

    return serializar_producto(producto, db)


@router.delete("/productos/{producto_id}")
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.activo = False

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo desactivar el producto") from exc

    return {"mensaje": "Producto desactivado correctamente"}


@router.get("/inventario/movimientos", response_model=list[schemas.MovimientoInventarioRespuesta])
def obtener_movimientos_inventario(
    producto_id: Optional[int] = Query(default=None, alias="productoId"),
    limite: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(models.MovimientoInventario)
    if producto_id:
        consulta = consulta.filter(models.MovimientoInventario.producto_id == producto_id)
    movimientos = consulta.order_by(models.MovimientoInventario.created_at.desc()).limit(limite).all()
    return [serializar_movimiento(movimiento, db) for movimiento in movimientos]


@router.post("/inventario/entrada", response_model=schemas.ProductoRespuesta)
def registrar_entrada_inventario(
    entrada: schemas.EntradaInventarioCrear,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    try:
        producto = aplicar_entrada_inventario(db, entrada.producto_id, entrada.cantidad, entrada.motivo)
        db.commit()
        db.refresh(producto)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo registrar la entrada de inventario") from exc

    return serializar_producto(producto, db)


@router.post("/inventario/ajuste", response_model=schemas.ProductoRespuesta)
def registrar_ajuste_inventario(
    ajuste: schemas.AjusteInventarioCrear,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    try:
        producto = aplicar_ajuste_inventario(db, ajuste.producto_id, ajuste.stock_nuevo, ajuste.motivo)
        db.commit()
        db.refresh(producto)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo registrar el ajuste de inventario") from exc

    return serializar_producto(producto, db)
