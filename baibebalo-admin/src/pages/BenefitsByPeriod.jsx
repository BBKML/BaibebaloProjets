import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import { formatCurrency } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
  { value: 'months_12', label: 'Par mois (12 derniers mois)' },
  { value: 'years_5', label: 'Par année (5 dernières années)' },
  { value: 'custom', label: 'Entre deux dates' },
];

const SOURCE_OPTIONS = [
  { value: 'both', label: 'Livraison + Restaurants' },
  { value: 'delivery', label: 'Livraison uniquement' },
  { value: 'restaurant', label: 'Restaurants uniquement' },
];

export default function BenefitsByPeriod() {
  const [periodType, setPeriodType] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [source, setSource] = useState('both');

  const periodParam = periodType === 'months_12' || periodType === 'month' ? 'month' : periodType === 'years_5' || periodType === 'year' ? 'year' : periodType;
  const limitParam =
    periodType === 'months_12' ? 12
    : periodType === 'years_5' ? 5
    : periodType === 'month' ? 1
    : periodType === 'year' ? 1
    : undefined;
  const params = {
    period: periodParam,
    ...(limitParam !== undefined && { limit: limitParam }),
    ...(periodType === 'custom' && dateFrom && dateTo && { date_from: dateFrom, date_to: dateTo }),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['benefits-by-period', params],
    queryFn: () => financesAPI.getBenefitsByPeriod(params),
    enabled: periodType !== 'custom' || (!!dateFrom && !!dateTo),
    retry: 1,
  });

  const periods = data?.data?.periods || [];
  const summary = data?.data?.summary || { total_restaurant: 0, total_delivery: 0, total: 0 };

  const displaySummary = {
    total_restaurant: source === 'both' || source === 'restaurant' ? summary.total_restaurant : 0,
    total_delivery: source === 'both' || source === 'delivery' ? summary.total_delivery : 0,
    total:
      source === 'both'
        ? summary.total
        : source === 'restaurant'
          ? summary.total_restaurant
          : summary.total_delivery,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/finances" className="flex items-center gap-1.5 text-slate-500 hover:text-primary font-medium">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Finances
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Bénéfices par période
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Revenus de la plateforme (commissions restaurants et part livraison) par mois, par année ou entre deux dates.
          </p>
        </div>

        {/* Filtres */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Période et source</p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Période</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-w-[220px]"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {periodType === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Du</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Au</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-w-[200px]"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-700 dark:text-red-400 text-sm">
              {error?.response?.data?.error?.message || error?.message || 'Erreur lors du chargement'}
            </p>
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : (
          <>
            {/* Synthèse */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Total sur la période</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(source === 'both' || source === 'restaurant') && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Bénéfice restaurants</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {formatCurrency(displaySummary.total_restaurant)}
                    </p>
                  </div>
                )}
                {(source === 'both' || source === 'delivery') && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Bénéfice livraison</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {formatCurrency(displaySummary.total_delivery)}
                    </p>
                  </div>
                )}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-primary/30 p-4">
                  <p className="text-sm font-medium text-primary dark:text-primary/90">Total affiché</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {formatCurrency(displaySummary.total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tableau par période */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Détail par période</p>
              </div>
              <div className="overflow-x-auto">
                {periods.length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    {(periodType === 'custom' && (!dateFrom || !dateTo))
                      ? 'Choisissez une date de début et une date de fin.'
                      : 'Aucune donnée pour cette période.'}
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Période</th>
                        {(source === 'both' || source === 'restaurant') && (
                          <th className="px-6 py-4">Restaurants</th>
                        )}
                        {(source === 'both' || source === 'delivery') && (
                          <th className="px-6 py-4">Livraison</th>
                        )}
                        <th className="px-6 py-4">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {periods.map((row) => {
                        const rowTotal =
                          source === 'both'
                            ? row.benefit_total
                            : source === 'restaurant'
                              ? row.benefit_restaurant
                              : row.benefit_delivery;
                        return (
                          <tr key={row.period_label || row.period} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                              {row.period_label}
                            </td>
                            {(source === 'both' || source === 'restaurant') && (
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                {formatCurrency(row.benefit_restaurant)}
                              </td>
                            )}
                            {(source === 'both' || source === 'delivery') && (
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                {formatCurrency(row.benefit_delivery)}
                              </td>
                            )}
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                              {formatCurrency(rowTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
