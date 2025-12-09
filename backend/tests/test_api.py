from app.models import Adresse, Livraison
from datetime import date, time

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_and_list_livraisons(client, session):
    # 1. Préparer des données directement en BDD (Arrange)
    adresse1 = Adresse(id="A", latitude=10.0, longitude=10.0)
    adresse2 = Adresse(id="B", latitude=20.0, longitude=20.0)
    session.add(adresse1)
    session.add(adresse2)
    session.commit()
    
    # Utiliser l'API pour ajouter une livraison (si l'endpoint existait en POST)
    # Ou insérer manuellement pour tester le GET
    liv = Livraison(
        adresse_pickup_id="A", 
        adresse_delivery_id="B", 
        duree_pickup=10, 
        duree_delivery=10, 
        date= date(2024, 1, 1)
    )
    session.add(liv)
    session.commit()

    # 2. Appeler l'API (Act)
    response = client.get("/livraisons")

    # 3. Vérifier (Assert)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["adresse_pickup_id"] == "A"

def test_calculer_tournee_sans_plan(client):
    """Doit échouer car la BDD est vide (pas de plan, pas de demande)"""
    response = client.get("/calculer_tournee?nb_livreurs=1")
    assert response.status_code == 500
    assert "Impossible de calculer" in response.json()["detail"]

def test_upload_endpoints_mock(client, mocker):
    """
    Exemple de test avec Mock pour éviter de lire de vrais fichiers XML.
    On 'mock' la fonction import_plan_xml pour qu'elle ne fasse rien 
    mais renvoie un succès.
    """
    # On empêche la vraie fonction de s'exécuter
    mocker.patch("app.main.import_plan_xml", return_value=150)
    mocker.patch("shutil.copyfileobj") # On empêche l'écriture fichier disque
    mocker.patch("os.makedirs")
    # Fichier fictif
    files = {'file': ('plan.xml', b'<xml>content</xml>', 'text/xml')}
    response = client.post("/upload_plan", files=files)
    assert response.status_code == 200
    assert "150 adresses" in response.json()["message"]