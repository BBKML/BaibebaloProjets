import { useState } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const PromotionalBanners = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [banners] = useState([
    {
      id: 1,
      title: 'Promo Burger Week 2024',
      target: 'client',
      dateRange: '01/10 - 07/10',
      status: 'active',
      rank: 1,
      image: 'https://via.placeholder.com/1200x400',
    },
    {
      id: 2,
      title: 'Livreur Bonus Weekend',
      target: 'livreur',
      dateRange: 'Permanent',
      status: 'active',
      rank: 2,
      image: 'https://via.placeholder.com/1200x400',
    },
    {
      id: 3,
      title: 'Campagne Parrainage',
      target: 'all',
      dateRange: 'Démarre le 15/10',
      status: 'scheduled',
      rank: 3,
      image: 'https://via.placeholder.com/1200x400',
    },
  ]);

  const [formData, setFormData] = useState({
    title: '',
    target: 'all',
    startDate: '',
    endDate: '',
    redirectUrl: '',
    image: null,
  });

  const handleCreate = () => {
    toast.success('Bannière créée avec succès');
  };

  const handleEdit = (bannerId) => {
    toast.success(`Modification de la bannière ${bannerId}`);
  };

  const handleDelete = (bannerId) => {
    if (globalThis.confirm('Êtes-vous sûr de vouloir supprimer cette bannière ?')) {
      toast.success(`Bannière ${bannerId} supprimée`);
    }
  };

  const getTargetBadgeColor = (target) => {
    switch (target) {
      case 'client':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'livreur':
        return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'restaurant':
        return 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 -mx-8 -mt-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <a className="hover:text-primary" href="#">
                  Admin
                </a>
                <span>/</span>
                <a className="hover:text-primary" href="#">
                  Marketing
                </a>
                <span>/</span>
                <span className="text-slate-900 dark:text-white">Gestion des Bannières</span>
              </nav>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestion des Bannières
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden lg:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-lg">
                  search
                </span>
                <input
                  className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20"
                  placeholder="Rechercher une bannière..."
                  type="text"
                />
              </div>
              <button
                onClick={handleCreate}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Ajouter une Bannière
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Banner List & Filters */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filters/Tabs */}
            <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex w-fit">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-6 py-2 text-sm transition-colors rounded-lg ${
                  activeFilter === 'all'
                    ? 'font-bold bg-primary text-white'
                    : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setActiveFilter('client')}
                className={`px-6 py-2 text-sm transition-colors rounded-lg ${
                  activeFilter === 'client'
                    ? 'font-bold bg-primary text-white'
                    : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Clients
              </button>
              <button
                onClick={() => setActiveFilter('restaurant')}
                className={`px-6 py-2 text-sm transition-colors rounded-lg ${
                  activeFilter === 'restaurant'
                    ? 'font-bold bg-primary text-white'
                    : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Restaurants
              </button>
              <button
                onClick={() => setActiveFilter('livreur')}
                className={`px-6 py-2 text-sm transition-colors rounded-lg ${
                  activeFilter === 'livreur'
                    ? 'font-bold bg-primary text-white'
                    : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Livreurs
              </button>
            </div>

            {/* Drag & Drop List */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
                Bannières Actives (Glisser pour ordonner)
              </p>
              {banners.map((banner) => {
                const isScheduled = banner.status === 'scheduled';
                return (
                  <div
                    key={banner.id}
                    className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:shadow-lg hover:shadow-primary/5 transition-all ${
                      banner.rank === 1 ? 'border-l-4 border-l-primary' : ''
                    } ${isScheduled ? 'opacity-75 grayscale-[0.5]' : ''}`}
                  >
                    <div className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing">
                      <span className="material-symbols-outlined">drag_indicator</span>
                    </div>
                    <div className="size-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${banner.image})` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{banner.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getTargetBadgeColor(banner.target)}`}>
                          {banner.target === 'all' ? 'Tous' : banner.target === 'client' ? 'Client' : banner.target === 'livreur' ? 'Livreur' : 'Restaurant'}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                          <span className="material-symbols-outlined text-xs">
                            {banner.dateRange === 'Permanent' ? 'all_inclusive' : 'calendar_today'}
                          </span>
                          {banner.dateRange}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end mr-4">
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            banner.status === 'active'
                              ? 'text-emerald-500'
                              : banner.status === 'scheduled'
                              ? 'text-amber-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {banner.status === 'active' ? 'Actif' : banner.status === 'scheduled' ? 'Planifié' : 'Inactif'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Rang #{banner.rank}</span>
                      </div>
                      <button
                        onClick={() => handleEdit(banner.id)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Creation Form */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm sticky top-32 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Détails de la Bannière</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Configurez votre nouveau visuel marketing</p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Image de la bannière
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900/50 hover:border-primary transition-colors cursor-pointer group">
                    <span className="material-symbols-outlined text-4xl text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">
                      cloud_upload
                    </span>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Cliquez pour uploader (1200x400px)
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">JPG, PNG jusqu'à 2MB</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-900 dark:text-white">Titre de la bannière</label>
                    <input
                      className="w-full px-4 py-2.5 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary/20"
                      placeholder="ex: Solde d'hiver"
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-900 dark:text-white">Cible</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary/20"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    >
                      <option value="all">Tous les utilisateurs</option>
                      <option value="client">Clients uniquement</option>
                      <option value="restaurant">Restaurants</option>
                      <option value="livreur">Livreurs</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-900 dark:text-white">Lien de redirection</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-lg">
                        link
                      </span>
                      <input
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary/20"
                        placeholder="https://baibebalo.com/promo"
                        type="text"
                        value={formData.redirectUrl}
                        onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Date début</label>
                      <input
                        className="w-full px-3 py-2 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary/20"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Date fin</label>
                      <input
                        className="w-full px-3 py-2 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:border-primary focus:ring-primary/20"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Publier la Bannière
                </button>
                <button className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PromotionalBanners;
