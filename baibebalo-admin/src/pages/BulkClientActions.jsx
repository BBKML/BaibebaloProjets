import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { exportToCSV } from '../utils/export';
import toast from 'react-hot-toast';

const BulkClientActions = () => {
  const [selectedClients, setSelectedClients] = useState(['client-1']);
  const [activeTab, setActiveTab] = useState('all');

  const [clients] = useState([
    {
      id: 'client-1',
      name: 'Jean Dupont',
      email: 'j.dupont@email.com',
      status: 'active',
      lastActivity: 'Il y a 2 heures',
      role: 'Client Premium',
      avatar: 'https://via.placeholder.com/40',
    },
    {
      id: 'client-2',
      name: 'Marie Koné',
      email: 'm.kone@email.com',
      status: 'active',
      lastActivity: 'Il y a 5 heures',
      role: 'Client Standard',
      avatar: null,
    },
    {
      id: 'client-3',
      name: 'Amadou Diallo',
      email: 'a.diallo@email.com',
      status: 'suspended',
      lastActivity: 'Il y a 3 jours',
      role: 'Client Standard',
      avatar: null,
    },
  ]);

  const handleToggleClient = (clientId) => {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map((c) => c.id));
    }
  };

  const handleBulkAction = (action) => {
    if (selectedClients.length === 0) {
      toast.error('Veuillez sélectionner au moins un client');
      return;
    }
    toast.success(`${action} appliqué à ${selectedClients.length} client(s)`);
  };

  const handleExport = () => {
    try {
      if (selectedClients.length === 0) {
        toast.error('Veuillez sélectionner au moins un client');
        return;
      }

      const selectedClientsData = clients.filter(c => selectedClients.includes(c.id));
      const exportData = selectedClientsData.map(client => ({
        'ID': client.id,
        'Nom': client.name,
        'Email': client.email,
        'Statut': client.status === 'active' ? 'Actif' : client.status === 'suspended' ? 'Suspendu' : 'En attente',
        'Dernière Activité': client.lastActivity,
        'Rôle': client.role,
      }));

      exportToCSV(exportData, `clients-export-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`Export CSV de ${selectedClients.length} client(s) réussi !`);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspended':
        return 'Suspendu';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  const filteredClients =
    activeTab === 'all'
      ? clients
      : activeTab === 'active'
      ? clients.filter((c) => c.status === 'active')
      : activeTab === 'suspended'
      ? clients.filter((c) => c.status === 'suspended')
      : clients.filter((c) => c.status === 'pending');

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Actions en Masse - Clients
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
              Visualisez et gérez votre base d'utilisateurs. Sélectionnez plusieurs lignes pour appliquer des
              modifications groupées instantanément.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-lg">filter_list</span>
              Filtres Avancés
            </button>
            <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all">
              <span className="material-symbols-outlined text-lg">person_add</span>
              Nouveau Client
            </button>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">group</span>
              Tous les clients
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] ml-1">
                {clients.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'active'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Actifs
            </button>
            <button
              onClick={() => setActiveTab('suspended')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'suspended'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">block</span>
              Suspendus
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'new'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">bolt</span>
              Nouveaux
            </button>
          </div>
          <div className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-500"
                placeholder="Rechercher par nom, email ou ID..."
                type="text"
              />
            </div>
            <select className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-3 pr-10 text-sm focus:ring-1 focus:ring-primary text-slate-500 dark:text-slate-400">
              <option>Rôle: Tous</option>
              <option>Client</option>
              <option>Partenaire</option>
              <option>Admin</option>
            </select>
            <button className="p-2.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <span className="material-symbols-outlined">sync</span>
            </button>
          </div>
        </div>


        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input
                      checked={selectedClients.length === clients.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-600 bg-transparent text-primary focus:ring-primary h-4 w-4"
                      type="checkbox"
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Dernière Activité
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClients.map((client) => {
                  const isSelected = selectedClients.includes(client.id);
                  return (
                    <tr
                      key={client.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-primary/5 dark:bg-primary/5'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      } row-hover`}
                    >
                      <td className="px-6 py-4">
                        <input
                          checked={isSelected}
                          onChange={() => handleToggleClient(client.id)}
                          className="rounded border-slate-300 dark:border-slate-600 bg-transparent text-primary focus:ring-primary h-4 w-4"
                          type="checkbox"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {client.avatar ? (
                            <div
                              className="size-10 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-700"
                              style={{ backgroundImage: `url(${client.avatar})` }}
                            />
                          ) : (
                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                              {client.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{client.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{client.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(client.status)}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              client.status === 'active'
                                ? 'bg-emerald-500'
                                : client.status === 'suspended'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {getStatusLabel(client.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
                        {client.lastActivity}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {client.role}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-xl">more_vert</span>
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

      {/* Floating Bulk Action Bar - Fixed Bottom */}
      {selectedClients.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
                <span className="text-sm font-black">{selectedClients.length}</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">
                  {selectedClients.length} Client{selectedClients.length > 1 ? 's' : ''} sélectionné{selectedClients.length > 1 ? 's' : ''}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-primary font-black">Actions Groupées</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span className="hidden md:inline">Export CSV</span>
              </button>
              <button
                onClick={() => handleBulkAction('Notification')}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">campaign</span>
                <span>Notification</span>
              </button>
              <button
                onClick={() => handleBulkAction('Suspendre')}
                className="bg-orange-500 hover:bg-orange-500/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">block</span>
                <span>Suspendre</span>
              </button>
            </div>
            <button
              onClick={() => setSelectedClients([])}
              className="absolute -top-3 -right-3 h-8 w-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors shadow-lg"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BulkClientActions;
