import { useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline, Marker } from "react-leaflet";
import L from 'leaflet';
import 'leaflet-arrowheads';
import "leaflet/dist/leaflet.css";

const createNumberedIcon = (number, type) => {
  let bgClass = "";
  if (type === "pickup") bgClass = "bg-blue-600";
  else if (type === "delivery") bgClass = "bg-red-600";
  else if (type === "warehouse") bgClass = "bg-yellow-400 text-slate-900"; 
  else if (type === "temp-pickup") bgClass = "bg-blue-400 opacity-90 border-dashed border-2"; 
  else if (type === "temp-delivery") bgClass = "bg-red-400 opacity-90 border-dashed border-2";

  const html = `
    <div class="${bgClass} w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-md transform hover:scale-110 transition-transform">
      ${number}
    </div>
  `;
  return L.divIcon({ className: "bg-transparent", html, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
};

// Icône personnalisée pour le livreur animé
const createDeliveryPersonIcon = (color, isWaiting = false) => {
  const emoji = isWaiting ? "📦" : "🚴🏼";
  const pulseClass = isWaiting ? "animate-pulse" : "";
  
  const html = `
    <div class="relative">
      <div class="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-lg font-bold border-3 border-white shadow-lg ${pulseClass}" style="background-color: ${color};">
        ${emoji}
      </div>
    </div>
  `;
  return L.divIcon({ 
    className: "bg-transparent", 
    html, 
    iconSize: [32, 32], 
    iconAnchor: [16, 16], 
    popupAnchor: [0, -16] 
  });
};

function MapRecenter({ mapData }) {
  const map = useMap();
  useEffect(() => {
    if (mapData && mapData.length > 0) {
      const lats = mapData.map(n => n.latitude);
      const lngs = mapData.map(n => n.longitude);
      map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [50, 50] });
    }
  }, [mapData, map]);
  return null;
}

function RouteWithArrows({ positions, color }) {
  const polylineRef = useRef(null);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (polyline) {
      // leaflet-arrowheads ajoute la méthode arrowheads() au prototype de Polyline
      if (typeof polyline.arrowheads === 'function') {
        polyline.arrowheads({
          size: '12px',       // Taille de la flèche
          frequency: '100px', // Une flèche tous les 100 pixels (ajustez selon besoin)
          fill: true,         // Flèche pleine
          color: color,       // Même couleur que la ligne
          offsets: { end: "10px" } 
        });
      }
    }
  }, [positions, color]); 

  return (
    <Polyline 
      ref={polylineRef}
      positions={positions}
      pathOptions={{ 
        color: color, 
        weight: 5, 
        opacity: 0.8,
        lineJoin: 'round'
      }} 
    />
  );
}

export default function MapHolder({ mapData, warehouse, deliveries, route, onNodeClick, isAdding, editingId, deliveryTime, animatedDeliveryPerson }) {
  
  const defaultCenter = [45.75, 4.85];

  const nodesMap = useMemo(() => {
    const map = new Map();
    if (mapData) mapData.forEach(node => map.set(String(node.id), node));
    return map;
  }, [mapData]);

  const warehouseNode = warehouse ? nodesMap.get(String(warehouse.adresse_id)) : null;

  const displayDeliveries = useMemo(() => {
    if (editingId) return deliveries.filter(l => l.id !== editingId);
    return deliveries;
  }, [deliveries, editingId]);

  const tourPolylines = useMemo(() => {
    if (!route || !Array.isArray(route)) return [];

    return route.map((tour) => {
      const positions = tour.full_path_ids
        .map((nodeId) => {
          const node = nodesMap.get(String(nodeId));
          return node ? [node.latitude, node.longitude] : null;
        })
        .filter((pos) => pos !== null);

      return {
        positions,
        color: tour.color || "#2563eb"
      };
    });
  }, [route, nodesMap]);

  return (
    <MapContainer center={defaultCenter} zoom={13} className={`w-full h-full z-0 ${isAdding || editingId ? 'cursor-crosshair' : ''}`}>
      <TileLayer attribution='' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

      {tourPolylines.map((tour, idx) => (
        <RouteWithArrows 
          key={idx}
          positions={tour.positions}
          color={tour.color}
        />
      ))}

      {mapData && mapData.map((node) => (
        <CircleMarker
          key={node.id}
          center={[node.latitude, node.longitude]}
          radius={(isAdding || editingId) ? 5 : 3} 
          pathOptions={{ 
            fillColor: (isAdding || editingId) ? "#3b82f6" : "#5f5f5fff", 
            fillOpacity: (isAdding || editingId) ? 0.4 : 0.6, 
            color: (isAdding || editingId) ? "#eff6ff" : "transparent",
            weight: 1 
          }}
          eventHandlers={{
            click: () => { if (onNodeClick) onNodeClick(node); },
            mouseover: (e) => e.target.setStyle({ radius: 8, fillOpacity: 1, fillColor: "#2563eb" }),
            mouseout: (e) => e.target.setStyle({ radius: (isAdding || editingId) ? 5 : 3, fillOpacity: (isAdding || editingId) ? 0.4 : 0.6, fillColor: (isAdding || editingId) ? "#3b82f6" : "#cbd5e1" }),
          }}
        >
          {!(isAdding || editingId) && (
            <Popup className="custom-popup"><div className="text-xs font-sans">Noeud #{node.id}</div></Popup>
          )}
        </CircleMarker>
      ))}

      {(isAdding || editingId) && deliveryTime?.pickupNode && (
        <Marker position={[deliveryTime.pickupNode.latitude, deliveryTime.pickupNode.longitude]} icon={createNumberedIcon(editingId || "P", "temp-pickup")} zIndexOffset={1000} />
      )}
      {(isAdding || editingId) && deliveryTime?.deliveryNode && (
        <Marker position={[deliveryTime.deliveryNode.latitude, deliveryTime.deliveryNode.longitude]} icon={createNumberedIcon(editingId || "D", "temp-delivery")} zIndexOffset={1000} />
      )}

      {warehouseNode && (
        <Marker position={[warehouseNode.latitude, warehouseNode.longitude]} icon={createNumberedIcon("E", "warehouse")} zIndexOffset={1000}>
          <Popup>Entrepôt</Popup>
        </Marker>
      )}

      {displayDeliveries.map((liv) => {
        const pickupNode = nodesMap.get(String(liv.adresse_pickup_id));
        const deliveryNode = nodesMap.get(String(liv.adresse_delivery_id));
        return (
          <div key={liv.id}>
            {pickupNode && <Marker position={[pickupNode.latitude, pickupNode.longitude]} icon={createNumberedIcon(liv.id, "pickup")}><Popup>Livraison #{liv.id} (Pickup)</Popup></Marker>}
            {deliveryNode && <Marker position={[deliveryNode.latitude, deliveryNode.longitude]} icon={createNumberedIcon(liv.id, "delivery")}><Popup>Livraison #{liv.id} (Delivery)</Popup></Marker>}
          </div>
        );
      })}

      {/* Livreur animé */}
      {animatedDeliveryPerson && animatedDeliveryPerson.position && animatedDeliveryPerson.isActive && route && route[animatedDeliveryPerson.tourIndex] && (
        <Marker 
          position={[animatedDeliveryPerson.position.latitude, animatedDeliveryPerson.position.longitude]} 
          icon={createDeliveryPersonIcon(
            route[animatedDeliveryPerson.tourIndex].color || "#2563eb",
            animatedDeliveryPerson.isWaiting
          )}
          zIndexOffset={3000}
        >
          <Popup>
            <div className="text-xs font-sans">
              <strong>{animatedDeliveryPerson.isWaiting ? "📦" : "🚴🏼"} Livreur {animatedDeliveryPerson.tourIndex + 1}</strong><br/>
              {animatedDeliveryPerson.isWaiting ? "En cours..." : `Position: Nœud #${animatedDeliveryPerson.position.id}`}
            </div>
          </Popup>
        </Marker>
      )}

      <MapRecenter mapData={mapData} />
      
      {/* Légende mini en bas à gauche */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg px-2 py-1.5 border border-gray-200">
        <div className="flex gap-3 text-[10px] text-gray-700">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 border border-gray-300"></span>
            <span>Entrepôt</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Delivery</span>
          </div>
        </div>
      </div>
    </MapContainer>
  );
}