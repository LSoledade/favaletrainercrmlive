import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-5 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading text-lg font-medium">{title}</h3>
        <button className="text-gray-400 hover:text-secondary">
          <span className="material-icons">more_vert</span>
        </button>
      </div>
      <div className="h-64 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
