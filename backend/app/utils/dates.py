from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import HTTPException


def parsear_fecha(valor: Optional[str], nombre: str) -> Optional[date]:
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"{nombre} debe tener formato YYYY-MM-DD") from exc


def validar_rango_fechas(fecha_inicio: Optional[str], fecha_fin: Optional[str]) -> tuple[date, date]:
    hoy = date.today()
    inicio = parsear_fecha(fecha_inicio, "fechaInicio")
    fin = parsear_fecha(fecha_fin, "fechaFin")

    if not inicio and not fin:
        inicio = hoy
        fin = hoy
    elif inicio and not fin:
        fin = inicio
    elif fin and not inicio:
        inicio = fin

    if inicio > fin:
        raise HTTPException(status_code=422, detail="La fecha inicial no puede ser mayor que la fecha final")
    if inicio > hoy or fin > hoy:
        raise HTTPException(status_code=422, detail="No se pueden consultar ventas de fechas futuras")

    return inicio, fin


def rango_datetime(fecha_inicio: Optional[str], fecha_fin: Optional[str]) -> tuple[datetime, datetime]:
    inicio, fin = validar_rango_fechas(fecha_inicio, fecha_fin)
    inicio_dt = datetime.combine(inicio, time.min)
    fin_dt = datetime.combine(fin + timedelta(days=1), time.min)
    return inicio_dt, fin_dt

