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
        <div className="bg-white shadow-md rounded p-2 text-sm">
          <p className="font-semibold">{label}</p>
          <p>Leads: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis dataKey="state" />
        <YAxis tickFormatter={(value) => value.toString()} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" fill="#E91E63" barSize={30} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
