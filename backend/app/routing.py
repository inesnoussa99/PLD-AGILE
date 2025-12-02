import networkx as nx
import math
from sqlmodel import Session, select
from .models import Troncon, Livraison, Programme

def build_graph(session: Session) -> nx.DiGraph:
    """Construit le graphe complet."""
    troncons = session.exec(select(Troncon)).all()
    G = nx.DiGraph()
    for t in troncons:
        G.add_edge(t.origine_id, t.destination_id, weight=t.longueur)
    return G

def get_polar_angle(origin_node, target_node):
    """Calcule l'angle (en radians) entre l'origine et la cible."""
    dx = target_node.longitude - origin_node.longitude
    dy = target_node.latitude - origin_node.latitude
    return math.atan2(dy, dx)

def solve_tsp(G, livraisons, warehouse_id, color_hex="#2563eb"):
    """
    Résout le problème du voyageur de commerce pour une liste donnée de livraisons.
    Retourne un objet structure de tournée.
    """
    if not livraisons:
        return None

    pickups = {l.adresse_pickup_id: l for l in livraisons}
    deliveries = {l.adresse_delivery_id: l for l in livraisons}
    
    candidates = set(pickups.keys())
    
    current_node = warehouse_id
    total_distance = 0
    full_path_ids = []
    steps = []

    steps.append({"type": "ENTREPOT", "id": warehouse_id})

    while candidates:
        try:
            lengths, paths = nx.single_source_dijkstra(G, current_node, weight='weight')
        except nx.NetworkXNoPath:
            print(f"Erreur graphe: chemin impossible depuis {current_node}")
            return None

        available_candidates = {node: dist for node, dist in lengths.items() if node in candidates}

        if not available_candidates:
            break

        nearest_node = min(available_candidates, key=available_candidates.get)
        distance_to_travel = available_candidates[nearest_node]
        path_to_travel = paths[nearest_node]

        total_distance += distance_to_travel
        
        if full_path_ids:
            full_path_ids.extend(path_to_travel[1:])
        else:
            full_path_ids.extend(path_to_travel)

        current_node = nearest_node
        candidates.remove(current_node)

        if current_node in pickups:
            livraison = pickups[current_node]
            candidates.add(livraison.adresse_delivery_id)
            steps.append({"type": "PICKUP", "id": current_node, "livraison_id": livraison.id})
        elif current_node in deliveries:
            livraison = deliveries[current_node]
            steps.append({"type": "DELIVERY", "id": current_node, "livraison_id": livraison.id})

    try:
        return_length = nx.shortest_path_length(G, current_node, warehouse_id, weight='weight')
        return_path = nx.shortest_path(G, current_node, warehouse_id, weight='weight')
        
        total_distance += return_length
        full_path_ids.extend(return_path[1:])
        steps.append({"type": "ENTREPOT_FIN", "id": warehouse_id})
        
    except nx.NetworkXNoPath:
        print("Erreur: Impossible de retourner à l'entrepôt.")
        return None

    return {
        "total_distance": total_distance,
        "full_path_ids": full_path_ids,
        "steps": steps,
        "color": color_hex 
    }

def calculate_multiple_tours(session: Session, nb_livreurs: int):
    """
    Divise les livraisons par secteurs angulaires (Sweep) et calcule une tournée pour chaque livreur.
    """
    G = build_graph(session)
    all_livraisons = session.exec(select(Livraison)).all()
    programme = session.exec(select(Programme)).first()

    if not programme or not all_livraisons:
        return []

    warehouse_id = programme.adresse_depart_id
    
    from .models import Adresse
    warehouse_node = session.get(Adresse, warehouse_id)
    
    if nb_livreurs <= 1:
        tour = solve_tsp(G, all_livraisons, warehouse_id)
        return [tour] if tour else []

    livraisons_with_angle = []
    
    for liv in all_livraisons:
        pickup_node = session.get(Adresse, liv.adresse_pickup_id)
        if pickup_node:
            angle = get_polar_angle(warehouse_node, pickup_node)
            livraisons_with_angle.append((angle, liv))

    livraisons_with_angle.sort(key=lambda x: x[0])
    
    sorted_livraisons = [x[1] for x[1] in livraisons_with_angle]

    k = min(nb_livreurs, len(sorted_livraisons)) 
    chunk_size = math.ceil(len(sorted_livraisons) / k)
    
    tours = []
    colors = ["#2563eb", "#e11d48", "#16a34a", "#d97706", "#9333ea", "#0891b2"] 

    for i in range(k):
        
        start_idx = i * chunk_size
        end_idx = start_idx + chunk_size
        sub_group = sorted_livraisons[start_idx:end_idx]
        
        if not sub_group:
            continue

        color = colors[i % len(colors)]
        tour = solve_tsp(G, sub_group, warehouse_id, color)
        
        if tour:
            tours.append(tour)

    return tours

def add_livraison(session, pickup_id, delivery_id, d_pickup, d_delivery, date_jour):
    from .models import Livraison, Programme
    
    programme = session.exec(select(Programme)).first()
    if not programme:
        return 

    liv = Livraison(
        adresse_pickup_id=pickup_id,
        adresse_delivery_id=delivery_id,
        duree_pickup=d_pickup,
        duree_delivery=d_delivery,
        date=date_jour,
        programme_id=programme.id
    )
    session.add(liv)
    session.commit()