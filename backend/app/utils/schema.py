from pathlib import Path

from sqlalchemy import text

from app import models  # noqa: F401
from app.database import Base, engine


def aplicar_migraciones():
    Base.metadata.create_all(bind=engine)

    migrations_dir = Path(__file__).resolve().parents[2] / "migrations"
    if not migrations_dir.exists():
        return

    with engine.begin() as connection:
        for migration in sorted(migrations_dir.glob("*.sql")):
            statements = migration.read_text().split(";")
            for statement in statements:
                sql = statement.strip()
                if sql:
                    connection.execute(text(sql))
