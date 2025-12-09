import networkx as nx
import math
from app.routing import get_polar_angle, solve_tsp, calculate_multiple_tours, add_livraison
from app.models import Adresse, Livraison , Programme, Troncon
from datetime import date, time

from sqlmodel import select



def test_get_polar_angle():

    # Création de deux adresses fictives
    entrepot = Adresse(id="A", latitude=0, longitude=0)
    cible = Adresse(id="B", latitude=1, longitude=1) # 45 degrés (pi/4)
    
    angle = get_polar_angle(entrepot, cible)
    assert math.isclose(angle, math.pi/4, rel_tol=1e-5)

    cible_sud = Adresse(id="C", latitude=-1, longitude=0) # -90 degrés (-pi/2)
    angle_sud = get_polar_angle(entrepot, cible_sud)
    assert math.isclose(angle_sud, -math.pi/2, rel_tol=1e-5)

def test_solve_tsp_simple():
    """Vérifie qu'on trouve un chemin simple A -> B -> A"""
    G = nx.DiGraph()
    G.add_edge("entrepot", "pickup", weight=10)
    G.add_edge("pickup", "delivery", weight=10)
    G.add_edge("delivery", "entrepot", weight=10)
    

    livraison = Livraison(
        id=1, 
        adresse_pickup_id="pickup", 
        adresse_delivery_id="delivery", 
        duree_pickup=0, 
        duree_delivery=0, 
        date="2024-01-01"
    )

    resultat = solve_tsp(G, [livraison], warehouse_id="entrepot")
    assert resultat is not None
    assert resultat["total_distance"] == 30.0 # 10 + 10 + 10
    ids = [step["id"] for step in resultat["steps"]]
    assert ids == ["entrepot", "pickup", "delivery", "entrepot"]

def test_solve_tsp_no_path():
    """Vérifie que la fonction gère le cas où aucun chemin n'existe"""
    G = nx.DiGraph()
    G.add_edge("A", "B", weight=10)
    # Pas de lien retour vers A
    livraison = Livraison(id=1, adresse_pickup_id="B", adresse_delivery_id="C", duree_pickup=0, duree_delivery=0, date="2024-01-01")
    resultat = solve_tsp(G, [livraison], warehouse_id="A")
    assert resultat is None

def test_solve_tsp_interleaved():
    """
    Vérifie le cas où il est plus rapide de faire :
    Pickup 1 -> Pickup 2 -> Delivery 2 -> Delivery 1
    plutôt que de livrer le 1 tout de suite.
    """
    G = nx.DiGraph()
    # Configuration du graphe (W = Warehouse/Entrepôt)
    # W -> P1 (10km)
    G.add_edge("W", "P1", weight=10)
    
    # De P1, aller à D1 est très loin (100km), mais aller à P2 est tout près (10km)
    G.add_edge("P1", "D1", weight=100)
    G.add_edge("P1", "P2", weight=10)
    
    # De P2, on livre D2 (10km)
    G.add_edge("P2", "D2", weight=10)
    
    # De D2, on va enfin livrer D1 (10km)
    G.add_edge("D2", "D1", weight=10)
    
    # Retour à la maison
    G.add_edge("D1", "W", weight=10)
    
    # Définition des 2 livraisons
    l1 = Livraison(id=1, adresse_pickup_id="P1", adresse_delivery_id="D1", duree_pickup=0, duree_delivery=0, date=date(2024,1,1))
    l2 = Livraison(id=2, adresse_pickup_id="P2", adresse_delivery_id="D2", duree_pickup=0, duree_delivery=0, date=date(2024,1,1))
    
    resultat = solve_tsp(G, [l1, l2], warehouse_id="W")
    
    assert resultat is not None
    # Chemin attendu : W -> P1 -> P2 -> D2 -> D1 -> W
    ids = [step["id"] for step in resultat["steps"]]
    assert ids == ["W", "P1", "P2", "D2", "D1", "W"]
    # Coût total : 10+10+10+10+10 = 50 (bien mieux que le chemin naïf qui coûterait >100)
    assert resultat["total_distance"] == 50.0

def test_solve_tsp_greedy_choice():
    """
    Vérifie que l'algorithme choisit toujours le voisin le plus proche.
    Situation : À l'entrepôt, P1 est à 10km, P2 est à 50km.
    Il doit choisir P1 d'abord.
    """
    G = nx.DiGraph()
    G.add_edge("W", "P1", weight=10)
    G.add_edge("W", "P2", weight=50)
    
    # On relie tout pour que le chemin soit possible peu importe l'ordre
    G.add_edge("P1", "D1", weight=10)
    G.add_edge("D1", "P2", weight=10) # P2 devient proche une fois qu'on est à D1
    G.add_edge("P2", "D2", weight=10)
    G.add_edge("D2", "W", weight=10)
    
    # Liens inverses coûteux pour ne pas tenter l'algo (juste pour rendre le graphe connexe)
    G.add_edge("P2", "P1", weight=100) 

    l1 = Livraison(id=1, adresse_pickup_id="P1", adresse_delivery_id="D1", duree_pickup=0, duree_delivery=0, date=date(2024,1,1))
    l2 = Livraison(id=2, adresse_pickup_id="P2", adresse_delivery_id="D2", duree_pickup=0, duree_delivery=0, date=date(2024,1,1))
    
    resultat = solve_tsp(G, [l1, l2], warehouse_id="W")
    
    ids = [step["id"] for step in resultat["steps"]]
    # Il doit faire P1 en premier car 10 < 50
    assert ids == ["W", "P1", "D1", "P2", "D2", "W"]

def test_solve_tsp_unreachable_return():
    """Tout est possible sauf le retour à la fin."""
    G = nx.DiGraph()
    G.add_edge("W", "P", weight=10)
    G.add_edge("P", "D", weight=10)
    # Pas de lien D -> W
    
    liv = Livraison(id=1, adresse_pickup_id="P", adresse_delivery_id="D", duree_pickup=0, duree_delivery=0, date=date(2024,1,1))
    
    resultat = solve_tsp(G, [liv], warehouse_id="W")
    assert resultat is None

def test_solve_tsp_broken_delivery_link():
    """Possible d'aller au Pickup, mais impossible d'aller à la Delivery."""
    G = nx.DiGraph()
    G.add_edge("W", "P", weight=10)
    G.add_edge("D", "W", weight=10)
    # Lien P -> D manquant
    
    liv = Livraison(id=1, adresse_pickup_id="P", adresse_delivery_id="D", duree_pickup=0, duree_delivery=0, date=date(2024,1,1))
    
    resultat = solve_tsp(G, [liv], warehouse_id="W")
    assert resultat is None

def test_calculate_multiple_tours_integration(session):
    """
    Test d'intégration : On met des données en base et on lance le calcul global.
    """
    # 1. Setup : Créer un mini-graphe en base
    # Entrepôt (W) -> A (10km) -> B (10km) -> W (10km)
    adresses = [
        Adresse(id="W", latitude=0, longitude=0),
        Adresse(id="A", latitude=1, longitude=1),
        Adresse(id="B", latitude=2, longitude=2),
    ]
    session.add_all(adresses)
    
    troncons = [
        Troncon(origine_id="W", destination_id="A", longueur=10, nomRue="R1"),
        Troncon(origine_id="A", destination_id="B", longueur=10, nomRue="R2"),
        Troncon(origine_id="B", destination_id="W", longueur=10, nomRue="R3"),
        # Il faut que le graphe soit connexe pour les allers-retours
        Troncon(origine_id="A", destination_id="W", longueur=10, nomRue="R4"), 
        Troncon(origine_id="W", destination_id="B", longueur=20, nomRue="R5"),
        Troncon(origine_id="B", destination_id="A", longueur=10, nomRue="R6"),
    ]
    session.add_all(troncons)

    # Programme (Départ W)
    prog = Programme(id=1, date_depart=time(8,0), adresse_depart_id="W")
    session.add(prog)
    
    # Livraison (Pickup A -> Delivery B)
    liv = Livraison(
        adresse_pickup_id="A",
        adresse_delivery_id="B",
        duree_pickup=5,
        duree_delivery=5,
        date=date.today(),
        programme_id=1
    )
    session.add(liv)
    session.commit()

    # 2. Action : Calculer pour 1 livreur
    tours = calculate_multiple_tours(session, nb_livreurs=1)

    # 3. Assertions
    assert len(tours) == 1
    steps = tours[0]["steps"]
    # On attend : Entrepot -> Pickup A -> Delivery B -> Entrepot
    assert len(steps) == 4
    assert steps[1]["type"] == "PICKUP"
    assert steps[1]["id"] == "A"
    assert tours[0]["total_distance"] == 30.0 # 10+10+10

def test_add_livraison(session):
    """Teste la fonction d'ajout manuel de livraison"""
    # Setup programme
    prog = Programme(date_depart=time(8,0), adresse_depart_id="W")
    session.add(prog)
    session.commit()

    # Action
    add_livraison(
        session, 
        pickup_id="A", 
        delivery_id="B", 
        d_pickup=10, 
        d_delivery=20, 
        date_jour=date(2024, 5, 20)
    )

    # Vérif
    l = session.exec(select(Livraison)).first()
    assert l is not None
    assert l.adresse_pickup_id == "A"
    assert l.programme_id == prog.id