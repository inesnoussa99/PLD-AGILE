from pathlib import Path
import xml.etree.ElementTree as ET
from datetime import date, time as time_cls
from sqlmodel import Session, select, delete
from .database import engine
from .models import Adresse, Livraison, Programme, Troncon

# Chemin vers le dossier data
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def export_program_xml(filename: str) -> None:
    xml_path = filename
    print(f"Export du programme vers : {xml_path}")
    
    root = ET.Element("demandeDeLivraisons")
    
    with Session(engine) as session:
        programmes = session.exec(select(Programme)).all()
        
        for programme in programmes:
            entrepot =  ET.SubElement(root,"entrepot",{"adresse": programme.adresse_depart_id,"heureDepart": programme.date_depart.strftime("%H:%M:%S")})
            
            livraisons = session.exec(
                select(Livraison).where(Livraison.programme_id == programme.id)
            ).all()
            
            for livraison in livraisons:
                ET.SubElement(root, "livraison", {
                    "adresseEnlevement": livraison.adresse_pickup_id,
                    "adresseLivraison": livraison.adresse_delivery_id,
                    "dureeEnlevement": str(livraison.duree_pickup),
                    "dureeLivraison": str(livraison.duree_delivery),
                })
    
    tree = ET.ElementTree(root)
    tree.write(xml_path, encoding="utf-8", xml_declaration=True)
    print("Export terminé.")