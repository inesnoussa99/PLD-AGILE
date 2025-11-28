import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Sidebar({ setMapData, setOpenedMap }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("aucune carte chargée");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

 const handleLoadMap = () => {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (event) => {
    const xmlString = event.target.result;

    // --- Analyse du XML côté front ---
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const nodes = Array.from(xmlDoc.getElementsByTagName("noeud")).map(n => ({
      id: n.getAttribute("id"),
      latitude: parseFloat(n.getAttribute("latitude")),
      longitude: parseFloat(n.getAttribute("longitude")),
    }));

    // Mise à jour front
    setMapData(nodes);
    setOpenedMap(true);
    setStatus(`Carte chargée : ${file.name}`);

    // --- Envoi du XML au backend ---
    try {
      const formData = new FormData();
      formData.append("file", file); // On envoie directement le fichier XML

      const response = await fetch("http://localhost:8000/upload_plan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi au backend");
      }

      const result = await response.json();
      console.log("Réponse backend :", result);

      setStatus(`Carte ${file.name} chargée et envoyée ✔`);
    } catch (error) {
      console.error(error);
      setStatus("Erreur : impossible d'envoyer la carte au backend ");
    }
  };

  reader.readAsText(file);
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
      {/* Les autres cartes restent inchangées */}
    </div>
  );
}
