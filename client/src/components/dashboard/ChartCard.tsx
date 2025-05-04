import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 dark:border dark:border-slate-700 rounded-lg shadow-md dark:shadow-primary/5 p-5 transition-all duration-200 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading text-lg font-medium dark:text-white dark:glow-text">{title}</h3>
        <button className="text-gray-400 hover:text-secondary dark:hover:text-primary dark:hover:glow-text">
          <span className="material-icons">more_vert</span>
        </button>
      </div>
      <div className="h-64 flex items-center justify-center dark:text-white">
        {children}
      </div>
    </div>
  );
}
