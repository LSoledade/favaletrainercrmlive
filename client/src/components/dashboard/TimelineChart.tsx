import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TimelineChart() {
  const [timeRange, setTimeRange] = useState('7d');
  
  // This would normally be fetched from the API based on the selected time range
  // For now, we'll just use some static data for demonstration
  const data = [
    { name: 'Dom', novosLeads: 120, convertidos: 20 },
    { name: 'Seg', novosLeads: 160, convertidos: 30 },
    { name: 'Ter', novosLeads: 140, convertidos: 25 },
    { name: 'Qua', novosLeads: 180, convertidos: 35 },
    { name: 'Qui', novosLeads: 200, convertidos: 40 },
    { name: 'Sex', novosLeads: 220, convertidos: 50 },
    { name: 'Sáb', novosLeads: 190, convertidos: 45 },
  ];
  
  return (
    <div className="w-full h-full">
      <div className="flex justify-end mb-4">
        <select 
          className="text-sm border rounded px-2 py-1 text-gray-700"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="year">Este ano</option>
        </select>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="novosLeads" 
            name="Novos Leads" 
            stroke="#E91E63" 
            strokeWidth={2} 
            activeDot={{ r: 8 }} 
          />
          <Line 
            type="monotone" 
            dataKey="convertidos" 
            name="Convertidos" 
            stroke="#311B92" 
            strokeWidth={2} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
