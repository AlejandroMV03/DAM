from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

URL_BASE_DE_DATOS = os.getenv("DATABASE_URL")

if not URL_BASE_DE_DATOS:
    raise RuntimeError("Falta DATABASE_URL en backend/.env")

engine = create_engine(URL_BASE_DE_DATOS)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

