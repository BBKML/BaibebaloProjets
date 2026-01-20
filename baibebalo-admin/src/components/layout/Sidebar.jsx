import { Link, useLocation } from 'react-router-dom';
import logoIcon from '../../assets/Baibebalo_icon_sans_fond_orange.png';

const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  
  const menuItems = [
    {
      label: 'Tableau de bord',
      path: '/',
      icon: 'dashboard',
    },
    {
      label: 'Commandes',
      path: '/orders',
      icon: 'shopping_cart',
    },
    {
      label: 'Restaurants',
      path: '/restaurants',
      icon: 'restaurant',
    },
    {
      label: 'Livreurs',
      path: '/drivers',
      icon: 'local_shipping',
    },
    {
      label: 'Clients',
      path: '/users',
      icon: 'group',
    },
    {
      label: 'Support',
      path: '/support',
      icon: 'support_agent',
    },
    {
      label: 'Finances',
      path: '/finances',
      icon: 'payments',
    },
    {
      label: 'Analyses',
      path: '/analytics',
      icon: 'analytics',
    },
    {
      label: 'Paramètres',
      path: '/settings/platform',
      icon: 'settings',
    },
  ];
  
  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 border-r border-slate-700/50
          bg-[#0f172a]
          flex flex-col shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo avec bouton fermer sur mobile */}
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {/* Logo Baibebalo */}
            <div className="flex items-center gap-3">
              <img 
                src={logoIcon} 
                alt="Baibebalo" 
                className="h-10 w-auto flex-shrink-0"
              />
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight leading-none text-white uppercase">
                  BAIBEBALO
                </h1>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Admin Control</p>
              </div>
            </div>
          </div>
          
          {/* Bouton fermer sur mobile */}
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer le menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      
      {/* Menu */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-slate-700/50 text-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Settings */}
      <div className="p-4 border-t border-slate-700/50">
        <Link
          to="/settings/platform"
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            location.pathname.startsWith('/settings')
              ? 'bg-slate-700/50 text-white'
              : 'text-white hover:bg-white/10'
          }`}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-sm font-medium">Paramètres</span>
        </Link>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
