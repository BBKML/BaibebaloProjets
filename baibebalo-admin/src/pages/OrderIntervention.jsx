import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { ordersAPI } from '../api/orders';
import driversAPI from '../api/drivers';
import toast from 'react-hot-toast';
import { logAction, ACTION_TYPES } from '../utils/adminActionLog';

const STATUS_LABELS = {
  new: { label: 'Nouvelle', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  accepted: { label: 'Acceptée', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  preparing: { label: 'En préparation', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ready: { label: 'Prête', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  delivering: { label: 'En livraison', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  delivered: { label: 'Livrée', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const TIMELINE_STEPS = [
  { key: 'placed_at', label: 'Commande passée', icon: 'receipt' },
  { key: 'accepted_at', label: 'Acceptée par le restaurant', icon: 'store' },
  { key: 'preparing_at', label: 'En préparation', icon: 'restaurant' },
  { key: 'ready_at', label: 'Prête à récupérer', icon: 'inventory' },
  { key: 'picked_up_at', label: 'Récupérée par le livreur', icon: 'directions_bike' },
  { key: 'delivered_at', label: 'Livrée', icon: 'home' },
];

const elapsed = (ts) => {
  if (!ts) return null;
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)} min`;
};

const fmt = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const OrderIntervention = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Charger les détails de la commande (auto-refresh toutes les 15s)
  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['order-intervention', id],
    queryFn: () => ordersAPI.getOrderDetails(id),
    refetchInterval: 15000,
    enabled: !!id,
  });

  // Charger les livreurs disponibles pour réassignation
  const { data: driversData } = useQuery({
    queryKey: ['drivers-available'],
    queryFn: () => driversAPI.getDrivers({ status: 'available', limit: 50 }),
    enabled: showReassignModal,
  });

  const order = orderData?.order || orderData?.data?.order || orderData;
  const availableDrivers = driversData?.delivery_persons || driversData?.data?.delivery_persons || [];

  // Logguer l'intervention dès que les données de la commande sont chargées
  const loggedRef = useState(false);
  if (order && !loggedRef[0]) {
    loggedRef[1](true);
    logAction('ORDER_INTERVENED', { orderId: id, orderNumber: order.order_number });
  }

  // Mutation : réassigner livreur
  const reassignMutation = useMutation({
    mutationFn: ({ orderId, driverId }) => ordersAPI.reassignDeliveryPerson(orderId, driverId),
    onSuccess: (_, { driverId }) => {
      toast.success('Livreur réassigné avec succès');
      const driver = availableDrivers?.find((d) => d.id === driverId);
      logAction(ACTION_TYPES.ORDER_REASSIGNED.label ? 'ORDER_REASSIGNED' : 'ORDER_REASSIGNED', {
        orderId: id,
        orderNumber: order?.order_number,
        driverName: driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : driverId,
      });
      setShowReassignModal(false);
      setSelectedDriverId('');
      queryClient.invalidateQueries({ queryKey: ['order-intervention', id] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la réassignation');
    },
  });

  // Mutation : annuler commande
  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }) => ordersAPI.cancelOrder(orderId, reason),
    onSuccess: (_, { reason }) => {
      toast.success('Commande annulée');
      logAction('ORDER_CANCELLED', {
        orderId: id,
        orderNumber: order?.order_number,
        reason,
      });
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ['order-intervention', id] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'annulation');
    },
  });

  const handleReassign = () => {
    if (!selectedDriverId) { toast.error('Sélectionnez un livreur'); return; }
    reassignMutation.mutate({ orderId: id, driverId: selectedDriverId });
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) { toast.error('Indiquez une raison d\'annulation'); return; }
    cancelMutation.mutate({ orderId: id, reason: cancelReason });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="text-center py-20 text-slate-500">
          <span className="material-symbols-outlined text-5xl mb-4 block">error</span>
          <p className="font-semibold">Commande introuvable</p>
          <Link to="/orders" className="mt-4 inline-block text-primary underline text-sm">← Retour aux commandes</Link>
        </div>
      </Layout>
    );
  }

  const statusCfg = STATUS_LABELS[order.status] || STATUS_LABELS.new;
  const isActive = !['delivered', 'cancelled'].includes(order.status);
  const deliveryAddress = typeof order.delivery_address === 'object'
    ? (order.delivery_address?.address_line || order.delivery_address?.street || order.delivery_address?.district || '')
    : (order.delivery_address || '');

  const elapsedSincePlaced = elapsed(order.placed_at || order.created_at);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/orders" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Intervention — #{order.order_number || id?.slice(0, 8)}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-9">
              Passée il y a {elapsedSincePlaced} • {fmt(order.placed_at || order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            {isActive && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Suivi en direct (15s)
              </span>
            )}
          </div>
        </div>

        {/* Alerte si commande bloquée */}
        {isActive && ['new', 'ready'].includes(order.status) && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            order.status === 'ready'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <span className="material-symbols-outlined text-amber-600 mt-0.5">warning</span>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300">
                {order.status === 'ready' ? 'Commande prête sans livreur' : 'Commande non prise en charge'}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                {order.status === 'ready'
                  ? `La commande attend un livreur depuis ${elapsed(order.ready_at || order.placed_at)}.`
                  : `Aucun restaurant n'a accepté cette commande depuis ${elapsedSincePlaced}.`}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Colonne gauche : infos */}
          <div className="lg:col-span-2 space-y-6">

            {/* Client + Restaurant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Client</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {order.customer_name || order.user?.first_name && `${order.user.first_name} ${order.user.last_name}` || 'Client'}
                </p>
                <p className="text-sm text-slate-500 mt-1">{order.customer_phone || order.user?.phone || '—'}</p>
                <p className="text-sm text-slate-400 mt-1 truncate">{deliveryAddress || '—'}</p>
                {(order.customer_phone || order.user?.phone) && (
                  <a
                    href={`tel:${order.customer_phone || order.user?.phone}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-base">call</span>
                    Appeler le client
                  </a>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Restaurant</p>
                <p className="font-bold text-slate-900 dark:text-white">{order.restaurant_name || order.restaurant?.name || '—'}</p>
                <p className="text-sm text-slate-500 mt-1">{order.restaurant?.phone || '—'}</p>
                {order.restaurant?.id && (
                  <Link
                    to={`/restaurants/${order.restaurant.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-base">store</span>
                    Voir le restaurant
                  </Link>
                )}
              </div>
            </div>

            {/* Livreur assigné */}
            {order.delivery_person && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Livreur assigné</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {order.delivery_person.first_name} {order.delivery_person.last_name}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">{order.delivery_person.phone || '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    {order.delivery_person.phone && (
                      <a
                        href={`tel:${order.delivery_person.phone}`}
                        className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100"
                      >
                        <span className="material-symbols-outlined text-base">call</span>
                      </a>
                    )}
                    {isActive && (
                      <button
                        onClick={() => setShowReassignModal(true)}
                        className="px-3 py-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                      >
                        Réassigner
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Articles */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">Articles commandés</p>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(order.items || order.order_items || []).map((item, i) => (
                    <tr key={i} className="px-5">
                      <td className="px-5 py-3 text-slate-900 dark:text-white font-medium">
                        {item.name || item.menu_item_name || item.item_name}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-center">{item.quantity}×</td>
                      <td className="px-5 py-3 text-slate-900 dark:text-white font-bold text-right">
                        {formatCurrency((item.price || item.unit_price || 0) * item.quantity)} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <td colSpan="2" className="px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300">Total</td>
                    <td className="px-5 py-3 text-sm font-black text-slate-900 dark:text-white text-right">
                      {formatCurrency(order.total || 0)} FCFA
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Colonne droite : timeline + actions */}
          <div className="space-y-6">

            {/* Timeline */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Progression</p>
              <div className="space-y-0">
                {TIMELINE_STEPS.map((step, idx) => {
                  const ts = order[step.key];
                  const isDone = !!ts;
                  const isCurrent = !ts && idx > 0 && !!order[TIMELINE_STEPS[idx - 1]?.key];
                  return (
                    <div key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          isDone
                            ? 'bg-primary text-white'
                            : isCurrent
                            ? 'bg-amber-400 text-white animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}>
                          <span className="material-symbols-outlined text-sm">{isDone ? 'check' : step.icon}</span>
                        </div>
                        {idx < TIMELINE_STEPS.length - 1 && (
                          <div className={`w-0.5 h-6 ${isDone ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className={`text-sm font-semibold ${isDone ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                        {ts && <p className="text-xs text-slate-400">{fmt(ts)}</p>}
                        {isCurrent && <p className="text-xs text-amber-500">En attente…</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions d'intervention */}
            {isActive && (
              <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 p-5 space-y-3">
                <p className="text-xs font-bold uppercase text-red-600 dark:text-red-400 tracking-wider">Actions admin</p>

                {!order.delivery_person && ['ready', 'accepted', 'preparing'].includes(order.status) && (
                  <button
                    onClick={() => setShowReassignModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">directions_bike</span>
                    Assigner un livreur
                  </button>
                )}
                {order.delivery_person && isActive && (
                  <button
                    onClick={() => setShowReassignModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">swap_horiz</span>
                    Changer le livreur
                  </button>
                )}

                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  Annuler la commande
                </button>

                <Link
                  to={`/orders/${id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Voir détail complet
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal réassignation livreur */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              {order.delivery_person ? 'Changer le livreur' : 'Assigner un livreur'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">Sélectionnez un livreur disponible</p>
            <select
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white mb-4 text-sm"
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              <option value="">-- Choisir un livreur --</option>
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.first_name} {d.last_name} {d.vehicle_type ? `(${d.vehicle_type})` : ''}
                </option>
              ))}
              {availableDrivers.length === 0 && (
                <option disabled>Aucun livreur disponible</option>
              )}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                onClick={handleReassign}
                disabled={!selectedDriverId || reassignMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {reassignMutation.isPending ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Annuler la commande</h3>
            <p className="text-sm text-slate-500 mb-4">
              Cette action est irréversible. Indiquez la raison de l'annulation.
            </p>
            <textarea
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white mb-4 text-sm resize-none"
              rows={3}
              placeholder="Raison de l'annulation (obligatoire)…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Retour
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Annulation…' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default OrderIntervention;
