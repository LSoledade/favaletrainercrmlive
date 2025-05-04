
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-primary/5 transition-all duration-200 ${className}`}>
      <div className="flex justify-between items-center p-3 sm:p-4 border-b dark:border-slate-700">
        <h3 className="font-heading text-base sm:text-lg font-medium dark:text-white truncate">{title}</h3>
        <button className="text-gray-400 hover:text-secondary dark:text-gray-300 dark:hover:text-pink-400 ml-2">
          <span className="material-icons text-base sm:text-lg">more_vert</span>
        </button>
      </div>
      <div className="p-2 sm:p-4 h-[250px] sm:h-[300px]">
        {children}
      </div>
    </div>
  );
}
