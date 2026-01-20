import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const LineChart = ({ data = [], dataKey = 'value', nameKey = 'name', color = '#0ca3e9', strokeWidth = 3 }) => {
  // Utiliser les données réelles uniquement
  const chartData = data || [];

  return (
    <div className="w-full relative" style={{ minWidth: 0, height: '256px' }}>
      <ResponsiveContainer width="100%" height={256} minWidth={0}>
        <RechartsLineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
          <XAxis 
            dataKey={nameKey}
            stroke="#94a3b8"
            fontSize={10}
            fontWeight="bold"
            tick={{ fill: '#94a3b8' }}
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
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color}
            strokeWidth={strokeWidth}
            dot={{ fill: color, strokeWidth: 2, stroke: '#fff', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
