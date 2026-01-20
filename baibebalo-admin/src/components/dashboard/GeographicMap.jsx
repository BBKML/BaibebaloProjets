import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuration des icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Coordonnées de Korhogo, Côte d'Ivoire
const KORHOGO_CENTER = [9.4581, -5.6296];
const KORHOGO_ZOOM = 13;

// Composant pour contrôler la carte
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

const GeographicMap = ({ activeOrders, hotZones, restaurants }) => {
  const [mapCenter, setMapCenter] = useState(KORHOGO_CENTER);
  const [mapZoom, setMapZoom] = useState(KORHOGO_ZOOM);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Créer une icône personnalisée pour les commandes actives
  const createOrderIcon = (status) => {
    const colors = {
      new: '#eab308',
      accepted: '#3b82f6',
      preparing: '#f97316',
      ready: '#a855f7',
      delivering: '#0ca3e9',
    };
    const color = colors[status] || '#6b7280';

    return L.divIcon({
      className: 'custom-order-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  // Créer une icône pour les restaurants
  const restaurantIcon = L.divIcon({
    className: 'custom-restaurant-marker',
    html: `
      <div style="
        background-color: #10b981;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-slate-900 dark:text-white">Carte Géographique</h3>
        <p className="text-xs text-slate-500 mt-1">Visualisation des commandes par quartier</p>
      </div>
      <div className="h-96 relative bg-slate-100 dark:bg-slate-950">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <MapController center={mapCenter} zoom={mapZoom} />
          
          {/* Tuiles OpenStreetMap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Zones chaudes (heatmap) */}
          {hotZones.map((zone, index) => {
            const intensity = Math.min(zone.orders_count / 50, 1); // Normaliser l'intensité
            return (
              <Circle
                key={`zone-${index}`}
                center={[zone.center.lat, zone.center.lng]}
                radius={1000} // 1km de rayon
                pathOptions={{
                  fillColor: '#ef4444',
                  fillOpacity: intensity * 0.3,
                  color: '#ef4444',
                  weight: 2,
                  opacity: 0.6,
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-1">{zone.zone}</h3>
                    <p className="text-xs text-slate-600">
                      {zone.orders_count} commandes (30 derniers jours)
                    </p>
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* Restaurants actifs */}
          {restaurants.map((restaurant) => (
            restaurant.location && (
              <Marker
                key={`restaurant-${restaurant.id}`}
                position={[restaurant.location.lat, restaurant.location.lng]}
                icon={restaurantIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-1">{restaurant.name}</h3>
                    <p className="text-xs text-slate-600">Restaurant actif</p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}

          {/* Commandes actives */}
          {activeOrders.map((order) => {
            if (!order.delivery_location) return null;
            
            return (
              <Marker
                key={`order-${order.id}`}
                position={[order.delivery_location.lat, order.delivery_location.lng]}
                icon={createOrderIcon(order.status)}
                eventHandlers={{
                  click: () => setSelectedOrder(order),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-1">
                      #{order.order_number || order.id.slice(0, 8)}
                    </h3>
                    <p className="text-xs text-slate-600 mb-1">
                      {order.restaurant?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Statut: {order.status}
                    </p>
                    {order.zone && (
                      <p className="text-xs text-slate-400 mt-1">
                        📍 {order.zone}
                      </p>
                    )}
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                    >
                      Voir détails →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Restaurants</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-primary" />
            <span className="text-slate-600 dark:text-slate-400">Commandes actives</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-red-500 opacity-50" />
            <span className="text-slate-600 dark:text-slate-400">Zones chaudes</span>
          </div>
        </div>
      </div>

      {/* Modal de détails de commande */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Détails de la commande
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Numéro</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Restaurant</p>
                <p className="text-sm text-slate-900 dark:text-white">
                  {selectedOrder.restaurant?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Statut</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  selectedOrder.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                  selectedOrder.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                  selectedOrder.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                  selectedOrder.status === 'ready' ? 'bg-purple-100 text-purple-800' :
                  selectedOrder.status === 'delivering' ? 'bg-primary/10 text-primary' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Montant</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(selectedOrder.total || 0)}
                </p>
              </div>
              {selectedOrder.zone && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Zone</p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    📍 {selectedOrder.zone}
                  </p>
                </div>
              )}
              {selectedOrder.delivery_location && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Coordonnées GPS</p>
                  <p className="text-sm text-slate-900 dark:text-white font-mono">
                    {selectedOrder.delivery_location.lat.toFixed(6)}, {selectedOrder.delivery_location.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  window.location.href = `/orders/${selectedOrder.id}`;
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold"
              >
                Voir la commande complète
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeographicMap;
