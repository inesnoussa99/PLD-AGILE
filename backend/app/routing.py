import networkx as nx
import math
import random
from sqlmodel import Session, select
from .models import Troncon, Livraison, Programme, Adresse

# --- PARAMÈTRES DES FOURMIS ---
ACO_ITERATIONS = 50     # Nombre de générations
ACO_ANT_COUNT = 20      # Nombre de fourmis par génération
ACO_ALPHA = 1.0         # Importance des phéromones
ACO_BETA = 2.0          # Importance de la distance (visibilité)
ACO_EVAPORATION = 0.5   # Vitesse d'évaporation des phéromones (0.5 = 50% par tour)
ACO_Q = 100.0           # Quantité de phéromone déposée

def build_graph(session: Session) -> nx.DiGraph:
    """Construit le graphe complet de la ville."""
    troncons = session.exec(select(Troncon)).all()
    G = nx.DiGraph()
    for t in troncons:
        G.add_edge(t.origine_id, t.destination_id, weight=t.longueur)
    return G

def get_polar_angle(origin_node, target_node):
    """Calcule l'angle pour le Sweep."""
    dx = target_node.longitude - origin_node.longitude
    dy = target_node.latitude - origin_node.latitude
    return math.atan2(dy, dx)

def precompute_distances(G, nodes_of_interest):
    """
    Calcule la matrice des distances réelles (Dijkstra) entre tous les points d'intérêt.
    C'est INDISPENSABLE pour que l'ACO soit rapide (évite de refaire Dijkstra 1000 fois).
    Retourne: dict[origine][destination] = distance
    """
    dist_matrix = {node: {} for node in nodes_of_interest}
    
    for start_node in nodes_of_interest:
        try:
            length, _ = nx.single_source_dijkstra(G, start_node, weight='weight')
            for target in nodes_of_interest:
                if target in length:
                    dist_matrix[start_node][target] = length[target]
                else:
                    dist_matrix[start_node][target] = float('inf')
        except nx.NetworkXNoPath:
            pass 
            
    return dist_matrix

def solve_tsp_aco(G, livraisons, warehouse_id, color_hex="#2563eb"):
    """
    Résout le TSP avec contraintes de précédence via ANT COLONY OPTIMIZATION.
    """
    if not livraisons:
        return None

    pickups = {l.adresse_pickup_id: l for l in livraisons}
    deliveries = {l.adresse_delivery_id: l for l in livraisons}
    
    poi_ids = set([warehouse_id]) | set(pickups.keys()) | set(deliveries.keys())
    poi_list = list(poi_ids)
    
    dist_matrix = precompute_distances(G, poi_list)
    
    pheromones = {i: {j: 1.0 for j in poi_list if i != j} for i in poi_list}

    best_tour = None
    best_distance = float('inf')

   
    for iteration in range(ACO_ITERATIONS):
        all_tours = []

        
        for _ in range(ACO_ANT_COUNT):
            current_node = warehouse_id
            visited = set([warehouse_id])
            tour_path = [warehouse_id]
            tour_dist = 0
            
            
           
            to_visit_pickups = set(pickups.keys())
            to_visit_deliveries = set(deliveries.keys())
            done_pickups = set()
            
            
            while to_visit_pickups or to_visit_deliveries:
                
                candidates = []
                
                
                candidates.extend(list(to_visit_pickups))
                
                
                available_deliveries = [
                    d_id for d_id in to_visit_deliveries 
                    if deliveries[d_id].adresse_pickup_id in done_pickups
                ]
                candidates.extend(available_deliveries)
                
                if not candidates:
                    break

                
                probabilities = []
                denom = 0.0
                
                for cand in candidates:
                    dist = dist_matrix[current_node].get(cand, float('inf'))
                    if dist == 0: dist = 0.1
                    
                    tau = pheromones[current_node][cand] 
                    eta = 1.0 / dist                    
                    
                    prob = (tau ** ACO_ALPHA) * (eta ** ACO_BETA)
                    probabilities.append(prob)
                    denom += prob
                
                if denom == 0:
                    next_node = random.choice(candidates)
                else:
                    
                    r = random.uniform(0, denom)
                    current_sum = 0
                    next_node = candidates[-1]
                    for i, cand in enumerate(candidates):
                        current_sum += probabilities[i]
                        if r <= current_sum:
                            next_node = cand
                            break
                
                
                tour_dist += dist_matrix[current_node][next_node]
                tour_path.append(next_node)
                current_node = next_node
                visited.add(next_node)
                
                
                if current_node in to_visit_pickups:
                    to_visit_pickups.remove(current_node)
                    done_pickups.add(current_node)
                elif current_node in to_visit_deliveries:
                    to_visit_deliveries.remove(current_node)

            
            return_dist = dist_matrix[current_node].get(warehouse_id, float('inf'))
            tour_dist += return_dist
            tour_path.append(warehouse_id)
            
            all_tours.append((tour_dist, tour_path))
            
            
            if tour_dist < best_distance:
                best_distance = tour_dist
                best_tour = tour_path

        
        for i in pheromones:
            for j in pheromones[i]:
                pheromones[i][j] *= (1.0 - ACO_EVAPORATION)
        
       
        for dist, path in all_tours:
            deposit = ACO_Q / dist if dist > 0 else 0
            for k in range(len(path) - 1):
                u, v = path[k], path[k+1]
                if v in pheromones[u]: 
                    pheromones[u][v] += deposit


    
    if not best_tour:
        return None
        
    final_full_path = []
    final_steps = []
    
    
    final_steps.append({"type": "ENTREPOT", "id": warehouse_id})
    
    
    for k in range(len(best_tour) - 1):
        u, v = best_tour[k], best_tour[k+1]
        
       
        try:
            path = nx.shortest_path(G, u, v, weight='weight')
            
            if final_full_path:
                final_full_path.extend(path[1:])
            else:
                final_full_path.extend(path)
            
            # Ajout de l'étape
            if v == warehouse_id:
                final_steps.append({"type": "ENTREPOT_FIN", "id": v})
            elif v in pickups:
                liv = pickups[v]
                final_steps.append({"type": "PICKUP", "id": v, "livraison_id": liv.id})
            elif v in deliveries:
                liv = deliveries[v]
                final_steps.append({"type": "DELIVERY", "id": v, "livraison_id": liv.id})
                
        except nx.NetworkXNoPath:
            print(f"Erreur reconstruction chemin {u}->{v}")
            return None

    return {
        "total_distance": best_distance,
        "full_path_ids": final_full_path,
        "steps": final_steps,
        "color": color_hex
    }


def calculate_multiple_tours(session: Session, nb_livreurs: int):
    """
    Divise les livraisons par secteurs (Sweep) et applique les Fourmis (ACO) sur chaque secteur.
    """
    G = build_graph(session)
    all_livraisons = session.exec(select(Livraison)).all()
    programme = session.exec(select(Programme)).first()

    if not programme or not all_livraisons:
        return []

    warehouse_id = programme.adresse_depart_id
    from .models import Adresse
    warehouse_node = session.get(Adresse, warehouse_id)

    livraisons_with_angle = []
    for liv in all_livraisons:
        pickup_node = session.get(Adresse, liv.adresse_pickup_id)
        if pickup_node:
            angle = get_polar_angle(warehouse_node, pickup_node)
            livraisons_with_angle.append((angle, liv))

    livraisons_with_angle.sort(key=lambda x: x[0])
    sorted_livraisons = [x[1] for x in livraisons_with_angle]

    k = min(nb_livreurs, len(sorted_livraisons))
    if k == 0: return []
    
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
        
       
        tour = solve_tsp_aco(G, sub_group, warehouse_id, color)
        
        if tour:
            tours.append(tour)

    return tours

def add_livraison(session, pickup_id, delivery_id, d_pickup, d_delivery, date_jour):
    from .models import Livraison, Programme
    programme = session.exec(select(Programme)).first()
    if not programme: return
    liv = Livraison(
        adresse_pickup_id=pickup_id, adresse_delivery_id=delivery_id,
        duree_pickup=d_pickup, duree_delivery=d_delivery,
        date=date_jour, programme_id=programme.id
    )
    session.add(liv)
    session.commit()


def compute_path_for_animation(session: Session, origine_id: str, destination_id: str, vitesse_kmh: float = 15.0):
    """
    Calcule le chemin détaillé (liste de nœuds) entre deux points pour l'animation.
    Utilisé par le frontend pour afficher le déplacement du livreur.
    """
    G = build_graph(session)
    
    try:
        path_ids = nx.shortest_path(G, source=origine_id, target=destination_id, weight='weight')
        distance_m = nx.shortest_path_length(G, source=origine_id, target=destination_id, weight='weight')
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None

    nodes_data = []
    
    adresses = session.exec(select(Adresse).where(Adresse.id.in_(path_ids))).all()
    adresses_map = {a.id: a for a in adresses}
    
    for nid in path_ids:
        if nid in adresses_map:
            node = adresses_map[nid]
            nodes_data.append({
                "id": node.id,
                "latitude": node.latitude,
                "longitude": node.longitude
            })
            
    vitesse_ms = vitesse_kmh / 3.6
    duree_s = distance_m / vitesse_ms if vitesse_ms > 0 else 0
    
    return {
        "duree_totale_s": duree_s,
        "distance_totale_m": distance_m,
        "nodes": nodes_data
    }