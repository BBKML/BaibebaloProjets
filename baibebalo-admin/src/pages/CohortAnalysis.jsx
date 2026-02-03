import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { exportToCSV } from '../utils/export';

const CohortAnalysis = () => {
  const navigate = useNavigate();
  const [cohortType, setCohortType] = useState('registration');
  const [segment, setSegment] = useState('all');

  // Données de cohorte simulées (matrice de rétention avec M0 à M9)
  const cohortData = [
    { cohort: 'Janvier 2024', users: 1240, m0: 100, m1: 42.5, m2: 35.2, m3: 28.1, m4: 25.0, m5: 22.4, m6: 21.8, m7: 20.5, m8: 18.2, m9: 15.4 },
    { cohort: 'Février 2024', users: 980, m0: 100, m1: 38.1, m2: 29.4, m3: 24.2, m4: 22.1, m5: 20.5, m6: 17.8, m7: 15.2, m8: 14.0, m9: 0 },
    { cohort: 'Mars 2024', users: 1520, m0: 100, m1: 48.2, m2: 41.0, m3: 36.5, m4: 32.2, m5: 28.9, m6: 26.4, m7: 22.1, m8: 0, m9: 0 },
    { cohort: 'Avril 2024', users: 1105, m0: 100, m1: 44.1, m2: 34.8, m3: 29.1, m4: 26.5, m5: 21.8, m6: 19.2, m7: 0, m8: 0, m9: 0 },
    { cohort: 'Mai 2024', users: 1350, m0: 100, m1: 46.5, m2: 38.2, m3: 32.8, m4: 28.4, m5: 24.1, m6: 0, m7: 0, m8: 0, m9: 0 },
    { cohort: 'Juin 2024', users: 1420, m0: 100, m1: 50.2, m2: 42.8, m3: 37.5, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0 },
  ];

  const getRetentionPercentage = (value, base) => {
    if (!base || base === 0) return 0;
    return Math.round((value / base) * 100);
  };

  const getCellColor = (percentage) => {
    if (percentage >= 80) return 'bg-primary text-white';
    if (percentage >= 60) return 'bg-primary/85 text-white';
    if (percentage >= 40) return 'bg-primary/65 text-white';
    if (percentage >= 20) return 'bg-primary/45 text-white';
    if (percentage >= 5) return 'bg-primary/25 text-slate-300';
    if (percentage > 0) return 'bg-primary/10 text-slate-400';
    return 'bg-slate-800 text-slate-600';
  };

  // Fonction d'export
  const handleExport = () => {
    try {
      const exportData = cohortData.map(cohort => ({
        'Cohorte': cohort.cohort,
        'Utilisateurs': cohort.users,
        'M0': cohort.m0,
        'M1': cohort.m1,
        'M2': cohort.m2,
        'M3': cohort.m3,
        'M4': cohort.m4,
        'M5': cohort.m5,
        'M6': cohort.m6,
        'M7': cohort.m7,
        'M8': cohort.m8,
        'M9': cohort.m9,
      }));

      exportToCSV(exportData, `analyse-cohorte-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors mt-1"
              title="Retour"
            >
              <span className="material-symbols-outlined text-slate-400">arrow_back</span>
            </button>
            <div className="space-y-2">
              <h1 className="text-white text-4xl font-black leading-tight tracking-tighter">
                Rétention Client
              </h1>
              <p className="text-slate-400 text-sm max-w-xl font-medium">
                Visualisez l'évolution de la fidélité de vos clients mois après mois à l'aide de notre graphique
                matriciel de cohorte.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all border border-slate-700">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtres Avancés
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-bold transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-primary/50 transition-colors">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
              Rétention Moyenne
            </p>
            <div className="flex items-end justify-between">
              <p className="text-white text-3xl font-black tracking-tighter leading-none">24.5%</p>
              <span className="text-emerald-400 text-xs font-bold flex items-center">
                +2.1% <span className="material-symbols-outlined text-xs">trending_up</span>
              </span>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Cohorte Active</p>
            <div className="flex items-end justify-between">
              <p className="text-white text-3xl font-black tracking-tighter leading-none">1,240</p>
              <span className="text-red-400 text-xs font-bold flex items-center">
                -0.5% <span className="material-symbols-outlined text-xs">trending_down</span>
              </span>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">LTV Moyen</p>
            <div className="flex items-end justify-between">
              <p className="text-white text-3xl font-black tracking-tighter leading-none">45 FCFA</p>
              <span className="text-emerald-400 text-xs font-bold flex items-center">
                +5.2% <span className="material-symbols-outlined text-xs">trending_up</span>
              </span>
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Churn Rate (M1)</p>
            <div className="flex items-end justify-between">
              <p className="text-white text-3xl font-black tracking-tighter leading-none">12.8%</p>
              <span className="text-emerald-400 text-xs font-bold flex items-center">
                -1.4% <span className="material-symbols-outlined text-xs">trending_down</span>
              </span>
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {/* Control Panel */}
          <div className="p-6 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Type de Cohorte
                </label>
                <select
                  className="bg-slate-900 border-slate-700 text-white rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-primary"
                  value={cohortType}
                  onChange={(e) => setCohortType(e.target.value)}
                >
                  <option value="registration">Date d'inscription</option>
                  <option value="first-purchase">Premier achat</option>
                  <option value="first-interaction">Première interaction</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Segment Client
                </label>
                <select
                  className="bg-slate-900 border-slate-700 text-white rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-primary"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                >
                  <option value="all">Tous les utilisateurs</option>
                  <option value="b2b">Clients B2B</option>
                  <option value="b2c">Clients B2C</option>
                  <option value="vip">Clients VIP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cohort Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="p-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50 min-w-[140px]">
                    Mois
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    Users
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-primary uppercase tracking-widest border-r border-slate-700/50 bg-primary/5">
                    M0
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+1
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+2
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+3
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+4
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+5
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+6
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+7
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-700/50">
                    M+8
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    M+9
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs font-medium">
                {cohortData.map((row, index) => (
                  <tr
                    key={`cohort-${index}-${row.cohort}`}
                    className="border-b border-slate-700/50 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-white font-bold border-r border-slate-700/50">{row.cohort}</td>
                    <td className="p-4 text-center text-slate-400 border-r border-slate-700/50">
                      {row.users.toLocaleString('fr-FR')}
                    </td>
                    {['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'].map((month) => {
                      const percentage = row[month] || 0;
                      const borderClass = month !== 'm9' ? 'border-r border-slate-700/50' : '';
                      return (
                        <td
                          key={`${row.cohort}-${month}`}
                          className={`p-4 text-center font-bold ${getCellColor(percentage)} ${borderClass}`}
                        >
                          {percentage > 0 ? `${percentage}%` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Légende Rétention</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">0%</span>
                <div className="flex h-3 w-32 rounded-full overflow-hidden">
                  <div className="h-full w-1/4 bg-primary/25"></div>
                  <div className="h-full w-1/4 bg-primary/45"></div>
                  <div className="h-full w-1/4 bg-primary/85"></div>
                  <div className="h-full w-1/4 bg-primary"></div>
                </div>
                <span className="text-[10px] text-slate-500">100%</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Période</label>
              <select className="bg-slate-900 border-slate-700 text-white rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-primary">
                <option>Derniers 12 mois</option>
                <option>Derniers 6 mois</option>
                <option>Année 2023</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CohortAnalysis;
