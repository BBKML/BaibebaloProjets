import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const PlatformSettings = () => {
  const [settings, setSettings] = useState({
    platformStatus: true,
    deliveryBaseFee: 2.50,
    deliveryPerKm: 0.75,
    avgPrepTime: 15,
    maxDeliveryTime: 45,
    minOrderValue: 10.00,
    maxOrderValue: 500.00,
  });

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // TODO: API call to save settings
    toast.success('Paramètres sauvegardés avec succès');
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Paramètres Généraux
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Contrôlez les paramètres opérationnels critiques de la plateforme BAIBEBALO.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 pr-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <label className="relative inline-flex items-center cursor-pointer ml-2">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.platformStatus}
                onChange={(e) => handleChange('platformStatus', e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                Status Plateforme
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tighter">
                {settings.platformStatus ? 'Ouvert aux commandes' : 'Fermé'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section: Frais de Livraison */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">payments</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Frais de Livraison</h3>
              </div>
              <span
                className="material-symbols-outlined text-slate-400 cursor-help"
                title="Configurez les frais facturés aux clients pour la livraison."
              >
                info
              </span>
            </div>
            <div className="p-6 flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Frais de base
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="2.50"
                      value={settings.deliveryBaseFee}
                      onChange={(e) => handleChange('deliveryBaseFee', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 italic">
                    Frais fixe appliqué à chaque commande livraison.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Frais par kilomètre
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="0.75"
                      value={settings.deliveryPerKm}
                      onChange={(e) => handleChange('deliveryPerKm', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA/km</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Sauvegarder
              </button>
            </div>
          </section>

          {/* Section: Gestion des Délais */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Gestion des Délais</h3>
              </div>
              <span
                className="material-symbols-outlined text-slate-400 cursor-help"
                title="Estimation des temps de traitement pour les clients."
              >
                info
              </span>
            </div>
            <div className="p-6 flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Temps de préparation moyen
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-16 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="15"
                      value={settings.avgPrepTime}
                      onChange={(e) => handleChange('avgPrepTime', parseInt(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">min</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Délai de livraison maximum
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-16 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="45"
                      value={settings.maxDeliveryTime}
                      onChange={(e) => handleChange('maxDeliveryTime', parseInt(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Sauvegarder
              </button>
            </div>
          </section>

          {/* Section: Limites de Commandes */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">shopping_cart</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Limites de Commandes</h3>
              </div>
            </div>
            <div className="p-6 flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Montant minimum de commande
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="10.00"
                      value={settings.minOrderValue}
                      onChange={(e) => handleChange('minOrderValue', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Montant maximum de commande
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent py-3 pl-4 pr-12 focus:border-primary focus:ring-primary sm:text-sm"
                      placeholder="500.00"
                      value={settings.maxOrderValue}
                      onChange={(e) => handleChange('maxOrderValue', parseFloat(e.target.value) || 0)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-slate-500 sm:text-sm">FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Sauvegarder
              </button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default PlatformSettings;
