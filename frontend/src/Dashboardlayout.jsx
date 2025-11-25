import Sidebar from "./Sidebar";
import StepCard from "./StepCard";
import MapPlaceholder from "./MapPlaceholder";

export default function DashboardLayout() {
  return (
    <div className="flex w-full h-screen bg-gray-50">

      <Sidebar />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col items-center space-y-10">
          
          {/* Les 5 cartes */}
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

          {/* Zone carte */}
          <div className="w-full max-w-5xl h-[500px]">
            <MapPlaceholder />
          </div>

        </div>
      </div>
    </div>
  );
}
