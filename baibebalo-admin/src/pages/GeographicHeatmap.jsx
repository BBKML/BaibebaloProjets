import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../components/layout/Layout';
import { exportToCSV } from '../utils/export';
import { analyticsAPI } from '../api/analytics';
import { dashboardAPI } from '../api/dashboard';

// Configuration des icônes Leaflet (nécessaire pour éviter les erreurs d'affichage)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Coordonnées de Korhogo, Côte d'Ivoire
const KORHOGO_CENTER = [9.4581, -5.6296];
const KORHOGO_ZOOM = 13;

// Composant pour contrôler la carte (zoom, centrage)
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

const GeographicHeatmap = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('24h');
  const [orderType, setOrderType] = useState('all');
  const [mapCenter, setMapCenter] = useState(KORHOGO_CENTER);
  const [mapZoom, setMapZoom] = useState(KORHOGO_ZOOM);
  const periodParam = period === '24h' ? '7d' : period === '7j' ? '7d' : '30d';

  // Récupérer les données analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['analytics', 'overview', periodParam],
    queryFn: () => analyticsAPI.getAnalytics({ period: periodParam }),
  });

  // Récupérer les données du dashboard
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  // Note: salesData peut être utilisé plus tard pour des détails supplémentaires

  // Calculer les données par zone depuis les données réelles
  // Note: Les zones géographiques nécessiteraient une table dédiée dans la base de données
  // Pour l'instant, on utilise des données estimées basées sur les commandes
  const totalOrders = Number.parseInt(analyticsData?.data?.total_orders || dashboardData?.data?.global?.total_orders || 0, 10);
  const activeOrders = Number.parseInt(dashboardData?.data?.today?.active_orders || 0, 10);
  const ordersChange = Number.parseFloat(analyticsData?.data?.orders_change || 0);

  // Données des zones avec coordonnées GPS réelles de Korhogo
  const zoneData = [
    { 
      name: 'Centre-ville', 
      orders: Math.floor(totalOrders * 0.35), 
      status: 'peak', 
      color: 'red',
      position: [9.4581, -5.6296], // Centre de Korhogo
      radius: 2000 // 2 km de rayon
    },
    { 
      name: 'Quartier Nord', 
      orders: Math.floor(totalOrders * 0.25), 
      status: 'high', 
      color: 'orange',
      position: [9.4700, -5.6296], // Nord de Korhogo
      radius: 1500 // 1.5 km de rayon
    },
    { 
      name: 'Quartier Sud', 
      orders: Math.floor(totalOrders * 0.20), 
      status: 'medium', 
      color: 'yellow',
      position: [9.4461, -5.6296], // Sud de Korhogo
      radius: 1500 // 1.5 km de rayon
    },
    { 
      name: 'Périphérie Est', 
      orders: Math.floor(totalOrders * 0.12), 
      status: 'low', 
      color: 'green',
      position: [9.4581, -5.6150], // Est de Korhogo
      radius: 1000 // 1 km de rayon
    },
    { 
      name: 'Périphérie Ouest', 
      orders: Math.floor(totalOrders * 0.08), 
      status: 'low', 
      color: 'green',
      position: [9.4581, -5.6442], // Ouest de Korhogo
      radius: 1000 // 1 km de rayon
    },
  ];

  // Fonctions pour les contrôles de la carte
  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 8));
  };

  const handleCenterMap = () => {
    setMapCenter(KORHOGO_CENTER);
    setMapZoom(KORHOGO_ZOOM);
  };

  // Fonction pour exporter les données
  const handleExport = () => {
    if (isLoadingAnalytics || isLoadingDashboard || zoneData.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    // Préparer les données pour l'export
    const exportData = zoneData.map((zone) => ({
      Zone: zone.name,
      'Nombre de commandes': zone.orders,
      Statut: zone.status === 'peak' ? 'Pic d\'activité' : zone.status === 'high' ? 'Élevé' : zone.status === 'medium' ? 'Moyen' : 'Faible',
      'Latitude': zone.position[0],
      'Longitude': zone.position[1],
      'Rayon (mètres)': zone.radius,
    }));

    // Exporter en CSV
    exportToCSV(exportData, `heatmap-geographique-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export CSV réussi');
  };

  const getColorClass = (color) => {
    const colors = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
    };
    return colors[color] || 'bg-slate-200';
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Sidebar - Data & Filters */}
        <aside className="w-80 lg:w-96 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            {/* Bouton retour */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm font-medium">Retour</span>
            </button>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary text-xs font-bold uppercase tracking-widest">Phase 5</span>
                <div className="size-1.5 rounded-full bg-primary animate-pulse"></div>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Heatmap Analytique
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Densité des commandes à Korhogo
              </p>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">
                <span>Période</span>
                <span className="text-primary cursor-pointer">Modifier</span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => setPeriod('24h')}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    period === '24h'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => setPeriod('7j')}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    period === '7j'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  7j
                </button>
                <button
                  onClick={() => setPeriod('30j')}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    period === '30j'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  30j
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1 pt-2">
                <span>Type de Commande</span>
              </div>
              <div className="flex h-11 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 p-1">
                <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-xs font-bold transition-colors ${
                  orderType === 'all'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="filter-type"
                    value="all"
                    checked={orderType === 'all'}
                    onChange={() => setOrderType('all')}
                    className="hidden"
                  />
                  Tout
                </label>
                <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-xs font-bold transition-colors ${
                  orderType === 'restaurant'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="filter-type"
                    value="restaurant"
                    checked={orderType === 'restaurant'}
                    onChange={() => setOrderType('restaurant')}
                    className="hidden"
                  />
                  Resto
                </label>
                <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-xs font-bold transition-colors ${
                  orderType === 'driver'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="filter-type"
                    value="driver"
                    checked={orderType === 'driver'}
                    onChange={() => setOrderType('driver')}
                    className="hidden"
                  />
                  Driver
                </label>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* Zone Statistics */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                Statistiques par Zone
              </h3>
              {isLoadingAnalytics || isLoadingDashboard ? (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                </div>
              ) : (
                zoneData.map((zone, index) => (
                <div
                  key={`zone-${index}-${zone.name}`}
                  className="group p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-primary transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">{zone.name}</h4>
                    {zone.status === 'peak' && (
                      <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Peak activity
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {zone.orders.toLocaleString('fr-FR')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">commandes complétées</p>
                    </div>
                    <div className="h-8 w-20 flex items-end gap-0.5">
                      {[0.4, 0.6, 0.4, 0.8, 1].map((height, i) => (
                        <div
                          key={`bar-${i}`}
                          className={`w-full ${getColorClass(zone.color)} rounded-t-sm`}
                          style={{ height: `${height * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-auto p-6">
            <button 
              onClick={handleExport}
              disabled={isLoadingAnalytics || isLoadingDashboard}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">download</span>
              <span>Exporter les données</span>
            </button>
          </div>
        </aside>

        {/* Main Content - Map Area */}
        <section className="flex-1 relative bg-[#0b0d11] dark:bg-slate-950 overflow-hidden">
          {/* Carte Leaflet Interactive */}
          <div className="absolute inset-0 z-0">
            {isLoadingAnalytics || isLoadingDashboard ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0b0d11] z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-white text-sm">Chargement de la carte...</p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={false}
                attributionControl={false}
                scrollWheelZoom={true}
              >
              <MapController center={mapCenter} zoom={mapZoom} />
              
              {/* Tuiles OpenStreetMap */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Cercles de heatmap pour chaque zone */}
              {zoneData.map((zone, index) => {
                const getColor = (color) => {
                  const colors = {
                    red: '#ef4444',
                    orange: '#f97316',
                    yellow: '#eab308',
                    green: '#22c55e',
                  };
                  return colors[color] || '#6b7280';
                };

                return (
                  <Circle
                    key={`zone-circle-${index}`}
                    center={zone.position}
                    radius={zone.radius}
                    pathOptions={{
                      fillColor: getColor(zone.color),
                      fillOpacity: zone.status === 'peak' ? 0.4 : zone.status === 'high' ? 0.3 : zone.status === 'medium' ? 0.2 : 0.15,
                      color: getColor(zone.color),
                      weight: 2,
                      opacity: 0.6,
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-sm mb-1">{zone.name}</h3>
                        <p className="text-xs text-slate-600">
                          {zone.orders.toLocaleString('fr-FR')} commandes
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Statut: {zone.status === 'peak' ? 'Pic d\'activité' : zone.status === 'high' ? 'Élevé' : zone.status === 'medium' ? 'Moyen' : 'Faible'}
                        </p>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

              {/* Marqueurs pour chaque zone */}
              {zoneData.map((zone, index) => {
                const getMarkerColor = (color) => {
                  const colors = {
                    red: '#ef4444',
                    orange: '#f97316',
                    yellow: '#eab308',
                    green: '#22c55e',
                  };
                  return colors[color] || '#6b7280';
                };

                // Créer une icône personnalisée
                const customIcon = L.divIcon({
                  className: 'custom-marker',
                  html: `
                    <div style="
                      background-color: ${getMarkerColor(zone.color)};
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      border: 3px solid white;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    "></div>
                  `,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                });

                return (
                  <Marker
                    key={`zone-marker-${index}`}
                    position={zone.position}
                    icon={customIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-sm mb-1">{zone.name}</h3>
                        <p className="text-xs text-slate-600">
                          {zone.orders.toLocaleString('fr-FR')} commandes complétées
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {zone.status === 'peak' && (
                            <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              Peak activity
                            </span>
                          )}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              </MapContainer>
            )}
          </div>

          {/* Floating Overlays */}
          {/* Quick Summary Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 px-6 py-3 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-700 dark:border-slate-800 rounded-full shadow-2xl">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                Commandes Actives
              </span>
              <span className="text-sm font-black text-white">
                {isLoadingDashboard ? '...' : activeOrders.toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="w-px h-6 bg-slate-700 dark:bg-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                Progression
              </span>
              <span className={`text-sm font-black ${ordersChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isLoadingAnalytics ? '...' : `${ordersChange > 0 ? '+' : ''}${ordersChange.toFixed(1)}%`}
              </span>
            </div>
            <div className="w-px h-6 bg-slate-700 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">En Direct</span>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-6 left-6 z-30 p-4 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-700 dark:border-slate-800 rounded-xl shadow-2xl min-w-[200px]">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase">
              Légende de Densité
            </p>
            <div
              className="h-2 w-full rounded-full mb-2"
              style={{
                background: 'linear-gradient(to right, #5AF063, #FBFF00, #FF9100, #CC0000)',
              }}
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              <span>Faible</span>
              <span>Moyenne</span>
              <span>Pic</span>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
            <button 
              onClick={handleZoomIn}
              className="size-10 flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-700 dark:border-slate-800 rounded-lg text-white hover:bg-primary transition-colors"
              title="Zoom avant"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button 
              onClick={handleZoomOut}
              className="size-10 flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-700 dark:border-slate-800 rounded-lg text-white hover:bg-primary transition-colors"
              title="Zoom arrière"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button 
              onClick={handleCenterMap}
              className="size-10 mt-2 flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-700 dark:border-slate-800 rounded-lg text-white hover:bg-primary transition-colors"
              title="Centrer sur Korhogo"
            >
              <span className="material-symbols-outlined">my_location</span>
            </button>
            <button className="size-10 flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-700 dark:border-slate-800 rounded-lg text-white hover:bg-primary transition-colors" title="Options de carte">
              <span className="material-symbols-outlined">layers</span>
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default GeographicHeatmap;
