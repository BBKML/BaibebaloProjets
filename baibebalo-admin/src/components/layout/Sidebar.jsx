import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import logoIcon from '../../assets/Baibebalo_icon_sans_fond_orange.png';
import { dashboardAPI } from '../../api/dashboard';

const NAV_GROUPS = [
  {
    label: 'Opérations',
    items: [
      { label: 'Tableau de bord', path: '/', icon: 'dashboard' },
      { label: 'Commandes', path: '/orders', icon: 'shopping_cart', badgeKey: 'pending_orders' },
      { label: 'Restaurants', path: '/restaurants', icon: 'restaurant', badgeKey: 'pending_restaurants' },
      { label: 'Livreurs', path: '/drivers', icon: 'delivery_dining', badgeKey: 'pending_drivers' },
      { label: 'Clients', path: '/users', icon: 'group' },
    ],
  },
  {
    label: 'Service & Finance',
    items: [
      { label: 'Support', path: '/support', icon: 'support_agent', badgeKey: 'open_tickets' },
      { label: 'Finances', path: '/finances', icon: 'account_balance_wallet' },
      { label: 'Codes Promo', path: '/settings/promo-codes', icon: 'local_offer' },
    ],
  },
  {
    label: 'Analyses',
    items: [
      { label: 'Analyses', path: '/analytics', icon: 'analytics' },
      { label: 'Perf. Restaurants', path: '/analytics/restaurants', icon: 'bar_chart' },
      { label: 'Perf. Livreurs', path: '/analytics/delivery', icon: 'two_wheeler' },
      { label: 'Rapports Financiers', path: '/finances/reports', icon: 'description' },
    ],
  },
];

const FOOTER_ITEMS = [
  { label: 'Paramètres', path: '/settings/platform', icon: 'settings' },
  { label: 'Mon compte', path: '/settings/account', icon: 'manage_accounts' },
];

const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation();

  // Charger les badges live (commandes en attente, tickets ouverts, etc.)
  const { data: badgeData } = useQuery({
    queryKey: ['sidebar-badges'],
    queryFn: () => dashboardAPI.getDashboard(),
    refetchInterval: 60000,
    retry: false,
    select: (data) => {
      const today = data?.data?.today || {};
      const comparisons = data?.data?.comparisons || {};
      return {
        pending_orders: today.pending_orders || 0,
        pending_restaurants: comparisons.pending_validations || 0,
        pending_drivers: comparisons.pending_driver_validations || 0,
        open_tickets: comparisons.open_tickets || 0,
      };
    },
  });

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 flex flex-col shrink-0
          bg-[#0d1528]
          border-r border-slate-700/40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-slate-700/40">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Baibebalo" className="h-9 w-auto flex-shrink-0" />
            <div>
              <h1 className="text-base font-black tracking-wide text-white uppercase leading-none">
                BAIBEBALO
              </h1>
              <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5">
                Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  const badge = item.badgeKey ? (badgeData?.[item.badgeKey] || 0) : 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative
                        ${active
                          ? 'bg-primary/15 text-white border-l-2 border-primary pl-[10px]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent pl-[10px]'
                        }
                      `}
                    >
                      <span
                        className={`material-symbols-outlined text-xl transition-colors ${
                          active ? 'text-primary' : ''
                        }`}
                        style={{ fontSize: '20px' }}
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-black bg-red-500 text-white rounded-full min-w-[18px] text-center leading-none">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Pied de page */}
        <div className="px-3 pb-4 pt-3 border-t border-slate-700/40 space-y-0.5">
          {FOOTER_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-2 pl-[10px]
                  ${active
                    ? 'bg-primary/15 text-white border-primary'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                  }
                `}
              >
                <span className={`material-symbols-outlined text-xl ${active ? 'text-primary' : ''}`} style={{ fontSize: '20px' }}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
