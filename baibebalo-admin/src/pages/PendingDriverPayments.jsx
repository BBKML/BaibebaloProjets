import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';
import toast from 'react-hot-toast';
import TableSkeleton from '../components/common/TableSkeleton';
import { financesAPI } from '../api/finances';

const PendingDriverPayments = () => {
  const [selectedPayments, setSelectedPayments] = useState(['payment-1', 'payment-2']);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');

  // Charger les paiements depuis l'API
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['pending-driver-payments', periodFilter, amountFilter],
    queryFn: () => financesAPI.getPendingDeliveryPayments({ 
      page: 1, 
      limit: 20,
      status: 'pending'
    }),
    retry: 2,
  });

  const payments = [
    {
      id: 'payment-1',
      driverName: 'Amadou Diallo',
      driverId: 'DRV-284',
      amount: 245.50,
      period: 'Semaine 1, Oct 2023',
      deliveries: 42,
      status: 'pending',
      avatar: null,
    },
    {
      id: 'payment-2',
      driverName: 'Koffi Kouassi',
      driverId: 'DRV-192',
      amount: 189.75,
      period: 'Semaine 1, Oct 2023',
      deliveries: 31,
      status: 'pending',
      avatar: null,
    },
    {
      id: 'payment-3',
      driverName: 'Fatou Sall',
      driverId: 'DRV-456',
      amount: 312.00,
      period: 'Semaine 2, Oct 2023',
      deliveries: 58,
      status: 'pending',
      avatar: null,
    },
  ];

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

  const handlePaySelected = () => {
    if (selectedPayments.length === 0) {
      toast.error('Veuillez sélectionner au moins un paiement');
      return;
    }
    toast.success(`Paiement de ${selectedPayments.length} livreur(s) effectué`);
    setSelectedPayments([]);
  };

  // Fonction d'export
  const handleExport = () => {
    try {
      const paymentsToExport = paymentsData?.data?.payments || payments;
      
      if (paymentsToExport.length === 0) {
        toast.error('Aucun paiement à exporter');
        return;
      }

      const exportData = paymentsToExport.map(payment => ({
        'ID Livreur': payment.driverId || payment.driver_id || '-',
        'Nom': payment.driverName || payment.driver_name || '-',
        'Montant': formatCurrency(payment.amount || 0),
        'Période': payment.period || '-',
        'Livraisons': payment.deliveries || payment.total_deliveries || 0,
        'Statut': payment.status === 'pending' ? 'En attente' : payment.status,
      }));

      exportToCSV(exportData, `paiements-livreurs-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-80 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-40 animate-pulse" />
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-64 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 animate-pulse" />
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={5} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-primary">
            Finances
          </a>
          <span className="text-slate-500 dark:text-slate-600">/</span>
          <span className="font-semibold text-primary">Paiements Livreurs en Attente</span>
        </nav>

        {/* Page Heading & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Paiements Livreurs en Attente
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Gérez et validez les soldes en attente pour vos livreurs partenaires.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-lg">download</span>
              Exporter CSV
            </button>
            <button
              onClick={handlePaySelected}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              Payer la sélection ({selectedPayments.length})
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-slate-500">person_search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par nom de livreur"
              className="bg-transparent border-none focus:ring-0 text-sm w-full p-0 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-slate-500">calendar_today</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm pr-8 py-0 text-slate-900 dark:text-white"
            >
              <option value="all">Toutes les périodes</option>
              <option value="week1">Semaine 1, Oct 2023</option>
              <option value="week2">Semaine 2, Oct 2023</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-slate-500">payments</span>
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm pr-8 py-0 text-slate-900 dark:text-white"
            >
              <option value="all">Tous les montants</option>
              <option value="low">&lt; 200 000 FCFA</option>
              <option value="medium">200 000 - 300 000 FCFA</option>
              <option value="high">&gt; 300 000 FCFA</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedPayments.length === payments.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Livreur
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Montant à régler
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Livraisons
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {payments.map((payment) => {
                  const isSelected = selectedPayments.includes(payment.id);
                  return (
                    <tr
                      key={payment.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectPayment(payment.id)}
                          className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {getInitials(payment.driverName)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{payment.driverName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">ID: {payment.driverId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{payment.period}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {payment.deliveries} livraisons
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PendingDriverPayments;
