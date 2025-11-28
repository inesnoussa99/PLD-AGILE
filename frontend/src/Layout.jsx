import Sidebar from "./Sidebar";
import StepCard from "./StepCard";
import MapHolder from "./MapHolder";
import { useState } from "react";

export default function Layout() {
  const [openedMap, setOpenedMap] = useState(false);
  const [mapData, setMapData] = useState([]); // contient les noeuds XML

  return (
    <div className="flex w-full h-screen bg-gray-50">

      <Sidebar setMapData={setMapData} setOpenedMap={setOpenedMap} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col items-center space-y-10">
          {openedMap ? (
            <div className="w-full max-w-5xl h-[500px]">
              <MapHolder mapData={mapData} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-12 mt-8">
                <StepCard 
                  number={1}
                  title="Charger une carte (XML)"
                  description="petitPlan.xml, moyenPlan.xml, grandPlan.xml…" 
                />
                <StepCard 
                  number={2}
                  title="Créer ou charger un programme"
                  description="Date, heure départ, entrepôt…" 
                />
                <StepCard 
                  number={3}
                  title="Ajouter des livraisons"
                  description="Pickup & Delivery avec durées"
                />
              </div>

              <div className="grid grid-cols-2 gap-12">
                <StepCard 
                  number={4}
                  title="Gérer les coursiers"
                  description="Nombre & ajout de coursiers"
                />
                <StepCard 
                  number={5}
                  title="Calculer & Sauvegarder"
                  description="Calcul d’itinéraires + export XML"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
