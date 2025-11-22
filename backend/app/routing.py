# backend/app/routing.py
from typing import Dict, List, Tuple, Optional
import heapq
from sqlmodel import Session, select
from .models import Troncon


Graph = Dict[str, List[Tuple[str, float]]]


def build_graph(session: Session) -> Graph:
    """
    Construit le graphe en mémoire à partir de la table Troncon.
    Chaque sommet est une adresse (id de noeud), et chaque arête un tronçon orienté.
    """
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
    """
    Algorithme de Dijkstra pour trouver le plus court chemin entre start et goal.
    Retourne (chemin, distance_totale). Si pas de chemin -> (None, inf).
    """
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


def compute_shortest_path(session: Session, origine_id: str, destination_id: str) -> Tuple[Optional[List[str]], float]:
    """
    Fonction utilitaire appelée par l'API : construit le graphe puis lance Dijkstra.
    """
    graph = build_graph(session)
    return dijkstra(graph, origine_id, destination_id)
