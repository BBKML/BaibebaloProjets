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

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Customer Info
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                {order.customer_name?.charAt(0) || 'C'}
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {order.customer_name || 'N/A'}
                </h4>
                <p className="text-sm text-slate-500">{order.customer_phone || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-lg">email</span>
                <span>{order.customer_email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-lg">phone</span>
                <span>{order.customer_phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Restaurant Info
            </h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                  {order.restaurant_name || 'N/A'}
                </h4>
              </div>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">location_on</span>
                  <span>{order.restaurant_address || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">email</span>
                  <span>{order.restaurant_email || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Timeline & Actions
            </h3>
            
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
