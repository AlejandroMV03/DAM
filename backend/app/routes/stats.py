from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.services.stats_service import construir_estadisticas


router = APIRouter(prefix="/api", tags=["estadisticas"])


@router.get("/estadisticas")
def obtener_estadisticas(
    periodo: str = Query(default="dia", pattern="^(dia|semana|mes|anio|rango)$"),
    fecha_inicio: Optional[str] = Query(default=None, alias="fechaInicio"),
    fecha_fin: Optional[str] = Query(default=None, alias="fechaFin"),
    db: Session = Depends(get_db),
    _usuario: models.Usuario = Depends(obtener_usuario_actual),
):
    return construir_estadisticas(periodo, fecha_inicio, fecha_fin, db)

