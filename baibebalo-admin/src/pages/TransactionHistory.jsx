import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';
import toast from 'react-hot-toast';
import TransactionHistorySkeleton from '../components/common/TransactionHistorySkeleton';

const TransactionHistory = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [period, setPeriod] = useState('30days');

  const [transactions] = useState([
    {
      id: 'TXN-492-9921',
      date: '24 Oct 2023',
      time: '14:32:01',
      type: 'commission',
      description: 'Order #88392 Commission payout',
      amount: 124.5,
      status: 'completed',
    },
    {
      id: 'TXN-492-9922',
      date: '24 Oct 2023',
      time: '11:15:45',
      type: 'payment',
      description: 'Restaurant payment for Order #88391',
      amount: 450.0,
      status: 'completed',
    },
    {
      id: 'TXN-492-9923',
      date: '23 Oct 2023',
      time: '16:20:12',
      type: 'withdrawal',
      description: 'Driver withdrawal request',
      amount: -120.0,
      status: 'pending',
    },
    {
      id: 'TXN-492-9924',
      date: '23 Oct 2023',
      time: '09:45:33',
      type: 'refund',
      description: 'Refund for Order #88385',
      amount: -89.5,
      status: 'completed',
    },
  ]);

  const handleExport = () => {
    try {
      const exportData = transactions.map(txn => ({
        'ID Transaction': txn.id,
        'Date': txn.date,
        'Heure': txn.time,
        'Type': txn.type,
        'Description': txn.description,
        'Montant': formatCurrency(Math.abs(txn.amount)),
        'Statut': txn.status,
      }));

      exportToCSV(exportData, `historique-transactions-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'commission':
        return 'monetization_on';
      case 'payment':
        return 'payments';
      case 'withdrawal':
        return 'account_balance_wallet';
      case 'refund':
        return 'undo';
      default:
        return 'receipt';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'commission':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'payment':
        return 'bg-primary/10 text-primary';
      case 'withdrawal':
        return 'bg-orange-500/10 text-orange-500';
      case 'refund':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const filteredTransactions = activeFilter === 'all' ? transactions : transactions.filter((t) => t.type === activeFilter);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Historique Complet des Transactions
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Phase 4 Completion Finances • Data-heavy oversight
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV/Excel
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Total Commissions
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(12450)}</h3>
              <span className="text-emerald-500 text-sm font-bold flex items-center">
                <span className="material-symbols-outlined text-sm mr-1">trending_up</span>+12%
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Total Payments
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(45200)}</h3>
              <span className="text-emerald-500 text-sm font-bold flex items-center">
                <span className="material-symbols-outlined text-sm mr-1">trending_up</span>+5%
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Total Withdrawals
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(8900)}</h3>
              <span className="text-red-500 text-sm font-bold flex items-center">
                <span className="material-symbols-outlined text-sm mr-1">trending_down</span>-2%
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Total Refunds
            </p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(1200)}</h3>
              <span className="text-emerald-500 text-sm font-bold flex items-center">
                <span className="material-symbols-outlined text-sm mr-1">trending_up</span>+0.5%
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 flex flex-wrap items-center gap-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  search
                </span>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-slate-500"
                  placeholder="Search by description or transaction ID..."
                  type="text"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-semibold border border-transparent hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span>Last 30 Days</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-semibold border border-transparent hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-lg">payments</span>
                <span>Amount Range</span>
              </button>
            </div>
          </div>
          <div className="p-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="text-xs font-bold text-slate-500 px-3 uppercase tracking-widest">Filter:</span>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                activeFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setActiveFilter('commission')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                activeFilter === 'commission'
                  ? 'bg-primary text-white'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Commissions
            </button>
            <button
              onClick={() => setActiveFilter('payment')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                activeFilter === 'payment'
                  ? 'bg-primary text-white'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveFilter('withdrawal')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                activeFilter === 'withdrawal'
                  ? 'bg-primary text-white'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Withdrawals
            </button>
            <button
              onClick={() => setActiveFilter('refund')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                activeFilter === 'refund'
                  ? 'bg-primary text-white'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Refunds
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{transaction.date}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{transaction.time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-7 rounded ${getTypeColor(transaction.type)} flex items-center justify-center`}
                        >
                          <span className="material-symbols-outlined text-sm">{getTypeIcon(transaction.type)}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                          {transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {transaction.id}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-bold ${
                          transaction.amount >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusBadge(transaction.status)}`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="material-symbols-outlined text-slate-500 dark:text-slate-400 hover:text-primary">
                        more_vert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TransactionHistory;
