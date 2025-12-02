import { useState } from "react";
import Sidebar from "./Sidebar";
import StepCard from "./StepCard";
import MapHolder from "./MapHolder";
import LivraisonList from "./LivraisonList"; 

export default function Layout() {
  const [openedMap, setOpenedMap] = useState(false);
  const [mapData, setMapData] = useState([]); 
  const [livraisons, setLivraisons] = useState([]); 
  const [tour, setTour] = useState(null);

  // 👇 1. ÉTATS AJOUTÉS (C'est ce qui manquait)
  const [pickupId, setPickupId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  const [selectionMode, setSelectionMode] = useState(null); // 'pickup', 'delivery' ou null

  const refreshLivraisons = async () => {
    try {
      const response = await fetch("http://localhost:8000/livraisons");
      if (response.ok) {
        const data = await response.json();
        setLivraisons(data);
      }
    } catch (error) {
      console.error("Erreur fetch livraisons:", error);
    }
  };

  // 👇 2. FONCTION DE GESTION DU CLIC
  const handleMarkerClick = (id) => {
    if (selectionMode === 'pickup') {
      setPickupId(id);
      setSelectionMode(null); // Désactive le mode après choix
    } else if (selectionMode === 'delivery') {
      setDeliveryId(id);
      setSelectionMode(null);
    }
  };

  return (
    <div className="flex w-full h-screen bg-gray-50 overflow-hidden">
      
      <Sidebar 
        setMapData={setMapData} 
        setOpenedMap={setOpenedMap} 
        onLivraisonsUpdated={refreshLivraisons}
        setTour={setTour}
        
        // 👇 3. TRANSMISSION DES PROPS À LA SIDEBAR
        pickupId={pickupId}
        setPickupId={setPickupId}
        deliveryId={deliveryId}
        setDeliveryId={setDeliveryId}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
      />

      {livraisons.length > 0 && (
        <LivraisonList livraisons={livraisons} />
      )}

      <div className="flex-1 relative"> 
        {openedMap ? (
          <div className="w-full h-full">
            <MapHolder 
              mapData={mapData} 
              tour={tour} 
              // 👇 4. TRANSMISSION DES PROPS À LA MAP
              onMarkerClick={handleMarkerClick}
              selectionMode={selectionMode}
            />
          </div>
        ) : (
          <div className="p-6 overflow-auto h-full flex flex-col items-center space-y-10">
              <div className="grid grid-cols-3 gap-12 mt-8">
                <StepCard number={1} title="Charger une carte (XML)" description="..." />
                <StepCard number={2} title="Créer ou charger un programme" description="..." />
                <StepCard number={3} title="Ajouter des livraisons" description="..." />
              </div>
          </div>
        )}
      </div>
    </div>
  );
}