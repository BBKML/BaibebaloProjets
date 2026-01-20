import { useState } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const OfflineDrivers = () => {
  const [activeTab, setActiveTab] = useState('offline');

  const [drivers] = useState([
    {
      id: 'DRV-001',
      name: 'Jean Dupont',
      lastConnection: 'Il y a 2 heures',
      lastGPSPosition: 'GPS Hors Ligne',
      status: 'offline',
    },
    {
      id: 'DRV-002',
      name: 'Marie Martin',
      lastConnection: 'Il y a 45 minutes',
      lastGPSPosition: 'GPS Hors Ligne',
      status: 'offline',
    },
    {
      id: 'DRV-003',
      name: 'Pierre Durand',
      lastConnection: 'Il y a 1 jour',
      lastGPSPosition: 'GPS Hors Ligne',
      status: 'offline',
    },
    {
      id: 'DRV-004',
      name: 'Noto Cokrat',
      lastConnection: 'Il y a 1 jour',
      lastGPSPosition: 'GPS Hors Ligne',
      status: 'offline',
    },
    {
      id: 'DRV-005',
      name: 'Amadou Diallo',
      lastConnection: 'En ligne maintenant',
      lastGPSPosition: '5.3369° N, -4.0267° W',
      status: 'online',
    },
  ]);

  const handleContact = (driverId, driverName) => {
    toast.success(`Contact de ${driverName} en cours...`);
  };

  const filteredDrivers = activeTab === 'online' ? drivers.filter((d) => d.status === 'online') : drivers.filter((d) => d.status === 'offline');

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Liste des Livreurs Hors Ligne
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Suivez les livreurs hors ligne et contactez-les si nécessaire
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
            <button
              onClick={() => setActiveTab('online')}
              className={`px-6 py-4 border-b-2 text-sm font-bold transition-colors ${
                activeTab === 'online'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              En ligne
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`px-6 py-4 border-b-2 text-sm font-bold transition-colors ${
                activeTab === 'offline'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hors ligne
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Nom du Livreur
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Dernière Connexion
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Dernière Position GPS
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-400">local_shipping</span>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          {activeTab === 'online' ? 'Aucun livreur en ligne' : 'Aucun livreur hors ligne'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr
                      key={driver.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{driver.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{driver.id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{driver.lastConnection}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{driver.lastGPSPosition}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleContact(driver.id, driver.name)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition-colors shadow-sm ml-auto"
                        >
                          <span className="material-symbols-outlined text-sm">sms</span>
                          <span className="material-symbols-outlined text-sm">phone</span>
                          <span>Contacter</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OfflineDrivers;
