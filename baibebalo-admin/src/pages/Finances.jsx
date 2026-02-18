import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import apiClient from '../api/client';
import { formatCurrency, formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';
import toast from 'react-hot-toast';

// Composant modal pour saisir la preuve de paiement
const PaymentProofModal = ({ isOpen, onClose, onConfirm, payment }) => {
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Réinitialiser les champs quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setPaymentTransactionId('');
      setPaymentProofUrl('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentTransactionId && !paymentProofUrl) {
      toast.error('Veuillez fournir au moins une preuve de paiement');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        payment_transaction_id: paymentTransactionId || null,
        payment_proof_url: paymentProofUrl || null,
      });
      setPaymentTransactionId('');
      setPaymentProofUrl('');
      onClose();
    } catch (error) {
      // Erreur gérée par onConfirm
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Preuve de Paiement
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Montant à payer : <span className="font-bold">{formatCurrency(payment?.amount || 0)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Numéro de transaction Mobile Money *
            </label>
            <input
              type="text"
              value={paymentTransactionId}
              onChange={(e) => setPaymentTransactionId(e.target.value)}
              placeholder="Ex: TX123456789"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Référence de la transaction Mobile Money effectuée
            </p>
          </div>

          <div className="text-center text-slate-400 dark:text-slate-500 text-sm">OU</div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              URL de capture d'écran
            </label>
            <input
              type="url"
              value={paymentProofUrl}
              onChange={(e) => setPaymentProofUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              URL d'une capture d'écran du virement (optionnel si transaction_id fourni)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:brightness-110 font-medium disabled:opacity-50"
              disabled={isSubmitting || (!paymentTransactionId && !paymentProofUrl)}
            >
              {isSubmitting ? 'Enregistrement...' : 'Marquer comme payé'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Finances = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('delivery');
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [paymentProofModal, setPaymentProofModal] = useState({ isOpen: false, payment: null });
  const [searchInput, setSearchInput] = useState(''); // État local pour l'input de recherche
  const debounceTimerRef = useRef(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    phone: '', // Recherche par numéro
    date_from: '', // Date de début
    date_to: '', // Date de fin
  });

  // Debounce pour la recherche par numéro (500ms) - recherche automatique après arrêt de saisie
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, phone: searchInput, page: 1 }));
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Fonction pour déclencher la recherche manuellement
  const handleSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Mettre à jour les filtres immédiatement
    setFilters(prev => ({ ...prev, phone: searchInput.trim(), page: 1 }));
    // Forcer le refetch des queries
    queryClient.invalidateQueries(['delivery-payments']);
    queryClient.invalidateQueries(['restaurant-payments']);
    queryClient.invalidateQueries(['paid-payments']);
  };

  const { data: deliveryData, isLoading: deliveryLoading, error: deliveryError } = useQuery({
    queryKey: ['delivery-payments', filters],
    queryFn: () => financesAPI.getPayoutRequests({ 
      ...filters, 
      user_type: 'delivery', 
      status: 'pending',
      phone: filters.phone || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    }),
    enabled: activeTab === 'delivery',
    retry: 1,
  });

  const { data: restaurantData, isLoading: restaurantLoading, error: restaurantError } = useQuery({
    queryKey: ['restaurant-payments', filters],
    queryFn: () => financesAPI.getPayoutRequests({ 
      ...filters, 
      user_type: 'restaurant', 
      status: 'pending',
      phone: filters.phone || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    }),
    enabled: activeTab === 'restaurant',
    retry: 1,
  });

  // Requête pour les payouts payés (tous types confondus)
  const { data: paidData, isLoading: paidLoading, error: paidError } = useQuery({
    queryKey: ['paid-payments', filters],
    queryFn: () => financesAPI.getPayoutRequests({ 
      ...filters, 
      status: 'paid',
      phone: filters.phone || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    }),
    enabled: activeTab === 'paid',
    retry: 1,
  });

  const isLoading = activeTab === 'delivery' 
    ? deliveryLoading 
    : activeTab === 'restaurant' 
    ? restaurantLoading 
    : paidLoading;
  const error = activeTab === 'delivery' 
    ? deliveryError 
    : activeTab === 'restaurant' 
    ? restaurantError 
    : paidError;
  const payments = activeTab === 'delivery' 
    ? (deliveryData?.data?.payouts || [])
    : activeTab === 'restaurant'
    ? (restaurantData?.data?.payouts || [])
    : (paidData?.data?.payouts || []);
  
  // Récupérer le total payé sur 24h depuis les statistiques
  const totalPaid24h = activeTab === 'delivery' 
    ? (deliveryData?.data?.statistics?.total_paid_24h || 0)
    : 0;
  
  // État vide pour les paiements (masquer le message vide pour l'onglet "Payés")
  const isEmpty = !isLoading && !error && payments.length === 0;

  // Handlers pour la sélection
  const handleSelectPayment = (paymentId) => {
    setSelectedPayments((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === payments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(payments.map((p) => p.id));
    }
  };

  // Mutation pour payer les sélections
  const paySelectedMutation = useMutation({
    mutationFn: async (paymentIds) => {
      const results = await Promise.allSettled(
        paymentIds.map((id) => {
          return apiClient.put(`/admin/finances/payouts/${id}/process`);
        })
      );
      
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        throw new Error(`${errors.length} paiement(s) ont échoué`);
      }
      
      return results;
    },
    onSuccess: () => {
      toast.success(`Paiement de ${selectedPayments.length} paiement(s) effectué avec succès`);
      setSelectedPayments([]);
      queryClient.invalidateQueries(['delivery-payments']);
      queryClient.invalidateQueries(['restaurant-payments']);
      queryClient.invalidateQueries(['delivery-payment-summary']);
      queryClient.invalidateQueries(['paid-payments']);
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'driver' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || error.message || 'Erreur lors du paiement');
    },
  });

  const handlePaySelected = () => {
    if (selectedPayments.length === 0) {
      toast.error('Veuillez sélectionner au moins un paiement');
      return;
    }
    if (window.confirm(`Êtes-vous sûr de vouloir payer ${selectedPayments.length} paiement(s) ?`)) {
      paySelectedMutation.mutate(selectedPayments);
    }
  };

  const handleViewDetails = (payment) => {
    // Naviguer vers la page de détails du livreur/restaurant
    const userId = payment.user_id;
    if (activeTab === 'delivery' || (activeTab === 'paid' && payment.user_type === 'delivery')) {
      navigate(`/drivers/${userId}`);
    } else if (activeTab === 'restaurant' || (activeTab === 'paid' && payment.user_type === 'restaurant')) {
      navigate(`/restaurants/${userId}`);
    } else {
      // Si on ne peut pas déterminer, aller à l'historique complet
      navigate('/finances/payouts-history');
    }
  };

  const handleViewHistory = () => {
    navigate('/finances/payouts-history');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {activeTab === 'delivery' ? 'Paiements Livreurs' : 'Paiements Restaurants'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez les versements en attente</p>
          </div>
          <TableSkeleton rows={10} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeTab === 'delivery' 
                ? 'Paiements Livreurs en Attente' 
                : activeTab === 'restaurant'
                ? 'Paiements Restaurants en Attente'
                : 'Paiements Payés'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base">
              {activeTab === 'delivery' 
                ? 'Gérez et validez les soldes en attente pour vos livreurs partenaires.'
                : activeTab === 'restaurant'
                ? 'Gérez les versements hebdomadaires et effectuez les virements groupés.'
                : 'Consultez tous les paiements marqués comme payés avec leurs preuves.'}
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'delivery' && (
              <button
                onClick={async () => {
                  if (window.confirm('Générer les payouts pour tous les livreurs avec solde > 1000 FCFA et numéro Mobile Money configuré ?')) {
                    try {
                      await financesAPI.generatePayouts('delivery');
                      toast.success('Payouts livreurs générés avec succès');
                      queryClient.invalidateQueries(['delivery-payments']);
                    } catch (error) {
                      toast.error(error.response?.data?.error?.message || 'Erreur lors de la génération');
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                <span>Générer les payouts livreurs</span>
              </button>
            )}
            {activeTab === 'restaurant' && (
              <button
                onClick={async () => {
                  if (window.confirm('Générer les payouts pour tous les restaurants avec solde > 10000 FCFA ?')) {
                    try {
                      await financesAPI.generatePayouts('restaurant');
                      toast.success('Payouts restaurants générés avec succès');
                      queryClient.invalidateQueries(['restaurant-payments']);
                    } catch (error) {
                      toast.error(error.response?.data?.error?.message || 'Erreur lors de la génération');
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                <span>Générer les payouts restaurants</span>
              </button>
            )}
            <button 
              onClick={() => {
                toast.info('Fonctionnalité d\'export en cours de développement');
              }}
              className="flex items-center gap-2 px-4 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">download</span>
              <span>Exporter CSV</span>
            </button>
            {activeTab !== 'paid' && (
              <button 
                onClick={handlePaySelected}
                disabled={selectedPayments.length === 0 || paySelectedMutation.isPending}
                className="flex items-center gap-2 px-6 h-11 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">send</span>
                <span>
                  {paySelectedMutation.isPending
                    ? 'Paiement en cours...'
                    : `Payer la sélection (${selectedPayments.length})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">error</span>
              <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                Erreur lors du chargement : {error?.response?.data?.error?.message || error?.message || 'Erreur inconnue'}
              </p>
            </div>
          </div>
        )}

        {/* Lien vers Vue paiement livreurs (liste + gains pour chaque lundi) */}
        <Link
          to="/finances/delivery-payment-summary"
          className="flex items-center gap-3 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-xl hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl text-primary">
            list_alt
          </span>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Vue paiement livreurs
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Liste des livreurs avec leurs gains à payer. Vue pour chaque lundi.
            </p>
          </div>
          <span className="material-symbols-outlined text-primary ml-auto">
            arrow_forward
          </span>
        </Link>

        {/* Guide : Comment payer les livreurs */}
        {activeTab === 'delivery' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Comment payer vos livreurs ?
            </p>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Cliquez sur <strong>Générer les payouts livreurs</strong> pour créer les demandes de paiement (livreurs avec solde &gt; 1000 FCFA et Mobile Money configuré).</li>
              <li>Sélectionnez les paiements à effectuer, puis cliquez sur <strong>Payer la sélection</strong>.</li>
              <li>Effectuez le virement Mobile Money vers le numéro indiqué pour chaque livreur.</li>
              <li>Optionnel : utilisez <strong>Marquer comme payé</strong> pour enregistrer la preuve (référence TX ou capture d&apos;écran).</li>
            </ol>
          </div>
        )}

        {/* Lien vers Espèces dues (ce que les livreurs doivent) */}
        <Link
          to="/finances/cash-owed"
          className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl text-amber-600 dark:text-amber-400">
            account_balance_wallet
          </span>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Espèces dues par les livreurs
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Voir combien chaque livreur doit reverser (paiements cash non remis)
            </p>
          </div>
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 ml-auto">
            arrow_forward
          </span>
        </Link>

        {/* Lien vers Remises espèces (valider les remises déclarées) */}
        <Link
          to="/finances/cash-remittances"
          className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl text-emerald-600 dark:text-emerald-400">
            payments
          </span>
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Remises espèces
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Valider ou refuser les remises déclarées par les livreurs (agence, dépôt, Mobile Money)
            </p>
          </div>
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 ml-auto">
            arrow_forward
          </span>
        </Link>

        {/* Filtres de recherche */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recherche par numéro
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Numéro de téléphone ou Mobile Money"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary"
                />
                {isLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="material-symbols-outlined animate-spin text-primary text-lg">sync</span>
                  </span>
                )}
                {!isLoading && searchInput && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-lg">search</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value, page: 1 })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value, page: 1 })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                disabled={isLoading}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                    Recherche...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">search</span>
                    Rechercher
                  </>
                )}
              </button>
              {(filters.phone || filters.date_from || filters.date_to) && (
                <div className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  {filters.phone && <span className="mr-2">📱 {filters.phone}</span>}
                  {filters.date_from && <span className="mr-2">📅 Depuis: {filters.date_from}</span>}
                  {filters.date_to && <span>📅 Jusqu'à: {filters.date_to}</span>}
                </div>
              )}
              <button
                onClick={() => {
                  setSearchInput('');
                  setFilters({
                    page: 1,
                    limit: 20,
                    phone: '',
                    date_from: '',
                    date_to: '',
                  });
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-0 mt-4">
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8">
            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
                activeTab === 'delivery'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              <span className="text-sm font-bold tracking-tight">Livreurs</span>
              {deliveryData?.data?.payouts?.length > 0 && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                  {deliveryData.data.payouts.length}
                </span>
              )}
              <span className="bg-primary/10 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {deliveryData?.data?.pagination?.total || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('restaurant')}
              className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
                activeTab === 'restaurant'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              <span className="text-sm font-bold tracking-tight">Restaurants</span>
              {restaurantData?.data?.payouts?.length > 0 && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                  {restaurantData.data.payouts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
                activeTab === 'paid'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              <span className="text-sm font-bold tracking-tight">Payés</span>
              {paidData?.data?.payouts?.length > 0 && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                  {paidData.data.payouts.length}
                </span>
              )}
            </button>
            <button 
              onClick={handleViewHistory}
              className="flex items-center gap-2 border-b-[3px] border-transparent text-slate-500 pb-3 pt-4 hover:text-primary transition-colors"
            >
              <span className="text-sm font-bold tracking-tight">Historique complet</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  {activeTab !== 'paid' && (
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedPayments.length === payments.length && payments.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer" 
                      />
                    </th>
                  )}
                  <th className="px-6 py-4">
                    {activeTab === 'delivery' 
                      ? 'Livreur' 
                      : activeTab === 'restaurant'
                      ? 'Restaurant'
                      : 'Bénéficiaire'}
                  </th>
                  <th className="px-6 py-4">Montant à régler</th>
                  <th className="px-6 py-4">Période</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isEmpty ? (
                  <tr>
                    <td colSpan={activeTab === 'paid' ? "5" : "6"} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto">
                        {/* Empty State Illustration */}
                        <div className="relative mb-10 w-full flex justify-center">
                          <div className="absolute inset-0 flex items-center justify-center opacity-20 dark:opacity-30 pointer-events-none">
                            <div className="w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
                            <div className="w-48 h-48 rounded-full bg-orange-500/10 blur-3xl -translate-x-20" />
                          </div>
                          <div className="relative z-10 w-64 h-64 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xl">
                            <div className="relative">
                              <div className="absolute -top-12 -right-4 w-12 h-12 rounded-full border-4 border-primary/40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                                <span className="material-symbols-outlined text-primary text-xl">payments</span>
                              </div>
                              <div className="absolute -bottom-8 -left-10 w-16 h-16 rounded-full border-4 border-orange-500/30 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center animate-pulse" style={{ animationDuration: '4s' }}>
                                <span className="material-symbols-outlined text-orange-500 text-2xl">toll</span>
                              </div>
                              <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-3xl flex items-center justify-center rotate-3 border-2 border-white/5 shadow-inner">
                                <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-[80px]">account_balance_wallet</span>
                              </div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-1 bg-primary/20 rotate-45 rounded-full" />
                            </div>
                          </div>
                        </div>
                        {/* Text Content */}
                        <div className="space-y-4">
                          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest">
                            Opérations à jour
                          </span>
                          <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Aucun paiement en attente
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                            Tout est parfaitement synchronisé ! Il n'y a actuellement aucune transaction en attente de
                            traitement pour vos livreurs.
                          </p>
                        </div>
                        {/* Action Area */}
                        <div className="mt-10 flex flex-col sm:flex-row gap-4">
                          <button 
                            onClick={handleViewHistory}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:shadow-xl hover:shadow-primary/30 flex items-center gap-2 group"
                          >
                            <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform">history</span>
                            Vérifier l'historique
                          </button>
                          <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-8 py-3.5 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700">
                            Configurer les seuils
                          </button>
                        </div>
                        {/* Stats Footer Hint */}
                        <div className="mt-16 grid grid-cols-3 gap-8 w-full max-w-md pt-8 border-t border-slate-200 dark:border-slate-800">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Dernier Run</p>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Il y a 2h</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Automatisé</p>
                            <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Payé (24h)</p>
                            <p className="text-sm font-extrabold text-primary">{formatCurrency(totalPaid24h)}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'paid' ? "5" : "6"} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                          <span className="material-symbols-outlined text-slate-400 text-5xl">payments</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                          {filters.phone || filters.date_from || filters.date_to
                            ? 'Aucun résultat trouvé'
                            : activeTab === 'paid' 
                            ? 'Aucun paiement payé'
                            : activeTab === 'restaurant'
                            ? 'Aucun paiement restaurant en attente'
                            : 'Aucun paiement en attente'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                          {filters.phone || filters.date_from || filters.date_to ? (
                            <>
                              Aucun paiement ne correspond à vos critères de recherche.
                              {filters.phone && <><br />Numéro recherché: <strong>{filters.phone}</strong></>}
                              {filters.date_from && <><br />Date de début: <strong>{filters.date_from}</strong></>}
                              {filters.date_to && <><br />Date de fin: <strong>{filters.date_to}</strong></>}
                              <br /><br />Essayez de modifier vos filtres ou réinitialisez la recherche.
                            </>
                          ) : (
                            <>
                              {activeTab === 'delivery' 
                                ? 'Aucun livreur n\'a de solde en attente de paiement pour le moment.'
                                : activeTab === 'restaurant'
                                ? 'Aucun restaurant n\'a de solde en attente de paiement pour le moment. Les paiements sont générés automatiquement le lundi matin à 9h.'
                                : 'Aucun paiement n\'a été marqué comme payé pour le moment.'}
                            </>
                          )}
                        </p>
                        {activeTab === 'restaurant' && (
                          <div className="mt-4">
                            <button
                              onClick={async () => {
                                if (window.confirm('Générer les payouts pour tous les restaurants avec solde > 10000 FCFA ?')) {
                                  try {
                                    await financesAPI.generatePayouts('restaurant');
                                    toast.success('Payouts restaurants générés avec succès');
                                    queryClient.invalidateQueries(['restaurant-payments']);
                                  } catch (error) {
                                    toast.error(error.response?.data?.error?.message || 'Erreur lors de la génération');
                                  }
                                }
                              }}
                              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all"
                            >
                              Générer les payouts maintenant
                            </button>
                          </div>
                        )}
                        {activeTab === 'delivery' && (
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Les paiements sont générés automatiquement le lundi matin à 9h, ou vous pouvez les créer manuellement.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const isSelected = selectedPayments.includes(payment.id);
                    return (
                    <tr 
                      key={payment.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      {activeTab !== 'paid' && (
                        <td className="px-6 py-5">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleSelectPayment(payment.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer" 
                          />
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            <span className="material-symbols-outlined text-slate-400">
                              {activeTab === 'delivery' ? 'local_shipping' : 'restaurant'}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white text-sm font-bold">
                              {activeTab === 'delivery' 
                                ? (payment.delivery_name || 'N/A')
                                : activeTab === 'restaurant'
                                ? (payment.restaurant_name || 'N/A')
                                : (payment.delivery_name || payment.restaurant_name || 'N/A')}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {activeTab === 'paid' && payment.user_type && (
                                <span className="mr-2">{payment.user_type === 'delivery' ? 'Livreur' : 'Restaurant'}</span>
                              )}
                              ID: #{payment.id?.slice(0, 8) || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-slate-900 dark:text-white text-sm font-black">
                          {formatCurrency(payment.amount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {payment.created_at ? formatDateShort(payment.created_at) : 'N/A'}
                      </td>
                      <td className="px-6 py-5">
                        {payment.status === 'paid' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                            Payé
                          </span>
                        ) : payment.status === 'completed' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                            Complété
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.status === 'paid' && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    const userId = payment.user_id;
                                    if (payment.user_type === 'delivery') {
                                      await financesAPI.refreshDeliveryBalance(userId);
                                    } else {
                                      await financesAPI.refreshRestaurantBalance(userId);
                                    }
                                    toast.success('Solde actualisé');
                                    queryClient.invalidateQueries(['delivery-payments']);
                                    queryClient.invalidateQueries(['restaurant-payments']);
                                    queryClient.invalidateQueries(['paid-payments']);
                                    queryClient.invalidateQueries(['delivery-payment-summary']);
                                    if (userId) queryClient.invalidateQueries(['driver', userId]);
                                  } catch (error) {
                                    toast.error('Erreur lors de l\'actualisation');
                                  }
                                }}
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50"
                                title="Actualiser le solde"
                              >
                                <span className="material-symbols-outlined text-base">refresh</span>
                              </button>
                              {(payment.payment_transaction_id || payment.payment_proof_url) && (
                                <button
                                  onClick={() => {
                                    const proof = payment.payment_transaction_id 
                                      ? `Transaction: ${payment.payment_transaction_id}` 
                                      : '';
                                    const url = payment.payment_proof_url 
                                      ? `\nPreuve: ${payment.payment_proof_url}` 
                                      : '';
                                    alert(`Preuve de paiement:\n${proof}${url}`);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50"
                                  title="Voir la preuve de paiement"
                                >
                                  <span className="material-symbols-outlined text-base">receipt</span>
                                </button>
                              )}
                            </>
                          )}
                          {payment.status === 'pending' && activeTab !== 'paid' && (
                            <button
                              onClick={() => {
                                setPaymentProofModal({ isOpen: true, payment });
                              }}
                              className="text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5"
                              title="Marquer comme payé"
                            >
                              <span className="material-symbols-outlined text-base">check_circle</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleViewDetails(payment)}
                            className="text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20"
                            title="Voir les détails"
                          >
                            Détails
                          </button>
                        </div>
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

      {/* Modal Preuve de Paiement */}
      <PaymentProofModal
        isOpen={paymentProofModal.isOpen}
        onClose={() => setPaymentProofModal({ isOpen: false, payment: null })}
        onConfirm={async (proof) => {
          try {
            await financesAPI.markPayoutAsPaid(paymentProofModal.payment.id, proof);
            toast.success('Paiement marqué comme effectué');
            queryClient.invalidateQueries(['delivery-payments']);
            queryClient.invalidateQueries(['restaurant-payments']);
            queryClient.invalidateQueries(['delivery-payment-summary']);
            const userId = paymentProofModal.payment?.user_id;
            if (userId) queryClient.invalidateQueries(['driver', userId]);
          } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Erreur lors du marquage');
            throw error;
          }
        }}
        payment={paymentProofModal.payment}
      />
    </Layout>
  );
};

export default Finances;
