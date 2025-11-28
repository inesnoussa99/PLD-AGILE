# backend/app/main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
import shutil
import os
from sqlmodel import Session, select
from .database import init_db, engine
from .models import Livraison, Adresse
from .import_xml import import_plan_xml, import_demande_xml
from .routing import compute_shortest_path 

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
    
@app.get("/plus_court_chemin")
def plus_court_chemin(origine_id: str, destination_id: str):
    with Session(engine) as session:
        path, distance = compute_shortest_path(session, origine_id, destination_id)
        if path is None:
            raise HTTPException(
                status_code=404,
                detail=f"Aucun chemin trouvé entre {origine_id} et {destination_id}",
            )
        return {
            "origine": origine_id,
            "destination": destination_id,
            "distance": distance,
            "path": path,
        }

@app.get("/add_livraison")
def add_livraison_api(adresse_pickup_id: str, adresse_delivery_id: str, duree_pickup: int, duree_delivery: int):
    from .routing import add_livraison
    from datetime import date
    add_livraison(Session(engine), adresse_pickup_id, adresse_delivery_id, duree_pickup, duree_delivery, date.today())
    return {"status": "success", "message": "Livraison ajoutée"}

@app.post("/upload_plan")
async def upload_plan(file: UploadFile = File(...)):
    try:
        
        file_location = f"data/{file.filename}"
        
        
        os.makedirs("data", exist_ok=True)
        
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        count = import_plan_xml(file_location) 
        
        # Pour l'instant, on retourne juste le succès
        return {"status": "success", "message": f"Fichier {file.filename} reçu et sauvegardé."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))