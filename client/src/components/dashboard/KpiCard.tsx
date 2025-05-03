interface KpiCardProps {
  title: string;
  value: number | string;
  icon: string;
  change: number;
  iconBgColor: string;
  iconColor: string;
}

export default function KpiCard({ 
  title, 
  value, 
  icon, 
  change, 
  iconBgColor, 
  iconColor 
}: KpiCardProps) {
  const isPositiveChange = change >= 0;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className={`h-10 w-10 rounded-full ${iconBgColor} flex items-center justify-center`}>
          <span className={`material-icons ${iconColor}`}>{icon}</span>
        </div>
      </div>
      
      <div className={`flex items-center text-sm ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
        <span className="material-icons text-sm mr-1">
          {isPositiveChange ? 'arrow_upward' : 'arrow_downward'}
        </span>
        <span>{Math.abs(change)}% vs. mês anterior</span>
      </div>
    </div>
  );
}
