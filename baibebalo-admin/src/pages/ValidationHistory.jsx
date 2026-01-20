import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import TableSkeleton from '../components/common/TableSkeleton';

const ValidationHistory = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    status: ['approved', 'rejected'],
    period: '30days',
  });

  // Simuler un chargement de données
  const { data, isLoading } = useQuery({
    queryKey: ['validation-history', activeTab, filters],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    retry: 2,
  });

  const validations = [
    {
      id: 'VAL-001',
      type: 'restaurant',
      entityName: 'Le Petit Bistro',
      entityId: 'REST-9023',
      submittedAt: '12 Oct 2023',
      validator: { name: 'Jean Valjean', avatar: '' },
      decisionDate: '14 Oct 2023',
      status: 'approved',
    },
    {
      id: 'VAL-002',
      type: 'driver',
      entityName: 'Mamadou Diallo',
      entityId: 'DRV-4451',
      submittedAt: '10 Oct 2023',
      validator: { name: 'Sophie Martin', avatar: '' },
      decisionDate: '11 Oct 2023',
      status: 'rejected',
    },
    {
      id: 'VAL-003',
      type: 'restaurant',
      entityName: 'Sushi Zen',
      entityId: 'RST-114',
      submittedAt: '08 Oct 2023',
      validator: { name: 'Marc Laurent', avatar: '' },
      decisionDate: '09 Oct 2023',
      status: 'approved',
    },
    {
      id: 'VAL-004',
      type: 'driver',
      entityName: 'Ibrahim Traoré',
      entityId: 'DRV-2234',
      submittedAt: '05 Oct 2023',
      validator: { name: 'Jean Valjean', avatar: '' },
      decisionDate: '07 Oct 2023',
      status: 'approved',
    },
  ];

  const getTypeIcon = (type) => {
    return type === 'restaurant' ? 'store' : 'local_shipping';
  };

  const getTypeColor = (type) => {
    return type === 'restaurant'
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
  };

  const getStatusConfig = (status) => {
    if (status === 'approved') {
      return {
        label: 'Approuvé',
        class: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      };
    }
    return {
      label: 'Rejeté',
      class: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    };
  };

  const handleExport = () => {
    toast.success('Export du log en cours...');
  };

  const handleRemoveFilter = (filterType, value) => {
    if (filterType === 'status') {
      setFilters((prev) => ({
        ...prev,
        status: prev.status.filter((s) => s !== value),
      }));
    }
  };

  const filteredValidations = validations.filter((v) => {
    if (activeTab === 'restaurants' && v.type !== 'restaurant') return false;
    if (activeTab === 'drivers' && v.type !== 'driver') return false;
    if (!filters.status.includes(v.status)) return false;
    return true;
  });

  const counts = {
    all: validations.length,
    restaurants: validations.filter((v) => v.type === 'restaurant').length,
    drivers: validations.filter((v) => v.type === 'driver').length,
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>

          {/* Tabs Skeleton */}
          <div className="flex gap-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-24 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-24 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-24 animate-pulse" />
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={10} columns={7} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Page Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Historique des Validations
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl">
              Suivi centralisé des décisions pour les restaurants et les livreurs partenaires.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Exporter le log
          </button>
        </div>

        {/* Tabs and Filters */}
        <div className="space-y-4">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-1 py-3 border-b-2 text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tous les types{' '}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeTab === 'all'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {counts.all}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('restaurants')}
              className={`px-1 py-3 border-b-2 text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'restaurants'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Restaurants{' '}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeTab === 'restaurants'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {counts.restaurants}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-1 py-3 border-b-2 text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'drivers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Livreurs{' '}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeTab === 'drivers'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {counts.drivers}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {filters.status.map((status) => (
              <button
                key={status}
                onClick={() => handleRemoveFilter('status', status)}
                className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 pl-4 pr-3 hover:border-primary transition-all"
              >
                <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  Statut: {status === 'approved' ? 'Approuvé' : 'Rejeté'}
                </p>
                <span className="material-symbols-outlined text-lg text-slate-400">close</span>
              </button>
            ))}
            <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-4 hover:border-primary transition-all">
              <span className="material-symbols-outlined text-lg text-slate-400">calendar_month</span>
              <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold">30 derniers jours</p>
              <span className="material-symbols-outlined text-lg text-slate-400">expand_more</span>
            </button>
            <div className="flex-1" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Filtres actifs: {filters.status.length}
            </p>
          </div>
        </div>

        {/* Validation History Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    Type
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    Entité
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    Soumission
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    Validateur
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    Date Décision
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    Statut Final
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredValidations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      Aucune validation trouvée
                    </td>
                  </tr>
                ) : (
                  filteredValidations.map((validation) => {
                    const statusConfig = getStatusConfig(validation.status);
                    return (
                      <tr
                        key={validation.id}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all"
                      >
                        <td className="px-6 py-4">
                          <div
                            className={`size-8 ${getTypeColor(validation.type)} rounded-lg flex items-center justify-center`}
                          >
                            <span className="material-symbols-outlined text-xl">
                              {getTypeIcon(validation.type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {validation.entityName}
                            </span>
                            <span className="text-xs text-slate-500">ID: {validation.entityId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{validation.submittedAt}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover" />
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {validation.validator.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{validation.decisionDate}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig.class}`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                validation.status === 'approved'
                                  ? 'bg-emerald-600 dark:bg-emerald-400'
                                  : 'bg-red-600 dark:bg-red-400'
                              }`}
                            />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-primary hover:text-primary/70 transition-colors">
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ValidationHistory;
