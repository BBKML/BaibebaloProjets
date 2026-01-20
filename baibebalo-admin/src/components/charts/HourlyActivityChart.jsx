import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const HourlyActivityChart = ({ data = [] }) => {
  // Créer un tableau pour les 24 heures
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Mapper les données par heure
  const hourMap = new Map();
  data.forEach(item => {
    hourMap.set(item.hour, item.orders_count || 0);
  });

  // Créer les données complètes avec toutes les heures
  const chartData = hours.map(hour => ({
    hour: hour,
    hourLabel: `${hour.toString().padStart(2, '0')}h`,
    orders: hourMap.get(hour) || 0,
  }));

  // Identifier les pics (top 25% des heures)
  const sortedByOrders = [...chartData].sort((a, b) => b.orders - a.orders);
  const top25Percent = Math.ceil(chartData.length * 0.25);
  const peakThreshold = sortedByOrders[top25Percent - 1]?.orders || 0;

  // Identifier les creux (bottom 25% des heures avec au moins une commande)
  const activeHours = chartData.filter(d => d.orders > 0);
  const bottom25Percent = Math.ceil(activeHours.length * 0.25);
  const lowThreshold = activeHours.length > 0
    ? [...activeHours].sort((a, b) => a.orders - b.orders)[bottom25Percent - 1]?.orders || 0
    : 0;

  // Fonction pour déterminer la couleur
  const getColor = (orders) => {
    if (orders >= peakThreshold && orders > 0) {
      return '#10b981'; // Vert pour les pics
    } else if (orders <= lowThreshold && orders > 0) {
      return '#f59e0b'; // Orange pour les creux
    } else if (orders === 0) {
      return '#e5e7eb'; // Gris pour aucune activité
    }
    return '#0ca3e9'; // Bleu pour activité normale
  };

  return (
    <div className="w-full h-64 relative" style={{ minWidth: 0, minHeight: '256px', width: '100%' }}>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Aucune donnée disponible</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis 
              dataKey="hourLabel" 
              stroke="#94a3b8"
              fontSize={10}
              tick={{ fill: '#94a3b8' }}
              interval={2} // Afficher une heure sur deux pour éviter la surcharge
            />
            <YAxis 
              stroke="#94a3b8"
              fontSize={10}
              tick={{ fill: '#94a3b8' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
              formatter={(value) => [`${value} commandes`, 'Commandes']}
            />
            <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.orders)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      {/* Légende */}
      <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Pics (12h-14h, 19h-21h)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Activité normale</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>Creux</span>
        </div>
      </div>
    </div>
  );
};

export default HourlyActivityChart;
