# backend/app/main.py
from fastapi import FastAPI
from .database import init_db, engine
from sqlmodel import Session, select
from .models import Livraison  # par ex, juste pour tester une route


app = FastAPI()


@app.on_event("startup")
def on_startup():
    # Création des tables au lancement du backend
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/livraisons")
def list_livraisons():
    with Session(engine) as session:
        livs = session.exec(select(Livraison)).all()
        return livs
    



