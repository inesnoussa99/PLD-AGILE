import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-arrowheads';
import { useMemo, useRef, useEffect } from 'react';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// --- Définition des Icônes ---
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

// --- SOUS-COMPOSANT POUR UNE LIGNE (Pour gérer les flèches individuellement) ---
const RoutePolyline = ({ positions, color }) => {
  const polyRef = useRef(null);

  useEffect(() => {
    if (polyRef.current) {
      polyRef.current.arrowheads({
        size: '15px',
        frequency: '80px',
        fill: true,
        color: color,
        yawn: 60
      });
      polyRef.current.redraw();
    }
  }, [positions, color]);

  return <Polyline ref={polyRef} positions={positions} color={color} weight={4} opacity={0.8} />;
};

// --- COMPOSANT PRINCIPAL ---
export default function MapHolder({ mapData, tour, onMarkerClick, selectionMode }) {
  
  const defaultCenter = mapData.length > 0 
    ? [mapData[0].latitude, mapData[0].longitude] 
    : [45.75, 4.85];

  const mapStyle = { height: '100%', width: '100%', cursor: selectionMode ? 'crosshair' : 'grab' };

  // 1. Préparation des données (Nodes & Roles)
  const { nodesMap, nodeRoles } = useMemo(() => {
    const nMap = new Map(mapData.map(node => [node.id, node]));
    const nRoles = new Map();

    // Fonction utilitaire pour traiter une tournée
    const processTourObj = (t) => {
      if (t.steps) {
        t.steps.forEach(step => {
          const type = step.type.includes('ENTREPOT') ? 'ENTREPOT' : step.type;
          nRoles.set(step.id, type);
        });
      }
    };

    // Gestion : tour peut être null, un objet unique (vieux format) ou un tableau (nouveau format)
    if (Array.isArray(tour)) {
      tour.forEach(t => processTourObj(t));
    } else if (tour) {
      processTourObj(tour);
    }

    return { nodesMap: nMap, nodeRoles: nRoles };
  }, [mapData, tour]);

  // 2. Préparation des lignes à tracer
  const routesToDisplay = useMemo(() => {
    if (!tour) return [];
    
    // On normalise en tableau
    const tourList = Array.isArray(tour) ? tour : [tour];

    return tourList.map((t, index) => {
      // Conversion des IDs en coords
      const coords = t.full_path_ids
        .map(id => {
          const node = nodesMap.get(id);
          return node ? [node.latitude, node.longitude] : null;
        })
        .filter(c => c !== null);

      return {
        key: index,
        coords: coords,
        color: t.color || "#2563eb" // Couleur fournie par le back, ou bleu par défaut
      };
    });
  }, [tour, nodesMap]);


  return (
    <MapContainer center={defaultCenter} zoom={13} style={mapStyle}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {/* Affichage des itinéraires */}
      {routesToDisplay.map(route => (
        <RoutePolyline 
          key={route.key} 
          positions={route.coords} 
          color={route.color} 
        />
      ))}

      {/* Affichage des marqueurs */}
      {mapData.map((node) => {
        const role = nodeRoles.get(node.id);
        let iconToUse = defaultIcon;
        let label = `Noeud ${node.id}`;

        if (tour) { // Si un calcul est fait, on filtre et colore
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
                return null; // On masque les points inutiles
            }
        }
        
        return (
          <Marker 
            key={node.id} 
            position={[node.latitude, node.longitude]}
            icon={iconToUse}
            eventHandlers={{
              click: () => { if (onMarkerClick) onMarkerClick(node.id); }
            }}
          >
            <Popup className="font-semibold">{label}</Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}