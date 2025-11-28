import networkx as nx
from sqlmodel import Session, select
from .models import Troncon, Livraison, Programme

def build_graph(session: Session) -> nx.DiGraph:
    """
    Construit un graphe orienté NetworkX à partir des tronçons en base de données.
    """
    troncons = session.exec(select(Troncon)).all()
    G = nx.DiGraph()
    
    # On ajoute les arêtes avec l'attribut 'weight' pour la longueur
    for t in troncons:
        G.add_edge(t.origine_id, t.destination_id, weight=t.longueur)
    
    return G

def calculate_tour(session: Session):
    """
    Calcule une tournée heuristique (Nearest Neighbor) en utilisant NetworkX.
    """
    # 1. Préparation des données
    G = build_graph(session)
    livraisons = session.exec(select(Livraison)).all()
    programme = session.exec(select(Programme)).first()

    if not programme:
        return None

    warehouse = programme.adresse_depart_id
    
    # Dictionnaires pour accès rapide
    pickups = {l.adresse_pickup_id: l for l in livraisons}
    deliveries = {l.adresse_delivery_id: l for l in livraisons}
    
    # Au départ, seuls les points de Pickup sont des candidats
    candidates = set(pickups.keys())
    
    current_node = warehouse
    total_distance = 0
    full_path_ids = [] # Liste séquentielle des IDs de noeuds visités
    steps = [] # Liste structurée des étapes (Pickup, Delivery, etc.)

    # Ajout de l'étape de départ
    steps.append({"type": "ENTREPOT", "id": warehouse})

    # 2. Boucle principale (Tant qu'il y a des points à visiter)
    while candidates:
        try:
            # Calcul des distances vers TOUS les autres noeuds depuis la position actuelle
            # NetworkX le fait très efficacement avec Dijkstra "Single Source"
            lengths, paths = nx.single_source_dijkstra(G, current_node, weight='weight')
        except nx.NetworkXNoPath:
            print(f"Erreur: Impossible de trouver un chemin depuis {current_node}")
            return None

        # On cherche le candidat le plus proche parmi ceux accessibles
        # On filtre 'lengths' pour ne garder que les noeuds qui sont dans 'candidates'
        available_candidates = {node: dist for node, dist in lengths.items() if node in candidates}

        if not available_candidates:
            print("Erreur: Aucun candidat accessible (Graphe déconnecté ?)")
            return None

        # Sélection du plus proche (min sur la distance)
        nearest_node = min(available_candidates, key=available_candidates.get)
        distance_to_travel = available_candidates[nearest_node]
        path_to_travel = paths[nearest_node]

        # Mise à jour des totaux
        total_distance += distance_to_travel
        
        # On ajoute le chemin (sauf le premier point pour éviter les doublons A->B, B->C)
        if full_path_ids:
            full_path_ids.extend(path_to_travel[1:])
        else:
            full_path_ids.extend(path_to_travel)

        # Mise à jour de la position et des candidats
        current_node = nearest_node
        candidates.remove(current_node)

        # Logique métier : Pickup -> Delivery devient disponible
        if current_node in pickups:
            livraison = pickups[current_node]
            candidates.add(livraison.adresse_delivery_id)
            steps.append({"type": "PICKUP", "id": current_node, "livraison_id": livraison.id})
        elif current_node in deliveries:
            livraison = deliveries[current_node]
            steps.append({"type": "DELIVERY", "id": current_node, "livraison_id": livraison.id})

    # 3. Retour à l'entrepôt
    try:
        return_length = nx.shortest_path_length(G, current_node, warehouse, weight='weight')
        return_path = nx.shortest_path(G, current_node, warehouse, weight='weight')
        
        total_distance += return_length
        full_path_ids.extend(return_path[1:])
        steps.append({"type": "ENTREPOT_FIN", "id": warehouse})
        
    except nx.NetworkXNoPath:
        print("Erreur: Impossible de retourner à l'entrepôt.")
        return None

    return {
        "total_distance": total_distance,
        "full_path_ids": full_path_ids,
        "steps": steps
    }
""" 
def compute_path_for_animation(
    session: Session,
    origine_id: str,
    destination_id: str,
    vitesse_kmh: float = 15.0,
) -> Optional[Dict]:
    #Calcule le plus court chemin entre deux adresses et retourne
    #une liste d'étapes numérotées avec coordonnées, distance cumulée
    #et temps cumulé (pour animer le livreur côté front).

    #- vitesse_kmh : vitesse moyenne du livreur (ex : 15 km/h à vélo)
    
    # On construit le graphe et on utilise le Dijkstra existant
    graph = build_graph(session)
    path, distance_totale = dijkstra(graph, origine_id, destination_id)

    if path is None:
        return None

    # Récupérer les coordonnées des adresses utilisées dans le chemin
    adresses = session.exec(
        select(Adresse).where(Adresse.id.in_(path))
    ).all()
    adresse_map = {a.id: a for a in adresses}

    # Conversion vitesse km/h -> m/s (si 'longueur' est en mètres)
    vitesse_ms = vitesse_kmh / 3.6 if vitesse_kmh > 0 else 0.0

    steps = []
    distance_cumulee = 0.0

    for idx, node_id in enumerate(path):
        adresse = adresse_map.get(node_id)

        # On ajoute l'étape courante avec la distance cumulée actuelle
        step = {
            "step_index": idx,
            "adresse_id": node_id,
            "longitude": adresse.longitude if adresse else None,
            "latitude": adresse.latitude if adresse else None,
            "distance_cumulee": distance_cumulee,
        }

        if vitesse_ms > 0:
            step["temps_cumule"] = distance_cumulee / vitesse_ms
        else:
            step["temps_cumule"] = None

        steps.append(step)

        # Met à jour la distance pour la prochaine étape
        if idx < len(path) - 1:
            u = node_id
            v = path[idx + 1]

            longueur_arc = None
            for voisin, w in graph.get(u, []):
                if voisin == v:
                    longueur_arc = w
                    break

            if longueur_arc is not None:
                distance_cumulee += float(longueur_arc)

    return {
        "origine_id": origine_id,
        "destination_id": destination_id,
        "distance_totale": distance_totale,
        "vitesse_kmh": vitesse_kmh,
        "steps": steps,
    }
"""
