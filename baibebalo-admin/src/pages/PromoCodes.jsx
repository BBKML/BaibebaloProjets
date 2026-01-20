import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';
import toast from 'react-hot-toast';

const PromoCodes = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [promoCodes] = useState([
    {
      id: 1,
      code: 'WELCOME20',
      type: 'percentage',
      value: 20,
      usage: { current: 60, limit: 100 },
      validity: { start: '01 Jan 2024', end: '31 Déc 2024' },
      status: 'active',
    },
    {
      id: 2,
      code: 'SUMMER5',
      type: 'fixed',
      value: 5.0,
      usage: { current: 12, limit: null },
      validity: { start: '01 Juin 2024', end: '31 Août 2024' },
      status: 'inactive',
    },
    {
      id: 3,
      code: 'WINTER10',
      type: 'percentage',
      value: 10,
      usage: { current: 100, limit: 100 },
      validity: { start: '01 Nov 2023', end: '31 Déc 2023' },
      status: 'expired',
    },
  ]);

  const handleCreate = () => {
    toast.success('Création d\'un nouveau code promo');
  };

  const handleEdit = (codeId) => {
    toast.success(`Modification du code ${codeId}`);
  };

  const handleDelete = (codeId) => {
    if (globalThis.confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) {
      toast.success(`Code ${codeId} supprimé`);
    }
  };

  // Fonction d'export
  const handleExport = () => {
    try {
      if (promoCodes.length === 0) {
        toast.error('Aucun code promo à exporter');
        return;
      }

      const exportData = promoCodes.map(code => ({
        'Code': code.code,
        'Type': code.type === 'percentage' ? 'Pourcentage' : 'Montant fixe',
        'Valeur': code.type === 'percentage' ? `${code.value}%` : formatCurrency(code.value),
        'Utilisations': `${code.usage.current}${code.usage.limit ? ` / ${code.usage.limit}` : ''}`,
        'Date Début': code.validity.start,
        'Date Fin': code.validity.end,
        'Statut': code.status === 'active' ? 'Actif' : code.status === 'inactive' ? 'Inactif' : 'Expiré',
      }));

      exportToCSV(exportData, `codes-promo-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const totalSavings = 12450.0;
  const conversionRate = 18.5;
  const activeCodes = promoCodes.filter((c) => c.status === 'active').length;
  const bestCode = promoCodes[0];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
              Gestion des Codes Promo Globaux
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal">
              Configurez et suivez l'efficacité de vos campagnes de coupons marketing.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExport}
              disabled={promoCodes.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              Exporter
            </button>
            <button
              onClick={handleCreate}
              className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="truncate">Créer un Code Promo</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
                Économies Totales Utilisateurs
              </p>
              <span className="material-symbols-outlined text-primary">savings</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">
                {formatCurrency(totalSavings)}
              </p>
              <p className="text-emerald-500 text-sm font-bold flex items-center">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                12%
              </p>
            </div>
            <div className="mt-2 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[65%]"></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
                Taux de Conversion Promo
              </p>
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">{conversionRate}%</p>
              <p className="text-emerald-500 text-sm font-bold flex items-center">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                2.4%
              </p>
            </div>
            <div className="mt-2 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[40%]"></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Codes Actifs</p>
              <span className="material-symbols-outlined text-primary">confirmation_number</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">{activeCodes}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">sur 150 créés</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-primary/20 bg-primary/10 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <p className="text-primary text-sm font-bold uppercase tracking-wider">Meilleur Code</p>
              <span className="material-symbols-outlined text-primary">star</span>
            </div>
            <div className="flex flex-col">
              <p className="text-slate-900 dark:text-white tracking-tight text-2xl font-bold">{bestCode.code}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{bestCode.usage.current} utilisations ce mois</p>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm">
          {/* Filters/Tabs Row */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center border-b-[3px] py-4 px-1 transition-colors ${
                  activeTab === 'all'
                    ? 'border-primary text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <p className="text-sm font-bold tracking-[0.015em]">Tous les codes</p>
                <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px]">152</span>
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`flex items-center border-b-[3px] py-4 px-1 transition-colors ${
                  activeTab === 'active'
                    ? 'border-primary text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <p className="text-sm font-bold tracking-[0.015em]">Actifs</p>
              </button>
              <button
                onClick={() => setActiveTab('expired')}
                className={`flex items-center border-b-[3px] py-4 px-1 transition-colors ${
                  activeTab === 'expired'
                    ? 'border-primary text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <p className="text-sm font-bold tracking-[0.015em]">Expirés</p>
              </button>
            </div>
            <div className="flex items-center gap-4 py-2">
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
          </div>
          {/* Actual Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/40">
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Code Promo
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Valeur</th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Utilisation
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Validité</th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {promoCodes.map((promo) => {
                  const initials = promo.code.substring(0, 2).toUpperCase();
                  const usagePercentage = promo.usage.limit
                    ? (promo.usage.current / promo.usage.limit) * 100
                    : (promo.usage.current / 100) * 100;

                  return (
                    <tr key={promo.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {initials}
                          </div>
                          <span className="text-slate-900 dark:text-white font-semibold">{promo.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-200">
                          {promo.type === 'percentage' ? 'Pourcentage' : 'Remise Fixe'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-primary font-bold">
                          {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            <span>{promo.usage.current}</span>
                            <span>{promo.usage.limit || 'Unlimited'}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                usagePercentage >= 100 ? 'bg-red-500' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <p className="font-medium text-slate-900 dark:text-white">{promo.validity.start}</p>
                          <p className="text-[10px]">au {promo.validity.end}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {promo.status === 'active' ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ml-2 text-xs font-bold text-emerald-500">ACTIF</span>
                          </label>
                        ) : promo.status === 'expired' ? (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-[18px]">event_busy</span>
                            <span className="text-xs font-bold text-red-500 uppercase">Expiré</span>
                          </div>
                        ) : (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400">OFF</span>
                          </label>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(promo.id)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded text-slate-500 dark:text-slate-400 hover:text-red-500"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/10">
            <p className="text-xs text-slate-500 dark:text-slate-400">Affichage de 1 à 3 sur 152 codes</p>
            <div className="flex items-center gap-2">
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

export default PromoCodes;
