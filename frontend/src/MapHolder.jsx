import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Correction icône par défaut Leaflet (sinon markers n'apparaissent pas)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapHolder({ mapData }) {
  if (mapData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full rounded-xl bg-gray-100 border border-gray-300 p-6">
        <p className="text-gray-400 text-lg">Carte de la ville</p>
        <p className="text-gray-400 text-sm">
          Aucune carte chargée. Utilisez « Charger une carte (XML) » dans le panneau de gauche.
        </p>
      </div>
    );
  }

  // Calculer le centre de la carte
  const latitudes = mapData.map(n => n.latitude);
  const longitudes = mapData.map(n => n.longitude);
  const center = [
    latitudes.reduce((a,b) => a+b,0)/latitudes.length,
    longitudes.reduce((a,b) => a+b,0)/longitudes.length
  ];

  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom={true} className="w-full h-full rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapData.map(node => (
        <Marker
          key={node.id}
          position={[node.latitude, node.longitude]}
        >
          <Popup>
            ID: {node.id} <br />
            lat: {node.latitude}, lng: {node.longitude}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
