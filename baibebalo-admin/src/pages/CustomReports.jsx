import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import ChartSkeleton from '../components/common/ChartSkeleton';

const CustomReports = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'orders']);
  const [visualization, setVisualization] = useState('line');
  const [schedule, setSchedule] = useState('none');

  // Simuler un chargement de données
  const { data, isLoading } = useQuery({
    queryKey: ['custom-reports', selectedMetrics, visualization],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    retry: 2,
  });

  const steps = [
    { number: 1, label: 'Sélection des indicateurs', key: 'metrics' },
    { number: 2, label: 'Mise en page & Visualisation', key: 'visualization' },
    { number: 3, label: 'Planification automatique', key: 'schedule' },
  ];

  const metrics = [
    {
      id: 'revenue',
      name: 'Chiffre d\'affaires',
      description: 'Revenus totaux générés',
      icon: 'payments',
      color: 'emerald',
    },
    {
      id: 'orders',
      name: 'Volume de commandes',
      description: 'Nombre total de transactions',
      icon: 'shopping_cart',
      color: 'amber',
    },
    {
      id: 'users',
      name: 'Nouveaux utilisateurs',
      description: 'Inscriptions sur la période',
      icon: 'person_add',
      color: 'blue',
    },
  ];

  const visualizations = [
    { id: 'line', name: 'Courbe', icon: 'show_chart' },
    { id: 'bar', name: 'Barres', icon: 'bar_chart_4_bars' },
    { id: 'table', name: 'Tableau', icon: 'table_chart' },
  ];

  const schedules = [
    { id: 'none', name: 'Aucune planification', description: 'Générer une seule fois' },
    { id: 'daily', name: 'Quotidien', description: 'Tous les jours à 8h00' },
    { id: 'weekly', name: 'Hebdomadaire', description: 'Tous les lundis à 8h00' },
    { id: 'monthly', name: 'Mensuel', description: 'Le 1er de chaque mois à 8h00' },
  ];

  const handleMetricToggle = (metricId) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = () => {
    toast.success('Rapport personnalisé créé avec succès !');
  };

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'bg-emerald-500/10 text-emerald-500',
      amber: 'bg-amber-500/10 text-amber-500',
      blue: 'bg-blue-500/10 text-blue-500',
    };
    return colors[color] || colors.blue;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>

          {/* Steps Skeleton */}
          <div className="flex gap-4">
            {new Array(3).fill(null).map((_, i) => (
              <div key={`step-skeleton-${i}`} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 animate-pulse" />
            ))}
          </div>

          {/* Chart Skeleton */}
          <ChartSkeleton type={visualization === 'line' ? 'line' : visualization === 'bar' ? 'bar' : 'table'} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
        {/* Page Header */}
        <header className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Création de Rapports Personnalisés
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configurez et planifiez vos analyses de données en temps réel.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Générer maintenant
            </button>
          </div>
        </header>

        {/* Wizard Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Configuration Wizard */}
          <div className="w-[450px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar">
          <div className="px-8 py-8 space-y-8">
            {/* Step 1: Metrics */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    1
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Sélection des indicateurs</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 pl-12">
                  {metrics.map((metric) => {
                    const isSelected = selectedMetrics.includes(metric.id);
                    return (
                      <label
                        key={metric.id}
                        className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getColorClasses(metric.color)}`}>
                            <span className="material-symbols-outlined">{metric.icon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{metric.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{metric.description}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleMetricToggle(metric.id)}
                          className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary bg-transparent size-5"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Visualizations */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="size-8 rounded-full border-2 border-primary flex items-center justify-center text-primary text-xs font-bold">
                    2
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Mise en page & Visualisation</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 pl-12">
                  {visualizations.map((viz) => {
                    const isSelected = visualization === viz.id;
                    return (
                      <button
                        key={viz.id}
                        onClick={() => setVisualization(viz.id)}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-3xl ${
                            isSelected ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {viz.icon}
                        </span>
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
                          {viz.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Schedule */}
            {currentStep === 3 && (
              <div className="space-y-4 pb-12">
                <div className="flex items-center gap-4">
                  <div className="size-8 rounded-full border-2 border-primary flex items-center justify-center text-primary text-xs font-bold">
                    3
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Planification automatique</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 pl-12">
                  {schedules.map((sched) => {
                    const isSelected = schedule === sched.id;
                    return (
                      <label
                        key={sched.id}
                        className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-primary/50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{sched.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{sched.description}</p>
                        </div>
                        <input
                          type="radio"
                          name="schedule"
                          value={sched.id}
                          checked={isSelected}
                          onChange={() => setSchedule(sched.id)}
                          className="text-primary focus:ring-primary"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentStep === 1
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Précédent
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2"
              >
                {currentStep === 3 ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    Générer maintenant
                  </>
                ) : (
                  <>
                    Suivant
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
          </div>

          {/* Right Panel: Live Preview */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center">
            {/* Floating Preview Label */}
            <div className="mb-8 flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Aperçu en temps réel
            </div>

            {/* Report Mockup Card */}
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-8 min-h-[700px]">
              {/* Report Header */}
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-6">
                <div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Rapport d'activité hebdomadaire
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Période : 01 Oct — 07 Oct 2023</p>
                </div>
                <div className="h-10 w-24 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center p-2">
                  <img 
                    src="/src/assets/Baibebalo_logo_sans_fond.png" 
                    alt="Baibebalo" 
                    className="h-full w-auto object-contain"
                  />
                </div>
              </div>

              {/* KPI Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Revenu Total
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-500">42 890 FCFA</span>
                    <span className="text-[10px] font-bold text-emerald-500/80">+12% vs last week</span>
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Commandes
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-500">1,248</span>
                    <span className="text-[10px] font-bold text-amber-500/80">+5% vs last week</span>
                  </div>
                </div>
              </div>

              {/* Main Visualization: Trend Line Placeholder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Évolution des ventes</p>
                  <div className="flex gap-2">
                    <div className="size-2 rounded-full bg-primary" />
                    <div className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  </div>
                </div>
                <div className="w-full h-48 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-end p-4 gap-2">
                  {/* Abstract Bar chart representing line graph points */}
                  {[40, 60, 55, 80, 65, 95, 85].map((height, i) => (
                    <div
                      key={`preview-bar-${i}`}
                      className="flex-1 bg-primary rounded-t-lg transition-all"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Data Breakdown Skeleton */}
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Détail par jour</p>
                <div className="space-y-2">
                  {['Lundi 01 Oct', 'Mardi 02 Oct', 'Mercredi 03 Oct', 'Jeudi 04 Oct', 'Vendredi 05 Oct'].map(
                    (day, i) => (
                      <div
                        key={`day-${i}`}
                        className={`flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 ${
                          i >= 2 ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-2 rounded-full bg-slate-200 dark:bg-slate-600" />
                          <span className="text-xs text-slate-600 dark:text-slate-400">{day}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {i >= 2 ? '...' : i === 0 ? '5 200 FCFA' : '6 140 FCFA'}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-8 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">
                  Généré automatiquement par BAIBEBALO Admin Intelligence
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomReports;
