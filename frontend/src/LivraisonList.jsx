import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area"; 

export default function LivraisonList({ livraisons }) {
  if (!livraisons || livraisons.length === 0) {
    return null; 
  }
  console.log("Affichage des livraisons :", livraisons);

  return (
    <div className="w-80 h-full bg-white border-r flex flex-col shadow-sm z-10">
      <div className="p-4 border-b bg-slate-50">
        <h2 className="font-semibold text-lg text-slate-800">Livraisons</h2>
        <p className="text-sm text-slate-500">{livraisons.length} planifiée(s)</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {livraisons.map((liv) => (
          <Card key={liv.id} className="mb-2 hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm font-bold text-blue-600">
                Livraison #{liv.id}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold">Enlèvement (Pickup):</span>
                <span>{liv.adresse_pickup_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Livraison (Delivery):</span>
                <span>{liv.adresse_delivery_id}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}