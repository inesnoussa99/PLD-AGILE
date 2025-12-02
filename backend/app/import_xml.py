from pathlib import Path
import xml.etree.ElementTree as ET
from datetime import date, time as time_cls
from sqlmodel import Session, select, delete
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
        # ⚡ OPTIMISATION : On vide TOUT avant d'importer un nouveau plan
        # Cela évite de vérifier l'existence ligne par ligne (trop lent pour Grand Plan)
        print("Nettoyage de la base de données...")
        session.exec(delete(Livraison))
        session.exec(delete(Programme))
        session.exec(delete(Troncon))
        session.exec(delete(Adresse))
        session.commit()

        print("Début de l'insertion des noeuds...")
        # On prépare toutes les adresses en mémoire
        adresses_to_add = []
        for addr_el in root.findall("noeud"):
            adresse = Adresse(
                id=addr_el.attrib["id"],
                longitude=float(addr_el.attrib["longitude"]),
                latitude=float(addr_el.attrib["latitude"]),
            )
            adresses_to_add.append(adresse)
        
        # Insertion massive (beaucoup plus rapide)
        session.add_all(adresses_to_add)
        session.commit()
        count = len(adresses_to_add)
        print(f"{count} noeuds insérés.")

        print("Début de l'insertion des tronçons...")
        troncons_to_add = []
        for trancon_el in root.findall("troncon"):
            trancon = Troncon(
                destination_id=trancon_el.attrib["destination"],
                longueur=float(trancon_el.attrib["longueur"]),
                nomRue=trancon_el.attrib["nomRue"],
                origine_id=trancon_el.attrib["origine"],
            )
            troncons_to_add.append(trancon)
            
        session.add_all(troncons_to_add)
        session.commit()
        print(f"{len(troncons_to_add)} tronçons insérés.")

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
        # Nettoyage des livraisons précédentes
        session.exec(delete(Livraison))
        session.exec(delete(Programme))
        session.commit()

        # Vérification RAPIDE que l'entrepôt existe
        # (On utilise session.get qui est optimisé par clé primaire)
        entrepot_adresse = session.get(Adresse, adresse_entrepot_code)
        if not entrepot_adresse:
            raise ValueError(f"L'adresse de l'entrepôt {adresse_entrepot_code} n'existe pas. Avez-vous importé le bon plan ?")

        programme = Programme(
            date_depart=heure_depart,
            adresse_depart_id=entrepot_adresse.id,
        )
        session.add(programme)
        session.commit()
        session.refresh(programme)

        date_livraison = date.today()

        livraisons_to_add = []
        for liv_el in root.findall("livraison"):
            code_pickup = liv_el.attrib["adresseEnlevement"]
            code_delivery = liv_el.attrib["adresseLivraison"]
            
            # Note : On ne vérifie pas chaque adresse ici pour gagner du temps. 
            # Si une adresse manque, la contrainte de clé étrangère SQL lèvera une erreur, ce qui est plus sûr.
            
            livraison = Livraison(
                adresse_pickup_id=code_pickup,
                adresse_delivery_id=code_delivery,
                duree_pickup=int(liv_el.attrib["dureeEnlevement"]),
                duree_delivery=int(liv_el.attrib["dureeLivraison"]),
                date=date_livraison,
                programme_id=programme.id,
            )
            livraisons_to_add.append(livraison)
            nb_livraisons += 1

        session.add_all(livraisons_to_add)
        session.commit()
    
    return nb_livraisons