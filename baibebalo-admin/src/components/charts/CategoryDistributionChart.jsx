import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#0ca3e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CategoryDistributionChart = ({ data = [] }) => {
  // Formater les données pour le graphique
  const chartData = data.map(item => ({
    name: item.category || 'Non spécifié',
    value: item.orders_count || 0,
    revenue: item.revenue || 0,
  }));

  // Calculer le total pour les pourcentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Formater les données avec pourcentages
  const formattedData = chartData.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
  }));

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Ne pas afficher les labels trop petits

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full h-64 relative" style={{ minWidth: 0, minHeight: '256px', width: '100%' }}>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Aucune donnée disponible</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
              formatter={(value, name, props) => {
                if (name === 'value') {
                  return [
                    `${value} commandes (${props.payload.percentage}%)`,
                    'Commandes'
                  ];
                }
                return [value, name];
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => {
                const item = formattedData.find(d => d.name === value);
                return `${value} (${item?.percentage || 0}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default CategoryDistributionChart;
