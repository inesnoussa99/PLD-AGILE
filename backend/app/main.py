# backend/app/main.py
from fastapi import FastAPI, HTTPException
from sqlmodel import Session, select
from .database import init_db, engine
from .models import Livraison, Adresse
from .import_xml import import_plan_xml, import_demande_xml

app = FastAPI()

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/livraisons")
def list_livraisons():
    with Session(engine) as session:
        livs = session.exec(select(Livraison)).all()
        return livs

@app.get("/adresses")
def list_adresses():
    """Route pour vérifier si les adresses sont là"""
    with Session(engine) as session:
        adresses = session.exec(select(Adresse)).limit(100).all()
        return adresses

@app.post("/import_plan/{filename}")
def import_plan(filename: str):
    try:
        count = import_plan_xml(filename)
        return {"status": "success", "message": f"{count} adresses importées depuis {filename}"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier XML non trouvé")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/import_demande/{filename}")
def import_demande(filename: str):
    try:
        count = import_demande_xml(filename)
        return {"status": "success", "message": f"{count} livraisons créées depuis {filename}"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier XML non trouvé")
    except ValueError as e:
        # Erreur si le plan n'a pas été chargé avant
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))