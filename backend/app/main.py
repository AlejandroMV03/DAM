from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.routes import auth, catalog, customers, health, stats, tickets
from app.utils.schema import aplicar_migraciones


ORIGENES_LOCALES = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


def obtener_origenes_permitidos():
    origenes = os.getenv("CORS_ORIGINS", "")
    if not origenes.strip():
        return ORIGENES_LOCALES
    return [origen.strip() for origen in origenes.split(",") if origen.strip()]


@asynccontextmanager
async def lifespan(_):
    aplicar_migraciones()
    yield


app = FastAPI(title="API Sistema DAM", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=obtener_origenes_permitidos(),
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
def manejar_error_sql(_, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error de base de datos. Verifica la conexion y migraciones del backend.",
            "error": exc.__class__.__name__,
        },
    )


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(customers.router)
app.include_router(tickets.router)
app.include_router(stats.router)
