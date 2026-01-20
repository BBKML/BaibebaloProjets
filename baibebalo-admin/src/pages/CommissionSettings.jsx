import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

const CommissionSettings = () => {
  const [defaultRate, setDefaultRate] = useState(15);
  const [restaurants] = useState([
    { id: 'RST-092', name: 'Le Petit Bistro', status: 'active', rate: 15, type: 'standard', lastChange: '24 Oct 2023', changedBy: 'Jean D.' },
    { id: 'RST-114', name: 'Sushi Zen', status: 'active', rate: 12, type: 'negotiated', lastChange: '15 Oct 2023', changedBy: 'Sophie M.' },
    { id: 'RST-045', name: 'Burger House', status: 'inactive', rate: 15, type: 'standard', lastChange: '01 Sep 2023', changedBy: 'Admin Système' },
    { id: 'RST-201', name: 'Pizza Napoli', status: 'active', rate: 18, type: 'premium', lastChange: '12 Oct 2023', changedBy: 'Marc L.' },
  ]);

  const handleApplyDefault = () => {
    toast.success(`Taux par défaut de ${defaultRate}% appliqué`);
  };

  const handleEdit = (restaurantId) => {
    toast.success(`Modification du restaurant ${restaurantId}`);
  };

  const avgRate = restaurants.reduce((sum, r) => sum + r.rate, 0) / restaurants.length;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
              Configuration des Commissions
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl">
              Ajustez les taux pour chaque partenaire ou appliquez une règle globale. Les changements impactent immédiatement la facturation.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-lg h-11 px-6 bg-slate-100 dark:bg-slate-800 text-primary dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent active:scale-95">
              <span className="material-symbols-outlined text-[20px]">history</span>
              <span>Journal d'audit</span>
            </button>
            <button
              onClick={handleApplyDefault}
              className="flex items-center gap-2 rounded-lg h-11 px-6 bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Appliquer le taux par défaut ({defaultRate}%)</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Taux Moyen</p>
              <span className="material-symbols-outlined text-primary/40">analytics</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{avgRate.toFixed(1)}%</p>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+0.2% ce mois</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Restaurants</p>
              <span className="material-symbols-outlined text-primary/40">storefront</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">128</p>
            <div className="text-slate-500 dark:text-slate-400 text-xs">8 en attente d'activation</div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Revenus Comm. (MTD)</p>
              <span className="material-symbols-outlined text-primary/40">payments</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(12450)}</p>
            <div className="text-primary font-bold text-xs uppercase tracking-wider">Objectif: 15k</div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-primary text-white p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <p className="text-white/80 text-sm font-medium">Taux par défaut</p>
              <span className="material-symbols-outlined text-white/50">settings_suggest</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tabular-nums">{defaultRate}%</p>
              <button
                onClick={() => {
                  const newRate = prompt('Nouveau taux par défaut (%)', defaultRate);
                  if (newRate) setDefaultRate(Number.parseFloat(newRate));
                }}
                className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors uppercase font-bold"
              >
                Modifier
              </button>
            </div>
            <p className="text-white/70 text-xs mt-1">Appliqué à 112 restaurants</p>
          </div>
        </div>

        {/* Main Management Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white px-2">Liste des Partenaires</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">filter_list</span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
                  placeholder="Filtrer par statut..."
                  type="text"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Restaurant</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Commission</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Dernier Changement</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {restaurants.map((restaurant) => {
                  const initials = restaurant.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();
                  const statusColor =
                    restaurant.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
                  let typeColor = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
                  if (restaurant.type === 'premium') {
                    typeColor = 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300';
                  } else if (restaurant.type === 'negotiated') {
                    typeColor = 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300';
                  }

                  return (
                    <tr
                      key={restaurant.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-white">{restaurant.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">ID: #{restaurant.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>
                          {restaurant.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold tabular-nums text-primary dark:text-blue-400">
                            {restaurant.rate}%
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeColor}`}>
                            {restaurant.type === 'premium' && 'Premium'}
                            {restaurant.type === 'negotiated' && 'Négocié'}
                            {restaurant.type === 'standard' && 'Standard'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">
                        {restaurant.lastChange} <br />
                        <span className="text-[10px]">par {restaurant.changedBy}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleEdit(restaurant.id)}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                          <span>Modifier</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Affichage de 4 sur 128 restaurants</p>
            <div className="flex gap-2">
              <button className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CommissionSettings;
