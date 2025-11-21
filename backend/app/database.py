import os
from sqlmodel import SQLModel, create_engine

# URL de la BDD (vient de docker-compose)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://appuser:apppassword@db:5432/livraisonsdb",
)

engine = create_engine(DATABASE_URL, echo=True)  # echo=True = logs SQL


def init_db() -> None:
    """
    Crée toutes les tables définies dans les classes SQLModel (table=True).
    """
    # IMPORTANT : importer les modèles pour que SQLModel les connaisse
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
