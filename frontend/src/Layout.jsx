// import { useState } from "react";
// import Sidebar from "./Sidebar";
// import StepCard from "./StepCard";
// import MapHolder from "./MapHolder";
// import LivraisonList from "./LivraisonList"; 

// export default function Layout() {

//   const [openedMap, setOpenedMap] = useState(false);
//   const [mapData, setMapData] = useState([]); 

//   const [deliveriesData, setDeliveriesData] = useState([]); 
//   const [warehouse, setWarehouse] = useState(null);
//   const [route, setRoute] = useState(null);

//   const [isAddingMode, setIsAddingMode] = useState(false);
//   const [newLivraison, setNewLivraison] = useState({
//     pickupNode: null,
//     deliveryNode: null
//   });

//   const refreshDeliveries = async () => {
//     try {
//       const response = await fetch("http://localhost:8000/livraisons");
//       if (response.ok) {
//         const data = await response.json();
//         setDeliveriesData(data);
//       }
//     } catch (error) {
//       console.error("Erreur fetch livraisons:", error);
//     }
//   };

//   const handleDeleteLivraison = async (id) => {
//     try {
//       await fetch(`http://localhost:8000/livraisons/${id}`, { method: 'DELETE' });
//       refreshDeliveries();
//       setRoute(null);
//     } catch (e) {
//       console.error("Erreur suppression", e);
//     }
//   };

//   const handleNodeClick = (node) => {
//     if (!isAddingMode) return;

//     if (!newLivraison.pickupNode) {
//       setNewLivraison(prev => ({ ...prev, pickupNode: node }));
//     } else if (!newLivraison.deliveryNode) {
//       if (node.id === newLivraison.pickupNode.id) {
//         alert("Le point de livraison doit être différent du point d'enlèvement");
//         return;
//       }
//       setNewLivraison(prev => ({ ...prev, deliveryNode: node }));
//     }
//   };

//   const cancelAdd = () => {
//     setIsAddingMode(false);
//     setNewLivraison({ pickupNode: null, deliveryNode: null });
//   };

//   return (
//     <div className="flex w-full h-screen bg-gray-50 overflow-hidden">
      
//       <Sidebar 
//         setOpenedMap={setOpenedMap}
//         setMapData={setMapData}
//         setDeliveriesData={setDeliveriesData}
//         deliveriesData={deliveriesData}
//         setWarehouse={setWarehouse}
//         onLivraisonsUpdated={refreshDeliveries}
//         setRoute={setRoute}
        
//         isAddingMode={isAddingMode}
//         setIsAddingMode={setIsAddingMode}
//         newLivraison={newLivraison}
//         cancelAdd={cancelAdd}
//         resetNewLivraison={() => setNewLivraison({ pickupNode: null, deliveryNode: null })}
//       />

//       <LivraisonList 
//         livraisons={deliveriesData} 
//         onDelete={handleDeleteLivraison}
//       />

//       <div className="flex-1 relative"> 
//         {openedMap ? (
//           <div className="w-full h-full">
//             <MapHolder 
//               mapData={mapData} 
//               warehouse={warehouse}
//               deliveries={deliveriesData}
//               route={route}
              
//               onNodeClick={handleNodeClick}
//               isAdding={isAddingMode}
//               deliveryTime={newLivraison}
//             />
//           </div>
//         ) : (
//           <div className="p-6 overflow-auto h-full flex flex-col items-center space-y-10">
//               <div className="grid grid-cols-3 gap-12 mt-8">
//                 <StepCard number={1} title="Charger une carte (XML)" description="..." />
//                 <StepCard number={2} title="Créer ou charger un programme" description="..." />
//                 <StepCard number={3} title="Ajouter des livraisons" description="..." />
//               </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import Sidebar from "./Sidebar";
import StepCard from "./StepCard";
import MapHolder from "./MapHolder";
import LivraisonList from "./LivraisonList";
import TourDetailPanel from "./TourDetailPanel"; 

export default function Layout() {

  const [openedMap, setOpenedMap] = useState(false);
  const [mapData, setMapData] = useState([]); 

  const [deliveriesData, setDeliveriesData] = useState([]); 
  const [warehouse, setWarehouse] = useState(null);
  const [route, setRoute] = useState(null);

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newLivraison, setNewLivraison] = useState({
    pickupNode: null,
    deliveryNode: null
  });

  // --- NOUVEAUX ÉTATS POUR LA CRÉATION DE PROGRAMME ---
  const [isSelectingWarehouse, setIsSelectingWarehouse] = useState(false);
  const [newProgramNode, setNewProgramNode] = useState(null);
  // ----------------------------------------------------

  // --- ÉTATS POUR LE DÉTAIL DE TOURNÉE ---
  const [selectedTourForDetail, setSelectedTourForDetail] = useState(null);
  const [animatedDeliveryPerson, setAnimatedDeliveryPerson] = useState(null);
  // ---------------------------------------

  const refreshDeliveries = async () => {
    try {
      const response = await fetch("http://localhost:8000/livraisons");
      if (response.ok) {
        const data = await response.json();
        setDeliveriesData(data);
      }
    } catch (error) {
      console.error("Erreur fetch livraisons:", error);
    }
  };

  const handleDeleteLivraison = async (id) => {
    try {
      await fetch(`http://localhost:8000/livraisons/${id}`, { method: 'DELETE' });
      refreshDeliveries();
      setRoute(null);
    } catch (e) {
      console.error("Erreur suppression", e);
    }
  };

  const handleNodeClick = (node) => {
    // --- PRIORITÉ A LA SÉLECTION D'ENTREPÔT ---
    if (isSelectingWarehouse) {
      setNewProgramNode(node);
      setIsSelectingWarehouse(false); // On arrête la sélection après le clic
      return;
    }
    // ------------------------------------------

    if (!isAddingMode) return;

    if (!newLivraison.pickupNode) {
      setNewLivraison(prev => ({ ...prev, pickupNode: node }));
    } else if (!newLivraison.deliveryNode) {
      if (node.id === newLivraison.pickupNode.id) {
        alert("Le point de livraison doit être différent du point d'enlèvement");
        return;
      }
      setNewLivraison(prev => ({ ...prev, deliveryNode: node }));
    }
  };

  const cancelAdd = () => {
    setIsAddingMode(false);
    setNewLivraison({ pickupNode: null, deliveryNode: null });
  };

  return (
    <div className="flex w-full h-screen bg-gray-50 overflow-hidden">
      
      <Sidebar 
        setOpenedMap={setOpenedMap}
        setMapData={setMapData}
        setDeliveriesData={setDeliveriesData}
        deliveriesData={deliveriesData}
        setWarehouse={setWarehouse}
        onLivraisonsUpdated={refreshDeliveries}
        setRoute={setRoute}
        
        isAddingMode={isAddingMode}
        setIsAddingMode={setIsAddingMode}
        newLivraison={newLivraison}
        cancelAdd={cancelAdd}
        resetNewLivraison={() => setNewLivraison({ pickupNode: null, deliveryNode: null })}

        // --- PASSAGE DES PROPS AU SIDEBAR ---
        isSelectingWarehouse={isSelectingWarehouse}
        setIsSelectingWarehouse={setIsSelectingWarehouse}
        newProgramNode={newProgramNode}
        setNewProgramNode={setNewProgramNode}
        
        // --- PROPS POUR DÉTAILS TOURNÉE ---
        route={route}
        onShowTourDetail={setSelectedTourForDetail}
        // ----------------------------------
      />

      <LivraisonList 
        livraisons={deliveriesData} 
        onDelete={handleDeleteLivraison}
      />

      <div className="flex-1 relative"> 
        {openedMap ? (
          <div className="w-full h-full relative">
            <MapHolder 
              mapData={mapData} 
              warehouse={warehouse}
              deliveries={deliveriesData}
              route={route}
              
              onNodeClick={handleNodeClick}
              isAdding={isAddingMode || isSelectingWarehouse} 
              deliveryTime={newLivraison}
              animatedDeliveryPerson={animatedDeliveryPerson}
            />
            
            {selectedTourForDetail && (
              <TourDetailPanel 
                tour={selectedTourForDetail.tour}
                tourIndex={selectedTourForDetail.index}
                onClose={() => {
                  setSelectedTourForDetail(null);
                  setAnimatedDeliveryPerson(null);
                }}
                onAnimationUpdate={setAnimatedDeliveryPerson}
              />
            )}
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