import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';

const PaymentDetails = () => {
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [payments] = useState([
    {
      id: 'PAY-001',
      orderId: 'ORD-2024-001',
      customer: 'Jean Dupont',
      restaurant: 'Le Petit Bistro',
      amount: 12500,
      method: 'mobile_money',
      provider: 'Orange Money',
      status: 'completed',
      date: new Date('2024-01-23T14:32:00'),
      transactionId: 'TXN-492-9921',
      fees: 250,
      netAmount: 12250,
    },
    {
      id: 'PAY-002',
      orderId: 'ORD-2024-002',
      customer: 'Marie Koné',
      restaurant: 'Pizza Express',
      amount: 8900,
      method: 'cash',
      provider: null,
      status: 'pending',
      date: new Date('2024-01-23T11:15:00'),
      transactionId: null,
      fees: 0,
      netAmount: 8900,
    },
  ]);

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'mobile_money':
        return 'smartphone';
      case 'cash':
        return 'account_balance_wallet';
      case 'card':
        return 'credit_card';
      default:
        return 'payments';
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'mobile_money':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'cash':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'card':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      default:
        return status;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Analyse Paiements - Vue Détaillée
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Détails complets de chaque transaction de paiement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtres
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-sm">download</span>
              Exporter
            </button>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Transactions Récentes</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {payments.map((payment) => (
              <button
                key={payment.id}
                type="button"
                className="w-full text-left p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                onClick={() => handleViewDetails(payment)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`size-12 ${getMethodColor(payment.method)} rounded-lg flex items-center justify-center`}
                    >
                      <span className="material-symbols-outlined text-2xl">{getMethodIcon(payment.method)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{payment.id}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusBadge(payment.status)}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {payment.customer} • {payment.restaurant}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {payment.date.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </p>
                    {payment.method === 'mobile_money' && payment.fees > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Frais: {formatCurrency(payment.fees)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Details Modal/Expanded View */}
        {selectedPayment && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Détails de la Transaction {selectedPayment.id}
              </h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Informations Commande
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">ID Commande:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedPayment.orderId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Client:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedPayment.customer}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Restaurant:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedPayment.restaurant}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Méthode de Paiement
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Type:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                        {selectedPayment.method === 'mobile_money' ? 'Mobile Money' : selectedPayment.method}
                      </span>
                    </div>
                    {selectedPayment.provider && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Fournisseur:</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {selectedPayment.provider}
                        </span>
                      </div>
                    )}
                    {selectedPayment.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Transaction ID:</span>
                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                          {selectedPayment.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Montants
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Montant Total:</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCurrency(selectedPayment.amount)}
                      </span>
                    </div>
                    {selectedPayment.fees > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Frais:</span>
                        <span className="text-sm font-bold text-red-500">-{formatCurrency(selectedPayment.fees)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Montant Net:</span>
                      <span className="text-lg font-bold text-emerald-500">
                        {formatCurrency(selectedPayment.netAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Date & Statut
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Date:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedPayment.date.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Statut:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusBadge(selectedPayment.status)}`}
                      >
                        {getStatusLabel(selectedPayment.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PaymentDetails;
