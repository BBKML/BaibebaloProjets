import Skeleton from './Skeleton';

const ChartSkeleton = ({ type = 'line' }) => {
  if (type === 'line') {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        {/* Titre visible (pas de skeleton selon maquette) */}
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue (30 Days)</h3>
        
        {/* Zone graphique avec lignes ondulées */}
        <div className="h-[300px] relative">
          {/* Axes */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
          <div className="absolute bottom-0 left-0 top-0 w-px bg-gray-200"></div>
          
          {/* Ligne ondulée SVG pour simuler la courbe */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f3f4f6" />
                <stop offset="50%" stopColor="#e5e7eb" />
                <stop offset="100%" stopColor="#f3f4f6" />
              </linearGradient>
            </defs>
            <path
              d="M 0,80 Q 10,60 20,50 T 40,40 T 60,35 T 80,30 T 100,25"
              fill="none"
              stroke="url(#shimmer-gradient)"
              strokeWidth="2"
              className="skeleton"
            />
            <path
              d="M 0,80 Q 10,60 20,50 T 40,40 T 60,35 T 80,30 T 100,25 L 100,100 L 0,100 Z"
              fill="url(#shimmer-gradient)"
              fillOpacity="0.3"
              className="skeleton"
            />
          </svg>
        </div>
      </div>
    );
  }
  
  if (type === 'doughnut') {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        {/* Titre visible (pas de skeleton selon maquette) */}
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Méthodes de paiement</h3>
        
        {/* Anneau skeleton (doughnut) */}
        <div className="flex justify-center items-center">
          <div className="relative w-[200px] h-[200px]">
            {/* Cercle extérieur avec border pour créer l'anneau */}
            <div 
              className="w-full h-full rounded-full skeleton"
              style={{
                border: '40px solid #e5e7eb',
                boxSizing: 'border-box',
              }}
            ></div>
            {/* Centre vide (cercle intérieur) */}
            <div 
              className="absolute rounded-full bg-gray-50"
              style={{
                width: 'calc(100% - 80px)',
                height: 'calc(100% - 80px)',
                top: '40px',
                left: '40px',
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default ChartSkeleton;
