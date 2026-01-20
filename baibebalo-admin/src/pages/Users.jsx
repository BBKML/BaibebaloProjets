import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { usersAPI } from '../api/users';
import { formatCurrency } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

const Users = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkReason, setBulkReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersAPI.getUsers(filters),
  });

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || {};

  // Gérer la sélection d'utilisateurs
  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  // Gérer les actions en masse
  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      toast.error('Veuillez sélectionner une action et des utilisateurs');
      return;
    }

    setIsProcessing(true);
    try {
      await usersAPI.bulkActionUsers(selectedUsers, bulkAction, bulkReason);
      toast.success(`${selectedUsers.length} utilisateur(s) ${bulkAction === 'suspend' ? 'suspendu(s)' : bulkAction === 'activate' ? 'activé(s)' : 'supprimé(s)'}`);
      setSelectedUsers([]);
      setShowBulkModal(false);
      setBulkAction(null);
      setBulkReason('');
      queryClient.invalidateQueries(['users']);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'action en masse');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Liste des Utilisateurs</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez tous les utilisateurs de la plateforme</p>
          </div>
          <TableSkeleton rows={10} columns={6} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Erreur lors du chargement</h3>
          <p className="text-red-700 dark:text-red-300 mt-2">{error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Liste des Utilisateurs</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez tous les utilisateurs de la plateforme</p>
          </div>
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectedUsers.length} sélectionné(s)
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined">more_vert</span>
                  <span className="text-sm font-semibold">Actions en masse</span>
                </button>
                {showBulkActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                    <button
                      onClick={() => {
                        setBulkAction('suspend');
                        setShowBulkModal(true);
                        setShowBulkActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Suspendre
                    </button>
                    <button
                      onClick={() => {
                        setBulkAction('activate');
                        setShowBulkModal(true);
                        setShowBulkActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Activer
                    </button>
                    <button
                      onClick={() => {
                        setBulkAction('delete');
                        setShowBulkModal(true);
                        setShowBulkActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-4">Utilisateur</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Téléphone</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
                    const isActive = user.status === 'active';
                    const isSelected = selectedUsers.includes(user.id);
                    
                    return (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                        onClick={() => navigate(`/users/${user.id}`)}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                              {initials || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-slate-500">ID: #{user.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {user.phone || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {user.role || 'Client'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            isActive 
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500'
                              : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500'
                          }`}>
                            {isActive ? 'Actif' : 'Suspendu'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => navigate(`/users/${user.id}`)}
                            className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors"
                          >
                            visibility
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

        {/* Modal Actions en Masse */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                {bulkAction === 'suspend' && 'Suspendre les utilisateurs'}
                {bulkAction === 'activate' && 'Activer les utilisateurs'}
                {bulkAction === 'delete' && 'Supprimer les utilisateurs'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Vous êtes sur le point de {bulkAction === 'suspend' ? 'suspendre' : bulkAction === 'activate' ? 'activer' : 'supprimer'} {selectedUsers.length} utilisateur(s).
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Raison (optionnel)
                </label>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  rows={3}
                  placeholder="Ex: Violation des conditions d'utilisation..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkAction(null);
                    setBulkReason('');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={isProcessing}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    bulkAction === 'delete'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-primary text-white hover:bg-primary/90'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isProcessing ? 'Traitement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Users;
