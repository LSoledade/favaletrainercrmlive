
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-primary/5 p-4 sm:p-6 hover:shadow-md dark:hover:shadow-primary/10 transition-all duration-200">
      <div className="flex justify-between items-start">
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight dark:text-white">{value}</p>

          <div className={`flex flex-wrap items-center ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <span className="material-icons text-sm">
              {change >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span className="ml-1 text-sm font-medium">{Math.abs(change)}%</span>
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 hidden xs:inline">vs último mês</span>
          </div>
        </div>

        <div className={`${iconBgColor} dark:bg-opacity-20 p-2 sm:p-3 rounded-lg`}>
          <span className={`material-icons text-base sm:text-lg ${iconColor}`}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
