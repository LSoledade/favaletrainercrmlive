
import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <Card variant="glow" className={className}>
      <div className="flex justify-between items-center p-3 sm:p-4 border-b dark:border-slate-700">
        <h3 className="font-heading text-base sm:text-lg font-medium dark:text-white dark:glow-text-subtle truncate">{title}</h3>
        <button className="text-gray-400 hover:text-secondary dark:text-gray-300 dark:hover:text-pink-400 ml-2 transition-all duration-200">
          <span className="material-icons text-base sm:text-lg">more_vert</span>
        </button>
      </div>
      <div className="p-2 sm:p-4 h-[250px] sm:h-[300px]">
        {children}
      </div>
    </Card>
  );
}
