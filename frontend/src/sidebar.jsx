// import { useState,useEffect,useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { ConfirmDialog } from "./ConfirmDialog";
// import { 
//   Map as MapIcon, 
//   List,
//   Upload, 
//   Plus,
//   Navigation, 
//   CheckCircle2, 
//   AlertCircle,
//   Package,
//   Loader2
// } from "lucide-react";

// export default function Sidebar({ setOpenedMap, setMapData, setDeliveriesData, deliveriesData, setWarehouse, onLivraisonsUpdated, setRoute, isAddingMode, setIsAddingMode, newLivraison, cancelAdd,resetNewLivraison}) {
  
//   const [mapFile, setMapFile] = useState(null);
//   const [mapStatus, setMapStatus] = useState(null);

//   const [deliveriesFile, setDeliveriesFile] = useState(null);
//   const [deliveriesStatus, setDeliveriesStatus] = useState(null);

//   const [routeStatus, setRouteStatus] = useState(null);

//   const mapInputRef = useRef(null);
//   const deliveriesInputRef = useRef(null);

//   const [delivererCount, setDelivererCount] = useState(1);

//   const [showMapResetConfirm, setShowMapResetConfirm] = useState(false);
//   const [showDeliveriesResetConfirm, setShowDeliveriesResetConfirm] = useState(false);

//   const visibleStatus = routeStatus || deliveriesStatus || mapStatus || null;

//   const [pickupDuration, setPickupDuration] = useState(180);
//   const [deliveryDuration, setDeliveryDuration] = useState(180);
//   const [addStatus, setAddStatus] = useState(null);

//   const resetMap = () => {
//     setMapFile(null);
//     setMapStatus(null);
//     setOpenedMap(false);
//     setMapData([]);
//     resetDeliveries();
//   };

//   const resetDeliveries = () => {
//     setDeliveriesFile(null);
//     setDeliveriesStatus(null);
//     setDeliveriesData([]);
//     setRouteStatus(null);
//   };

//   const handleMapFileChange = (e) => setMapFile(e.target.files[0]);
//   const handleDeliveriesFileChange = (e) => setDeliveriesFile(e.target.files[0]);
//   const handleCreateEmptyProgram = () => {
//     setDeliveriesData([]);
//     setDeliveriesStatus({type:'success',message:"Nouveau programme créé avec succès"});
//   };

//   const handleConfirmAdd = async () => {
//     if (!newLivraison.pickupNode || !newLivraison.deliveryNode) return;

//     try {
//       setAddStatus({ type: 'loading', message: "Ajout en cours..." });
      
//       const params = new URLSearchParams({
//         adresse_pickup_id: newLivraison.pickupNode.id,
//         adresse_delivery_id: newLivraison.deliveryNode.id,
//         duree_pickup: pickupDuration,
//         duree_delivery: deliveryDuration
//       });

//       const response = await fetch(`http://localhost:8000/add_livraison?${params.toString()}`);
//       if (!response.ok) throw new Error("Erreur serveur");

//       setAddStatus({ type: 'success', message: "Livraison ajoutée !" });
      
//       if (onLivraisonsUpdated) onLivraisonsUpdated();
//       if (setRoute) setRoute(null);
      
//       resetNewLivraison();
//       setTimeout(() => setAddStatus(null), 3000);

//     } catch (e) {
//       setAddStatus({ type: 'error', message: e.message });
//     }
//   };

//   const handleLoadMap = () => {
//     if (!mapFile) return;
//     setMapStatus({type:'loading', message:"Chargement..."});
//     const reader = new FileReader();
//     reader.onload = (event) => {
//       const xmlString = event.target.result;
//       const parser = new DOMParser();
//       const xmlDoc = parser.parseFromString(xmlString, "text/xml");
//       const nodes = Array.from(xmlDoc.getElementsByTagName("noeud")).map(n => ({
//         id: n.getAttribute("id"),
//         latitude: parseFloat(n.getAttribute("latitude")),
//         longitude: parseFloat(n.getAttribute("longitude")),
//       }));
//       setMapData(nodes);
//       setOpenedMap(true);
//       setMapStatus({type: 'success', message:`${mapFile.name} importé avec succès !`});
//     };
//     reader.readAsText(mapFile);
//   };

//   const handleLoadDeliveries = async () => {
//     if (!deliveriesFile) return;

//     if (setWarehouse) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         try {
//           const xmlString = event.target.result;
//           const parser = new DOMParser();
//           const xmlDoc = parser.parseFromString(xmlString, "text/xml");
          
//           const warehouseNode = xmlDoc.getElementsByTagName("entrepot")[0];
//           if (warehouseNode) {
//             const adresseId = warehouseNode.getAttribute("adresse");
//             // console.log("Entrepôt détecté (local) :", adresseId);
//             setWarehouse({ adresse_id: adresseId });
//           }
//         } catch (e) {
//           console.warn("Erreur lecture locale entrepôt", e);
//         }
//       };
//       reader.readAsText(deliveriesFile);
//     }

//     try {
//       const formData = new FormData();
//       formData.append("file", deliveriesFile);
//       setDeliveriesStatus({type:'loading', message:"Chargement..."});
//       const response = await fetch("http://localhost:8000/upload_demande", { method: "POST", body: formData });
//       if (!response.ok) throw new Error("Erreur backend");
//       // console.log(response);
//       setDeliveriesStatus({type:'success', message:`${deliveriesFile.name} importé avec succès !`});
//       if (onLivraisonsUpdated) onLivraisonsUpdated();

//      } catch (error) {
//         setDeliveriesStatus({type:'error', message:"Une erreur est survenue..."});
//         console.error(error.message);
//      }
//   };

//   const handleCalculateRoute = async () => {
//     try {
//       setRouteStatus({type:'loading', message: "Chargement..."});
      
//       const response = await fetch(`http://localhost:8000/calculer_tournee?nb_livreurs=${delivererCount}`);
      
//       if (!response.ok) {
//         const err = await response.json();
//         throw new Error(err.detail || "Erreur serveur");
//       }

//       const data = await response.json();
//       setRoute(data);
      
//       const totalDist = Array.isArray(data) 
//         ? data.reduce((acc, t) => acc + t.total_distance, 0)
//         : data.total_distance;

//       setRouteStatus({type:'success', message: `${Array.isArray(data) ? data.length : 1} tournée(s) calculé(s). Total: ${Math.round(totalDist)} m`});
//       console.log("Tournées reçues :", data);

//     } catch (error) {
//       setRouteStatus({type:'error', message:"Une erreur est survenue..."});
//       console.error(error.message);
//     }
//   };

//   const handleAddLivraison = async () => {
//     if (!pickupId || !deliveryId) {
//       setAddStatus("Erreur : IDs manquants");
//       return;
//     }
//     try {
//       setAddStatus("Ajout...");
//       const params = new URLSearchParams({
//         adresse_pickup_id: pickupId,
//         adresse_delivery_id: deliveryId,
//         duree_pickup: pickupDuration,
//         duree_delivery: deliveryDuration
//       });
//       const response = await fetch(`http://localhost:8000/add_livraison?${params.toString()}`);
//       if (!response.ok) throw new Error("Erreur ajout");
      
//       setAddStatus("✔ Ajouté !");
//       setPickupId(""); setDeliveryId("");
//       if (onLivraisonsUpdated) onLivraisonsUpdated();
//       if (setTour) setTour(null);
//       setRouteStatus("À recalculer");
//     } catch (error) {
//       setAddStatus(`Erreur : ${error.message}`);
//     }
//   };

//   const generateXML = (deliveriesData, depot) => {
//     const xmlDoc = document.implementation.createDocument("", "", null);
//     const root = xmlDoc.createElement("demandeDeLivraisons");

//     const entrepot = xmlDoc.createElement("entrepot");
//     entrepot.setAttribute("adresse", depot.adresse);
//     entrepot.setAttribute("heureDepart", depot.heureDepart);
//     root.appendChild(entrepot);

//     deliveriesData.forEach(d => {
//       const livraison = xmlDoc.createElement("livraison");
//       livraison.setAttribute("adresseEnlevement", d.adresseEnlevement);
//       livraison.setAttribute("adresseLivraison", d.adresseLivraison);
//       livraison.setAttribute("dureeEnlevement", d.dureeEnlevement);
//       livraison.setAttribute("dureeLivraison", d.dureeLivraison);
//       root.appendChild(livraison);
//     });

//     xmlDoc.appendChild(root);

//     const serializer = new XMLSerializer();
//     return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` + serializer.serializeToString(xmlDoc);
//   };

//   const downloadProgram = () => {
//     if (!deliveriesData || deliveriesData.length === 0) return;

//     const depot = { adresse: "2835339774", heureDepart: "8:0:0" };

//     const xmlContent = generateXML(deliveriesData, depot);
//     const blob = new Blob([xmlContent], { type: "application/xml" });
//     const url = URL.createObjectURL(blob);

//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "programme.xml";
//     a.click();
//     URL.revokeObjectURL(url);
//   };


//   const StatusDisplay = ({ status }) => {
//     if (!status) return null;
//     const colors = {
//       success: "text-emerald-600 bg-emerald-50 border-emerald-100",
//       error: "text-red-600 bg-red-50 border-red-100",
//       loading: "text-blue-600 bg-blue-50 border-blue-100",
//       info: "text-slate-500 bg-slate-50 border-slate-100"
//     };
//     const Icon = status.type === 'loading' ? Loader2 : (status.type === 'success' ? CheckCircle2 : AlertCircle);

//     return (
//       <div className={`text-xs px-3 py-2 rounded-md border flex items-center gap-2 mt-2 ${colors[status.type] || colors.info}`}>
//         <Icon className={`w-3 h-3 ${status.type === 'loading' ? 'animate-spin' : ''}`} />
//         <span>{status.message}</span>
//       </div>
//     );
//   };

//   return (
//     <aside className="w-80 flex flex-col h-full bg-white border-r border-slate-200 shadow-xl shadow-slate-200/50 z-20">
      
//       <div className="p-6 border-b border-slate-100 bg-slate-50/50">
//         <div className="flex items-center gap-3 text-slate-800">
//           <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-900">
//             <Navigation className="w-5 h-5" />
//           </div>
//           <div>
//             <h1 className="font-bold text-sm uppercase tracking-wide">AGILE LIVRAISON</h1>
//             <p className="text-xs text-slate-500">Planificateur de livraison</p>
//           </div>
//         </div>
//       </div>
      
//       <div className="px-4 py-2">
//         {visibleStatus && <StatusDisplay status={visibleStatus} />}
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
//         <section className="space-y-3">
//           <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
//             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">1</div>
//             <h2>Charger le plan</h2>
//           </div>
          
//           {mapStatus && mapStatus.type === "success" ? (
//             <div className="p-3 border rounded-lg bg-slate-50">
//               <p className="text-xs text-slate-700 font-medium">
//                 Carte chargée : {mapFile?.name}
//               </p>

//               <Button
//                 className="w-full mt-3 bg-slate-900 text-white text-xs"
//                 onClick={() => setShowMapResetConfirm(true)}
//               >
//                 Charger une nouvelle carte
//               </Button>
//             </div>
//           ) : (
//             <>
//               <div
//                 className="p-2 rounded-xl border border-slate-200 border-dashed hover:bg-slate-50 transition-colors"
//                 onClick={() => mapInputRef.current?.click()}
//               >
//                 <Input 
//                   ref={mapInputRef}
//                   type="file" 
//                   accept=".xml" 
//                   className="hidden" 
//                   onChange={handleMapFileChange} 
//                 />
                
//                 <div className="text-center space-y-2">
//                   <div 
//                     onClick={() => mapInputRef.current?.click()}
//                     className="cursor-pointer mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:scale-110 transition-transform"
//                   >
//                     <MapIcon className="w-5 h-5" />
//                   </div>
                  
//                   <div className="space-y-1">
//                     <p className="text-xs font-medium text-slate-700">
//                       {mapFile ? mapFile.name : "Sélectionner un fichier XML"}
//                     </p>
//                     {!mapFile && <p className="text-[10px] text-slate-400">Glisser ou cliquer pour parcourir</p>}
//                   </div>

//                   {mapFile && (
//                     <Button 
//                       size="sm" 
//                       className="w-full bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs" 
//                       onClick={(e)=>{
//                           e.stopPropagation(); 
//                           handleLoadMap();
//                         }
//                       }
//                     >
//                       <Upload className="w-3 h-3 mr-2" />
//                       Charger la carte
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             </>
//           )}

//           {/* {mapStatus && <StatusDisplay status={mapStatus} />} */}

//           <ConfirmDialog
//             open={showMapResetConfirm}
//             title="Charger une nouvelle carte"
//             message="Charger une nouvelle carte implique la perte de votre travail non sauvegardé. Voulez-vous continuer ?"
//             onCancel={() => setShowMapResetConfirm(false)}
//             onConfirm={() => {
//               resetMap();
//               setShowMapResetConfirm(false);
//               mapInputRef.current?.click();
//             }}
//           />
//         </section>

//         <section className="space-y-3">
//           <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
//             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">2</div>
//             <h2>Charger le programme de livraison</h2>
//           </div>

//           {!mapStatus || mapStatus.type !== "success" ? (
//             <div className="p-2 rounded-xl border border-slate-200 border-dashed transition-colors">
//               <p className="text-[10px] text-slate-400">Importer la carte avant le programme</p>
//             </div>
//           ) : (

//             deliveriesStatus && deliveriesStatus.type === "success" ? (
//               <div className="p-3 border rounded-lg bg-slate-50">
                
//                 <p className="text-xs text-slate-700 font-medium">
//                   Programme chargé : {deliveriesFile?.name}
//                 </p>

//                 <Button
//                   className="w-full mt-3 bg-slate-900 text-white text-xs"
//                   onClick={() => setShowDeliveriesResetConfirm(true)}
//                 >
//                   Charger un nouveau programme
//                 </Button>

//                 <Button
//                   variant="outline"
//                   size="sm"
//                   className="w-full mt-2 h-8 text-xs"
//                   onClick={() => setShowDeliveriesResetConfirm(true)}
//                 >
//                   <Plus />
//                   Créer un nouveau programme
//                 </Button>
//               </div>
//             ) : (
              
//               <div
//                 className="p-2 rounded-xl border border-slate-200 border-dashed hover:bg-slate-50 transition-colors"
//                 onClick={() => deliveriesInputRef.current?.click()}
//               >
//                 <Input
//                   ref={deliveriesInputRef}
//                   type="file"
//                   accept=".xml"
//                   className="hidden"
//                   onChange={handleDeliveriesFileChange}
//                 />

//                 <div className="text-center space-y-2">

//                   <div
//                     onClick={() => deliveriesInputRef.current?.click()}
//                     className="cursor-pointer mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:scale-110 transition-transform"
//                   >
//                     <List className="w-5 h-5" />
//                   </div>

//                   <div className="space-y-1">
//                     <p className="text-xs font-medium text-slate-700">
//                       {deliveriesFile ? deliveriesFile.name : "Sélectionner un fichier XML"}
//                     </p>

//                     {!deliveriesFile && (
//                       <p className="text-[10px] text-slate-400">Glisser ou cliquer pour parcourir</p>
//                     )}
//                   </div>

//                   <div className="space-y-2 pt-2">

//                     {deliveriesFile && (
//                       <Button
//                         size="sm"
//                         className="w-full bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleLoadDeliveries();
//                         }}
//                       >
//                         <Upload className="w-3 h-3 mr-2" />
//                         Charger le programme
//                       </Button>
//                     )}

//                     <Button
//                       variant="outline"
//                       size="sm"
//                       className="w-full h-8 text-xs"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleCreateEmptyProgram();
//                       }}
//                     >
//                       <Plus />
//                       Créer un nouveau programme
//                     </Button>

//                   </div>
//                 </div>
//               </div>
//             )
//           )}

//           {/* {deliveriesStatus && <StatusDisplay status={deliveriesStatus} />} */}

//           <ConfirmDialog
//             open={showDeliveriesResetConfirm}
//             title="Charger un nouveau programme"
//             message="Importer un nouveau programme implique la perte de votre travail non sauvegardé. Voulez-vous continuer ?"
//             onCancel={() => setShowDeliveriesResetConfirm(false)}
//             onConfirm={() => {
//               resetDeliveries();
//               setShowDeliveriesResetConfirm(false);
//               deliveriesInputRef.current?.click();
//             }}
//           />
//         </section>

//         <section className="pt-4 border-t border-slate-100 space-y-3">
//             <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
//                 <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">3</div>
//                 <h2>Ajouter une livraison</h2>
//             </div>

//             {!isAddingMode ? (
//                  <Button 
//                     variant="outline" 
//                     className="w-full text-xs dashed border-slate-300"
//                     disabled={!deliveriesStatus || deliveriesStatus.type !== 'success'}
//                     onClick={() => setIsAddingMode(true)}
//                  >
//                     <Plus className="w-3 h-3 mr-2"/> Mode Ajout
//                  </Button>
//             ) : (
//                 <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
//                     <p className="text-xs text-blue-800 font-semibold mb-2">Nouvelle Livraison</p>
                    
//                     {/* Etape 1 : Pickup */}
//                     <div className={`text-xs p-2 rounded border ${newLivraison.pickupNode ? 'bg-white border-green-200 text-green-700' : 'bg-white border-blue-200 text-slate-500'}`}>
//                         <span className="font-bold">1. Pickup : </span> 
//                         {newLivraison.pickupNode ? `Noeud #${newLivraison.pickupNode.id}` : "Cliquez sur la carte..."}
//                     </div>

//                     {/* Etape 2 : Delivery */}
//                     {newLivraison.pickupNode && (
//                         <div className={`text-xs p-2 rounded border ${newLivraison.deliveryNode ? 'bg-white border-green-200 text-green-700' : 'bg-white border-blue-200 text-slate-500'}`}>
//                             <span className="font-bold">2. Delivery : </span> 
//                             {newLivraison.deliveryNode ? `Noeud #${newLivraison.deliveryNode.id}` : "Cliquez sur la carte..."}
//                         </div>
//                     )}

//                     {/* Etape 3 : Durées et Validation */}
//                     {newLivraison.pickupNode && newLivraison.deliveryNode && (
//                         <div className="space-y-2 pt-2 border-t border-blue-100">
//                             <div className="grid grid-cols-2 gap-2">
//                                 <div>
//                                     <label className="text-[10px] uppercase font-bold text-slate-500">Durée Pickup (s)</label>
//                                     <Input 
//                                         type="number" 
//                                         value={pickupDuration} 
//                                         onChange={(e) => setPickupDuration(e.target.value)} 
//                                         className="h-8 text-xs bg-white"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="text-[10px] uppercase font-bold text-slate-500">Durée Delivery (s)</label>
//                                     <Input 
//                                         type="number" 
//                                         value={deliveryDuration} 
//                                         onChange={(e) => setDeliveryDuration(e.target.value)} 
//                                         className="h-8 text-xs bg-white"
//                                     />
//                                 </div>
//                             </div>
                            
//                             <Button className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleConfirmAdd}>
//                                 Valider l'ajout
//                             </Button>
//                         </div>
//                     )}

//                     <Button variant="ghost" className="w-full h-6 text-[10px] text-slate-400 hover:text-red-500" onClick={cancelAdd}>
//                         Annuler
//                     </Button>
                    
//                     {addStatus && <StatusDisplay status={addStatus} />}
//                 </div>
//             )}
//         </section>

//         <section className="pt-4 border-t border-slate-100 space-y-3">
//           <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
//             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">3</div>
//             <h2>Calculer l'itinéraire des livreurs</h2>
//           </div>
//           {
//             deliveriesStatus && deliveriesStatus.type == 'success' ? (
//               <>
//                 <div className="space-y-1">
//                   <label className="text-xs font-medium text-slate-600">
//                     Nombre de livreurs
//                   </label>
//                   <input
//                     type="number"
//                     min="1"
//                     value={delivererCount}
//                     onClick={(e) => e.stopPropagation()}
//                     onChange={(e) => setDelivererCount(parseInt(e.target.value))}
//                     className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <Button 
//                   className="w-full h-12 text-sm font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:translate-y-[-1px]" 
//                   onClick={handleCalculateRoute}
//                 >
//                   <Package className="w-4 h-4 mr-2" />
//                   Calculer l'itinéraire
//                 </Button>
//               </>
//             ) : (
//               <div className="p-2 rounded-xl border border-slate-200 border-dashed transition-colors">
//                 <p className="text-[10px] text-slate-400">Importer un programme ou créer en un nouveau pour calculer l'itniéraire</p>
//               </div>
//             )
//           }

//           {/* { routeStatus ? <StatusDisplay status={routeStatus} /> : null} */}
//         </section>

//         <section className="pt-4 border-t border-slate-100 space-y-3">
//           <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
//             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">4</div>
//             <h2>Sauvegarder le programme</h2>
//           </div>

//           {deliveriesData && deliveriesData.length > 0 ? (
//             <Button
//               className="w-full h-10 bg-blue-600 text-white text-sm shadow-md hover:bg-blue-700"
//               onClick={downloadProgram}
//             >
//               Télécharger le programme XML
//             </Button>
//           ) : (
//             <div className="p-2 rounded-xl border border-slate-200 border-dashed text-[10px] text-slate-400">
//               Aucun programme à sauvegarder
//             </div>
//           )}
//         </section>

//       </div>

//       <div className="p-4 border-t border-slate-100 text-center">
//         <p className="text-[10px] text-slate-400 font-medium">PLD AGILE • 2025-2026</p>
//       </div>
//     </aside>
//   );
// }

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "./ConfirmDialog";
import { 
  Map as MapIcon, 
  List,
  Upload, 
  Plus,
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Loader2,
  MapPin
} from "lucide-react";

export default function Sidebar({ 
  setOpenedMap, setMapData, setDeliveriesData, deliveriesData, setWarehouse, onLivraisonsUpdated, setRoute, 
  isAddingMode, setIsAddingMode, newLivraison, cancelAdd, resetNewLivraison,
  // Nouvelles props reçues de Layout
  isSelectingWarehouse, setIsSelectingWarehouse, newProgramNode, setNewProgramNode,
  // Props pour les détails de tournée
  route, onShowTourDetail
}) {
  
  const [mapFile, setMapFile] = useState(null);
  const [mapStatus, setMapStatus] = useState(null);

  const [deliveriesFile, setDeliveriesFile] = useState(null);
  const [deliveriesStatus, setDeliveriesStatus] = useState(null);

  const [routeStatus, setRouteStatus] = useState(null);

  const mapInputRef = useRef(null);
  const deliveriesInputRef = useRef(null);

  const [delivererCount, setDelivererCount] = useState(1);

  const [showMapResetConfirm, setShowMapResetConfirm] = useState(false);
  const [showDeliveriesResetConfirm, setShowDeliveriesResetConfirm] = useState(false);

  // Etats locaux pour la création de programme
  const [creationStep, setCreationStep] = useState('idle'); // 'idle', 'selecting', 'confirming'
  const [departureTime, setDepartureTime] = useState("08:00:00");

  const visibleStatus = routeStatus || deliveriesStatus || mapStatus || null;

  const [pickupDuration, setPickupDuration] = useState(180);
  const [deliveryDuration, setDeliveryDuration] = useState(180);
  const [addStatus, setAddStatus] = useState(null);

  // --- Gestion Création Nouveau Programme ---
  const handleStartCreateProgram = () => {
    setCreationStep('selecting');
    setIsSelectingWarehouse(true);
    setNewProgramNode(null);
    setDeliveriesStatus({ type: 'info', message: "Cliquez sur la carte pour définir l'entrepôt." });
  };

  const handleCancelCreate = () => {
    setCreationStep('idle');
    setIsSelectingWarehouse(false);
    setNewProgramNode(null);
    setDeliveriesStatus(null);
  };

  // Surveiller si un nœud a été sélectionné dans Layout
  useEffect(() => {
    if (newProgramNode && creationStep === 'selecting') {
      setCreationStep('confirming');
      setDeliveriesStatus(null);
    }
  }, [newProgramNode, creationStep]);

  const handleConfirmCreateProgram = async () => {
    if (!newProgramNode) return;

    try {
      setDeliveriesStatus({ type: 'loading', message: "Création du programme..." });
      
      const params = new URLSearchParams({
        entrepot_adresse: newProgramNode.id,
        heure_depart: departureTime
      });

      const response = await fetch(`http://localhost:8000/create_new_program?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création");
      }

      // Succès
      setDeliveriesData([]); // Liste vide
      setWarehouse({ adresse_id: newProgramNode.id }); // Affiche l'entrepôt sur la carte
      setRoute(null);
      setRouteStatus(null);
      setDeliveriesFile(null); // Reset fichier chargé
      
      setDeliveriesStatus({ type: 'success', message: "Nouveau programme créé !" });
      
      // Reset modes
      setCreationStep('idle');
      setIsSelectingWarehouse(false);
      setNewProgramNode(null);

    } catch (e) {
      console.error(e);
      setDeliveriesStatus({ type: 'error', message: "Erreur serveur" });
    }
  };
  // ------------------------------------------

  const resetMap = () => {
    setMapFile(null);
    setMapStatus(null);
    setOpenedMap(false);
    setMapData([]);
    resetDeliveries();
  };

  const resetDeliveries = () => {
    setDeliveriesFile(null);
    setDeliveriesStatus(null);
    setDeliveriesData([]);
    setRouteStatus(null);
    handleCancelCreate();
  };

  const handleMapFileChange = (e) => setMapFile(e.target.files[0]);
  const handleDeliveriesFileChange = (e) => setDeliveriesFile(e.target.files[0]);

  const handleConfirmAdd = async () => {
    if (!newLivraison.pickupNode || !newLivraison.deliveryNode) return;

    try {
      setAddStatus({ type: 'loading', message: "Ajout en cours..." });
      
      const params = new URLSearchParams({
        adresse_pickup_id: newLivraison.pickupNode.id,
        adresse_delivery_id: newLivraison.deliveryNode.id,
        duree_pickup: pickupDuration,
        duree_delivery: deliveryDuration
      });
      const response = await fetch(`http://localhost:8000/add_livraison?${params.toString()}`, {
        method: 'GET'
      });
      if (!response.ok) throw new Error("Erreur serveur");

      setAddStatus({ type: 'success', message: "Livraison ajoutée !" });
      
      if (onLivraisonsUpdated) onLivraisonsUpdated();
      if (setRoute) setRoute(null);
      
      resetNewLivraison();
      setTimeout(() => setAddStatus(null), 3000);

    } catch (e) {
      setAddStatus({ type: 'error', message: e.message });
    }
  };

  const handleLoadMap = async () => {
    if (!mapFile) return;
    setMapStatus({type:'loading', message:"Chargement..."});
    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlString = event.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const nodes = Array.from(xmlDoc.getElementsByTagName("noeud")).map(n => ({
        id: n.getAttribute("id"),
        latitude: parseFloat(n.getAttribute("latitude")),
        longitude: parseFloat(n.getAttribute("longitude")),
      }));
      setMapData(nodes);
      setOpenedMap(true);
      setMapStatus({type: 'success', message:`${mapFile.name} importé avec succès !`});
    };
    reader.readAsText(mapFile);
    const formData = new FormData();
      formData.append("file", mapFile);
      const response = await fetch("http://localhost:8000/upload_plan", { method: "POST", body: formData });
    if (!response.ok) throw new Error("Erreur backend");
  };

  const handleLoadDeliveries = async () => {
    if (!deliveriesFile) return;

    if (setWarehouse) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const xmlString = event.target.result;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlString, "text/xml");
          
          const warehouseNode = xmlDoc.getElementsByTagName("entrepot")[0];
          if (warehouseNode) {
            const adresseId = warehouseNode.getAttribute("adresse");
            setWarehouse({ adresse_id: adresseId });
          }
        } catch (e) {
          console.warn("Erreur lecture locale entrepôt", e);
        }
      };
      reader.readAsText(deliveriesFile);
    }

    try {
      const formData = new FormData();
      formData.append("file", deliveriesFile);
      setDeliveriesStatus({type:'loading', message:"Chargement..."});
      const response = await fetch("http://localhost:8000/upload_demande", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Erreur backend");
      setDeliveriesStatus({type:'success', message:`${deliveriesFile.name} importé avec succès !`});
      if (onLivraisonsUpdated) onLivraisonsUpdated();

     } catch (error) {
        setDeliveriesStatus({type:'error', message:"Une erreur est survenue..."});
        console.error(error.message);
     }
  };

  const handleCalculateRoute = async () => {
    try {
      setRouteStatus({type:'loading', message: "Chargement..."});
      
      const response = await fetch(`http://localhost:8000/calculer_tournee?nb_livreurs=${delivererCount}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Erreur serveur");
      }

      const data = await response.json();
      setRoute(data);
      
      const totalDist = Array.isArray(data) 
        ? data.reduce((acc, t) => acc + t.total_distance, 0)
        : data.total_distance;

      setRouteStatus({type:'success', message: `${Array.isArray(data) ? data.length : 1} tournée(s) calculé(s). Total: ${Math.round(totalDist)} m`});

    } catch (error) {
      setRouteStatus({type:'error', message:"Une erreur est survenue..."});
      console.error(error.message);
    }
  };

  const generateXML = (deliveriesData, depot) => {
    const xmlDoc = document.implementation.createDocument("", "", null);
    const root = xmlDoc.createElement("demandeDeLivraisons");

    const entrepot = xmlDoc.createElement("entrepot");
    entrepot.setAttribute("adresse", depot.adresse);
    entrepot.setAttribute("heureDepart", depot.heureDepart);
    root.appendChild(entrepot);

    deliveriesData.forEach(d => {
      const livraison = xmlDoc.createElement("livraison");
      livraison.setAttribute("adresseEnlevement", d.adresseEnlevement);
      livraison.setAttribute("adresseLivraison", d.adresseLivraison);
      livraison.setAttribute("dureeEnlevement", d.dureeEnlevement);
      livraison.setAttribute("dureeLivraison", d.dureeLivraison);
      root.appendChild(livraison);
    });

    xmlDoc.appendChild(root);
    const serializer = new XMLSerializer();
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` + serializer.serializeToString(xmlDoc);
  };

  const downloadProgram = async () => {
    try {
      const response = await fetch(`http://localhost:8000/save_programme_xml`, { 
          method: "GET" 
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Erreur serveur");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;  
    
      a.download = "programme.xml"; 
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      setRouteStatus({type:'error', message: "Une erreur est survenue lors du téléchargement."});
      console.error(error.message);
    }
};

  const StatusDisplay = ({ status }) => {
    if (!status) return null;
    const colors = {
      success: "text-emerald-600 bg-emerald-50 border-emerald-100",
      error: "text-red-600 bg-red-50 border-red-100",
      loading: "text-blue-600 bg-blue-50 border-blue-100",
      info: "text-slate-500 bg-slate-50 border-slate-100"
    };
    const Icon = status.type === 'loading' ? Loader2 : (status.type === 'success' ? CheckCircle2 : AlertCircle);

    return (
      <div className={`text-xs px-3 py-2 rounded-md border flex items-center gap-2 mt-2 ${colors[status.type] || colors.info}`}>
        <Icon className={`w-3 h-3 ${status.type === 'loading' ? 'animate-spin' : ''}`} />
        <span>{status.message}</span>
      </div>
    );
  };

  return (
    <aside className="w-80 flex flex-col h-full bg-white border-r border-slate-200 shadow-xl shadow-slate-200/50 z-20">
      
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 text-slate-800">
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-900">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm uppercase tracking-wide">AGILE LIVRAISON</h1>
            <p className="text-xs text-slate-500">Planificateur de livraison</p>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2">
        {visibleStatus && <StatusDisplay status={visibleStatus} />}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">1</div>
            <h2>Charger le plan</h2>
          </div>
          
          {mapStatus && mapStatus.type === "success" ? (
            <div className="p-3 border rounded-lg bg-slate-50">
              <p className="text-xs text-slate-700 font-medium">
                Carte chargée : {mapFile?.name}
              </p>
              <Button className="w-full mt-3 bg-slate-900 text-white text-xs" onClick={() => setShowMapResetConfirm(true)}>
                Charger une nouvelle carte
              </Button>
            </div>
          ) : (
            <div className="p-2 rounded-xl border border-slate-200 border-dashed hover:bg-slate-50 transition-colors" onClick={() => mapInputRef.current?.click()}>
              <Input ref={mapInputRef} type="file" accept=".xml" className="hidden" onChange={handleMapFileChange} />
              <div className="text-center space-y-2">
                <div onClick={() => mapInputRef.current?.click()} className="cursor-pointer mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:scale-110 transition-transform">
                  <MapIcon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-700">{mapFile ? mapFile.name : "Sélectionner un fichier XML"}</p>
                </div>
                {mapFile && (
                  <Button size="sm" className="w-full bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs" onClick={(e)=>{ e.stopPropagation(); handleLoadMap(); }}>
                    <Upload className="w-3 h-3 mr-2" /> Charger la carte
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <ConfirmDialog
            open={showMapResetConfirm}
            title="Charger une nouvelle carte"
            message="Attention, tout travail non sauvegardé sera perdu."
            onCancel={() => setShowMapResetConfirm(false)}
            onConfirm={() => { resetMap(); setShowMapResetConfirm(false); mapInputRef.current?.click(); }}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">2</div>
            <h2>Charger le programme</h2>
          </div>

          {!mapStatus || mapStatus.type !== "success" ? (
            <div className="p-2 rounded-xl border border-slate-200 border-dashed text-[10px] text-slate-400">Importer la carte d'abord</div>
          ) : (

            creationStep !== 'idle' ? (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3 animate-in fade-in">
                    <p className="text-xs text-blue-800 font-semibold">Création d'un programme</p>
                    
                    {creationStep === 'selecting' && (
                        <div className="text-xs text-slate-600 italic">
                            <MapPin className="w-3 h-3 inline mr-1"/>
                            Veuillez cliquer sur un nœud de la carte pour définir l'entrepôt.
                        </div>
                    )}

                    {creationStep === 'confirming' && newProgramNode && (
                        <div className="space-y-3">
                            <div className="text-xs p-2 bg-white rounded border border-blue-200 text-slate-700">
                                <span className="font-bold">Entrepôt :</span> #{newProgramNode.id}
                            </div>
                            
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Heure de départ</label>
                                <Input 
                                    type="time" step="1"
                                    value={departureTime}
                                    onChange={(e) => setDepartureTime(e.target.value)}
                                    className="h-8 text-xs bg-white mt-1"
                                />
                            </div>

                            <Button className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleConfirmCreateProgram}>
                                <CheckCircle2 className="w-3 h-3 mr-2"/> Valider le programme
                            </Button>
                        </div>
                    )}

                    <Button variant="ghost" className="w-full h-6 text-[10px] text-slate-400 hover:text-red-500" onClick={handleCancelCreate}>
                        Annuler
                    </Button>
                </div>
            ) : (

                deliveriesStatus && deliveriesStatus.type === "success" ? (
                    <div className="p-3 border rounded-lg bg-slate-50">
                        <p className="text-xs text-slate-700 font-medium">Programme chargé : {deliveriesFile?.name || "Nouveau"}</p>
                        <Button className="w-full mt-3 bg-slate-900 text-white text-xs" onClick={() => setShowDeliveriesResetConfirm(true)}>
                             Charger un autre programme
                        </Button>
                        <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => setShowDeliveriesResetConfirm(true)}>
                            <Plus className="w-3 h-3 mr-2"/> Créer un nouveau
                        </Button>
                    </div>
                ) : (
                    <div className="p-2 rounded-xl border border-slate-200 border-dashed hover:bg-slate-50 transition-colors">

                        <Input ref={deliveriesInputRef} type="file" accept=".xml" className="hidden" onChange={handleDeliveriesFileChange} />
                        
                        <div className="text-center space-y-2" onClick={() => deliveriesInputRef.current?.click()}>
                            <div className="cursor-pointer mx-auto w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <List className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-slate-700">{deliveriesFile ? deliveriesFile.name : "Sélectionner un fichier XML"}</p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 px-2 pb-2">
                             {deliveriesFile && (
                                <Button size="sm" className="w-full bg-slate-900 text-white h-8 text-xs" onClick={(e)=>{ e.stopPropagation(); handleLoadDeliveries(); }}>
                                    <Upload className="w-3 h-3 mr-2" /> Charger
                                </Button>
                             )}
                             <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={(e) => { e.stopPropagation(); handleStartCreateProgram(); }}>
                                <Plus className="w-3 h-3 mr-2"/> Créer un nouveau
                             </Button>
                        </div>
                    </div>
                )
            )
          )}
          <ConfirmDialog
            open={showDeliveriesResetConfirm}
            title="Nouveau programme"
            message="Le programme actuel sera perdu. Continuer ?"
            onCancel={() => setShowDeliveriesResetConfirm(false)}
            onConfirm={() => { resetDeliveries(); setShowDeliveriesResetConfirm(false); }} 
          />
        </section>

        <section className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">3</div>
                <h2>Ajouter une livraison</h2>
            </div>
            {!isAddingMode ? (
                 <Button variant="outline" className="w-full text-xs dashed border-slate-300" disabled={!deliveriesStatus || deliveriesStatus.type !== 'success' || creationStep !== 'idle'} onClick={() => setIsAddingMode(true)}>
                    <Plus className="w-3 h-3 mr-2"/> Mode Ajout
                 </Button>
            ) : (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3 animate-in fade-in">
                    <p className="text-xs text-blue-800 font-semibold mb-2">Nouvelle Livraison</p>
                    <div className={`text-xs p-2 rounded border ${newLivraison.pickupNode ? 'bg-white border-green-200 text-green-700' : 'bg-white border-blue-200 text-slate-500'}`}>
                        <span className="font-bold">1. Pickup : </span> {newLivraison.pickupNode ? `Noeud #${newLivraison.pickupNode.id}` : "Cliquez sur la carte..."}
                    </div>
                    {newLivraison.pickupNode && (
                        <div className={`text-xs p-2 rounded border ${newLivraison.deliveryNode ? 'bg-white border-green-200 text-green-700' : 'bg-white border-blue-200 text-slate-500'}`}>
                            <span className="font-bold">2. Delivery : </span> {newLivraison.deliveryNode ? `Noeud #${newLivraison.deliveryNode.id}` : "Cliquez sur la carte..."}
                        </div>
                    )}
                    {newLivraison.pickupNode && newLivraison.deliveryNode && (
                        <div className="space-y-2 pt-2 border-t border-blue-100">
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] uppercase font-bold text-slate-500">Durée Pickup (s)</label><Input type="number" value={pickupDuration} onChange={(e) => setPickupDuration(e.target.value)} className="h-8 text-xs bg-white"/></div>
                                <div><label className="text-[10px] uppercase font-bold text-slate-500">Durée Delivery (s)</label><Input type="number" value={deliveryDuration} onChange={(e) => setDeliveryDuration(e.target.value)} className="h-8 text-xs bg-white"/></div>
                            </div>
                            <Button className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleConfirmAdd}>Valider l'ajout</Button>
                        </div>
                    )}
                    <Button variant="ghost" className="w-full h-6 text-[10px] text-slate-400 hover:text-red-500" onClick={cancelAdd}>Annuler</Button>
                    {addStatus && <StatusDisplay status={addStatus} />}
                </div>
            )}
        </section>

        <section className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">4</div>
            <h2>Calculer l'itinéraire</h2>
          </div>
          {deliveriesStatus && deliveriesStatus.type === 'success' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Nombre de livreurs</label>
                  <input type="number" min="1" value={delivererCount} onChange={(e) => setDelivererCount(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <Button className="w-full h-12 text-sm font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCalculateRoute}>
                  <Package className="w-4 h-4 mr-2" /> Calculer l'itinéraire
                </Button>

                {/* Afficher les tournées calculées avec boutons détails */}
                {route && Array.isArray(route) && route.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-bold text-slate-700 mb-2">Tournées calculées :</div>
                    {route.map((tour, idx) => {
                      const tourSteps = tour.steps?.filter(s => s.type === "PICKUP" || s.type === "DELIVERY") || [];
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                          <div 
                            className="w-3 h-3 rounded-full border-2 border-white shadow-md flex-shrink-0"
                            style={{ backgroundColor: tour.color || "#2563eb" }}
                          />
                          <div className="flex-1 text-xs text-slate-700">
                            <div className="font-semibold">Livreur {idx + 1}</div>
                            <div className="text-[10px] text-slate-500">{tourSteps.length} étapes · {Math.round(tour.total_distance)}m</div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-[10px] px-2"
                            onClick={() => onShowTourDetail({ tour, index: idx })}
                          >
                            Détails
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="p-2 rounded-xl border border-slate-200 border-dashed text-[10px] text-slate-400">Importer ou créer un programme d'abord</div>
            )
          }
        </section>

        <section className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">5</div>
            <h2>Sauvegarder</h2>
          </div>
          {deliveriesData && deliveriesData.length > 0 ? (
            <Button className="w-full h-10 bg-blue-600 text-white text-sm shadow-md hover:bg-blue-700" onClick={downloadProgram}>
              Télécharger le programme XML
            </Button>
          ) : (
            <div className="p-2 rounded-xl border border-slate-200 border-dashed text-[10px] text-slate-400">Aucun programme à sauvegarder</div>
          )}
        </section>

      </div>
      <div className="p-4 border-t border-slate-100 text-center"><p className="text-[10px] text-slate-400 font-medium">PLD AGILE • 2025-2026</p></div>
    </aside>
  );
}