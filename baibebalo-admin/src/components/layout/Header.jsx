import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../api/dashboard';
import { useAlerts } from '../../contexts/AlertsContext';

const Header = ({ onMenuClick = () => {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState(() => JSON.parse(localStorage.getItem('admin') || '{}'));
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { setShowAlertsPanel } = useAlerts();

  // Récupérer le nombre d'alertes
  const { data: alertsData } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: () => dashboardAPI.getSystemAlerts(),
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    retry: false,
  });

  const alertsCount = alertsData?.data?.count || 0;
  
  // Écouter les mises à jour des données admin
  useEffect(() => {
    const handleAdminUpdate = () => {
      const updatedAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
      setAdmin(updatedAdmin);
    };
    
    window.addEventListener('adminDataUpdated', handleAdminUpdate);
    return () => window.removeEventListener('adminDataUpdated', handleAdminUpdate);
  }, []);
  
  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };
  
  // Générer le breadcrumb basé sur le pathname
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') {
      return { home: 'Accueil', current: 'Tableau de bord' };
    }
    const parts = path.split('/').filter(Boolean);
    const labels = {
      orders: 'Commandes',
      users: 'Clients',
      restaurants: 'Restaurants',
      delivery: 'Livreurs',
      finances: 'Finances',
      support: 'Support',
      analytics: 'Analyses',
      settings: 'Paramètres',
    };
    return {
      home: 'Accueil',
      current: labels[parts[0]] || parts[0].charAt(0).toUpperCase() + parts[0].slice(1),
    };
  };
  
  const breadcrumb = getBreadcrumb();
  
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-primary/10 dark:bg-primary/20 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      {/* Left: Hamburger Menu + Breadcrumb */}
      <div className="flex items-center gap-4">
        {/* Bouton Hamburger Menu (visible sur mobile/tablette) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>
        
        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm">
          <span className="material-symbols-outlined text-sm">home</span>
          <span className="font-medium">{breadcrumb.home}</span>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{breadcrumb.current}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-6">
        {/* Recherche */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input
            type="text"
            placeholder="Rechercher une commande..."
            className="pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 w-64 transition-all"
          />
        </div>
        
        {/* Notifications */}
        <button 
          onClick={() => {
            setShowAlertsPanel(true);
          }}
          className="relative text-slate-500 hover:text-primary transition-colors"
          title={`${alertsCount} alerte(s) système - Cliquez pour voir`}
        >
          <span className="material-symbols-outlined">notifications</span>
          {alertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
              {alertsCount > 9 ? '9+' : alertsCount}
            </span>
          )}
        </button>
        
        {/* Profil avec menu dropdown */}
        <div className="relative flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{admin.full_name || 'Admin User'}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{admin.role || 'SUPER_ADMIN'}</p>
          </div>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 bg-cover bg-center ring-2 ring-slate-100 dark:ring-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm hover:ring-primary/50 transition-all cursor-pointer overflow-hidden"
            style={admin.profile_picture ? {
              backgroundImage: `url(${admin.profile_picture})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : {}}
            title={admin.profile_picture ? 'Photo de profil' : 'Aucune photo'}
          >
            {!admin.profile_picture && (admin.full_name?.charAt(0) || 'A')}
          </button>
          
          {/* Menu dropdown */}
          {showProfileMenu && (
            <>
              {/* Overlay pour fermer le menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProfileMenu(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-20">
                {/* Informations utilisateur */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {admin.full_name || 'Administrateur'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {admin.email || 'admin@baibebalo.ci'}
                  </p>
                </div>
                
                {/* Options du menu */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings/account');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg text-slate-500 dark:text-slate-400">person</span>
                    <span>Modifier mon compte</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
