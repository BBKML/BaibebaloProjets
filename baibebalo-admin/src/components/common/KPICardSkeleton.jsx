import Skeleton from './Skeleton';

const KPICardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6" style={{ minHeight: '140px' }}>
      <div className="flex items-start justify-between mb-4">
        {/* Icône skeleton - cercle 48px */}
        <Skeleton variant="circular" width="48px" height="48px" />
      </div>
      
      {/* Titre skeleton - 60% largeur, 14px hauteur */}
      <Skeleton variant="text" width="60%" height="14px" className="mb-3" />
      
      {/* Valeur skeleton (épaisse) - 80% largeur, 32px hauteur */}
      <Skeleton variant="text" width="80%" height="32px" className="mb-2" />
      
      {/* Variation skeleton (fine) - 40% largeur, 14px hauteur */}
      <Skeleton variant="text" width="40%" height="14px" />
    </div>
  );
};

export default KPICardSkeleton;
