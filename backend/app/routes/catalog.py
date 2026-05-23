from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.services.catalog_service import buscar_categoria_por_nombre, serializar_servicio


router = APIRouter(prefix="/api", tags=["catalogo"])


@router.get("/categorias", response_model=list[schemas.CategoriaRespuesta])
def obtener_categorias(
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(models.Categoria)
    if not incluir_inactivas:
        consulta = consulta.filter(models.Categoria.activa == True)
    return consulta.order_by(models.Categoria.nombre.asc()).all()


@router.post("/categorias", response_model=schemas.CategoriaRespuesta, status_code=201)
def crear_categoria(
    categoria: schemas.CategoriaCrear,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    existente = buscar_categoria_por_nombre(db, categoria.nombre)
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe una categoria con ese nombre")

    nueva_categoria = models.Categoria(
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
        raise HTTPException(status_code=500, detail="No se pudo guardar la categoria") from exc

    return nueva_categoria


@router.put("/categorias/{categoria_id}", response_model=schemas.CategoriaRespuesta)
def actualizar_categoria(
    categoria_id: int,
    categoria_actualizada: schemas.CategoriaActualizar,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    categoria = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")

    duplicada = buscar_categoria_por_nombre(db, categoria_actualizada.nombre)
    if duplicada and duplicada.id != categoria_id:
        raise HTTPException(status_code=409, detail="Ya existe otra categoria con ese nombre")

    categoria.nombre = categoria_actualizada.nombre
    categoria.descripcion = categoria_actualizada.descripcion
    categoria.activa = categoria_actualizada.activa

    try:
        db.commit()
        db.refresh(categoria)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar la categoria") from exc

    return categoria


@router.delete("/categorias/{categoria_id}")
def eliminar_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    categoria = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")

    categoria.activa = False

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar la categoria") from exc

    return {"mensaje": "Categoria eliminada o desactivada correctamente"}


@router.post("/servicios", response_model=schemas.ServicioRespuesta, status_code=201)
def crear_servicio(
    servicio: schemas.ServicioCrear,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    categoria = db.query(models.Categoria).filter(models.Categoria.id == servicio.categoria_id).first()
    if not categoria or not categoria.activa:
        raise HTTPException(status_code=404, detail="Categoria no encontrada o inactiva")

    duplicado = (
        db.query(models.Servicio)
        .filter(
            func.lower(models.Servicio.nombre) == servicio.nombre.lower(),
            models.Servicio.categoria_id == servicio.categoria_id,
            models.Servicio.activo == True,
        )
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=409, detail="Ya existe un servicio activo con ese nombre en la categoria")

    nuevo_servicio = models.Servicio(
        nombre=servicio.nombre,
        categoria_id=servicio.categoria_id,
        categoria=categoria.nombre,
        precio=servicio.precio,
        activo=servicio.activo,
    )

    try:
        db.add(nuevo_servicio)
        db.commit()
        db.refresh(nuevo_servicio)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar el servicio") from exc

    return serializar_servicio(nuevo_servicio, db)


@router.get("/servicios", response_model=list[schemas.ServicioRespuesta])
def obtener_servicios(
    categoria_id: Optional[int] = Query(default=None, alias="categoriaId"),
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    consulta = db.query(models.Servicio)
    if categoria_id:
        consulta = consulta.filter(models.Servicio.categoria_id == categoria_id)
    if not incluir_inactivos:
        consulta = consulta.filter(models.Servicio.activo == True)
    servicios = consulta.order_by(models.Servicio.nombre.asc()).all()
    return [serializar_servicio(servicio, db) for servicio in servicios]


@router.put("/servicios/{servicio_id}", response_model=schemas.ServicioRespuesta)
def actualizar_servicio(
    servicio_id: int,
    servicio_actualizado: schemas.ServicioActualizar,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    categoria = db.query(models.Categoria).filter(models.Categoria.id == servicio_actualizado.categoria_id).first()
    if not categoria or not categoria.activa:
        raise HTTPException(status_code=404, detail="Categoria no encontrada o inactiva")

    servicio.nombre = servicio_actualizado.nombre
    servicio.categoria_id = servicio_actualizado.categoria_id
    servicio.categoria = categoria.nombre
    servicio.precio = servicio_actualizado.precio
    servicio.activo = servicio_actualizado.activo

    try:
        db.commit()
        db.refresh(servicio)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar el servicio") from exc

    return serializar_servicio(servicio, db)


@router.delete("/servicios/{servicio_id}")
def eliminar_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    servicio.activo = False

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar el servicio") from exc

    return {"mensaje": "Servicio desactivado correctamente"}

