# backend/app/import_xml.py

from pathlib import Path
import sys
import xml.etree.ElementTree as ET
from datetime import date, time as time_cls

from sqlmodel import Session, select

from .database import engine
from .models import Adresse, Livraison, Programme

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def get_or_create_adresse(session: Session, code: str) -> Adresse:
    """
    On utilise le champ Adresse.adresse pour stocker le code venant du XML
    (ex: "25610888"). On met des valeurs par défaut pour cp/coord_x/coord_y.
    """
    adresse = session.exec(
        select(Adresse).where(Adresse.adresse == code)
    ).first()
    if adresse:
        return adresse

    adresse = Adresse(
        adresse=code,
        cp="00000",      # valeur par défaut
        coord_x=0.0,     # à adapter plus tard si tu as de vraies coords
        coord_y=0.0,
    )
    session.add(adresse)
    session.commit()
    session.refresh(adresse)
    return adresse


def import_demande_xml(filename: str) -> None:
    """
    Importe un fichier demandeXXX.xml :
    - crée l'entrepôt comme Adresse
    - crée un Programme avec heure de départ
    - crée toutes les Livraisons liées à ce Programme
    """
    xml_path = DATA_DIR / filename
    if not xml_path.exists():
        raise FileNotFoundError(f"Fichier XML introuvable : {xml_path}")

    print(f"📂 Import du fichier {xml_path}")

    tree = ET.parse(xml_path)
    root = tree.getroot()

    entrepot_el = root.find("entrepot")
    if entrepot_el is None:
        raise ValueError("Pas de balise <entrepot> dans le XML")

    adresse_entrepot_code = entrepot_el.attrib["adresse"]
    heure_depart_str = entrepot_el.attrib["heureDepart"]  # ex: "8:0:0"

    # On convertit "8:0:0" -> time(8, 0, 0)
    h, m, s = map(int, heure_depart_str.split(":"))
    heure_depart = time_cls(h, m, s)

    with Session(engine) as session:
        # Entrepôt
        entrepot_adresse = get_or_create_adresse(session, adresse_entrepot_code)

        # Programme associé à ce fichier
        programme = Programme(
            date_depart=heure_depart,
            adresse_depart_id=entrepot_adresse.id,
        )
        session.add(programme)
        session.commit()
        session.refresh(programme)

        # Date des livraisons : pour l'instant, on met la date du jour
        date_livraison = date.today()

        nb_livraisons = 0
        for liv_el in root.findall("livraison"):
            code_pickup = liv_el.attrib["adresseEnlevement"]
            code_delivery = liv_el.attrib["adresseLivraison"]
            duree_pickup = int(liv_el.attrib["dureeEnlevement"])
            duree_delivery = int(liv_el.attrib["dureeLivraison"])

            addr_pickup = get_or_create_adresse(session, code_pickup)
            addr_delivery = get_or_create_adresse(session, code_delivery)

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

    print(f"✅ Import terminé pour {filename} : {nb_livraisons} livraisons créées.")


def main():
    if len(sys.argv) < 2:
        print("Utilisation : python -m app.import_xml <fichier1.xml> [fichier2.xml ...]")
        sys.exit(1)

    for arg in sys.argv[1:]:
        # on accepte "demandeGrand7" ou "demandeGrand7.xml"
        if not arg.endswith(".xml"):
            arg = arg + ".xml"
        import_demande_xml(arg)


if __name__ == "__main__":
    main()
