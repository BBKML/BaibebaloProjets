import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import driversAPI from '../api/drivers';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons (webpack asset issue)
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Korhogo, Côte d'Ivoire center
const MAP_CENTER = [9.4581, -5.6296];

const STATUS_CONFIG = {
  available: { label: 'Disponible', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' },
  busy: { label: 'Occupé', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  on_break: { label: 'Pause', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  offline: { label: 'Hors ligne', color: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
};

const RealTimeDriverTracking = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [MapComponents, setMapComponents] = useState(null);

  // Load Leaflet components lazily (SSR-safe)
  useEffect(() => {
    import('react-leaflet').then(({ MapContainer, TileLayer, Marker, Popup, Circle }) => {
      setMapComponents({ MapContainer, TileLayer, Marker, Popup, Circle });
    });
  }, []);

  // Fetch all active drivers
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['drivers-tracking'],
    queryFn: () => driversAPI.getDrivers({ limit: 100, status: '' }),
    refetchInterval: 30000,
    retry: 2,
  });

  const allDrivers = data?.data?.delivery_persons || [];

  // Only drivers with known GPS coordinates
  const driversWithLocation = allDrivers.filter(
    (d) => d.current_latitude && d.current_longitude
  );

  const filteredDrivers = allDrivers.filter((d) => {
    const matchFilter =
      activeFilter === 'all' ||
      (activeFilter === 'available' && d.delivery_status === 'available') ||
      (activeFilter === 'busy' && d.delivery_status === 'busy') ||
      (activeFilter === 'offline' && (!d.delivery_status || d.delivery_status === 'offline'));
    const name = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase();
    const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || (d.phone || '').includes(searchQuery);
    return matchFilter && matchSearch;
  });

  const counts = {
    all: allDrivers.length,
    available: allDrivers.filter((d) => d.delivery_status === 'available').length,
    busy: allDrivers.filter((d) => d.delivery_status === 'busy').length,
    offline: allDrivers.filter((d) => !d.delivery_status || d.delivery_status === 'offline').length,
  };

  const FILTERS = [
    { key: 'all', label: 'Tous', icon: 'group' },
    { key: 'available', label: 'Disponibles', icon: 'check_circle' },
    { key: 'busy', label: 'Occupés', icon: 'local_shipping' },
    { key: 'offline', label: 'Hors ligne', icon: 'offline_bolt' },
  ];

  const createMarkerIcon = (deliveryStatus) => {
    const color = deliveryStatus === 'available' ? '#10b981' : deliveryStatus === 'busy' ? '#f59e0b' : '#94a3b8';
    return L.divIcon({
      html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <span class="material-symbols-outlined" style="color:white;font-size:16px;font-variation-settings:'FILL' 1">two_wheeler</span>
      </div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/drivers"
              className="flex items-center justify-center size-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Suivi Temps Réel Livreurs
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {driversWithLocation.length} livreur{driversWithLocation.length !== 1 ? 's' : ''} avec position GPS active
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Actualiser
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'all', label: 'Total livreurs', icon: 'group', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-700' },
            { key: 'available', label: 'Disponibles', icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { key: 'busy', label: 'En livraison', icon: 'local_shipping', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { key: 'offline', label: 'Hors ligne', icon: 'offline_bolt', color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700' },
          ].map(({ key, label, icon, color, bg }) => (
            <div key={key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 shadow-sm">
              <div className={`size-10 rounded-lg ${bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${color}`}>{icon}</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{isLoading ? '—' : counts[key]}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeFilter === key
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeFilter === key ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Map + List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm h-145">
            {MapComponents ? (
              <MapComponents.MapContainer
                center={MAP_CENTER}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={true}
              >
                <MapComponents.TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {driversWithLocation.map((driver) => {
                  const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Sans nom';
                  const statusCfg = STATUS_CONFIG[driver.delivery_status] || STATUS_CONFIG.offline;
                  return (
                    <MapComponents.Marker
                      key={driver.id}
                      position={[Number(driver.current_latitude), Number(driver.current_longitude)]}
                      icon={createMarkerIcon(driver.delivery_status)}
                      eventHandlers={{ click: () => setSelectedDriver(driver) }}
                    >
                      <MapComponents.Popup>
                        <div className="text-sm min-w-40">
                          <p className="font-black text-slate-900">{fullName}</p>
                          <p className="text-slate-500">{driver.phone}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${statusCfg.bg}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </MapComponents.Popup>
                    </MapComponents.Marker>
                  );
                })}
              </MapComponents.MapContainer>
            ) : (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-400 animate-pulse">map</span>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mt-3">Chargement de la carte...</p>
                </div>
              </div>
            )}
            {!isLoading && driversWithLocation.length === 0 && MapComponents && (
              <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-800/90 rounded-xl px-5 py-3 shadow-lg border border-slate-200 dark:border-slate-700 text-sm text-center">
                  <span className="material-symbols-outlined text-amber-500 text-xl block mx-auto mb-1">location_off</span>
                  Aucun livreur avec position GPS active.<br />
                  <span className="text-xs text-slate-400">Les livreurs apparaissent quand l'app est ouverte.</span>
                </div>
              </div>
            )}
          </div>

          {/* Driver list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-145">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-black text-slate-900 dark:text-white mb-3">
                Livreurs ({filteredDrivers.length})
              </p>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom ou téléphone..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading ? (
                <div className="p-6 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl animate-pulse block mb-2">sync</span>
                  Chargement...
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl block mb-2">search_off</span>
                  Aucun livreur
                </div>
              ) : (
                filteredDrivers.map((driver) => {
                  const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Sans nom';
                  const statusCfg = STATUS_CONFIG[driver.delivery_status] || STATUS_CONFIG.offline;
                  const hasLocation = !!(driver.current_latitude && driver.current_longitude);
                  return (
                    <div
                      key={driver.id}
                      onClick={() => setSelectedDriver(driver)}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedDriver?.id === driver.id
                          ? 'bg-primary/10 border-l-2 border-primary'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300">
                            {(driver.first_name?.[0] || '') + (driver.last_name?.[0] || '') || '?'}
                          </div>
                          <span className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white dark:border-slate-800 ${statusCfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{fullName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{driver.phone}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${statusCfg.bg}`}>
                            {statusCfg.label}
                          </span>
                          {hasLocation ? (
                            <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">location_on</span>
                              GPS actif
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">location_off</span>
                              Pas de GPS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RealTimeDriverTracking;
