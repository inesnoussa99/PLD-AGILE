# 🚴‍♂️ PLD-AGILE
## Logiciel de planification de tournées de livraison à vélo

Projet académique — PLD Agile | INSA Lyon (2025)

PLD-AGILE est une application web full-stack permettant de calculer, gérer et optimiser des tournées de livraison à vélo.
L’application propose une visualisation cartographique interactive, une gestion multi-livreurs et des algorithmes d’optimisation prenant en compte les contraintes Pickup / Delivery.

---

## ✨ Fonctionnalités principales

- Import et visualisation d’un plan de ville (XML)
- Gestion des livraisons Pickup / Delivery
- Ajout manuel de livraisons
- Choix du nombre de livreurs
- Calcul automatique des tournées optimisées
- Visualisation des tournées par couleur
- Sauvegarde et relecture des programmes (XML)

---

## 🧱 Architecture

- Frontend : React (SPA)
- Backend : Python (API REST)
- Base de données : PostgreSQL
- Algorithmes :
  - Dijkstra (plus courts chemins)
  - Sweep (partitionnement géographique)
  - TSP (Ant Colony Optimization)
- Déploiement : Docker et Docker Compose

---

## 🧰 Prérequis

- Docker
- Docker Compose

Aucune installation locale de Node.js ou Python n’est nécessaire si Docker est utilisé.

---

## 🚀 Lancer l’application

### 1. Cloner le dépôt

Commande à exécuter :
git clone https://github.com/inesnoussa99/PLD-AGILE.git
cd PLD-AGILE

### 2. Lancer tous les services (Frontend, Backend et Base de données)

Commande à exécuter :
docker compose up --build

Docker démarre automatiquement :
- la base de données PostgreSQL
- l’API backend Python
- le frontend React

### 3. Accéder à l’application

Frontend (interface utilisateur) :
http://localhost:3000

Backend (API REST) :
http://localhost:8000

---

## 🧭 Guide d’utilisation

### Charger un plan de ville
Importer un fichier XML représentant le plan urbain.
Les adresses et tronçons sont affichés sur la carte.

### Charger ou créer un programme de livraison
- Importer un programme existant (XML)
- Ou créer un nouveau programme de livraison

### Visualiser les points Pickup / Delivery
Les points sont affichés sur la carte et sont cliquables.

### Ajouter une livraison
Sélectionner une adresse de pickup puis une adresse de delivery.

### Choisir le nombre de livreurs
Le système répartit automatiquement les livraisons entre les livreurs.

### Calculer les tournées
Les tournées optimisées sont calculées côté backend.

### Visualiser les tournées
Chaque tournée est affichée avec une couleur différente sur la carte.

### Sauvegarder le programme
Les programmes peuvent être sauvegardés et rechargés ultérieurement.

---

## ⚙️ Fonctionnalités Back-End

- Import de plans et programmes XML
- Gestion des livraisons (ajout / suppression)
- Calcul des plus courts chemins
- Calcul multi-livreurs
- API REST
- Communication Front ↔ Back (CORS)

---

## 🖥️ Fonctionnalités Front-End

- Interface React fluide (SPA)
- Visualisation cartographique interactive
- Interaction avec les points
- Ajout dynamique de livraisons
- Affichage des tournées optimisées

---

## 🧠 Algorithmes utilisés

- Dijkstra : calcul des distances optimales
- Sweep Algorithm : partitionnement géographique
- Ant Colony Optimization (TSP) : optimisation des tournées

---

## 👥 Équipe

Projet réalisé par le groupe Hexanôme 4141 — INSA Lyon :

- Adam NAJI
- Ines CHEBBI
- Hamza EL KARCHOUNI
- Yliess BELLARGUI
- Malek AOUADI
- Wassim BOURAS
- Yao Mario SENAH

---

## 🔮 Pistes d’amélioration

- Passage de Dijkstra à A* pour améliorer les performances
- Mise en cache des graphes et des chemins
- Validation plus stricte des entrées
- Amélioration UX (temps, créneaux, export PDF)

---
