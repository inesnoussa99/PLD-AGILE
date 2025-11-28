import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import StepCard from "./StepCard";
import MapHolder from "./MapHolder";
import LivraisonList from "./LivraisonList"; 

export default function Layout() {
  const [openedMap, setOpenedMap] = useState(false);
  const [mapData, setMapData] = useState([]); 
  const [livraisons, setLivraisons] = useState([]); 

  const [tour, setTour] = useState(null);

  // Fonction pour récupérer les livraisons depuis le backend
  const refreshLivraisons = async () => {
    try {
      const response = await fetch("http://localhost:8000/livraisons");
      if (response.ok) {
        const data = await response.json();
        setLivraisons(data);
        console.log("Livraisons mises à jour :", data);
      }
    } catch (error) {
      console.error("Erreur lors du fetch des livraisons:", error);
    }
  };

  return (
    <div className="flex w-full h-screen bg-gray-50 overflow-hidden">
      
      {/* On passe la fonction refreshLivraisons à la Sidebar */}
      <Sidebar 
        setMapData={setMapData} 
        setOpenedMap={setOpenedMap} 
        onLivraisonsUpdated={refreshLivraisons}
        setTour={setTour}
      />

      {/* Affichage de la liste SI on a des livraisons */}
      {livraisons.length > 0 && (
        <LivraisonList livraisons={livraisons} />
      )}

      <div className="flex-1 relative"> 
        {/* 'relative' et 'h-full' sont importants pour que la map prenne la place restante */}
        
        {openedMap ? (
          <div className="w-full h-full"> {/* La carte prend 100% de l'espace restant */}
            <MapHolder mapData={mapData} tour={tour} />
          </div>
        ) : (
          /* Votre écran d'accueil avec les étapes */
          <div className="p-6 overflow-auto h-full flex flex-col items-center space-y-10">
              <div className="grid grid-cols-3 gap-12 mt-8">
                <StepCard number={1} title="Charger une carte (XML)" description="..." />
                <StepCard number={2} title="Créer ou charger un programme" description="..." />
                <StepCard number={3} title="Ajouter des livraisons" description="..." />
              </div>
              <div className="grid grid-cols-2 gap-12">
                <StepCard number={4} title="Gérer les coursiers" description="..." />
                <StepCard number={5} title="Calculer & Sauvegarder" description="..." />
              </div>
          </div>
        )}
      </div>
    </div>
  );
}