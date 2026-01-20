const TransactionHistorySkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Heading & Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="h-9 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-11 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>

      {/* Filter Skeleton Row */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={`filter-skeleton-${i}`}
            className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"
          />
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Référence</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skeleton-row-${i}`} className="border-t border-slate-100 dark:border-slate-700/50">
                  <td className="px-6 py-5">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-60" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-40" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse opacity-30" />
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-50" />
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-70" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse opacity-40" />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <div className="size-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-20" />
                      <div className="size-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-20" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-40" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`pagination-skeleton-${i}`}
                className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse opacity-30"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistorySkeleton;
