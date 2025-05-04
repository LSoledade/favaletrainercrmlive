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
  return (
    <div className="bg-white dark:bg-slate-800 dark:border dark:border-slate-700 rounded-lg shadow-md dark:shadow-primary/5 p-5 hover:shadow-lg dark:hover:glow-xs transition-all duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 dark:text-gray-300 font-medium text-sm mb-1">{title}</h3>
          <p className="text-2xl font-semibold dark:text-white dark:glow-text">{value}</p>

          <div className={`flex items-center mt-2 ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <span className="material-icons text-sm">
              {change >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span className="ml-1 text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        </div>

        <div className={`${iconBgColor} dark:bg-opacity-30 p-3 rounded-lg dark:glow-xs`}>
          <span className={`material-icons ${iconColor} dark:text-opacity-90`}>{icon}</span>
        </div>
      </div>
    </div>
  );
}