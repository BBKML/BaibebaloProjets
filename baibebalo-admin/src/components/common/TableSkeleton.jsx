import Skeleton from './Skeleton';

const TableSkeleton = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* En-têtes visibles (pas de skeleton selon maquette) */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="grid grid-cols-6 gap-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">ORDER ID</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">CLIENT</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">RESTAURANT</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">MONTANT</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">STATUT</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">TEMPS</div>
        </div>
      </div>
      
      {/* Lignes skeleton */}
      <div className="divide-y divide-gray-200">
        {[...Array(rows)].map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className={`px-6 py-4 ${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            style={{ height: '56px' }}
          >
            <div className="grid grid-cols-6 gap-4 items-center h-full">
              {/* Colonne 1: ORDER ID (pas d'avatar dans la maquette) */}
              <Skeleton variant="text" width="70%" height="16px" />
              
              {/* Colonne 2: CUSTOMER */}
              <Skeleton variant="text" width="80%" height="16px" />
              
              {/* Colonne 3: RESTAURANT */}
              <Skeleton variant="text" width="75%" height="16px" />
              
              {/* Colonne 4: AMOUNT */}
              <Skeleton variant="text" width="60%" height="16px" />
              
              {/* Colonne 5: STATUS (badge) */}
              <Skeleton variant="rectangular" width="80px" height="24px" className="rounded-full" />
              
              {/* Colonne 6: TIME */}
              <Skeleton variant="text" width="50%" height="16px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;
