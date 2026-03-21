import React from 'react';

interface IUCNBadgeProps {
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'EX': { label: 'Extinct', color: 'text-white', bg: 'bg-slate-900' },
  'EW': { label: 'Extinct in Wild', color: 'text-white', bg: 'bg-slate-800' },
  'CR': { label: 'Critically Endangered', color: 'text-white', bg: 'bg-red-600' },
  'EN': { label: 'Endangered', color: 'text-white', bg: 'bg-orange-600' },
  'VU': { label: 'Vulnerable', color: 'text-white', bg: 'bg-yellow-600' },
  'NT': { label: 'Near Threatened', color: 'text-white', bg: 'bg-lime-600' },
  'LC': { label: 'Least Concern', color: 'text-white', bg: 'bg-emerald-600' },
  'DD': { label: 'Data Deficient', color: 'text-slate-700', bg: 'bg-slate-200' },
  'NE': { label: 'Not Evaluated', color: 'text-slate-700', bg: 'bg-slate-100' },
};

export const IUCNBadge: React.FC<IUCNBadgeProps> = ({ status = 'NE', size = 'sm' }) => {
  const config = STATUS_MAP[status] || STATUS_MAP['NE'];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`${config.bg} ${config.color} ${sizeClasses[size]} font-medium rounded-full`}>
      {config.label}
    </span>
  );
};
