
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import shutil
import os
import tempfile
from sqlmodel import Session, select,delete
from .database import init_db, engine
from .models import Livraison, Adresse, Programme
from .import_xml import import_plan_xml, import_demande_xml
from .routing import calculate_multiple_tours, add_livraison
from datetime import time

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/calculer_tournee")
def calculer_tournee(nb_livreurs: int = 1): 
    with Session(engine) as session:
        try:
            results = calculate_multiple_tours(session, nb_livreurs)
            
            if not results:
                 raise HTTPException(
                    status_code=404, 
                    detail="Impossible de calculer. Vérifiez qu'un plan et une demande sont chargés."
                )
            return results
            
        except Exception as e:
            print(f"Erreur lors du calcul de tournée: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/add_livraison")
def add_livraison_api(adresse_pickup_id: str, adresse_delivery_id: str, duree_pickup: int, duree_delivery: int):
    from datetime import date
    add_livraison(Session(engine), adresse_pickup_id, adresse_delivery_id, duree_pickup, duree_delivery, date.today())
    return {"status": "success", "message": "Livraison ajoutée"}

@app.delete("/livraisons/{livraison_id}")
def delete_livraison(livraison_id: int):
    with Session(engine) as session:
        livraison = session.get(Livraison, livraison_id)
        if not livraison:
            raise HTTPException(status_code=404, detail="Livraison introuvable")
        
        session.delete(livraison)
        session.commit()
        return {"status": "success", "message": f"Livraison {livraison_id} supprimée"}

@app.get("/create_new_program")
def create_new_program_api(entrepot_adresse: str, heure_depart: str):
    try:
        with Session(engine) as session:
            print("Nettoyage de la base de données...")

            session.exec(delete(Livraison))
            session.exec(delete(Programme))
            session.commit()

            heure_obj = datetime.strptime(heure_depart, "%H:%M:%S").time()

            programme = Programme(
                date_depart=heure_obj,
                adresse_depart_id=entrepot_adresse,
            )

            session.add(programme)
            session.commit()
            session.refresh(programme)

        return {"status": "success", "message": "Nouveau programme créé"}

    except Exception as e:
        print(f"Erreur création programme: {e}")
        raise HTTPException(status_code=500, detail=str(e))

        
@app.post("/upload_plan")
async def upload_plan(file: UploadFile = File(...)):
    try:
        file_location = f"data/{file.filename}"
        os.makedirs("data", exist_ok=True)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        count = import_plan_xml(file.filename) 
        return {"status": "success", "message": f"Plan importé : {count} adresses."}
    except Exception as e:
        print(f"Erreur lors de l'upload : {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_demande")
async def upload_demande(file: UploadFile = File(...)):
    try:
        file_location = f"data/{file.filename}"
        os.makedirs("data", exist_ok=True)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print("UPLOAD PLAN")
        count = import_demande_xml(file.filename)
        return {"status": "success", "message": f"Demande chargée : {count} livraisons importées."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Erreur upload demande: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/plus_court_chemin_detaille")
def plus_court_chemin_detaille(
    origine_id: str,
    destination_id: str,
    vitesse_kmh: float = 15.0,
):
    try:
        with Session(engine) as session:
            details = compute_path_for_animation(
                session=session,
                origine_id=origine_id,
                destination_id=destination_id,
                vitesse_kmh=vitesse_kmh,
            )

        if details is None:
            raise HTTPException(
                status_code=404,
                detail="Aucun chemin trouvé entre ces deux adresses.",
            )

        return details

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/save_programme_xml")
def save_programme_xml():
    from .export_xml import export_program_xml
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as tmp_file:
        file_path = tmp_file.name
    
    try:
        with Session(engine) as session:
            export_program_xml(session, file_path)
            
        return FileResponse(
            path=file_path,
            media_type='application/xml',
            filename="programme.xml" 
        )

    except Exception as e:
        print(f"Erreur export programme: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du fichier : {e}")

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)