import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { dashboardAPI } from '../api/dashboard';
import Layout from '../components/layout/Layout';
import KPICard from '../components/dashboard/KPICard';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';
import TableSkeleton from '../components/common/TableSkeleton';
import RevenueChart from '../components/charts/RevenueChart';
import CategoryDistributionChart from '../components/charts/CategoryDistributionChart';
import HourlyActivityChart from '../components/charts/HourlyActivityChart';
import SalesGoalChart from '../components/charts/SalesGoalChart';
import RealTimeOrdersStream from '../components/dashboard/RealTimeOrdersStream';
import GeographicMap from '../components/dashboard/GeographicMap';
import { formatCurrency, formatDateShort } from '../utils/format';

const Dashboard = () => {
  const navigate = useNavigate();
  const [realTimeOrders, setRealTimeOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  
  // Requête pour le dashboard
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getDashboard(),
    retry: 2,
    retryDelay: 1000,
  });
  
  // Requête pour les commandes récentes
  const { data: ordersData } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => dashboardAPI.getRecentOrders({ limit: 10 }),
    enabled: !!data, // Ne charger que si le dashboard est chargé
  });

  // Requête pour les données de revenus (30 derniers jours)
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-data'],
    queryFn: () => dashboardAPI.getRevenueData('daily'), // 30 derniers jours
    enabled: !!data,
    retry: false, // Ne pas réessayer si l'endpoint n'existe pas
    staleTime: 5 * 60 * 1000, // Considérer les données comme valides pendant 5 minutes
  });

  // Requête initiale pour les commandes en temps réel
  const { data: realTimeOrdersData, refetch: refetchRealTimeOrders } = useQuery({
    queryKey: ['realtime-orders'],
    queryFn: () => dashboardAPI.getRealTimeOrders({ limit: 20 }),
    enabled: !!data,
  });

  // Requête pour les données géographiques
  const { data: geographicData, refetch: refetchGeographic } = useQuery({
    queryKey: ['geographic-data'],
    queryFn: () => dashboardAPI.getGeographicData(),
    enabled: !!data,
  });

  // Configuration WebSocket pour temps réel
  useEffect(() => {
    if (!data) return; // Attendre que le dashboard soit chargé

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Connexion WebSocket - utiliser la même URL que l'API
    const getWebSocketURL = () => {
      if (import.meta.env.DEV) {
        const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
        return `http://localhost:${backendPort}`;
      }
      return window.location.origin;
    };

    const newSocket = io(getWebSocketURL(), {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connecté');
      // Rejoindre la room admin dashboard
      newSocket.emit('join_admin_dashboard');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket déconnecté');
    });

    // Écouter les nouvelles commandes
    newSocket.on('new_order', (data) => {
      console.log('🆕 Nouvelle commande:', data);
      refetchRealTimeOrders();
      refetchGeographic();
    });

    // Écouter les mises à jour de commandes
    newSocket.on('order_updated', (data) => {
      console.log('🔄 Commande mise à jour:', data);
      refetchRealTimeOrders();
      refetchGeographic();
    });

    setSocket(newSocket);

    // Nettoyage à la déconnexion
    return () => {
      newSocket.close();
    };
  }, [data, refetchRealTimeOrders, refetchGeographic]);

  // Mettre à jour les commandes en temps réel
  useEffect(() => {
    if (realTimeOrdersData?.data?.orders) {
      setRealTimeOrders(realTimeOrdersData.data.orders);
    }
  }, [realTimeOrdersData]);
  
  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Titre */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Vue d'ensemble de la plateforme</p>
          </div>
          
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {new Array(4).fill(null).map((_, i) => (
              <KPICardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
          
          {/* Graphiques Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSkeleton type="line" />
            </div>
            <div>
              <ChartSkeleton type="doughnut" />
            </div>
          </div>
          
          {/* Tableau Skeleton */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Commandes récentes</h2>
            <TableSkeleton rows={5} columns={6} />
          </div>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
    };
    
    console.error('❌ Erreur Dashboard complète:', errorDetails);
    
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800">Erreur lors du chargement du dashboard</h3>
          </div>
          <p className="text-red-700 mb-2 font-medium">
            {error.message?.includes('timeout') 
              ? 'Timeout: Le backend ne répond pas. Vérifiez qu\'il est démarré sur http://localhost:3000'
              : error.response?.data?.error?.message || error.message || 'Une erreur est survenue'}
          </p>
          
          {/* Détails de l'erreur en mode développement */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto max-h-40">
              <p className="font-semibold mb-1">Détails techniques:</p>
              <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
            </div>
          )}
          
          <div className="text-sm text-red-600 space-y-1 mt-4">
            <p className="font-semibold">Vérifiez que:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Le backend est démarré sur http://localhost:3000</li>
              <li>Vous êtes bien connecté (token valide)</li>
              <li>L'endpoint /api/v1/admin/dashboard est accessible</li>
              <li>Le proxy Vite est configuré correctement (frontend sur port 5173)</li>
              <li>Pas de conflit de ports (backend 3000, frontend 5173)</li>
            </ul>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => globalThis.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={() => {
                console.log('🔍 Diagnostic:', {
                  token: localStorage.getItem('accessToken') ? 'Présent' : 'Absent',
                  admin: localStorage.getItem('admin'),
                  backendURL: 'http://localhost:5000',
                });
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Diagnostic (Console)
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Adapter la structure du backend au format attendu par le frontend
  const backendData = data?.data || {};
  const global = backendData.global || {};
  const today = backendData.today || {};
  const comparisons = backendData.comparisons || {};
  const categoryDistribution = backendData.category_distribution || [];
  const hourlyActivity = backendData.hourly_activity || [];
  
  // Construire les KPIs au format attendu
  const kpis = {
    total_revenue: global.total_revenue || 0,
    total_orders: global.total_orders || 0,
    total_users: global.total_users || 0,
    new_users: comparisons.new_users_today || 0,
    active_deliveries: today.active_orders || 0,
    revenue_change: comparisons.revenue_change || 0,
    orders_change: comparisons.orders_change || 0,
    satisfaction: comparisons.satisfaction?.current || 0,
    satisfaction_change: comparisons.satisfaction?.change || 0,
  };
  
  // Récupérer les commandes récentes depuis l'endpoint orders
  const recent_orders = ordersData?.data?.orders || [];
  
  // Mapper les commandes pour correspondre au format attendu
  const mappedOrders = recent_orders.map(order => ({
    id: order.id,
    customer_name: order.client_name || `${order.user_id?.slice(0, 8)}...`,
    restaurant_name: order.restaurant_name || 'N/A',
    total_amount: order.total || 0,
    status: order.status,
    created_at: order.placed_at || order.created_at,
  }));
  
  return (
    <Layout>
      <div className="space-y-8">
        {/* KPI Section - Conforme au cahier des charges */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="CA Total"
            value={formatCurrency(kpis?.total_revenue || 0)}
            change={kpis?.revenue_change}
            iconName="payments"
          />
          <KPICard
            title="Commandes"
            value={kpis?.total_orders || 0}
            change={kpis?.orders_change}
            iconName="shopping_bag"
          />
          <KPICard
            title="Utilisateurs"
            value={kpis?.total_users || 0}
            change={kpis?.new_users}
            changeLabel={`+${kpis?.new_users || 0} nouveaux`}
            iconName="people"
          />
          <KPICard
            title="Satisfaction"
            value={`${(kpis?.satisfaction || 0).toFixed(1)}/5`}
            change={kpis?.satisfaction_change}
            iconName="star"
          />
        </div>
        
        {/* Flux de commandes en temps réel */}
        <RealTimeOrdersStream orders={realTimeOrders || []} />

        {/* Carte géographique */}
        <GeographicMap 
          activeOrders={geographicData?.data?.active_orders || []}
          hotZones={geographicData?.data?.hot_zones || []}
          restaurants={geographicData?.data?.restaurants || []}
        />

        {/* Chart & Table Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Aperçu des Revenus</h3>
                <p className="text-xs text-slate-500 mt-1">30 derniers jours avec moyenne mobile et prévisions</p>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center min-h-[300px]">
              <div className="flex-1 min-h-[256px] w-full" style={{ minWidth: 0 }}>
                <RevenueChart 
                  data={revenueData?.data?.chartData || []}
                  previousMonthData={revenueData?.data?.previousMonthData || []}
                  forecastData={revenueData?.data?.forecastData || []}
                />
              </div>
            </div>
          </div>

          {/* Right Quick Stats/Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Objectif de Ventes</h3>
            {/* Objectif = 30% de plus que le revenu actuel */}
            <SalesGoalChart 
              current={kpis?.total_revenue || 0}
              goal={Math.max((kpis?.total_revenue || 0) * 1.3, 100000)}
              directSales={kpis?.total_revenue ? Math.round((kpis?.total_revenue || 0) * 0.6) : 0}
              partners={kpis?.total_revenue ? Math.round((kpis?.total_revenue || 0) * 0.4) : 0}
            />
          </div>
        </div>

        {/* Nouveaux graphiques : Répartition par catégorie et Activité par heure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition par catégorie */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Répartition par Catégorie</h3>
              <p className="text-xs text-slate-500 mt-1">30 derniers jours - Commandes livrées</p>
            </div>
            <div className="p-6">
              <CategoryDistributionChart data={categoryDistribution} />
            </div>
          </div>

          {/* Activité par heure */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Activité par Heure</h3>
              <p className="text-xs text-slate-500 mt-1">7 derniers jours - Répartition horaire</p>
            </div>
            <div className="p-6">
              <HourlyActivityChart data={hourlyActivity} />
            </div>
          </div>
        </div>
        
        {/* Recent Orders Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">Dernières Commandes</h3>
            <button 
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-primary hover:underline uppercase tracking-tight"
            >
              Voir tout
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">ID Commande</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Montant</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {mappedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      Aucune commande récente
                    </td>
                  </tr>
                ) : (
                  mappedOrders.map((order) => {
                    const initials = order.customer_name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    
                    const statusConfig = {
                      pending: { label: 'En attente', class: 'bg-semantic-amber/10 text-semantic-amber' },
                      confirmed: { label: 'Confirmé', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
                      preparing: { label: 'Préparation', class: 'bg-semantic-amber/10 text-semantic-amber' },
                      shipped: { label: 'Expédié', class: 'bg-primary/10 text-primary' },
                      delivered: { label: 'Livré', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
                    };
                    
                    const status = statusConfig[order.status] || { label: order.status, class: 'bg-slate-100 text-slate-600' };
                    
                    return (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                              {initials}
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{order.customer_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{formatDateShort(order.created_at)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors">more_vert</button>
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

export default Dashboard;
