import { useParams, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const PaymentMethodDetails = () => {
  const { method } = useParams();
  const methodName = method || 'Orange Money';

  // Mock data for the selected payment method
  const dailyData = Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1} Oct`,
    volume: Math.floor(Math.random() * 5000000) + 1000000,
    success: Math.floor(Math.random() * 100) + 85,
  }));

  return (
    <Layout>
      <div className="space-y-0">
        {/* Breadcrumbs */}
        <div className="px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-slate-500 hover:text-primary transition-colors">
              Accueil
            </Link>
            <span className="text-slate-600">/</span>
            <Link to="/finances/analysis" className="text-slate-500 hover:text-primary transition-colors">
              Analyses Paiements
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">{methodName}</span>
          </div>
        </div>

        {/* Page Heading */}
        <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-white text-4xl font-black tracking-tight">{methodName}</h2>
              <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-xs font-bold uppercase tracking-widest border border-green-500/20">
                Actif
              </span>
            </div>
            <p className="text-slate-400 text-lg">
              Analyse approfondie des performances du canal {methodName} (OM Pay).
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 bg-slate-800 border border-slate-700 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              Derniers 30 jours
            </button>
            <button className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>
        </header>

        {/* Stats KPI */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-8 py-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
              Taux de Réussite
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">94.2%</p>
              <span className="text-green-500 text-xs font-bold flex items-center">
                +2.1% <span className="material-symbols-outlined text-xs">arrow_upward</span>
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-4xl">monitoring</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
              Volume Total
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">45.2M CFA</p>
              <span className="text-red-500 text-xs font-bold flex items-center">
                -5.4% <span className="material-symbols-outlined text-xs">arrow_downward</span>
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-4xl">timer</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
              Temps de Réponse
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">1.2s</p>
              <span className="text-green-500 text-xs font-bold flex items-center">
                -0.3s <span className="material-symbols-outlined text-xs">arrow_downward</span>
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-4xl">payments</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
              Chiffre d'Affaires
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">12.8M CFA</p>
              <span className="text-green-500 text-xs font-bold flex items-center">
                +12% <span className="material-symbols-outlined text-xs">arrow_upward</span>
              </span>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Volume Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-white text-lg font-bold">Tendances des Transactions</h3>
                <p className="text-slate-500 text-sm">Volume hebdomadaire {methodName}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">2,450 tx</p>
                <p className="text-primary text-xs font-bold uppercase tracking-widest">7 Derniers Jours</p>
              </div>
            </div>
            <div className="h-[240px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData.slice(0, 7)}>
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b95da" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0b95da" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#0b95da"
                    strokeWidth={3}
                    fill="url(#blueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-4 px-2">
              {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map((day) => (
                <span key={day} className="text-slate-500 text-xs font-bold">
                  {day}
                </span>
              ))}
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-white text-lg font-bold">Statut des Opérations</h3>
              <p className="text-slate-500 text-sm">Répartition en temps réel</p>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center gap-6">
              <div className="relative flex items-center justify-center">
                {/* Circular Progress Visualizer */}
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    className="text-slate-800"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                  />
                  <circle
                    className="text-primary"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="70"
                    stroke="currentColor"
                    strokeDasharray="440"
                    strokeDashoffset="44"
                    strokeWidth="12"
                  />
                  <circle
                    className="text-red-500"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="70"
                    stroke="currentColor"
                    strokeDasharray="440"
                    strokeDashoffset="380"
                    strokeWidth="12"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-white text-3xl font-black">94%</span>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Succès</span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-slate-300">Succès</span>
                  </div>
                  <span className="text-white font-bold">2,308 tx</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-slate-300">Échecs</span>
                  </div>
                  <span className="text-white font-bold">112 tx</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-600" />
                    <span className="text-slate-300">En attente</span>
                  </div>
                  <span className="text-white font-bold">30 tx</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <h3 className="text-white text-lg font-bold">Dernières Transactions {methodName}</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  search
                </span>
                <input
                  className="bg-slate-900 border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:ring-primary focus:border-primary w-64"
                  placeholder="Rechercher ID, Tel..."
                  type="text"
                />
              </div>
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 bg-slate-900 text-white text-xs font-bold hover:bg-slate-700">
                <span className="material-symbols-outlined text-xs">filter_list</span>
                <span>Filtrer</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Date & Heure
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {[
                  {
                    id: 'OM-82941-X',
                    client: { name: 'Moussa Koné', phone: '+223 76 54 32 10', initials: 'MK' },
                    amount: 25000,
                    status: 'success',
                    date: "Aujourd'hui, 14:23",
                  },
                  {
                    id: 'OM-82939-A',
                    client: { name: 'Aminata Diallo', phone: '+223 66 11 22 33', initials: 'AD' },
                    amount: 10500,
                    status: 'failed',
                    date: "Aujourd'hui, 13:58",
                  },
                  {
                    id: 'OM-82935-Z',
                    client: { name: 'Sekou Traoré', phone: '+223 70 88 99 00', initials: 'ST' },
                    amount: 50000,
                    status: 'pending',
                    date: "Aujourd'hui, 13:45",
                  },
                  {
                    id: 'OM-82930-B',
                    client: { name: 'Fatoumata Cissé', phone: '+223 69 44 55 66', initials: 'FC' },
                    amount: 5000,
                    status: 'success',
                    date: "Aujourd'hui, 13:12",
                  },
                ].map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-mono text-primary font-medium">#{tx.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                          {tx.client.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">{tx.client.name}</span>
                          <span className="text-xs text-slate-500">{tx.client.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-white">
                      {tx.amount.toLocaleString('fr-FR')} CFA
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                          tx.status === 'success'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : tx.status === 'failed'
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {(() => {
                          if (tx.status === 'success') return 'Réussi';
                          if (tx.status === 'failed') return 'Échoué';
                          return 'En cours';
                        })()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{tx.date}</td>
                    <td className="px-6 py-4">
                      <button className="text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentMethodDetails;
