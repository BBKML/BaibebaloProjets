import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SystemAlertsPanel from '../dashboard/SystemAlertsPanel';
import NewOrderToasts from '../common/NewOrderToasts';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <SystemAlertsPanel />
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
      {/* Toasts nouvelles commandes — global sur toutes les pages */}
      <NewOrderToasts />
    </div>
  );
};

export default Layout;
