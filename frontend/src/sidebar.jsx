import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MousePointer2 } from "lucide-react"; // Si vous avez installé lucide-react

export default function Sidebar({ 
  setMapData, setOpenedMap, onLivraisonsUpdated, setTour,
  pickupId, setPickupId, deliveryId, setDeliveryId, selectionMode, setSelectionMode 
}) {
  // États existants
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Aucune carte chargée");
  const [demandeFile, setDemandeFile] = useState(null);
  const [demandeStatus, setDemandeStatus] = useState("Aucune demande chargée");
  const [tourStatus, setTourStatus] = useState("");
  
  // États pour l'ajout manuel (durées)
  const [pickupDuration, setPickupDuration] = useState(180);
  const [deliveryDuration, setDeliveryDuration] = useState(180);
  const [addStatus, setAddStatus] = useState("");

  // 👇 NOUVEL ÉTAT : Nombre de livreurs
  const [nbLivreurs, setNbLivreurs] = useState(1);

  // --- Handlers ---
  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleDemandeFileChange = (e) => setDemandeFile(e.target.files[0]);

  const handleLoadMap = () => {
    if (!file) return;
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
      setStatus(`Carte chargée : ${file.name}`);
    };
    reader.readAsText(file);
  }

  const handleLoadDemande = async () => {
    if (!demandeFile) return;
    try {
      const formData = new FormData();
      formData.append("file", demandeFile);
      setDemandeStatus("Envoi en cours...");
      const response = await fetch("http://localhost:8000/upload_demande", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Erreur backend");
      
      const result = await response.json();
      setDemandeStatus(`✔ ${demandeFile.name} importé !`);
      if (onLivraisonsUpdated) onLivraisonsUpdated();
     } catch (error) {
        setDemandeStatus(`Erreur : ${error.message}`);
     }
  };

  // 👇 CALCUL DE TOURNÉE MIS À JOUR
  const handleCalculateTour = async () => {
    try {
      setTourStatus("Calcul en cours...");
      
      // On passe le paramètre nb_livreurs
      const response = await fetch(`http://localhost:8000/calculer_tournee?nb_livreurs=${nbLivreurs}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Erreur serveur");
      }

      const data = await response.json(); // data est maintenant une LISTE de tournées
      setTour(data);
      
      // On calcule la distance totale cumulée pour l'affichage
      const totalDist = Array.isArray(data) 
        ? data.reduce((acc, t) => acc + t.total_distance, 0)
        : data.total_distance;

      setTourStatus(`Succès ! ${Array.isArray(data) ? data.length : 1} tournée(s). Total: ${Math.round(totalDist)} m`);
      console.log("Tournées reçues :", data);

    } catch (error) {
      console.error("Erreur calcul :", error);
      setTourStatus("Erreur : Impossible de calculer");
    }
  };

  const handleAddLivraison = async () => {
    if (!pickupId || !deliveryId) {
      setAddStatus("Erreur : IDs manquants");
      return;
    }
    try {
      setAddStatus("Ajout...");
      const params = new URLSearchParams({
        adresse_pickup_id: pickupId,
        adresse_delivery_id: deliveryId,
        duree_pickup: pickupDuration,
        duree_delivery: deliveryDuration
      });
      const response = await fetch(`http://localhost:8000/add_livraison?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur ajout");
      
      setAddStatus("✔ Ajouté !");
      setPickupId(""); setDeliveryId("");
      if (onLivraisonsUpdated) onLivraisonsUpdated();
      if (setTour) setTour(null);
      setTourStatus("À recalculer");
    } catch (error) {
      setAddStatus(`Erreur : ${error.message}`);
    }
  };

  return (
    <div className="w-80 p-4 space-y-4 bg-white border-r h-full overflow-y-auto shadow-xl z-20">
      
      {/* Cartes 1 et 2 inchangées (Plan / Demande) */}
      <Card>
        <CardHeader><CardTitle>1. Charger Carte</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input type="file" accept=".xml" onChange={handleFileChange} />
          <Button className="w-full" onClick={handleLoadMap}>Charger</Button>
          <p className="text-xs text-gray-500">{status}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Charger Demande</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input type="file" accept=".xml" onChange={handleDemandeFileChange} />
          <Button variant="secondary" className="w-full" onClick={handleLoadDemande} disabled={!demandeFile}>Importer</Button>
          <p className="text-xs text-gray-500">{demandeStatus}</p>
        </CardContent>
      </Card>

      {/* 👇 CARTE 3 : CALCUL AVEC CHOIX DU NOMBRE DE LIVREURS */}
      <Card className="border-l-4 border-l-green-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">3. Calculer l'itinéraire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Nombre de livreurs</label>
            <Input 
              type="number" 
              min="1" 
              max="10"
              value={nbLivreurs}
              onChange={(e) => setNbLivreurs(parseInt(e.target.value) || 1)}
            />
          </div>

          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white" 
            onClick={handleCalculateTour}
          >
            Lancer le calcul
          </Button>
          
          {tourStatus && (
            <div className={`text-xs p-2 rounded mt-2 ${tourStatus.includes("Erreur") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
              {tourStatus}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARTE 4 : AJOUT MANUEL (Avec Selection) */}
      <Card className="border-l-4 border-l-purple-500 shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-base">4. Ajouter Livraison</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
               <label className="text-xs font-semibold text-gray-600">ID Pickup</label>
               <Button size="sm" variant={selectionMode === 'pickup' ? "destructive" : "outline"} className="h-6 text-xs px-2"
                 onClick={() => setSelectionMode(selectionMode === 'pickup' ? null : 'pickup')}>
                 {selectionMode === 'pickup' ? "Annuler" : "Cibler"}
               </Button>
            </div>
            <Input placeholder="Cliquer sur la carte" value={pickupId} onChange={(e) => setPickupId(e.target.value)} 
              className={selectionMode === 'pickup' ? "border-red-500 ring-1 ring-red-500" : ""} />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
               <label className="text-xs font-semibold text-gray-600">ID Delivery</label>
               <Button size="sm" variant={selectionMode === 'delivery' ? "destructive" : "outline"} className="h-6 text-xs px-2"
                 onClick={() => setSelectionMode(selectionMode === 'delivery' ? null : 'delivery')}>
                 {selectionMode === 'delivery' ? "Annuler" : "Cibler"}
               </Button>
            </div>
            <Input placeholder="Cliquer sur la carte" value={deliveryId} onChange={(e) => setDeliveryId(e.target.value)} 
              className={selectionMode === 'delivery' ? "border-red-500 ring-1 ring-red-500" : ""} />
          </div>
          
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAddLivraison}>Ajouter</Button>
          {addStatus && <p className="text-xs text-gray-600 mt-1">{addStatus}</p>}
        </CardContent>
      </Card>

    </div>
  );
}