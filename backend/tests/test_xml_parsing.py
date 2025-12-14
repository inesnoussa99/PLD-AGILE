import pytest
from app.import_xml import import_plan_xml, import_demande_xml
from app.models import Adresse, Livraison, Troncon
from sqlmodel import select

# Contenu fictif d'un plan XML
XML_PLAN_CONTENT = """<?xml version="1.0" encoding="UTF-8"?>
<reseau>
    <noeud id="1" latitude="45.75" longitude="4.85"/>
    <noeud id="2" latitude="45.76" longitude="4.86"/>
    <troncon destination="2" longueur="100.0" nomRue="Rue Test" origine="1"/>
</reseau>
"""

# Contenu fictif d'une demande XML
XML_DEMANDE_CONTENT = """<?xml version="1.0" encoding="UTF-8"?>
<demandeDeLivraisons>
    <entrepot adresse="1" heureDepart="8:00:00"/>
    <livraison adresseEnlevement="1" adresseLivraison="2" dureeEnlevement="10" dureeLivraison="20"/>
</demandeDeLivraisons>
"""

def test_import_plan_xml(session, tmp_path, mocker):
    """
    Teste l'importation d'un plan.
    Utilise 'tmp_path' (fixture pytest) pour créer un fichier temporaire
    et 'mocker' pour tromper le code sur l'emplacement du dossier data.
    """
    # 1. Créer le faux fichier XML
    dossier_test = tmp_path / "data"
    dossier_test.mkdir()
    fichier_xml = dossier_test / "plan_test.xml"
    fichier_xml.write_text(XML_PLAN_CONTENT, encoding="utf-8")

    # 2. On patche DATA_DIR pour qu'il pointe vers notre dossier temporaire
    mocker.patch("app.import_xml.DATA_DIR", dossier_test)

    # 3. Exécuter l'import
    count = import_plan_xml("plan_test.xml")

    # 4. Vérifications
    assert count == 2 # 2 noeuds
    
    # Vérifier en base
    adresses = session.exec(select(Adresse)).all()
    assert len(adresses) == 2
    assert adresses[0].id == "1"
    
    troncons = session.exec(select(Troncon)).all()
    assert len(troncons) == 1
    assert troncons[0].nomRue == "Rue Test"

def test_import_demande_xml(session, tmp_path, mocker):
    """Teste l'importation d'une demande de livraison"""
    # 1. Pré-requis : Il faut charger le plan d'abord (noeuds 1 et 2)
    # On réutilise la logique du test précédent ou on insère manuellement
    a1 = Adresse(id="1", latitude=0, longitude=0)
    a2 = Adresse(id="2", latitude=0, longitude=0)
    session.add(a1)
    session.add(a2)
    session.commit()

    # 2. Créer le faux fichier XML
    dossier_test = tmp_path / "data"
    # mkdir exist_ok=True car le dossier peut exister si le test précédent a tourné
    dossier_test.mkdir(exist_ok=True) 
    fichier_xml = dossier_test / "demande_test.xml"
    fichier_xml.write_text(XML_DEMANDE_CONTENT, encoding="utf-8")

    # 3. Patch du dossier data
    mocker.patch("app.import_xml.DATA_DIR", dossier_test)

    # 4. Exécuter l'import
    count = import_demande_xml("demande_test.xml")

    # 5. Vérifications
    assert count == 1
    livraisons = session.exec(select(Livraison)).all()
    assert len(livraisons) == 1
    assert livraisons[0].adresse_pickup_id == "1"
    assert livraisons[0].duree_pickup == 10