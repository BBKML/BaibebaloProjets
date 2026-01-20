import { useState } from 'react';
import Layout from '../components/layout/Layout';

const RealTimeDriverTracking = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [drivers] = useState([
    {
      id: 'DRV-001',
      name: 'Amadou Kone',
      status: 'available',
      lastUpdate: '2 min',
      activeOrderId: null,
      position: { lat: 9.4581, lng: -5.6296 },
    },
    {
      id: 'DRV-002',
      name: 'Bintou Coulibaly',
      status: 'delivering',
      lastUpdate: 'Now',
      activeOrderId: 'ORD-5421',
      position: { lat: 9.4600, lng: -5.6300 },
    },
    {
      id: 'DRV-003',
      name: 'Mamadou Diallo',
      status: 'available',
      lastUpdate: '5 min',
      activeOrderId: null,
      position: { lat: 9.4550, lng: -5.6250 },
    },
    {
      id: 'DRV-004',
      name: 'Fatou Traoré',
      status: 'delivering',
      lastUpdate: '1 min',
      activeOrderId: 'ORD-5422',
      position: { lat: 9.4620, lng: -5.6320 },
    },
  ]);

  const filteredDrivers = drivers.filter((driver) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'available' && driver.status === 'available') ||
      (activeFilter === 'busy' && driver.status === 'delivering');
    const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const availableCount = drivers.filter((d) => d.status === 'available').length;
  const busyCount = drivers.filter((d) => d.status === 'delivering').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Suivi Temps Réel Livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Suivez la position et le statut de tous les livreurs en temps réel
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">circle</span>
            Tous
          </button>
          <button
            onClick={() => setActiveFilter('available')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeFilter === 'available'
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">circle</span>
            Disponibles ({availableCount})
          </button>
          <button
            onClick={() => setActiveFilter('busy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeFilter === 'busy'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">circle</span>
            Occupés ({busyCount})
          </button>
        </div>

        {/* Map and List Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm h-[600px] relative">
              {/* Map Placeholder - In production, this would be a real map component (Google Maps, Mapbox, etc.) */}
              <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">map</span>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Carte interactive (Korhogo, Côte d'Ivoire)
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {filteredDrivers.length} livreur{filteredDrivers.length > 1 ? 's' : ''} visible{filteredDrivers.length > 1 ? 's' : ''}
                  </p>
                </div>
                {/* Map markers simulation */}
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="absolute"
                    style={{
                      left: `${50 + (driver.position.lat - 9.4581) * 10000}%`,
                      top: `${50 + (driver.position.lng + 5.6296) * 10000}%`,
                    }}
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <div
                      className={`size-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
                        driver.status === 'available' ? 'bg-primary' : 'bg-orange-500'
                      }`}
                    >
                      <span className="material-symbols-outlined text-white text-sm">
                        {driver.status === 'available' ? 'motorcycle' : 'local_shipping'}
                      </span>
                    </div>
                    {selectedDriver?.id === driver.id && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                        {driver.name} ({driver.status === 'available' ? 'Disponible' : 'En Livraison'})
                      </div>
                    )}
                  </div>
                ))}
                {/* Map controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                  <button className="size-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">add</span>
                  </button>
                  <button className="size-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">remove</span>
                  </button>
                  <button className="size-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">my_location</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Drivers List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Livreurs en Ligne ({drivers.length})
              </h3>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un livreur..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">search_off</span>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Aucun livreur trouvé</p>
                </div>
              ) : (
                filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDriver?.id === driver.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          driver.status === 'available' ? 'bg-primary/20 text-primary' : 'bg-orange-500/20 text-orange-500'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {driver.status === 'available' ? 'motorcycle' : 'local_shipping'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{driver.name}</p>
                          <span
                            className={`size-2 rounded-full ${
                              driver.status === 'available' ? 'bg-primary' : 'bg-orange-500'
                            }`}
                          />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          Status: {driver.status === 'available' ? 'Disponible' : 'En Livraison'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Last update: {driver.lastUpdate} {typeof driver.lastUpdate === 'number' ? 'min' : ''}
                        </p>
                        {driver.activeOrderId && (
                          <p className="text-xs font-bold text-primary mt-1">Active Order ID: {driver.activeOrderId}</p>
                        )}
                        {!driver.activeOrderId && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">-</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RealTimeDriverTracking;
