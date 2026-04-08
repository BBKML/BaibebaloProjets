import Skeleton from './Skeleton';

const KPICardSkeleton = () => (
  <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
    {/* Accent bar */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-t-2xl" />

    <div className="flex items-start justify-between mb-4 mt-1">
      <Skeleton variant="rounded" width="44px" height="44px" className="rounded-xl" />
      <Skeleton variant="text" width="72px" height="22px" className="rounded-full" />
    </div>

    <Skeleton variant="text" width="55%" height="13px" className="mb-2" />
    <Skeleton variant="text" width="75%" height="28px" className="mb-2" />
    <Skeleton variant="text" width="45%" height="11px" />
  </div>
);

export default KPICardSkeleton;
