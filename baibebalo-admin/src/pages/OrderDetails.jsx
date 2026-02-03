import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { ordersAPI } from '../api/orders';
import { supportAPI } from '../api/support';
import driversAPI from '../api/drivers';
import { formatCurrency, formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersAPI.getOrderDetails(id),
    retry: 2,
  });

  // Récupérer la liste des livreurs disponibles
  const { data: driversData, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['drivers', 'active'],
    queryFn: () => driversAPI.getDrivers({ status: 'active', limit: 100 }),
    enabled: showReassignModal,
  });

  // Mutation pour annuler la commande
  const cancelMutation = useMutation({
    mutationFn: (reason) => ordersAPI.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id]);
      queryClient.invalidateQueries(['orders']);
      setShowCancelModal(false);
      setCancelReason('');
      toast.success('Commande annulée avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'annulation de la commande');
    },
  });

  // Mutation pour réassigner le livreur
  const reassignMutation = useMutation({
    mutationFn: (deliveryPersonId) => ordersAPI.reassignDeliveryPerson(id, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id]);
      queryClient.invalidateQueries(['orders']);
      setShowReassignModal(false);
      setSelectedDeliveryPerson('');
      toast.success('Livreur réassigné avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la réassignation du livreur');
    },
  });

  // Handler pour créer un ticket de support pour contacter le client
  const handleContactClient = () => {
    const order = data?.data?.order || {};
    if (order.user_id) {
      navigate(`/support?user_id=${order.user_id}&order_id=${id}`);
    } else {
      toast.error('Impossible de contacter le client : ID utilisateur manquant');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/orders')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="h-8 w-64 skeleton"></div>
          </div>
          <TableSkeleton rows={5} columns={4} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Erreur</h3>
          <p className="text-red-700 dark:text-red-300">{error.message || 'Erreur lors du chargement de la commande'}</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour aux commandes
          </button>
        </div>
      </Layout>
    );
  }

  const order = data?.data?.order || {};
  const isDelayed = order.status === 'delayed' || order.is_delayed;

  // Timeline steps
  const timelineSteps = [
    { key: 'placed', label: 'Commandée', icon: 'shopping_cart' },
    { key: 'confirmed', label: 'Confirmée', icon: 'check_circle' },
    { key: 'preparing', label: 'En préparation', icon: 'restaurant' },
    { key: 'ready', label: 'Prête', icon: 'done' },
    { key: 'on_route', label: 'En route', icon: 'local_shipping' },
    { key: 'delivered', label: 'Livrée', icon: 'check' },
  ];

  const currentStepIndex = timelineSteps.findIndex(step => step.key === order.status) || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/orders')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Détails Commande & Intervention
              </h1>
              {isDelayed && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mt-2">
                  ! En retard
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <p className="text-sm text-slate-500">Numéro de commande</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">#{order.order_number || order.id?.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Date</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatDateShort(order.placed_at || order.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Statut</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                order.status === 'delivering' ? 'bg-purple-100 text-purple-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {order.status === 'delivered' ? 'Livrée' :
                 order.status === 'cancelled' ? 'Annulée' :
                 order.status === 'preparing' ? 'En préparation' :
                 order.status === 'delivering' ? 'En livraison' :
                 order.status === 'ready' ? 'Prête' :
                 order.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Paiement</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                order.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {order.payment_status === 'paid' ? 'Payé' :
                 order.payment_status === 'failed' ? 'Échoué' :
                 'En attente'}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(order.total_amount || order.total || 0)}</p>
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Client
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-lg font-bold">
                {order.customer_name?.charAt(0) || 'C'}
              </div>
              <div>
                <h4 
                  className="font-bold text-sm text-slate-900 dark:text-white cursor-pointer hover:text-primary"
                  onClick={() => order.user_id && navigate(`/users/${order.user_id}`)}
                >
                  {order.customer_name || 'N/A'}
                </h4>
                <p className="text-xs text-slate-500">{order.customer_phone || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-base">email</span>
                <span className="text-xs truncate">{order.customer_email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Restaurant
            </h3>
            <div className="space-y-3">
              <h4 
                className="font-bold text-sm text-slate-900 dark:text-white cursor-pointer hover:text-primary"
                onClick={() => order.restaurant_id && navigate(`/restaurants/${order.restaurant_id}`)}
              >
                {order.restaurant_name || 'N/A'}
              </h4>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base mt-0.5">location_on</span>
                  <span>{order.restaurant_address || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">phone</span>
                  <span>{order.restaurant_phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Livraison
            </h3>
            <div className="space-y-3">
              {order.delivery_person_id ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">delivery_dining</span>
                  </div>
                  <div>
                    <p 
                      className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-primary"
                      onClick={() => navigate(`/drivers/${order.delivery_person_id}`)}
                    >
                      {order.delivery_first_name || ''} {order.delivery_last_name || 'Livreur assigné'}
                    </p>
                    <p className="text-xs text-slate-500">{order.delivery_phone || ''}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-600">Aucun livreur assigné</p>
              )}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base mt-0.5">pin_drop</span>
                  <span>{
                    typeof order.delivery_address === 'object' 
                      ? (order.delivery_address?.address_line || order.delivery_address?.label || order.delivery_address?.street || `${order.delivery_address?.district || ''} ${order.delivery_address?.city || ''}`.trim())
                      : (order.delivery_address || order.delivery_location?.address || 'Adresse non définie')
                  }</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">payments</span>
                  <span>Frais: {formatCurrency(order.delivery_fee || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Paiement
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">
                    {order.payment_method === 'cash' ? 'money' : 'credit_card'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {order.payment_method === 'cash' ? 'Espèces' : 
                     order.payment_method === 'mobile_money' ? 'Mobile Money' :
                     order.payment_method || 'Non défini'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sous-total</span>
                  <span className="font-semibold">{formatCurrency(order.subtotal || (order.total - (order.delivery_fee || 0)) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Frais de livraison</span>
                  <span className="font-semibold">{formatCurrency(order.delivery_fee || 0)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Réduction</span>
                    <span className="font-semibold">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-900 dark:text-white font-bold">Total</span>
                  <span className="font-bold text-primary">{formatCurrency(order.total_amount || order.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600">info</span>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Instructions spéciales</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{order.special_instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline & Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Timeline & Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Timeline */}
            <div className="space-y-4 mb-6">
              {timelineSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isCompleted 
                        ? 'bg-primary text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-sm">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">{step.icon}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        isCurrent 
                          ? 'text-primary' 
                          : isCompleted 
                          ? 'text-slate-900 dark:text-white' 
                          : 'text-slate-500'
                      }`}>
                        {step.label}
                        {isCurrent && <span className="ml-2 text-xs">(Actuellement)</span>}
                      </p>
                      {isCompleted && order.updated_at && (
                        <p className="text-xs text-slate-400">
                          {new Date(order.updated_at).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => setShowReassignModal(true)}
                disabled={order.status === 'cancelled' || order.status === 'delivered'}
                className="w-full px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                Réassigner Livreur
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={order.status === 'cancelled' || order.status === 'delivered'}
                className="w-full px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                Annuler Commande
              </button>
              <button
                onClick={handleContactClient}
                className="w-full px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                Contacter Client
              </button>
            </div>

            {isDelayed && (
              <p className="mt-4 text-xs text-red-600 dark:text-red-400 font-medium">
                Action requise pour la commande en retard #{order.id?.slice(0, 8)}
              </p>
            )}
          </div>
        </div>

        {/* Ordered Items */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ordered Items
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  <th className="px-6 py-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {item.name || item.item_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">
                        {item.quantity || 1}x
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.price || item.unit_price || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                      Aucun article trouvé
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                  <td colSpan="2" className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                    Total
                  </td>
                  <td className="px-6 py-4 text-right text-lg text-slate-900 dark:text-white">
                    {formatCurrency(order.total_amount || order.total || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Réassigner Livreur */}
        {showReassignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReassignModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Réassigner un livreur</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Sélectionner un livreur
                  </label>
                  <select
                    value={selectedDeliveryPerson}
                    onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sélectionner un livreur...</option>
                    {isLoadingDrivers ? (
                      <option value="" disabled>Chargement des livreurs...</option>
                    ) : driversData?.data?.delivery_persons?.length > 0 ? (
                      driversData.data.delivery_persons.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.first_name || ''} {driver.last_name || ''} - {driver.phone || 'N/A'}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Aucun livreur disponible</option>
                    )}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReassignModal(false);
                      setSelectedDeliveryPerson('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-semibold"
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (selectedDeliveryPerson) {
                        reassignMutation.mutate(selectedDeliveryPerson);
                      } else {
                        toast.error('Veuillez sélectionner un livreur');
                      }
                    }}
                    disabled={!selectedDeliveryPerson || reassignMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    {reassignMutation.isLoading ? 'Réassignation...' : 'Réassigner'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Annuler Commande */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Annuler la commande</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Raison de l'annulation (optionnel)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Entrez la raison de l'annulation..."
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary resize-none"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-semibold"
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
                        cancelMutation.mutate(cancelReason || null);
                      }
                    }}
                    disabled={cancelMutation.isLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    {cancelMutation.isLoading ? 'Annulation...' : 'Confirmer l\'annulation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrderDetails;
