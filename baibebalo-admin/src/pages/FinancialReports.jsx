import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import { financesAPI } from '../api/finances';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';

const METRICS = [
  {
    id: 'revenue',
    name: 'Chiffre d\'affaires',
    description: 'Total brut des commandes livrées (GMV).',
    icon: 'trending_up',
    color: 'green',
  },
  {
    id: 'commission',
    name: 'Commissions plateforme',
    description: 'Frais de service prélevés sur chaque transaction.',
    icon: 'percent',
    color: 'blue',
  },
  {
    id: 'delivery_earnings',
    name: 'Gains livreurs',
    description: 'Montant total versé aux livreurs.',
    icon: 'two_wheeler',
    color: 'orange',
  },
  {
    id: 'restaurant_payouts',
    name: 'Versements restaurants',
    description: 'Montant net reversé aux restaurants partenaires.',
    icon: 'restaurant',
    color: 'purple',
  },
  {
    id: 'cash_collected',
    name: 'Espèces collectées',
    description: 'Total espèces perçues et remises à l\'agence.',
    icon: 'payments',
    color: 'emerald',
  },
];

const AGGREGATIONS = [
  { id: 'daily', label: 'Quotidien', icon: 'today' },
  { id: 'weekly', label: 'Hebdomadaire', icon: 'date_range' },
  { id: 'monthly', label: 'Mensuel', icon: 'calendar_month' },
  { id: 'yearly', label: 'Annuel', icon: 'calendar_today' },
];

const PERIODS = [
  { id: '7d', label: '7 derniers jours' },
  { id: '30d', label: '30 derniers jours' },
  { id: '90d', label: '3 derniers mois' },
  { id: 'this_month', label: 'Ce mois-ci' },
  { id: 'last_month', label: 'Mois précédent' },
  { id: 'this_year', label: 'Cette année' },
  { id: 'custom', label: 'Période personnalisée' },
];

const COLOR_CLASSES = {
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
};

const STEPS = [
  { number: 1, label: 'Métriques', key: 'metrics' },
  { number: 2, label: 'Période & Filtres', key: 'period' },
  { number: 3, label: 'Export', key: 'export' },
];

const FinancialReports = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'commission']);
  const [aggregation, setAggregation] = useState('monthly');
  const [period, setPeriod] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleMetricToggle = (id) => {
    setSelectedMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (currentStep === 1 && selectedMetrics.length === 0) {
      toast.error('Sélectionnez au moins une métrique');
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const getPeriodParams = () => {
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    if (period === '7d') {
      const from = new Date(today); from.setDate(today.getDate() - 7);
      return { date_from: fmt(from), date_to: fmt(today) };
    }
    if (period === '30d') {
      const from = new Date(today); from.setDate(today.getDate() - 30);
      return { date_from: fmt(from), date_to: fmt(today) };
    }
    if (period === '90d') {
      const from = new Date(today); from.setDate(today.getDate() - 90);
      return { date_from: fmt(from), date_to: fmt(today) };
    }
    if (period === 'this_month') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { date_from: fmt(from), date_to: fmt(today) };
    }
    if (period === 'last_month') {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { date_from: fmt(from), date_to: fmt(to) };
    }
    if (period === 'this_year') {
      const from = new Date(today.getFullYear(), 0, 1);
      return { date_from: fmt(from), date_to: fmt(today) };
    }
    if (period === 'custom') {
      return { date_from: customFrom, date_to: customTo };
    }
    return {};
  };

  const handleGenerate = async () => {
    if (period === 'custom' && (!customFrom || !customTo)) {
      toast.error('Veuillez saisir les dates de début et de fin');
      return;
    }
    setIsGenerating(true);
    try {
      const params = getPeriodParams();
      const overview = await financesAPI.getFinancialOverview(params);
      const overviewData = overview?.data || {};

      const rows = [
        {
          'Rapport': 'Synthèse Financière Baibebalo',
          'Période': PERIODS.find((p) => p.id === period)?.label || period,
          'Métriques': selectedMetrics.map((m) => METRICS.find((x) => x.id === m)?.name).join(', '),
          'Agrégation': AGGREGATIONS.find((a) => a.id === aggregation)?.label || aggregation,
          'Date génération': new Date().toLocaleString('fr-FR'),
        },
        {},
        {
          'Métrique': 'Chiffre d\'affaires (GMV)',
          'Valeur': formatCurrency(overviewData.total_revenue || overviewData.gmv || 0),
        },
        {
          'Métrique': 'Commissions plateforme',
          'Valeur': formatCurrency(overviewData.platform_commission || overviewData.total_commission || 0),
        },
        {
          'Métrique': 'Total commandes',
          'Valeur': overviewData.total_orders || 0,
        },
        {
          'Métrique': 'Commandes livrées',
          'Valeur': overviewData.delivered_orders || 0,
        },
        {
          'Métrique': 'Commandes annulées',
          'Valeur': overviewData.cancelled_orders || 0,
        },
      ];

      const filename = `rapport-financier-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(rows, filename);
      toast.success(`Rapport généré et téléchargé : ${filename}`);
    } catch (err) {
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setIsGenerating(false);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to="/finances"
            className="flex items-center justify-center size-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-colors shadow-sm"
            title="Retour aux Finances"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Génération de Rapports Financiers
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Configurez et exportez vos données financières en 3 étapes.
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-4 relative">
          <div className="absolute top-5 left-0 w-full h-px bg-slate-200 dark:bg-slate-700 z-0" />
          {STEPS.map((step) => (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`size-10 rounded-full flex items-center justify-center font-black text-sm shadow ${
                  currentStep > step.number
                    ? 'bg-emerald-500 text-white'
                    : currentStep === step.number
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
              >
                {currentStep > step.number ? (
                  <span className="material-symbols-outlined text-sm">check</span>
                ) : (
                  step.number
                )}
              </div>
              <span className={`text-xs font-bold ${currentStep >= step.number ? 'text-primary' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100 dark:bg-slate-700">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Étape {currentStep} / {STEPS.length}
              </p>
              <h2 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {STEPS[currentStep - 1].label}
              </h2>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {Math.round(progress)}% complété
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Métriques */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {METRICS.map((metric) => {
                  const selected = selectedMetrics.includes(metric.id);
                  return (
                    <label key={metric.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleMetricToggle(metric.id)}
                        className="sr-only"
                      />
                      <div
                        className={`relative h-full p-4 border-2 rounded-xl transition-all ${
                          selected
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-3 right-3 text-primary material-symbols-outlined text-lg">
                            check_circle
                          </span>
                        )}
                        <div className={`size-9 rounded-lg ${COLOR_CLASSES[metric.color]} flex items-center justify-center mb-3`}>
                          <span className="material-symbols-outlined text-xl">{metric.icon}</span>
                        </div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{metric.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {metric.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Step 2: Période & Filtres */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Période</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PERIODS.map((p) => (
                      <label key={p.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="period"
                          value={p.id}
                          checked={period === p.id}
                          onChange={(e) => setPeriod(e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={`p-3 border-2 rounded-xl text-sm font-bold text-center transition-all ${
                            period === p.id
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {p.label}
                        </div>
                      </label>
                    ))}
                  </div>
                  {period === 'custom' && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Date de début</label>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Date de fin</label>
                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Agrégation temporelle</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {AGGREGATIONS.map((agg) => (
                      <label key={agg.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="aggregation"
                          value={agg.id}
                          checked={aggregation === agg.id}
                          onChange={(e) => setAggregation(e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={`p-3 border-2 rounded-xl text-center transition-all ${
                            aggregation === agg.id
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl text-slate-500 dark:text-slate-400 block mb-1">
                            {agg.icon}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{agg.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Statut des commandes</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'Toutes' },
                      { id: 'delivered', label: 'Livrées uniquement' },
                      { id: 'cancelled', label: 'Annulées uniquement' },
                      { id: 'paid', label: 'Payées (paiement validé)' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStatusFilter(s.id)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                          statusFilter === s.id
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Export */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Format d'export</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'csv', label: 'CSV', desc: 'Compatible Excel, Google Sheets, LibreOffice.', icon: 'table_view' },
                      { id: 'pdf', label: 'PDF', desc: 'Rapport mis en page, idéal pour impression / archivage.', icon: 'picture_as_pdf', disabled: true },
                    ].map((fmt) => (
                      <label key={fmt.id} className={fmt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
                        <input
                          type="radio"
                          name="format"
                          value={fmt.id}
                          checked={exportFormat === fmt.id}
                          onChange={(e) => !fmt.disabled && setExportFormat(e.target.value)}
                          disabled={fmt.disabled}
                          className="sr-only"
                        />
                        <div
                          className={`p-4 border-2 rounded-xl flex items-start gap-3 transition-all ${
                            exportFormat === fmt.id
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-3xl text-slate-500 dark:text-slate-400">
                            {fmt.icon}
                          </span>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {fmt.label}
                              {fmt.disabled && <span className="ml-2 text-xs text-slate-400 font-normal">(bientôt)</span>}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{fmt.desc}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Récapitulatif */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Récapitulatif</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Métriques sélectionnées</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedMetrics.map((m) => METRICS.find((x) => x.id === m)?.name).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Période</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {PERIODS.find((p2) => p2.id === period)?.label}
                      {period === 'custom' && customFrom && ` (${customFrom} → ${customTo})`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Agrégation</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {AGGREGATIONS.find((a) => a.id === aggregation)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Format</span>
                    <span className="font-bold text-slate-900 dark:text-white uppercase">{exportFormat}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                currentStep === 1
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Précédent
            </button>
            <button
              onClick={handleNext}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-black hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Génération...
                </>
              ) : currentStep === 3 ? (
                <>
                  <span className="material-symbols-outlined text-sm">file_download</span>
                  Générer & Télécharger
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
    </Layout>
  );
};

export default FinancialReports;
