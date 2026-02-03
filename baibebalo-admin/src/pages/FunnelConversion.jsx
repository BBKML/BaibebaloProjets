import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';
import { analyticsAPI } from '../api/analytics';
import { dashboardAPI } from '../api/dashboard';

const FunnelConversion = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30');
  const periodParam = period === '7' ? '7d' : period === '30' ? '30d' : '90d';

  // Récupérer les données analytics des utilisateurs
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['analytics', 'users', periodParam],
    queryFn: () => analyticsAPI.getUsersReport({ period: periodParam }),
  });

  // Récupérer les données analytics globales
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['analytics', 'overview', periodParam],
    queryFn: () => analyticsAPI.getAnalytics({ period: periodParam }),
  });

  // Récupérer les données du dashboard
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  // Données du funnel depuis les APIs (réelles)
  const stats = usersData?.data?.statistics || {};
  const analytics = analyticsData?.data || {};
  const globalStats = dashboardData?.data?.global || {};
  const retention = analytics.retention || {};

  const totalUsers = parseInt(stats.total_users || globalStats.total_users || 0);
  const activeUsers = parseInt(stats.active_users || analytics.active_users || 0);
  const totalOrders = parseInt(analytics.total_orders || globalStats.total_orders || 0);
  // Clients avec au moins 1 commande (période)
  const usersWithFirstOrder = parseInt(retention.total_clients ?? analytics.active_users ?? 0);
  // Clients avec 2+ commandes (répétées)
  const usersWithRepeatOrders = parseInt(retention.returning_clients ?? 0);

  // Visiteurs : estimation (pas de tracking), sinon = inscriptions pour éviter division par zéro
  const visitors = Math.max(totalUsers * 10, totalUsers || 1);
  const registrations = totalUsers;
  // Première commande = utilisateurs ayant passé au moins une commande (réel)
  const firstOrder = usersWithFirstOrder;
  // Commandes répétées = utilisateurs avec 2+ commandes (réel)
  const repeatOrders = usersWithRepeatOrders;
  // Clients actifs = utilisateurs ayant commandé dans la période (réel)
  const activeClients = activeUsers;

  // Pourcentages du funnel (éviter division par zéro)
  const safePct = (num, denom) => (denom > 0 ? Math.min(100, Math.round((num / denom) * 100)) : 0);
  const funnelSteps = [
    { label: 'Visiteurs', value: visitors, percentage: 100, color: 'bg-primary' },
    { label: 'Inscriptions', value: registrations, percentage: safePct(registrations, visitors), color: 'bg-blue-500' },
    { label: 'Première Commande', value: firstOrder, percentage: safePct(firstOrder, visitors), color: 'bg-purple-500' },
    { label: 'Commandes Répétées', value: repeatOrders, percentage: safePct(repeatOrders, visitors), color: 'bg-emerald-500' },
    { label: 'Clients Actifs', value: activeClients, percentage: safePct(activeClients, visitors), color: 'bg-green-600' },
  ];

  // KPIs (éviter Infinity / division par zéro)
  const totalRegistrations = registrations;
  const conversionRate = (() => {
    const rate = analytics.conversion_rate;
    if (rate != null && !Number.isNaN(Number(rate))) return Number(rate);
    if (totalUsers > 0 && firstOrder >= 0) return Number(((firstOrder / totalUsers) * 100).toFixed(1));
    return 0;
  })();
  const avgCustomerValue = analytics.average_order_value ?? analytics.avg_order_value ?? 0;
  
  // Calculer les changements (mockés pour l'instant)
  const registrationsChange = 5.2; // TODO: Calculer depuis les données
  const conversionChange = 1.2; // TODO: Calculer depuis les données
  const customerValueChange = -2.1; // TODO: Calculer depuis les données

  // Fonction d'export
  const handleExport = () => {
    try {
      const exportData = [
        {
          'Période': `${period} jours`,
          'Total Inscriptions': totalRegistrations,
          'Taux de Conversion': `${conversionRate}%`,
          'Valeur Moyenne Client': formatCurrency(avgCustomerValue),
        },
        ...funnelSteps.map(step => ({
          'Étape': step.label,
          'Valeur': step.value,
          'Pourcentage': `${step.percentage}%`,
        })),
      ];

      exportToCSV(exportData, `funnel-conversion-${period}j-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Retour"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Funnel de Conversion Analytics
              </h1>
              <p className="text-xs text-slate-400 mt-1">Dernière mise à jour: Aujourd'hui, 10:45</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/50"
                placeholder="Rechercher un segment..."
                type="text"
              />
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button 
                onClick={handleExport}
                disabled={isLoadingUsers || isLoadingAnalytics}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Exporter Rapport
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center shadow-sm">
            <button
              onClick={() => setPeriod('7')}
              className={`px-6 py-2 text-sm font-semibold transition-all ${
                period === '7'
                  ? 'bg-white dark:bg-slate-700 rounded-lg shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => setPeriod('30')}
              className={`px-6 py-2 text-sm transition-all ${
                period === '30'
                  ? 'font-bold bg-white dark:bg-slate-700 rounded-lg shadow-sm text-primary'
                  : 'font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              30 jours
            </button>
            <button
              onClick={() => setPeriod('90')}
              className={`px-6 py-2 text-sm font-semibold transition-all ${
                period === '90'
                  ? 'bg-white dark:bg-slate-700 rounded-lg shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              90 jours
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium hover:border-primary transition-colors shadow-sm">
              <span className="size-2 rounded-full bg-primary"></span>
              Platform: All
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium hover:border-primary transition-colors shadow-sm">
              <span className="size-2 rounded-full bg-purple-500"></span>
              Région: Korhogo, Côte d'Ivoire
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Inscriptions</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoadingUsers ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  totalRegistrations.toLocaleString('fr-FR')
                )}
              </h3>
              <span className="text-emerald-500 text-sm font-bold flex items-center mb-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                {registrationsChange > 0 ? '+' : ''}{registrationsChange.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-full"></div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Taux de Conversion</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoadingAnalytics ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  `${Number.isFinite(Number(conversionRate)) ? Number(conversionRate).toFixed(1) : '0.0'}%`
                )}
              </h3>
              <span className="text-emerald-500 text-sm font-bold flex items-center mb-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                {conversionChange > 0 ? '+' : ''}{conversionChange.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full" style={{ width: '12.5%' }}></div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Valeur Client Moyenne</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoadingAnalytics ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  formatCurrency(avgCustomerValue)
                )}
              </h3>
              <span className={`text-sm font-bold flex items-center mb-1 ${customerValueChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                <span className="material-symbols-outlined text-sm">
                  {customerValueChange >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {customerValueChange > 0 ? '+' : ''}{customerValueChange.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Funnel de Conversion</h3>
          <div className="space-y-4">
            {isLoadingUsers || isLoadingAnalytics ? (
              <div className="text-center py-8 text-slate-500">Chargement des données...</div>
            ) : funnelSteps.length > 0 ? (
              funnelSteps.map((step, index) => {
              const isFirst = index === 0;
              const isLast = index === funnelSteps.length - 1;
              
              return (
                <div key={`funnel-${index}-${step.label}`} className="relative">
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-semibold text-slate-900 dark:text-white">
                      {step.label}
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className={`h-16 ${step.color} rounded-lg flex items-center justify-between px-6 text-white transition-all`}
                        style={{
                          width: `${step.percentage}%`,
                          clipPath: isFirst
                            ? 'polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)'
                            : isLast
                            ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10% 50%)'
                            : 'polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%)',
                        }}
                      >
                        <span className="text-lg font-bold">{step.value.toLocaleString('fr-FR')}</span>
                        <span className="text-sm font-semibold opacity-90">{step.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  {index < funnelSteps.length - 1 && (
                    <div className="flex justify-center my-2">
                      <div className="w-1 h-6 bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                  )}
                </div>
              );
              })
            ) : (
              <div className="text-center py-8 text-slate-500">Aucune donnée disponible</div>
            )}
          </div>
        </div>

        {/* Conversion Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Taux de Conversion par Étape</h3>
            <div className="space-y-4">
              {funnelSteps.map((step, index) => {
                if (index === 0) return null;
                const previousStep = funnelSteps[index - 1];
                const prevVal = previousStep.value || 0;
                const stepVal = step.value || 0;
                const pct = prevVal > 0 ? Math.min(100, Number(((stepVal / prevVal) * 100).toFixed(1))) : 0;
                const displayPct = prevVal === 0 ? 'N/A' : `${pct}%`;
                const barWidth = prevVal === 0 ? 0 : pct;
                return (
                  <div key={`conversion-${index}-${step.label}`}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">{previousStep.label} → {step.label}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{displayPct}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Analyse des Pertes</h3>
            <div className="space-y-3">
              {funnelSteps.map((step, index) => {
                if (index === 0) return null;
                const previousStep = funnelSteps[index - 1];
                const prevVal = previousStep.value || 0;
                const stepVal = step.value || 0;
                const loss = Math.max(0, prevVal - stepVal);
                const lossPct = prevVal > 0 ? Math.min(100, Math.round((loss / prevVal) * 1000) / 10) : 0;
                const displayPct = prevVal === 0 ? 'N/A' : `${lossPct}%`;
                return (
                  <div key={`loss-${index}-${step.label}`} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</span>
                      <span className="text-xs font-bold text-rose-500">{displayPct}</span>
                    </div>
                    <p className="text-xs text-slate-500">{loss.toLocaleString('fr-FR')} utilisateurs perdus</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FunnelConversion;
