import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Sidebar({ setMapData, setOpenedMap,onLivraisonsUpdated, setTour }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("aucune carte chargée");

  const [demandeFile, setDemandeFile] = useState(null);
  const [demandeStatus, setDemandeStatus] = useState("Aucune demande chargée");

  const [tourStatus, setTourStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDemandeFileChange = (e) => {
    setDemandeFile(e.target.files[0]);
  };

  const handleLoadMap = () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlString = event.target.result;

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      // Récupère tous les noeuds
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

      const response = await fetch("http://localhost:8000/upload_demande", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur backend");
      }

      const result = await response.json();
      console.log("Succès demande :", result);
      setDemandeStatus(`✔ ${demandeFile.name} importé !`);
      
      if (onLivraisonsUpdated) {
        onLivraisonsUpdated();
      }

     }
      
      catch (error) {
        console.error(error);
        setDemandeStatus(`Erreur : ${error.message}`);
      }
    };

    const handleCalculateTour = async () => {
      try {
        setTourStatus("Calcul en cours...");
        
        const response = await fetch("http://localhost:8000/calculer_tournee");
        
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Erreur serveur");
        }
  
        const data = await response.json();
        
        // On envoie le résultat au parent (Layout)
        setTour(data);
        
        // Feedback utilisateur
        setTourStatus(`Succès ! Distance : ${Math.round(data.total_distance)} m`);
        console.log("Tournée reçue :", data);
  
      } catch (error) {
        console.error("Erreur calcul :", error);
        setTourStatus("Erreur : Impossible de calculer");
      }
    };

  return (
    <div className="w-72 p-4 space-y-4 bg-white border-r h-full overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>Charger une carte (XML)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input type="file" accept=".xml" onChange={handleFileChange} />
          <Button className="w-full" onClick={handleLoadMap}>
            Charger la carte
          </Button>
          <p className="text-xs text-gray-500">État : {status}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>2. Charger une Demande</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input type="file" accept=".xml" onChange={handleDemandeFileChange} />
          <Button 
            className="w-full variant-secondary" 
            onClick={handleLoadDemande}
            disabled={!demandeFile} 
          >
            Charger la demande
          </Button>
          <p className="text-xs text-gray-500">État : {demandeStatus}</p>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-green-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">3. Calculer l'itinéraire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Optimiser la tournée pour les livraisons chargées.
          </p>
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
      {/* Les autres cartes restent inchangées */}
    </div>
  );
}
