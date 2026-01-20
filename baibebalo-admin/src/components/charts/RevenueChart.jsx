import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const RevenueChart = ({ data = [], previousMonthData = [], forecastData = [] }) => {
  // Utiliser les données réelles, ou un tableau vide
  const chartData = data.length > 0 ? data : [];
  
  // Combiner les données actuelles avec les prévisions
  const combinedData = [...chartData, ...forecastData];

  return (
    <div className="w-full h-64 relative" style={{ minWidth: 0, minHeight: '256px', width: '100%' }}>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Aucune donnée disponible</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <AreaChart data={combinedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ca3e9" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#0ca3e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              stroke="#94a3b8"
              fontSize={10}
              fontWeight="bold"
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis 
              stroke="#94a3b8"
              fontSize={10}
              tick={{ fill: '#94a3b8' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
              formatter={(value, name) => {
                if (name === 'revenue') {
                  return [`${value.toLocaleString('fr-FR')} FCFA`, 'Revenu actuel'];
                } else if (name === 'previousRevenue') {
                  return [`${value.toLocaleString('fr-FR')} FCFA`, 'Mois précédent'];
                } else if (name === 'movingAverage') {
                  return [`${value.toLocaleString('fr-FR')} FCFA`, 'Moyenne mobile'];
                } else if (name === 'forecast') {
                  return [`${value.toLocaleString('fr-FR')} FCFA`, 'Prévision'];
                }
                return [value, name];
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => {
                const labels = {
                  revenue: 'Revenu actuel',
                  previousRevenue: 'Mois précédent',
                  movingAverage: 'Moyenne mobile (7j)',
                  forecast: 'Prévision',
                };
                return labels[value] || value;
              }}
            />
            {/* Données du mois précédent (ligne pointillée) */}
            {previousMonthData.length > 0 && (
              <Line
                type="monotone"
                dataKey="revenue"
                data={previousMonthData}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="previousRevenue"
                connectNulls
              />
            )}
            {/* Revenu actuel (zone remplie) */}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0ca3e9"
              strokeWidth={3}
              fill="url(#colorRevenue)"
              dot={{ fill: '#0ca3e9', strokeWidth: 2, stroke: '#fff', r: 4 }}
              activeDot={{ r: 6 }}
              name="revenue"
            />
            {/* Moyenne mobile (ligne) */}
            {chartData.some(d => d.movingAverage !== undefined) && (
              <Line
                type="monotone"
                dataKey="movingAverage"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="movingAverage"
                connectNulls
              />
            )}
            {/* Prévisions (ligne pointillée) */}
            {forecastData.length > 0 && (
              <Line
                type="monotone"
                dataKey="revenue"
                data={forecastData}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ fill: '#f59e0b', strokeWidth: 2, stroke: '#fff', r: 3 }}
                name="forecast"
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default RevenueChart;
