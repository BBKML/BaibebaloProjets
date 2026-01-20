import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SystemAlertsPanel from '../dashboard/SystemAlertsPanel';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        {/* Panneau d'alertes système - disponible sur toutes les pages */}
        <SystemAlertsPanel />
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
