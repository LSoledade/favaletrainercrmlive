import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StateBarChartProps {
  data: Record<string, number>;
}

export default function StateBarChart({ data }: StateBarChartProps) {
  // Format data for chart
  const chartData = Object.entries(data)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7); // Take top 7 states
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 shadow-md dark:shadow-black/30 rounded p-2 text-xs sm:text-sm border border-gray-100 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-gray-200">{label}</p>
          <p className="text-gray-600 dark:text-gray-300">Leads: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="w-full overflow-auto pb-2 h-full">
      <div className="min-w-[320px] xs:min-w-[400px] sm:min-w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis dataKey="state" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => value.toString()} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#E91E63" barSize={20} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
