import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import driversAPI from '../api/drivers';
import { formatCurrency, formatDate } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';
import toast from 'react-hot-toast';

const METHOD_LABELS = {
  agency: "À l'agence",
  bank_deposit: 'Dépôt compte',
  mobile_money_deposit: 'Dépôt Mobile Money',
};

const STATUS_LABELS = {
  pending: { label: 'En attente', color: 'amber' },
  completed: { label: 'Validée', color: 'green' },
  rejected: { label: 'Refusée', color: 'red' },
};

const ConfirmModal = ({ remittance, isOpen, onClose, onConfirm }) => {
  const [notes, setNotes] = useState('');
  const [verifiedAmount, setVerifiedAmount] = useState(remittance?.amount?.toString() || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      notes: notes.trim() || undefined,
      verified_amount: verifiedAmount ? parseFloat(verifiedAmount) : undefined,
    });
    setNotes('');
    setVerifiedAmount(remittance?.amount?.toString() || '');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Valider la remise</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Montant déclaré : <span className="font-bold">{formatCurrency(remittance?.amount || 0)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Montant reçu (optionnel)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={verifiedAmount}
              onChange={(e) => setVerifiedAmount(e.target.value)}
              placeholder={remittance?.amount}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Laissez vide si identique au montant déclaré
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Référence virement, remarques..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Valider la remise
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RejectModal = ({ remittance, isOpen, onClose, onReject }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Veuillez indiquer le motif du refus');
      return;
    }
    onReject(reason.trim());
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Refuser la remise</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Remise de {formatCurrency(remittance?.amount || 0)} par {remittance?.delivery_name}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Motif du refus *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Ex: Montant incorrect, référence invalide..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              disabled={!reason.trim()}
            >
              Refuser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CashRemittances = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deliveryPersonId, setDeliveryPersonId] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const { data: driversData } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => driversAPI.getDrivers({ limit: 200 }),
  });
  const drivers = driversData?.data?.delivery_persons || driversData?.data?.drivers || driversData?.delivery_persons || [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['cash-remittances', statusFilter, dateFrom, dateTo, deliveryPersonId],
    queryFn: () =>
      financesAPI.getCashRemittances({
        status: statusFilter,
        page: 1,
        limit: 50,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        delivery_person_id: deliveryPersonId || undefined,
      }),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, notes, verified_amount }) => financesAPI.confirmCashRemittance(id, notes, verified_amount),
    onSuccess: () => {
      queryClient.invalidateQueries(['cash-remittances']);
      toast.success('Remise validée');
      setConfirmModal(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Erreur lors de la validation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => financesAPI.rejectCashRemittance(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['cash-remittances']);
      toast.success('Remise refusée');
      setRejectModal(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Erreur lors du refus');
    },
  });

  const remittances = data?.data?.remittances || [];
  const pagination = data?.data?.pagination || {};

  const handleConfirm = (payload) => {
    if (!confirmModal) return;
    confirmMutation.mutate({
      id: confirmModal.id,
      notes: payload.notes,
      verified_amount: payload.verified_amount,
    });
  };

  const handleReject = (reason) => {
    if (!rejectModal) return;
    rejectMutation.mutate({ id: rejectModal.id, reason });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Remises espèces
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Validez ou refusez les remises déclarées par les livreurs (agence, dépôt compte ou Mobile Money).
            </p>
          </div>
          <Link
            to="/finances"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Retour Finances
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === value
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Du</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Au</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div className="min-w-[200px]">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Livreur</label>
                <select
                  value={deliveryPersonId}
                  onChange={(e) => setDeliveryPersonId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                >
                  <option value="">Tous les livreurs</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                      {d.phone ? ` (${d.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {(dateFrom || dateTo || deliveryPersonId) && (
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setDeliveryPersonId('');
                  }}
                  className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">
              Erreur : {error?.response?.data?.error?.message || error?.message || 'Erreur inconnue'}
            </p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {isLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Livreur</th>
                    <th className="px-6 py-4">Montant</th>
                    <th className="px-6 py-4">Méthode</th>
                    <th className="px-6 py-4">Référence</th>
                    <th className="px-6 py-4">Statut</th>
                    {statusFilter === 'pending' && <th className="px-6 py-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {remittances.length === 0 ? (
                    <tr>
                      <td colSpan={statusFilter === 'pending' ? 7 : 6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">
                            {statusFilter === 'pending' ? 'pending_actions' : 'check_circle'}
                          </span>
                          <p className="text-slate-500 dark:text-slate-400 font-medium">
                            {statusFilter === 'pending'
                              ? 'Aucune remise en attente'
                              : statusFilter === 'completed'
                              ? 'Aucune remise validée'
                              : 'Aucune remise refusée'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    remittances.map((r) => {
                      const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
                      const orders = typeof r.orders === 'string' ? JSON.parse(r.orders || '[]') : r.orders || [];
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                            {formatDate(r.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900 dark:text-white">{r.delivery_name}</span>
                            {r.delivery_phone && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{r.delivery_phone}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                            {formatCurrency(r.amount)}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            {METHOD_LABELS[r.method] || r.method}
                            {r.mobile_money_provider && (
                              <span className="text-xs block text-slate-500">
                                ({r.mobile_money_provider.replace('_', ' ')})
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                            {r.reference || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                statusInfo.color === 'amber'
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                  : statusInfo.color === 'green'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          {statusFilter === 'pending' && (
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setConfirmModal(r)}
                                  disabled={confirmMutation.isPending || rejectMutation.isPending}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                >
                                  Valider
                                </button>
                                <button
                                  onClick={() => setRejectModal(r)}
                                  disabled={confirmMutation.isPending || rejectMutation.isPending}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                  Refuser
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.total > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pagination.total} remise(s) au total
          </p>
        )}
      </div>

      <ConfirmModal
        remittance={confirmModal}
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={handleConfirm}
      />
      <RejectModal
        remittance={rejectModal}
        isOpen={!!rejectModal}
        onClose={() => setRejectModal(null)}
        onReject={handleReject}
      />
    </Layout>
  );
};

export default CashRemittances;
