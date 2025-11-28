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
