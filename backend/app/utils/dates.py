from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException


DAM_TIMEZONE = ZoneInfo("America/Merida")


def ahora_local() -> datetime:
    return datetime.now(DAM_TIMEZONE)


def hoy_local() -> date:
    return ahora_local().date()


def a_hora_local(valor: Optional[datetime]) -> Optional[datetime]:
    if not valor:
        return None
    if valor.tzinfo is None:
        valor = valor.replace(tzinfo=timezone.utc)
    return valor.astimezone(DAM_TIMEZONE)


def parsear_fecha(valor: Optional[str], nombre: str) -> Optional[date]:
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"{nombre} debe tener formato YYYY-MM-DD") from exc


def validar_rango_fechas(fecha_inicio: Optional[str], fecha_fin: Optional[str]) -> tuple[date, date]:
    hoy = hoy_local()
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
    inicio_dt = datetime.combine(inicio, time.min, tzinfo=DAM_TIMEZONE)
    fin_dt = datetime.combine(fin + timedelta(days=1), time.min, tzinfo=DAM_TIMEZONE)
    return inicio_dt, fin_dt
