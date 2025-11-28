import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-arrowheads'; 
import { useMemo, useRef, useEffect } from 'react';




delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});


const circleIcon = new L.divIcon({
  className: "custom-circle-marker", 
  
  html: "", 
  
  iconSize: [14, 14],
  
  
  iconAnchor: [7, 7], 
});

const createColoredIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};
const warehouseIcon = createColoredIcon('black');
const pickupIcon = createColoredIcon('green');
const deliveryIcon = createColoredIcon('red');
const defaultIcon = new L.Icon.Default();

export default function MapHolder({ mapData, tour }) {
  const defaultCenter = mapData.length > 0 
    ? [mapData[0].latitude, mapData[0].longitude] 
    : [45.75, 4.85];

  // 👇 3. Création de la référence pour la Polyline
  const polylineRef = useRef(null);

  const { nodesMap, nodeRoles } = useMemo(() => {
    const nMap = new Map(mapData.map(node => [node.id, node]));
    const nRoles = new Map();
    if (tour && tour.steps) {
      tour.steps.forEach(step => {
        const type = step.type.includes('ENTREPOT') ? 'ENTREPOT' : step.type;
        nRoles.set(step.id, type);
      });
    }
    return { nodesMap: nMap, nodeRoles: nRoles };
  }, [mapData, tour]);

  const routeCoordinates = useMemo(() => {
    if (!tour || !tour.full_path_ids) return [];
    return tour.full_path_ids
      .map(id => {
        const node = nodesMap.get(id);
        return node ? [node.latitude, node.longitude] : null;
      })
      .filter(c => c !== null);
  }, [tour, nodesMap]);

  // 👇 4. UseEffect pour ajouter les flèches quand l'itinéraire change
  useEffect(() => {
    if (polylineRef.current) {
        // On applique les flèches sur l'instance Leaflet
        // .arrowheads() est ajouté par l'import 'leaflet-arrowheads'
        polylineRef.current.arrowheads({
            size: '15px',     // Taille de la flèche
            frequency: '80px', // Une flèche tous les 80 pixels
            fill: true,       // Flèche pleine
            color: '#2563eb', // Même couleur que la ligne (blue-600)
            yawn: 60          // Angle d'ouverture de la flèche
        });
        
        // Force la mise à jour visuelle (parfois nécessaire)
        polylineRef.current.redraw();
    }
  }, [routeCoordinates]); // Se relance si les coordonnées changent

  return (
    <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {routeCoordinates.length > 0 && (
        <Polyline 
          ref={polylineRef} // 👇 5. On attache la référence ici
          positions={routeCoordinates} 
          color="#2563eb" 
          weight={4} 
          opacity={0.7} 
        />
      )}

      {mapData.map((node) => {
        const role = nodeRoles.get(node.id);
        let iconToUse = defaultIcon;
        let label = `Noeud ${node.id}`;

        if (tour) {
            if (role === 'ENTREPOT') {
                iconToUse = warehouseIcon;
                label = `🏢 Entrepôt (${node.id})`;
            } else if (role === 'PICKUP') {
                iconToUse = pickupIcon;
                label = `📦 Enlèvement (${node.id})`;
            } else if (role === 'DELIVERY') {
                iconToUse = deliveryIcon;
                label = `📍 Livraison (${node.id})`;
            } else {
                return null; 
            }
        }
        
        return (
          <Marker 
            key={node.id} 
            position={[node.latitude, node.longitude]}
            icon={iconToUse}
          >
            <Popup className="font-semibold">{label}</Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}