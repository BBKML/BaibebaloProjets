import { useState } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const DeliveryZones = () => {
  const [selectedZone, setSelectedZone] = useState(0);
  const [zones] = useState([
    { id: 1, name: 'Centre-ville (Commerce)', baseFee: 1000, estimatedTime: '15-25 min', status: 'active', color: 'primary' },
    { id: 2, name: 'Quartier Soba', baseFee: 1500, estimatedTime: '30-45 min', status: 'active', color: 'emerald' },
    { id: 3, name: 'Petit Paris', baseFee: 1200, estimatedTime: '20-35 min', status: 'active', color: 'orange' },
    { id: 4, name: 'Quartier Résidentiel', baseFee: 2000, estimatedTime: '40-55 min', status: 'active', color: 'purple' },
  ]);

  const handleCreateZone = () => {
    toast.success('Nouvelle zone créée');
  };

  const handleEdit = (zoneId) => {
    toast.success(`Modification de la zone ${zoneId}`);
  };

  const handleDelete = (zoneId) => {
    if (globalThis.confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) {
      toast.success(`Zone ${zoneId} supprimée`);
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Left Sidebar: Zone Management */}
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Livraison Korhogo</h1>
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {zones.length} Zones
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Configurez les tarifs et périmètres par quartier.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {zones.map((zone, index) => {
              const isSelected = selectedZone === index;
              const colorClasses = {
                primary: 'bg-primary',
                emerald: 'bg-emerald-500',
                orange: 'bg-orange-500',
                purple: 'bg-purple-500',
              };

              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(index)}
                  className={`group cursor-pointer p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'bg-slate-50 dark:bg-slate-800 border-primary shadow-lg shadow-primary/5'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{zone.name}</h3>
                    {isSelected ? (
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${colorClasses[zone.color]} mt-1.5`}></div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Tarif Base</p>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{zone.baseFee.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Délai Est.</p>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{zone.estimatedTime}</p>
                    </div>
                  </div>
                  <div className={`flex justify-end gap-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(zone.id);
                      }}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(zone.id);
                      }}
                      className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded text-slate-500 dark:text-slate-400"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Sidebar Footer Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={handleCreateZone}
              className="flex w-full items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">add_location_alt</span>
              <span>Nouvelle Zone</span>
            </button>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 py-2 rounded-lg font-medium text-xs transition-colors border border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-xs">upload</span>
                <span>Import</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 py-2 rounded-lg font-medium text-xs transition-colors border border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-xs">download</span>
                <span>Export</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content - Map Area */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-900">
          {/* Map Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Carte des Zones de Livraison</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Visualisation et édition des périmètres de livraison
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors">
                  <span className="material-symbols-outlined">layers</span>
                </button>
                <button className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors">
                  <span className="material-symbols-outlined">fullscreen</span>
                </button>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
            {/* Placeholder pour la carte - À remplacer par une vraie carte (Leaflet, Google Maps, etc.) */}
            <div className="text-center p-8">
              <div className="w-64 h-64 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-6xl">map</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Carte interactive des zones</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Intégration avec Leaflet ou Google Maps recommandée
              </p>
            </div>

            {/* Zones simulées sur la carte */}
            {zones.map((zone, index) => {
              if (selectedZone !== index) return null;
              const positions = [
                { top: '30%', left: '40%', width: '120px', height: '120px' },
                { top: '50%', left: '60%', width: '100px', height: '100px' },
                { top: '40%', left: '25%', width: '110px', height: '110px' },
                { top: '60%', left: '70%', width: '130px', height: '130px' },
              ];
              const pos = positions[index] || { top: '50%', left: '50%', width: '100px', height: '100px' };

              return (
                <div
                  key={`zone-${zone.id}`}
                  className="absolute rounded-full opacity-40 border-2 border-primary animate-pulse"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                    height: pos.height,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={zone.name}
                />
              );
            })}
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default DeliveryZones;
