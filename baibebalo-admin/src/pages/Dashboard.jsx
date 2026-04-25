import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [realTimeOrders, setRealTimeOrders] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  
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
    if (!data) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Connecter au service WebSocket
    socketService.connect(token);

    // Écouter le statut de connexion
    const unsubscribeConnection = socketService.on('connection_status', (data) => {
      setSocketConnected(data.connected);
    });

    // Écouter les nouvelles commandes
    const unsubscribeNewOrder = socketService.on('new_order', (orderData) => {
      console.log('🆕 Nouvelle commande:', orderData);
      toast.success(`Nouvelle commande #${orderData.order_number || orderData.id?.slice(0,8)}`);
      refetchRealTimeOrders();
      refetchGeographic();
      queryClient.invalidateQueries(['dashboard']);
    });

    // Écouter les mises à jour de commandes
    const unsubscribeOrderUpdated = socketService.on('order_updated', () => {
      refetchRealTimeOrders();
      refetchGeographic();
    });

    // Écouter les changements de statut
    const unsubscribeStatusChanged = socketService.on('order_status_changed', (orderData) => {
      console.log('📦 Statut commande changé:', orderData);
      refetchRealTimeOrders();
    });

    // Écouter les commandes livrées
    const unsubscribeDelivered = socketService.on('order_delivered', (orderData) => {
      toast.success(`Commande #${orderData.order_number || ''} livrée !`);
      queryClient.invalidateQueries(['dashboard']);
      refetchRealTimeOrders();
    });

    // Écouter les changements de statut des livreurs
    const unsubscribeDeliveryStatus = socketService.on('delivery_status_changed', (statusData) => {
      console.log('🚴 Statut livreur:', statusData);
      if (statusData.status === 'available') {
        setActiveDeliveries(prev => prev + 1);
      } else if (statusData.status === 'offline') {
        setActiveDeliveries(prev => Math.max(0, prev - 1));
      }
    });

    // Écouter les alertes système
    const unsubscribeSystemAlert = socketService.on('system_alert', (alertData) => {
      toast.error(alertData.message || 'Alerte système', { duration: 5000 });
    });

    // Écouter les alertes de commandes en retard
    const unsubscribeDelayedAlert = socketService.on('order_delayed_alert', (alertData) => {
      toast.error(`⏰ Commande #${alertData.order_number} en retard !`, { duration: 8000 });
    });

    // Écouter les nouveaux tickets support
    const unsubscribeSupportTicket = socketService.on('new_support_ticket', (ticketData) => {
      toast(`🎫 Nouveau ticket: ${ticketData.subject || 'Support'}`, { icon: '📩' });
    });

    // Nettoyage
    return () => {
      unsubscribeConnection();
      unsubscribeNewOrder();
      unsubscribeOrderUpdated();
      unsubscribeStatusChanged();
      unsubscribeDelivered();
      unsubscribeDeliveryStatus();
      unsubscribeSystemAlert();
      unsubscribeDelayedAlert();
      unsubscribeSupportTicket();
    };
  }, [data, refetchRealTimeOrders, refetchGeographic, queryClient]);

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

  const kpis = {
    total_revenue: parseFloat(global.total_revenue || 0),
    today_revenue: parseFloat(today.today_revenue || 0),
    total_orders: parseInt(global.total_orders || 0),
    today_orders: parseInt(today.completed_orders || 0),
    total_users: parseInt(global.total_users || 0),
    new_users: comparisons.new_users_today || 0,
    active_orders: parseInt(today.active_orders || 0),
    pending_orders: parseInt(today.pending_orders || 0),
    active_drivers: parseInt(global.active_delivery_persons || 0),
    open_restaurants: parseInt(global.active_restaurants || 0),
    open_tickets: parseInt(backendData.pending?.tickets || 0),
    revenue_change: comparisons.revenue_change || 0,
    orders_change: comparisons.orders_change || 0,
    satisfaction: comparisons.satisfaction?.current || 0,
    satisfaction_change: comparisons.satisfaction?.change || 0,
  };

  const recent_orders = ordersData?.data?.orders || [];
  const mappedOrders = recent_orders.map(order => ({
    id: order.id,
    customer_name: order.client_name || `Client ${order.user_id?.slice(0, 6)}`,
    restaurant_name: order.restaurant_name || '—',
    total_amount: order.total || 0,
    status: order.status,
    created_at: order.placed_at || order.created_at,
  }));

  const STATUS_CONFIG = {
    pending:           { label: 'En attente',    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
    new:               { label: 'Nouvelle',      cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
    scheduled:         { label: 'Programmée',    cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' },
    accepted:          { label: 'Acceptée',      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    confirmed:         { label: 'Confirmée',     cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    preparing:         { label: 'En préparation',cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
    ready:             { label: 'Prête',         cls: 'bg-primary/10 text-primary' },
    picked_up:         { label: 'Récupérée',     cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
    delivering:        { label: 'En livraison',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
    driver_at_customer:{ label: 'Livreur arrivé',cls: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
    delivered:         { label: 'Livré',         cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    cancelled:         { label: 'Annulée',       cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  };

  // Heure de salutation
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Layout>
      <div className="space-y-7 pb-8">

        {/* ── Entête ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {greeting}, {admin.full_name?.split(' ')[0] || 'Admin'} 
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicateur WebSocket */}
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              socketConnected
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {socketConnected ? 'Temps réel actif' : 'Hors ligne'}
            </span>
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontSize: '18px' }}>add</span>
              Voir commandes
            </button>
          </div>
        </div>

        {/* ── Bande "Aujourd'hui" ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              icon: 'receipt_long',
              label: 'Commandes aujourd\'hui',
              value: kpis.today_orders,
              color: 'text-primary bg-primary/10',
              dot: kpis.pending_orders > 0,
              dotLabel: `${kpis.pending_orders} en attente`,
            },
            {
              icon: 'payments',
              label: 'Revenus du jour',
              value: formatCurrency(kpis.today_revenue),
              color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
            },
            {
              icon: 'delivery_dining',
              label: 'Livreurs actifs',
              value: kpis.active_drivers,
              color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400',
            },
            {
              icon: 'restaurant',
              label: 'Restaurants ouverts',
              value: kpis.open_restaurants,
              color: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400',
            },
            {
              icon: 'support_agent',
              label: 'Tickets ouverts',
              value: kpis.open_tickets,
              color: kpis.open_tickets > 0
                ? 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400'
                : 'text-slate-500 bg-slate-100 dark:bg-slate-800',
              dot: kpis.open_tickets > 0,
              dotLabel: 'À traiter',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3"
            >
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{stat.label}</p>
                <p className="text-base font-black text-slate-900 dark:text-white leading-tight">{stat.value}</p>
                {stat.dot && stat.dotLabel && (
                  <p className="text-[10px] font-bold text-red-500 leading-none mt-0.5">{stat.dotLabel}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Actions rapides ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Valider restaurants', icon: 'storefront', path: '/restaurants?status=pending', color: 'bg-violet-500' },
            { label: 'Commandes problèmes', icon: 'report_problem', path: '/orders/problematic', color: 'bg-red-500' },
            { label: 'Suivi livreurs live', icon: 'location_on', path: '/drivers/tracking', color: 'bg-emerald-500' },
            { label: 'Rapport financier', icon: 'bar_chart', path: '/finances/reports', color: 'bg-primary' },
          ].map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className={`p-2 rounded-lg ${action.color} text-white shrink-0`}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{action.icon}</span>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-left leading-tight group-hover:text-primary transition-colors">
                {action.label}
              </span>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          ))}
        </div>

        {/* ── KPI principaux ── */}
        <div>
          <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            Indicateurs globaux
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KPICard
              title="Chiffre d'affaires total"
              value={formatCurrency(kpis.total_revenue)}
              change={kpis.revenue_change}
              iconName="payments"
              color="green"
              subtitle={`Aujourd'hui : ${formatCurrency(kpis.today_revenue)}`}
              href="/finances"
            />
            <KPICard
              title="Commandes totales"
              value={kpis.total_orders.toLocaleString('fr-FR')}
              change={kpis.orders_change}
              iconName="shopping_bag"
              color="blue"
              subtitle={`${kpis.today_orders} aujourd'hui · ${kpis.active_orders} actives`}
              href="/orders"
            />
            <KPICard
              title="Clients inscrits"
              value={kpis.total_users.toLocaleString('fr-FR')}
              change={kpis.new_users}
              changeLabel={`+${kpis.new_users} aujourd'hui`}
              iconName="group"
              color="purple"
              subtitle={`+${kpis.new_users} nouveaux ce jour`}
              href="/users"
            />
            <KPICard
              title="Satisfaction client"
              value={`${parseFloat(kpis.satisfaction || 0).toFixed(1)} / 5`}
              change={kpis.satisfaction_change}
              iconName="star"
              color="orange"
              subtitle="Note moyenne des livraisons"
            />
          </div>
        </div>

        {/* ── Flux temps réel ── */}
        <RealTimeOrdersStream orders={realTimeOrders || []} />

        {/* ── Graphiques revenus + objectif ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Revenus — 30 derniers jours</h3>
                <p className="text-xs text-slate-400 mt-0.5">Avec moyenne mobile et projection</p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold bg-primary/10 text-primary rounded-full uppercase tracking-wide">
                Live
              </span>
            </div>
            <div className="p-6 flex-1 min-h-75">
              <RevenueChart
                data={revenueData?.data?.chartData || []}
                previousMonthData={revenueData?.data?.previousMonthData || []}
                forecastData={revenueData?.data?.forecastData || []}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Objectif mensuel</h3>
            <p className="text-xs text-slate-400 mb-6">Progression vers l'objectif +30%</p>
            <SalesGoalChart
              current={kpis.total_revenue}
              goal={Math.max(kpis.total_revenue * 1.3, 100000)}
              directSales={Math.round(kpis.total_revenue * 0.6)}
              partners={Math.round(kpis.total_revenue * 0.4)}
            />
          </div>
        </div>

        {/* ── Carte géographique ── */}
        <GeographicMap
          activeOrders={geographicData?.data?.active_orders || []}
          hotZones={geographicData?.data?.hot_zones || []}
          restaurants={geographicData?.data?.restaurants || []}
        />

        {/* ── Catégories + Horaires ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Répartition par catégorie</h3>
              <p className="text-xs text-slate-400 mt-0.5">30 derniers jours</p>
            </div>
            <div className="p-6">
              <CategoryDistributionChart data={categoryDistribution} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Activité par heure</h3>
              <p className="text-xs text-slate-400 mt-0.5">7 derniers jours</p>
            </div>
            <div className="p-6">
              <HourlyActivityChart data={hourlyActivity} />
            </div>
          </div>
        </div>

        {/* ── Dernières commandes ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Dernières commandes</h3>
              <p className="text-xs text-slate-400 mt-0.5">{mappedOrders.length} commandes récentes</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wide"
            >
              Voir tout
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
                  <th className="px-6 py-3.5">Commande</th>
                  <th className="px-6 py-3.5">Client</th>
                  <th className="px-6 py-3.5 hidden md:table-cell">Restaurant</th>
                  <th className="px-6 py-3.5 hidden sm:table-cell">Date</th>
                  <th className="px-6 py-3.5 text-center">Statut</th>
                  <th className="px-6 py-3.5 text-right">Montant</th>
                  <th className="px-6 py-3.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {mappedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 block mb-2">inbox</span>
                      <p className="text-slate-400 text-sm">Aucune commande récente</p>
                    </td>
                  </tr>
                ) : (
                  mappedOrders.map((order) => {
                    const initials = (order.customer_name || 'C')
                      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const sc = STATUS_CONFIG[order.status] || { label: order.status, cls: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-black text-primary shrink-0">
                              {initials}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {order.customer_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-sm text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          {order.restaurant_name}
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-sm text-slate-400 whitespace-nowrap">
                          {formatDateShort(order.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors" style={{ fontSize: '18px' }}>
                            chevron_right
                          </span>
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
