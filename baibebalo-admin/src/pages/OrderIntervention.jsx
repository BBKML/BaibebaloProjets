import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

const OrderIntervention = () => {
  const [order] = useState({
    id: 'BAIB-12345',
    status: 'delayed',
    customer: {
      name: 'Jean Dupont',
      email: 'jean.dupont@email.com',
      phone: '+33 6 12 34 56 78',
      avatar: null,
    },
    restaurant: {
      name: 'Le Petit Bistrot',
      email: 'contact@petitbistrot.fr',
      address: '123 Rue de la Paix, Paris',
    },
    items: [
      { name: 'Burger Classic', quantity: 1, price: 15.5 },
      { name: 'Fries', quantity: 1, price: 4.5 },
      { name: 'Coca-Cola', quantity: 1, price: 3.0 },
    ],
    timeline: [
      { step: 'Placed', time: '12:30 PM', completed: true },
      { step: 'Preparing', time: '12:45 PM', completed: true },
      { step: 'On Route', time: 'Currently', completed: false, current: true },
    ],
  });

  const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleReassign = () => {
    toast.success('Réassignation du livreur en cours...');
  };

  const handleCancel = () => {
    if (globalThis.confirm(`Êtes-vous sûr de vouloir annuler la commande ${order.id} ?`)) {
      toast.success(`Commande ${order.id} annulée`);
    }
  };

  const handleContact = () => {
    toast.success('Contact du client en cours...');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Détails Commande & Intervention
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Commande #{order.id}</p>
          </div>
          {order.status === 'delayed' && (
            <span className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              En retard
            </span>
          )}
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Customer Info</h2>
            <div className="flex items-start gap-4">
              {order.customer.avatar ? (
                <div
                  className="size-16 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${order.customer.avatar})` }}
                />
              ) : (
                <div className="size-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xl font-black">
                  {order.customer.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900 dark:text-white mb-2">{order.customer.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{order.customer.email}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{order.customer.phone}</p>
              </div>
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Restaurant Info</h2>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white mb-2">{order.restaurant.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{order.restaurant.address}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{order.restaurant.email}</p>
            </div>
          </div>
        </div>

        {/* Ordered Items */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ordered Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-center">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-center">
                      {item.quantity}x
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white text-right">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td colSpan="2" className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white text-right">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Timeline & Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Timeline & Actions</h2>

          {/* Timeline */}
          <div className="mb-8">
            <div className="space-y-4">
              {order.timeline.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-primary text-white'
                          : step.current
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {step.completed ? (
                        <span className="material-symbols-outlined text-sm">check</span>
                      ) : step.current ? (
                        <span className="material-symbols-outlined text-sm">directions_walk</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">circle</span>
                      )}
                    </div>
                    {index < order.timeline.length - 1 && (
                      <div className="w-0.5 h-12 bg-slate-200 dark:bg-slate-700 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{step.step}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {step.time}
                      {step.current && <span className="ml-2 text-orange-500">(Currently)</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-2 border-red-200 dark:border-red-900/30 rounded-lg p-6 bg-red-50 dark:bg-red-900/10">
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={handleReassign}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition-colors"
              >
                Réassigner Livreur
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
              >
                Annuler Commande
              </button>
              <button
                onClick={handleContact}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors"
              >
                Contacter Client
              </button>
            </div>
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              Action required for delayed order #{order.id}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderIntervention;
