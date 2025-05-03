import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SourceData {
  Favale: number;
  Pink: number;
}

interface SourcePieChartProps {
  data: SourceData;
}

export default function SourcePieChart({ data }: SourcePieChartProps) {
  // Format data for chart
  const chartData = [
    { name: 'Favale', value: data.Favale },
    { name: 'Pink', value: data.Pink }
  ];
  
  // Calculate percentages
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
  const formattedData = chartData.map(item => ({
    ...item,
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
  }));
  
  const COLORS = ['#E91E63', '#311B92'];
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white shadow-md rounded p-2 text-sm">
          <p className="font-semibold">{payload[0].name}</p>
          <p>Leads: {payload[0].value}</p>
          <p>{payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percentage }) => `${name} (${percentage}%)`}
        >
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
