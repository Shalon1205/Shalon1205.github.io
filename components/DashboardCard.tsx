import React, { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  height?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className = "", height = "h-64" }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-100 p-4 flex flex-col ${className} ${height}`}>
      <h3 className="text-slate-800 font-bold text-base mb-4 border-l-4 border-blue-500 pl-2 leading-tight">
        {title}
      </h3>
      <div className="flex-1 min-h-0 w-full">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;