import React from 'react';

interface BCSSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export const BCSSelector: React.FC<BCSSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            value === score
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {score}
        </button>
      ))}
    </div>
  );
};
