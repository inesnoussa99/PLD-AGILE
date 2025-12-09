import math
from typing import Dict, List, Optional

import networkx as nx
from sqlmodel import Session, select

from .models import Troncon, Livraison, Programme, Adresse


def build_graph(session: Session) -> nx.DiGraph:
    """
    Construit le graphe complet des tronçons.

    Optimisation possible (plus tard) :
    - cacher le graphe en mémoire et le reconstruire seulement
      quand un nouveau plan est importé.
    """
    troncons = session.exec(select(Troncon)).all()
    G = nx.DiGraph()
    for t in troncons:
        # Si tu veux, tu peux aussi stocker la vitesse, etc. dans les attributs
        G.add_edge(t.origine_id, t.destination_id, weight=t.longueur)
    return G


def get_polar_angle(origin_node: Adresse, target_node: Adresse) -> float:
    """
    Calcule l'angle (en radians) entre l'origine (entrepôt) et le pickup.
    Utilisé pour la méthode "Sweep" qui découpe l'espace en secteurs.
    """
    dx = target_node.longitude - origin_node.longitude
    dy = target_node.latitude - origin_node.latitude
    return math.atan2(dy, dx)


def solve_tsp(
    G: nx.DiGraph,
    livraisons: List[Livraison],
    warehouse_id: str,
    color_hex: str = "#2563eb",
) -> Optional[dict]:
    """
    Résout un TSP glouton (plus proche voisin) sur un sous-ensemble de livraisons.

    - On part de l'entrepôt
    - On cherche à chaque étape le prochain pickup/delivery le plus proche
      atteignable dans le graphe.
    - On force l'ordre : pickup puis delivery de la même livraison.

    Renvoie:
      {
        "total_distance": float,
        "full_path_ids": [id_adresse0, id_adresse1, ...],
        "steps": [
          {"type": "ENTREPOT", "id": ...},
          {"type": "PICKUP", "id": ..., "livraison_id": ...},
          {"type": "DELIVERY", "id": ..., "livraison_id": ...},
          {"type": "ENTREPOT_FIN", "id": ...},
        ],
        "color": "#xxxxxx"
      }
    """
    if not livraisons:
        return None

    # Indexation pickup / delivery
    pickups: Dict[str, Livraison] = {l.adresse_pickup_id: l for l in livraisons}
    deliveries: Dict[str, Livraison] = {l.adresse_delivery_id: l for l in livraisons}

    # Ensemble des noeuds candidats (on commence par les pickups)
    candidates = set(pickups.keys())

    current_node = warehouse_id
    total_distance = 0.0
    full_path_ids: List[str] = []
    steps: List[dict] = []

    # On note le départ entrepôt
    steps.append({"type": "ENTREPOT", "id": warehouse_id})

    while candidates:
        try:
            # Plus courts chemins depuis la position courante
            lengths, paths = nx.single_source_dijkstra(G, current_node, weight="weight")
        except nx.NetworkXNoPath:
            # Impossible de continuer : le graphe ne permet pas d'atteindre les candidats restants
            print(f"[solve_tsp] Aucun chemin depuis {current_node} vers les candidats restants.")
            return None

        # Ne garder que les distances vers les candidats encore à visiter
        available_candidates = {
            node: dist for node, dist in lengths.items() if node in candidates
        }

        if not available_candidates:
            # On ne peut plus atteindre aucun candidat
            break

        # Candidat le plus proche
        nearest_node = min(available_candidates, key=available_candidates.get)
        distance_to_travel = available_candidates[nearest_node]
        path_to_travel = paths[nearest_node]

        # Mise à jour du chemin complet
        total_distance += distance_to_travel
        if full_path_ids:
            # On évite de répéter le noeud courant
            full_path_ids.extend(path_to_travel[1:])
        else:
            full_path_ids.extend(path_to_travel)

        # On se déplace
        current_node = nearest_node
        candidates.remove(current_node)

        # Pickup ou delivery ?
        if current_node in pickups:
            livraison = pickups[current_node]
            # On ajoute sa delivery comme future candidate
            candidates.add(livraison.adresse_delivery_id)
            steps.append(
                {
                    "type": "PICKUP",
                    "id": current_node,
                    "livraison_id": livraison.id,
                }
            )
        elif current_node in deliveries:
            livraison = deliveries[current_node]
            steps.append(
                {
                    "type": "DELIVERY",
                    "id": current_node,
                    "livraison_id": livraison.id,
                }
            )

    # Retour à l'entrepôt
    try:
        return_length = nx.shortest_path_length(
            G, current_node, warehouse_id, weight="weight"
        )
        return_path = nx.shortest_path(
            G, current_node, warehouse_id, weight="weight"
        )

        total_distance += return_length
        # On évite de dupliquer current_node
        full_path_ids.extend(return_path[1:])
        steps.append({"type": "ENTREPOT_FIN", "id": warehouse_id})
    except nx.NetworkXNoPath:
        print("[solve_tsp] Impossible de revenir à l'entrepôt.")
        return None

    return {
        "total_distance": total_distance,
        "full_path_ids": full_path_ids,
        "steps": steps,
        "color": color_hex,
    }


def calculate_multiple_tours(session: Session, nb_livreurs: int):
    """
    Divise les livraisons en secteurs angulaires (méthode Sweep) autour de l'entrepôt
    et calcule une tournée TSP gloutonne pour chaque livreur.

    Optimisations par rapport à ta version :
    - Bug de "sorted_livraisons" corrigé
    - Chargement des adresses des pickups en une seule requête au lieu d'un
      session.get() dans la boucle.
    """
    G = build_graph(session)
    all_livraisons: List[Livraison] = session.exec(select(Livraison)).all()
    programme: Programme | None = session.exec(select(Programme)).first()

    if not programme or not all_livraisons:
        return []

    warehouse_id = programme.adresse_depart_id
    warehouse_node: Adresse | None = session.get(Adresse, warehouse_id)

    if warehouse_node is None:
        # Cas de plan mal initialisé
        print("[calculate_multiple_tours] Adresse départ introuvable.")
        return []

    # Cas 1 seul livreur : une seule tournée globale
    if nb_livreurs <= 1:
        tour = solve_tsp(G, all_livraisons, warehouse_id)
        return [tour] if tour else []

    # Précharger les adresses des pickups en une seule fois
    pickup_ids = {liv.adresse_pickup_id for liv in all_livraisons}
    if not pickup_ids:
        return []

    adresses_pickup = session.exec(
        select(Adresse).where(Adresse.id.in_(pickup_ids))
    ).all()
    adresses_by_id: Dict[str, Adresse] = {a.id: a for a in adresses_pickup}

    livraisons_with_angle: List[tuple[float, Livraison]] = []

    for liv in all_livraisons:
        pickup_node = adresses_by_id.get(liv.adresse_pickup_id)
        if pickup_node is None:
            # Pickup sans adresse valide : on la saute
            continue
        angle = get_polar_angle(warehouse_node, pickup_node)
        livraisons_with_angle.append((angle, liv))

    # Tri par angle croissant
    livraisons_with_angle.sort(key=lambda x: x[0])

    # ⚠️ Corrigé ici
    sorted_livraisons: List[Livraison] = [item[1] for item in livraisons_with_angle]

    if not sorted_livraisons:
        return []

    # Nombre de livreurs réellement utilisés (au plus nb_livreurs, au plus nb_livraisons)
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


def add_livraison(
    session: Session,
    pickup_id: str,
    delivery_id: str,
    d_pickup: int,
    d_delivery: int,
    date_jour,
):
    """
    Insère une nouvelle livraison liée au programme courant.
    """
    programme: Programme | None = session.exec(select(Programme)).first()
    if not programme:
        return

    liv = Livraison(
        adresse_pickup_id=pickup_id,
        adresse_delivery_id=delivery_id,
        duree_pickup=d_pickup,
        duree_delivery=d_delivery,
        date=date_jour,
        programme_id=programme.id,
    )
    session.add(liv)
    session.commit()

def compute_path_for_animation(
    session: Session,
    origine_id: str,
    destination_id: str,
    vitesse_kmh: float = 15.0,
) -> Optional[dict]:
    # Protection vitesse nulle ou négative
    if vitesse_kmh <= 0:
        vitesse_kmh = 15.0
    # Conversion en m/s
    vitesse_mps = vitesse_kmh * 1000.0 / 3600.0
    # 1. Construire le graphe
    G = build_graph(session)
    # 2. Chercher le plus court chemin (en distance)
    try:
        path_ids: List[str] = nx.shortest_path(
            G,
            source=origine_id,
            target=destination_id,
            weight="weight",
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        # Aucun chemin possible dans le graphe
        return None
    if not path_ids or len(path_ids) < 2:
        # Chemin trivial ou vide
        return None
    # 3. Charger les adresses concernées en une seule fois
    adresses = session.exec(
        select(Adresse).where(Adresse.id.in_(path_ids))
    ).all()
    adresses_by_id: Dict[str, Adresse] = {a.id: a for a in adresses}
    # Vérifier qu'on a bien toutes les adresses
    for aid in path_ids:
        if aid not in adresses_by_id:
            # Incohérence des données : une adresse du chemin n'existe pas
            return None
    # 4. Construire la liste ordonnée des noeuds (pour affichage / animation)
    nodes = []
    for idx, aid in enumerate(path_ids):
        addr = adresses_by_id[aid]
        nodes.append(
            {
                "id": aid,
                "order": idx,
                "latitude": addr.latitude,
                "longitude": addr.longitude,
            }
        )
    # 5. Calcul des segments (tronçons consécutifs du chemin)
    segments: List[dict] = []
    distance_totale_m = 0.0
    duree_totale_s = 0.0
    # Pour chaque paire (origine, destination) consécutive du chemin
    for i in range(len(path_ids) - 1):
        o_id = path_ids[i]
        d_id = path_ids[i + 1]
        # Récupérer le tronçon correspondant
        troncon = session.exec(
            select(Troncon).where(
                (Troncon.origine_id == o_id) & (Troncon.destination_id == d_id)
            )
        ).first()
        if troncon is not None:
            distance_m = float(troncon.longueur)
        else:
            # Si le tronçon n'est pas trouvé, on fait un fallback :
            # distance géographique approximative (lat/lon) en mètres.
            addr_o = adresses_by_id[o_id]
            addr_d = adresses_by_id[d_id]
            # Distance euclidienne approximative (valable pour des petites distances locales)
            # On utilise un coefficient ~111_000 m par degré pour les latitudes.
            lat_diff = (addr_d.latitude - addr_o.latitude) * 111_000.0
            lon_diff = (addr_d.longitude - addr_o.longitude) * 111_000.0 * math.cos(
                math.radians(addr_o.latitude)
            )
            distance_m = math.sqrt(lat_diff**2 + lon_diff**2)
        # Durée pour ce segment
        duree_s = distance_m / vitesse_mps
        distance_totale_m += distance_m
        duree_totale_s += duree_s
        segments.append(
            {
                "index": i,
                "origine_id": o_id,
                "destination_id": d_id,
                "distance_m": distance_m,
                "duree_s": duree_s,
                "distance_cumulative_m": distance_totale_m,
                "duree_cumulative_s": duree_totale_s,
                "from": {
                    "id": o_id,
                    "latitude": adresses_by_id[o_id].latitude,
                    "longitude": adresses_by_id[o_id].longitude,
                },
                "to": {
                    "id": d_id,
                    "latitude": adresses_by_id[d_id].latitude,
                    "longitude": adresses_by_id[d_id].longitude,
                },
            }
        )
    # 6. Préparer la réponse globale
    result = {
        "origine_id": origine_id,
        "destination_id": destination_id,
        "vitesse_kmh": vitesse_kmh,
        "distance_totale_m": distance_totale_m,
        "duree_totale_s": duree_totale_s,
        "nodes": nodes,
        "segments": segments,
    }
    return result
