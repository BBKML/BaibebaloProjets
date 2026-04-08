import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';
import TableSkeleton from '../components/common/TableSkeleton';
import { promosAPI } from '../api/promos';
import toast from 'react-hot-toast';

const PromoCodes = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['promotions', activeTab],
    queryFn: () => promosAPI.getPromotions({ status: activeTab === 'all' ? undefined : activeTab }),
  });

  const toggleMutation = useMutation({
    mutationFn: promosAPI.togglePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const createMutation = useMutation({
    mutationFn: promosAPI.createPromotion,
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      setShowCreateModal(false);
      toast.success('Code promo créé avec succès');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erreur lors de la création'),
  });

  const promoCodes = data?.data?.promotions || data?.promotions || [];
  const activeCodes = promoCodes.filter((c) => c.is_active).length;
  const bestCode = promoCodes[0];

  const handleExport = () => {
    if (promoCodes.length === 0) { toast.error('Aucun code promo à exporter'); return; }
    const exportData = promoCodes.map((code) => ({
      'Code': code.code,
      'Type': code.discount_type === 'percentage' ? 'Pourcentage' : 'Montant fixe',
      'Valeur': code.discount_type === 'percentage' ? `${code.discount_value}%` : formatCurrency(code.discount_value),
      'Utilisations': `${code.usage_count || 0}${code.usage_limit ? ` / ${code.usage_limit}` : ''}`,
      'Date Début': code.valid_from ? new Date(code.valid_from).toLocaleDateString('fr-FR') : '-',
      'Date Fin': code.valid_until ? new Date(code.valid_until).toLocaleDateString('fr-FR') : '-',
      'Statut': code.is_active ? 'Actif' : 'Inactif',
    }));
    exportToCSV(exportData, `codes-promo-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export CSV réussi !');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white">Gestion des Codes Promo</h1>
          <TableSkeleton rows={8} columns={7} />
        </div>
      </Layout>
    );
  }

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
              onClick={() => setShowCreateModal(true)}
              className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="truncate">Créer un Code Promo</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Codes Actifs</p>
            <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">{activeCodes}</p>
            <p className="text-slate-500 text-xs">sur {promoCodes.length} créés</p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Utilisations totales</p>
            <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">
              {promoCodes.reduce((sum, c) => sum + (c.usage_count || 0), 0)}
            </p>
          </div>
          {bestCode && (
            <div className="flex flex-col gap-2 rounded-xl p-6 border border-primary/20 bg-primary/10">
              <p className="text-primary text-sm font-bold uppercase tracking-wider">Meilleur Code</p>
              <p className="text-slate-900 dark:text-white tracking-tight text-2xl font-bold">{bestCode.code}</p>
              <p className="text-slate-500 text-xs">{bestCode.usage_count || 0} utilisations</p>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-6">
            <div className="flex gap-8">
              {[
                { key: 'all', label: 'Tous les codes' },
                { key: 'active', label: 'Actifs' },
                { key: 'expired', label: 'Expirés' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center border-b-[3px] py-4 px-1 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <p className="text-sm font-bold tracking-[0.015em]">{tab.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/40">
                  {['Code Promo', 'Type', 'Valeur', 'Utilisation', 'Validité', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {promoCodes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      Aucun code promo trouvé
                    </td>
                  </tr>
                ) : (
                  promoCodes.map((promo) => {
                    const usageLimit = promo.usage_limit || 100;
                    const usagePct = Math.min(((promo.usage_count || 0) / usageLimit) * 100, 100);
                    return (
                      <tr key={promo.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                              {promo.code?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-slate-900 dark:text-white font-semibold">{promo.code}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-200">
                            {promo.discount_type === 'percentage' ? 'Pourcentage' : 'Remise Fixe'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-primary font-bold">
                            {promo.discount_type === 'percentage'
                              ? `${promo.discount_value}%`
                              : formatCurrency(promo.discount_value)}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1.5 w-32">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                              <span>{promo.usage_count || 0}</span>
                              <span>{promo.usage_limit || '∞'}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full ${usagePct >= 100 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${usagePct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs text-slate-500">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {promo.valid_from ? new Date(promo.valid_from).toLocaleDateString('fr-FR') : '-'}
                            </p>
                            <p className="text-[10px]">
                              au {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('fr-FR') : '∞'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={promo.is_active}
                              onChange={() => toggleMutation.mutate(promo.id)}
                              disabled={toggleMutation.isPending}
                            />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                            <span className={`ml-2 text-xs font-bold ${promo.is_active ? 'text-emerald-500' : 'text-slate-500'}`}>
                              {promo.is_active ? 'ACTIF' : 'OFF'}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleMutation.mutate(promo.id)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {promo.is_active ? 'pause' : 'play_arrow'}
                            </span>
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

      {showCreateModal && (
        <CreatePromoModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </Layout>
  );
};

const CreatePromoModal = ({ onClose, onSubmit, isLoading }) => {
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    min_order_amount: '',
    description: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code || (form.discount_type !== 'free_delivery' && !form.discount_value) || !form.valid_from || !form.valid_until) {
      toast.error('Code, valeur, date de début et date de fin sont requis');
      return;
    }
    if (new Date(form.valid_until) <= new Date(form.valid_from)) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }
    // Map frontend field names → backend expected field names
    const typeMap = { fixed: 'fixed_amount', percentage: 'percentage', free_delivery: 'free_delivery' };
    onSubmit({
      code: form.code.toUpperCase().trim(),
      type: typeMap[form.discount_type] || form.discount_type,
      value: form.discount_type === 'free_delivery' ? 0 : parseFloat(form.discount_value),
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      description: form.description || undefined,
    });
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Créer un Code Promo</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code *</label>
              <input
                required
                value={form.code}
                onChange={set('code')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary uppercase"
                placeholder="EX: WELCOME20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type *</label>
              <select value={form.discount_type} onChange={set('discount_type')} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary">
                <option value="percentage">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (FCFA)</option>
                <option value="free_delivery">Livraison gratuite</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valeur {form.discount_type !== 'free_delivery' ? '*' : ''}{' '}
                {form.discount_type === 'percentage' ? '(%)' : form.discount_type === 'free_delivery' ? '' : '(FCFA)'}
              </label>
              <input
                required={form.discount_type !== 'free_delivery'}
                type="number"
                min="0"
                max={form.discount_type === 'percentage' ? 100 : undefined}
                value={form.discount_type === 'free_delivery' ? '0' : form.discount_value}
                onChange={set('discount_value')}
                disabled={form.discount_type === 'free_delivery'}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                placeholder={form.discount_type === 'percentage' ? '20' : form.discount_type === 'free_delivery' ? 'N/A' : '500'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limite d'utilisations</label>
              <input
                type="number"
                min="1"
                value={form.usage_limit}
                onChange={set('usage_limit')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="Illimité"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valide du *</label>
              <input required type="date" value={form.valid_from} onChange={set('valid_from')} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valide jusqu'au *</label>
              <input required type="date" value={form.valid_until} onChange={set('valid_until')} min={form.valid_from || undefined} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Commande minimum (FCFA)</label>
            <input
              type="number"
              min="0"
              value={form.min_order_amount}
              onChange={set('min_order_amount')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Aucun minimum"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (optionnel)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={set('description')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary resize-none"
              placeholder="Description interne..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromoCodes;
