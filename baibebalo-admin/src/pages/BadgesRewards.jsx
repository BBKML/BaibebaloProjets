import { useState } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const BadgesRewards = () => {
  const [badges] = useState([
    {
      id: 1,
      name: 'Super Driver',
      icon: 'star_rate',
      color: 'primary',
      description: 'Note > 4.8 & 100+ livraisons sans incident.',
      holders: 420,
    },
    {
      id: 2,
      name: 'Speed Star',
      icon: 'speed',
      color: 'emerald',
      description: 'Moyenne de livraison inférieure à 25 minutes.',
      holders: 156,
    },
    {
      id: 3,
      name: 'Eco-Champion',
      icon: 'eco',
      color: 'accent',
      description: 'Utilisation de véhicule électrique sur 50+ trajets.',
      holders: 89,
    },
    {
      id: 4,
      name: 'Night Owl',
      icon: 'nightlight',
      color: 'purple',
      description: '50+ livraisons entre 22h et 6h.',
      holders: 67,
    },
  ]);

  const [activities] = useState([
    {
      id: 1,
      driver: 'Moussa B.',
      badge: 'Super Driver',
      badgeColor: 'primary',
      date: "Aujourd'hui, 14:30",
      author: 'Par Admin Jean',
      type: 'manual',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3PhFIjrg2quqU2RuvsIMl-yEDiRS2-w_8OsEa_NR-EvbvmNPPhPTQ7iPZACi_pqo99OH-FC5RXv-b_B6USBHag7yQxLjl-aZwbRB-gNWXHrL0EjCq3qv0TCNvFG1k0pVDM8MsrI-NP8z__SsXZOrSgT3yAW3Er21-u_6CMKouKZdCJ31w79dldniJVF9FcbuaQMw_kWJ9Ti3lbs8Cu6_Fsr5nmKPdpT8FOdsqneehzu9ezcRo5gLqKtFX6iDf2fx01fqeBRxDFGFy',
    },
    {
      id: 2,
      driver: 'Fatou D.',
      badge: 'Speed Star',
      badgeColor: 'emerald',
      date: "Aujourd'hui, 11:15",
      author: 'Automatique',
      type: 'auto',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQQd-okP4EclIhVtmv5c5X5TOL2-lk84_GceJrMajSF89iJ_91bOxxRnIL1guw0-TaYsKocS8vr6ipJb_pcilG9Mgce5PvArUYi0uYWXw_QFazKK2E51v521ATOFu5zietjpK601qt-8w_xPlKzWLDCfUbEmSMmC4O2mx47P8i7Y9spUyL7fnQb4COToq8LFZG511WcZjWLlxJWs5mDLW826cDcSPsLIIMjw7nDRbi_PbJgY4vCPK0QPGV8Z8Xe24GsIcTznWv0fDD',
    },
    {
      id: 3,
      driver: 'Koffi A.',
      badge: 'Eco-Champion',
      badgeColor: 'accent',
      date: 'Hier, 18:45',
      author: 'Par Admin Marie',
      type: 'manual',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSXCQ_KAQ2ICWpsM2NQa2raXOFIRB1X8CpDlcIkF8L0ypPB1pXD1eJbznVq_Pog4aRW6XGcEh5UYhHDhIjppkb2APrKI0c0srfSr3KNL8Su081EoDCatarSBuJJRshl2CoXi8BilMEXGv8Ph06MSpU3fksWlWiAAReo_lVdzcX_0I1Bd64IDnMutgfbtIDDtXIRgNfqPqWEDWKdYmorQgWKteST_zl3cm17tYMi_s2Bh9T-YCzzlCUm7xJ-R_gXiyXn6AuNuss6bHi',
    },
    {
      id: 4,
      driver: 'Idriss S.',
      badge: 'Super Driver',
      badgeColor: 'primary',
      date: 'Hier, 16:20',
      author: 'Par Admin Jean',
      type: 'manual',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZOh1DgdolXwyX6TGmYJb3GxhD_A5JgMSwdoQjajNgGxstbf0I01Cj6MaPe8Jw-MjYtxBGpcl0H_RjlJWC9Z0bgTw6jAcck-Zly-MdPp_eC_o4rhBMji0pZwJPrgRxO4B0Ct0oFwfW-thUAY3iZZKIxAIHD6-fa2b56eaT29lhyKItMsboC_mCmzKmwXgoXhk7rOSdCl4luaSvN7rzpQ5LzlO_Oz4FCE36sIaSZTcaAAL0g62TqTtN0---6Fndrbvgv9BwWqrAVyvg',
    },
  ]);

  const handleCreate = () => {
    toast.success('Badge créé avec succès');
  };

  const handleReward = () => {
    toast.success('Récompense attribuée');
  };

  const getColorClasses = (color) => {
    const colors = {
      primary: 'bg-primary/20 text-primary',
      emerald: 'bg-emerald-500/20 text-emerald-500',
      accent: 'bg-orange-500/20 text-orange-500',
      purple: 'bg-purple-500/20 text-purple-500',
    };
    return colors[color] || colors.primary;
  };

  const getBadgeColorClasses = (color) => {
    const colors = {
      primary: 'border-primary text-primary',
      emerald: 'border-emerald-500 text-emerald-500',
      accent: 'border-orange-500 text-orange-500',
      purple: 'border-purple-500 text-purple-500',
    };
    return colors[color] || colors.primary;
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Badges & Récompenses</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gérez et suivez les performances de vos livreurs</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none w-64 text-sm"
                placeholder="Rechercher un badge..."
                type="text"
              />
            </div>
            <button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Créer un badge
            </button>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Badges attribués (Mois)</p>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">workspace_premium</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">1,284</h3>
              <span className="text-emerald-500 text-sm font-medium flex items-center">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                +5.4%
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Livreur du mois</p>
              <div className="w-10 h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <span className="material-symbols-outlined">emoji_events</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-cover bg-center border border-slate-700"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD8dmKgV_OmjSFRlI7-9i-cZ_KGZpRcYKPBN5l7uTzgSTb5ZgujoqTg-hiJvaMIO9RYuwuLWkb0pgGx5zBSEhlulEsyFLWlmyPzhrVA-LkiTJy8YLmssX9FSRCOpvUwRbHVnoHW3SmV-DJdNkSBcXVTplQ8YuPKNkK5x35Y7Php6coIlk4UrSXn6sZ61xHpWbZUwbF7hN6z3UhaFwxW8mgZpqgEFiuIWicHOa0D6-uzrF0FMR53IhPYwQpEOTt6dAYjLIeePp_vYD4h')",
                }}
              />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mamadou K.</h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">142 livraisons • 4.95 ⭐</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Taux d'engagement</p>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <span className="material-symbols-outlined">bolt</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">88.4%</h3>
              <span className="text-emerald-500 text-sm font-medium flex items-center">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                +2.1%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Badge Grid (Left & Center) */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Catalogue des Badges</h3>
                <button className="text-primary text-sm font-semibold hover:underline">Voir tout</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="group p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-transparent hover:border-primary transition-all cursor-pointer"
                  >
                    <div
                      className={`w-20 h-20 mx-auto mb-4 ${getColorClasses(badge.color).split(' ')[0]} rounded-full flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform`}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${
                          badge.color === 'primary'
                            ? 'from-primary/30'
                            : badge.color === 'emerald'
                            ? 'from-emerald-500/30'
                            : badge.color === 'accent'
                            ? 'from-orange-500/30'
                            : 'from-purple-500/30'
                        } to-transparent`}
                      ></div>
                      <span
                        className={`material-symbols-outlined text-4xl fill-icon ${
                          badge.color === 'primary'
                            ? 'text-primary'
                            : badge.color === 'emerald'
                            ? 'text-emerald-500'
                            : badge.color === 'accent'
                            ? 'text-orange-500'
                            : 'text-purple-500'
                        }`}
                      >
                        {badge.icon}
                      </span>
                    </div>
                    <h4 className="text-center font-bold text-slate-900 dark:text-white mb-1">{badge.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4 line-clamp-2">
                      {badge.description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Détenteurs</span>
                      <span
                        className={`text-xs font-bold ${
                          badge.color === 'primary'
                            ? 'text-primary'
                            : badge.color === 'emerald'
                            ? 'text-emerald-500'
                            : badge.color === 'accent'
                            ? 'text-orange-500'
                            : 'text-purple-500'
                        }`}
                      >
                        {badge.holders}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Assignment */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary">card_giftcard</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Récompense manuelle</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                    Sélectionner un livreur
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-primary px-4 py-2 text-sm"
                      placeholder="Nom ou ID du livreur..."
                      type="text"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      search
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                    Badge à attribuer
                  </label>
                  <select className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-primary px-4 py-2 text-sm">
                    <option>Super Driver</option>
                    <option>Speed Star</option>
                    <option>Eco-Champion</option>
                    <option>Night Owl</option>
                  </select>
                </div>
                <div className="md:col-span-2 mt-2">
                  <button
                    onClick={handleReward}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">send</span>
                    Récompenser le livreur
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* History Table (Right) */}
          <div className="xl:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Activités récentes</h3>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[600px] p-6 space-y-6 custom-scrollbar">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex-shrink-0 bg-cover bg-center ${getBadgeColorClasses(activity.badgeColor)}`}
                      style={{
                        backgroundImage: activity.avatar ? `url("${activity.avatar}")` : undefined,
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        <span className="text-slate-900 dark:text-white">{activity.driver}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          {activity.type === 'manual' ? ' a reçu le badge ' : ' a débloqué '}
                        </span>
                        <span
                          className={
                            activity.badgeColor === 'primary'
                              ? 'text-primary'
                              : activity.badgeColor === 'emerald'
                              ? 'text-emerald-500'
                              : activity.badgeColor === 'accent'
                              ? 'text-orange-500'
                              : 'text-purple-500'
                          }
                        >
                          {activity.badge}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold">
                        {activity.date} • {activity.author}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800">
                <button className="w-full text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors">
                  Charger plus d'activités
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BadgesRewards;
