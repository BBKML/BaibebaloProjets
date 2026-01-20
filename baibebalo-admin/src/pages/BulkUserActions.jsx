import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { exportToCSV } from '../utils/export';
import toast from 'react-hot-toast';

const BulkUserActions = () => {
  const [selectedUsers, setSelectedUsers] = useState([1, 2, 3]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Mock data
  const users = [
    {
      id: 1,
      name: 'Jean Dupont',
      email: 'j.dupont@email.com',
      status: 'active',
      lastActivity: 'Il y a 2 heures',
      role: 'Client Premium',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTAohmEp89J6CjmFkhOYuOgUddz5D8z2le7CpYQVw2bHqMYpN5S_-SxHnXfHg4gUgHUZ7z0l1UQ3ZPREjj6NZsP3C3vUakB4t3YEogxvoINWiBn04Y_6A8JHxDNUaAjA6v7ut2lPJ2iHjxjrZYRpT2Gxp8gUjS_1o5m_OLYAxULtXegE1EYlg7I7_QKeZVR08Rh1bu2uf6oOaGTFRIuHLMdJFDZUUYwvEl0QR2XBs00MCxRHQOiI2-ZSNqVb8TSNGtX6HqzdArFFng',
    },
    {
      id: 2,
      name: 'Marie Curie',
      email: 'm.curie@science.fr',
      status: 'paused',
      lastActivity: 'Il y a 1 jour',
      role: 'Chercheur',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlIujucK52JZIzMPlIQi4dwJwYE1AnCTrcKBEMo41Ly4yAkJ9PJL45Qzh8lfgeIulcsRgElJxmfLlG_qvaGKfvO3ey0lQwxrt4wLZYd2DIMQmZckyjRpdFRujfsjX5a_1UmHbEuQ6ZeW-y3mufbm4nMWcAwnbCoXd9V0GzMVQMt8fd2XbYKKFnOSaJjmteeP7rPjyoKhVdhRWRYQ9dwy17EV-7OPonaYDSfikv4olQS82vOYIpjzpMbx66-zvKYMFuLCtPcDwqw2AF',
    },
    {
      id: 3,
      name: 'Lucas Martin',
      email: 'l.martin@provider.com',
      status: 'suspended',
      lastActivity: 'Il y a 3 jours',
      role: 'Client Standard',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6ILqQaAdyEYeMftf71PAHtFgAN8XZMkvNbLDTmsa0GMt3_r6GWWRv4E7Zmh4aRYsYss4HMwx6it7WQ0CJc2pInXUfZ7JPbz13vOYFEM5Np5A-8EtvD38oYJsFaY891O1_L_48DNGwhctcmPk3kF1x5AEOILqGOPbXEALdHfUuoX2vy-APV6kfWRjpvDBvYkgwYgXHN5dPfWMYqZZrrNGG0aStGmrKOxdy1zh3oNj_hFNyovW0rncz6K7fJM65BfoLBwX-4pDVPZwM',
    },
    {
      id: 4,
      name: 'Sophie Bernard',
      email: 's.bernard@mail.fr',
      status: 'active',
      lastActivity: 'Il y a 5 heures',
      role: 'Client Premium',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTAohmEp89J6CjmFkhOYuOgUddz5D8z2le7CpYQVw2bHqMYpN5S_-SxHnXfHg4gUgHUZ7z0l1UQ3ZPREjj6NZsP3C3vUakB4t3YEogxvoINWiBn04Y_6A8JHxDNUaAjA6v7ut2lPJ2iHjxjrZYRpT2Gxp8gUjS_1o5m_OLYAxULtXegE1EYlg7I7_QKeZVR08Rh1bu2uf6oOaGTFRIuHLMdJFDZUUYwvEl0QR2XBs00MCxRHQOiI2-ZSNqVb8TSNGtX6HqzdArFFng',
    },
  ];

  const getStatusConfig = (status) => {
    const configs = {
      active: {
        label: 'Actif',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500',
      },
      paused: {
        label: 'En pause',
        className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
        dot: 'bg-slate-500',
      },
      suspended: {
        label: 'Suspendu',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        dot: 'bg-red-500',
      },
    };
    return configs[status] || configs.active;
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setShowBulkActions(selectedUsers.length > 0);
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
      setShowBulkActions(false);
    } else {
      setSelectedUsers(users.map((u) => u.id));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action) => {
    if (action === 'Exporter') {
      try {
        if (selectedUsers.length === 0) {
          toast.error('Veuillez sélectionner au moins un utilisateur');
          return;
        }

        const selectedUsersData = users.filter(u => selectedUsers.includes(u.id));
        const exportData = selectedUsersData.map(user => ({
          'ID': user.id,
          'Nom': user.name,
          'Email': user.email,
          'Statut': getStatusConfig(user.status).label,
          'Dernière Activité': user.lastActivity,
          'Rôle': user.role,
        }));

        exportToCSV(exportData, `utilisateurs-export-${new Date().toISOString().split('T')[0]}.csv`);
        toast.success(`Export CSV de ${selectedUsers.length} utilisateur(s) réussi !`);
        setSelectedUsers([]);
        setShowBulkActions(false);
      } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        toast.error('Erreur lors de l\'export');
      }
    } else {
      toast.success(`${action} appliqué à ${selectedUsers.length} utilisateur(s)`);
      setSelectedUsers([]);
      setShowBulkActions(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'Tous les clients', count: 1248, icon: 'group' },
    { id: 'active', label: 'Actifs', count: 1120, icon: 'check_circle' },
    { id: 'suspended', label: 'Suspendus', count: 45, icon: 'block' },
    { id: 'new', label: 'Nouveaux', count: 83, icon: 'bolt' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Breadcrumbs & Heading */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <span className="hover:text-primary cursor-pointer">Admin</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="hover:text-primary cursor-pointer">Gestion Utilisateurs</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900 dark:text-white font-medium">Actions en Masse</span>
          </div>
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
        </div>

        {/* Filters & Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                {tab.label}
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] ml-1">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email ou ID..."
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
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
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20 h-4 w-4"
                    />
                  </th>
                  <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                    Statut
                  </th>
                  <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Dernière Connexion
                  </th>
                  <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => {
                  const statusConfig = getStatusConfig(user.status);
                  const isSelected = selectedUsers.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors group ${
                        isSelected
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectUser(user.id)}
                          className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20 h-4 w-4"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="size-10 rounded-full bg-cover bg-center border border-slate-300 dark:border-slate-600"
                            style={{ backgroundImage: user.avatar ? `url("${user.avatar}")` : undefined }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">{user.role}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : user.status === 'paused'
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{user.lastActivity}</td>
                      <td className="p-4 text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Bulk Action Bar (Contextual) */}
        {selectedUsers.length > 0 && (
          <div className="mb-6 sticky top-20 z-40">
            <div className="bg-primary shadow-xl shadow-primary/20 rounded-xl p-4 flex flex-wrap items-center justify-between text-white border border-white/10">
              <div className="flex items-center gap-4 px-2">
                <div className="size-6 bg-white/20 rounded flex items-center justify-center">
                  <input
                    checked={selectedUsers.length === users.length}
                    onChange={handleSelectAll}
                    className="rounded border-none text-primary focus:ring-0"
                    type="checkbox"
                  />
                </div>
                <span className="font-bold text-sm tracking-wide">
                  {selectedUsers.length} UTILISATEUR{selectedUsers.length > 1 ? 'S' : ''} SÉLECTIONNÉ{selectedUsers.length > 1 ? 'S' : ''}
                </span>
                <button
                  onClick={() => {
                    setSelectedUsers([]);
                    setShowBulkActions(false);
                  }}
                  className="text-xs text-white/70 hover:text-white underline font-medium"
                >
                  Tout désélectionner
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('Exporter')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  EXPORTER CSV
                </button>
                <button
                  onClick={() => handleBulkAction('Suspendre')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors border border-white/5"
                >
                  <span className="material-symbols-outlined text-lg">person_off</span>
                  SUSPENDRE
                </button>
                <button
                  onClick={() => handleBulkAction('Activer')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg text-xs font-black transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/10"
                >
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                  ACTIVER LES COMPTES
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BulkUserActions;
