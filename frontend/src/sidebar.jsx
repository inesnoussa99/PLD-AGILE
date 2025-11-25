import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Sidebar() {
  return (
    <div className="w-72 p-4 space-y-4 bg-white border-r h-full overflow-y-auto">

      {/* Charger une carte */}
      <Card>
        <CardHeader>
          <CardTitle>Charger une carte (XML)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input type="file" />
          <Button className="w-full">Charger la carte</Button>
          <p className="text-xs text-gray-500">État : aucune carte chargée</p>
        </CardContent>
      </Card>

      {/* Programme */}
      <Card>
        <CardHeader>
          <CardTitle>Gérer un programme P&D</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full">Créer un programme</Button>
          <Button variant="outline" className="w-full">Charger un programme (XML)</Button>
          <Button className="w-full">Ajouter Pickup & Delivery</Button>
        </CardContent>
      </Card>

      {/* Coursiers */}
      <Card>
        <CardHeader>
          <CardTitle>Gérer les coursiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Nombre de coursiers" />
          <p className="text-xs text-gray-500">Coursiers enregistrés : 0</p>
        </CardContent>
      </Card>

      {/* Itinéraires */}
      <Card>
        <CardHeader>
          <CardTitle>Calculer les itinéraires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full">Calculer la tournée optimale</Button>
          <p className="text-xs text-gray-500">Distance totale : -- | Durée : --</p>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Sauvegarder</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Exporter en XML</Button>
        </CardContent>
      </Card>
    </div>
  );
}
