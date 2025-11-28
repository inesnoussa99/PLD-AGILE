# backend/app/routing.py
from typing import Dict, List, Tuple, Optional
import heapq
from sqlmodel import Session, select
from .models import Troncon, Livraison, Adresse

Graph = Dict[str, List[Tuple[str, float]]]

def build_graph(session: Session) -> Graph:
    #Construit le graphe en mémoire à partir de la table Troncon.
    #Chaque sommet est une adresse (id de noeud), et chaque arête un tronçon orienté.
    graph: Graph = {}
    troncons = session.exec(select(Troncon)).all()
    for t in troncons:
        origine = t.origine_id
        dest = t.destination_id
        longueur = float(t.longueur)
        if origine not in graph:
            graph[origine] = []
        graph[origine].append((dest, longueur))
        # Si le graphe est NON orienté, on peut décommenter ça : (idk)
        # if dest not in graph:
        #     graph[dest] = []
        # graph[dest].append((origine, longueur))
    return graph


def dijkstra(graph: Graph, start: str, goal: str) -> Tuple[Optional[List[str]], float]:
    #Algorithme de Dijkstra pour trouver le plus court chemin entre start et goal.
    #Retourne (chemin, distance_totale). Si pas de chemin -> (None, inf).
    if start not in graph and start != goal:
        return None, float("inf")
    # Distance minimale connue jusqu'à chaque noeud
    dist = {start: 0.0}
    # Pour reconstruire le chemin
    prev: Dict[str, str] = {}
    # File de priorité (distance, noeud)
    heap: List[Tuple[float, str]] = [(0.0, start)]
    while heap:
        d_current, node = heapq.heappop(heap)
        # Si on a déjà un meilleur chemin, on saute
        if d_current > dist.get(node, float("inf")):
            continue
        # Si on est arrivé à la destination
        if node == goal:
            break
        # Parcourir les voisins
        for neighbor, weight in graph.get(node, []):
            new_dist = d_current + weight
            if new_dist < dist.get(neighbor, float("inf")):
                dist[neighbor] = new_dist
                prev[neighbor] = node
                heapq.heappush(heap, (new_dist, neighbor))
    if goal not in dist:
        return None, float("inf")
    # Reconstruire le chemin en remontant depuis goal
    path: List[str] = []
    current = goal
    while current != start:
        path.append(current)
        current = prev[current]
    path.append(start)
    path.reverse()
    return path, dist[goal]

def add_livraison(session: Session, adresse_pickup_id: str, adresse_delivery_id: str, duree_pickup: int, duree_delivery: int, date,id_programme:int ) -> int:
    #Fonction utilitaire pour ajouter une livraison à la base de données.
    livraison = Livraison(
        adresse_pickup_id=adresse_pickup_id,
        adresse_delivery_id=adresse_delivery_id,
        duree_pickup=duree_pickup,
        duree_delivery=duree_delivery,
        date=date,
        programme_id=id_programme
    )
    session.add(livraison)
    session.commit()
    session.refresh(livraison)
    return livraison.id


def compute_shortest_path(session: Session, origine_id: str, destination_id: str) -> Tuple[Optional[List[str]], float]:
    #Fonction utilitaire appelée par l'API : construit le graphe puis lance Dijkstra.
    graph = build_graph(session)
    return dijkstra(graph, origine_id, destination_id)

def compute_path_for_animation(
    session: Session,
    origine_id: str,
    destination_id: str,
    vitesse_kmh: float = 15.0,
) -> Optional[Dict]:
    """
    Calcule le plus court chemin entre deux adresses et retourne
    une liste d'étapes numérotées avec coordonnées, distance cumulée
    et temps cumulé (pour animer le livreur côté front).

    - vitesse_kmh : vitesse moyenne du livreur (ex : 15 km/h à vélo)
    """
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

