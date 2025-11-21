# backend/app/import_xml.py
from pathlib import Path
import xml.etree.ElementTree as ET
from datetime import date, time as time_cls
from sqlmodel import Session, select
from .database import engine
from .models import Adresse, Livraison, Programme, Troncon

# Chemin vers le dossier data
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def import_plan_xml(filename: str) -> int:
    xml_path = DATA_DIR / filename
    if not xml_path.exists():
        raise FileNotFoundError(f"Fichier XML introuvable : {xml_path}")
    
    print(f"Import du plan : {xml_path}")
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    count = 0
    with Session(engine) as session:
        # On peut vider la table Adresse si nécessaire, ou juste ajouter
        # Pour l'instant on ajoute seulement ceux qui n'existent pas
        
        for addr_el in root.findall("noeud"):
            adress_id = addr_el.attrib["id"]
            coord_x = float(addr_el.attrib["longitude"])
            coord_y = float(addr_el.attrib["latitude"])

            # Vérif existence (optionnel si on veut écraser)
            existing = session.get(Adresse, adress_id)
            if existing:
                continue

            adresse = Adresse(
                id=adress_id,
                longitude=coord_x,
                latitude=coord_y,
            )
            session.add(adresse)
            count += 1
        
        session.commit()
        for trancon_el in root.findall("troncon"):
            trancon = Troncon(
                destination_id = trancon_el.attrib["destination"],
                longueur = float(trancon_el.attrib["longueur"]),
                nomRue = trancon_el.attrib["nomRue"],
                origine_id = trancon_el.attrib["origine"],
            )
            session.add(trancon)
        session.commit()
    return count

def import_demande_xml(filename: str) -> int:
    xml_path = DATA_DIR / filename
    if not xml_path.exists():
        raise FileNotFoundError(f"Fichier XML introuvable : {xml_path}")

    print(f"Import de la demande : {xml_path}")
    tree = ET.parse(xml_path)
    root = tree.getroot()

    entrepot_el = root.find("entrepot")
    if entrepot_el is None:
        raise ValueError("Pas de balise <entrepot> dans le XML")

    adresse_entrepot_code = entrepot_el.attrib["adresse"]
    heure_depart_str = entrepot_el.attrib["heureDepart"]
    
    h, m, s = map(int, heure_depart_str.split(":"))
    heure_depart = time_cls(h, m, s)

    nb_livraisons = 0
    with Session(engine) as session:
        # Vérification que l'entrepôt existe dans le PLAN
        entrepot_adresse = session.get(Adresse, adresse_entrepot_code)
        if not entrepot_adresse:
            raise ValueError(f"L'adresse de l'entrepôt {adresse_entrepot_code} n'existe pas. Avez-vous importé le plan ?")

        programme = Programme(
            date_depart=heure_depart,
            adresse_depart_id=entrepot_adresse.id,
        )
        session.add(programme)
        session.commit()
        session.refresh(programme)

        date_livraison = date.today()

        for liv_el in root.findall("livraison"):
            code_pickup = liv_el.attrib["adresseEnlevement"]
            code_delivery = liv_el.attrib["adresseLivraison"]
            duree_pickup = int(liv_el.attrib["dureeEnlevement"])
            duree_delivery = int(liv_el.attrib["dureeLivraison"])

            addr_pickup = session.get(Adresse, code_pickup)
            addr_delivery = session.get(Adresse, code_delivery)

            if not addr_pickup or not addr_delivery:
                print(f"Erreur: Adresse manquante (Pickup: {code_pickup}, Delivery: {code_delivery}). Livraison ignorée.")
                continue

            livraison = Livraison(
                adresse_pickup_id=addr_pickup.id,
                adresse_delivery_id=addr_delivery.id,
                duree_pickup=duree_pickup,
                duree_delivery=duree_delivery,
                date=date_livraison,
                programme_id=programme.id,
            )
            session.add(livraison)
            nb_livraisons += 1

        session.commit()
    
    return nb_livraisons
