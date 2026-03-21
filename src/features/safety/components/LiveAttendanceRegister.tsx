import React, { useEffect } from 'react';

interface LiveAttendanceRegisterProps {
  value: Record<string, boolean>;
  onChange: (val: Record<string, boolean>) => void;
  readOnly?: boolean;
  currentlyClockedIn: string[];
}

export const LiveAttendanceRegister: React.FC<LiveAttendanceRegisterProps> = ({
  value,
  onChange,
  readOnly = false,
  currentlyClockedIn
}) => {
  useEffect(() => {
    if (Object.keys(value).length === 0 && currentlyClockedIn.length > 0) {
      const initialAttendance: Record<string, boolean> = {};
      currentlyClockedIn.forEach(staff => {
        initialAttendance[staff] = false;
      });
      onChange(initialAttendance);
    }
  }, [currentlyClockedIn, value, onChange]);

  const toggleAccounted = (staff: string) => {
    if (readOnly) return;
    onChange({ ...value, [staff]: !value[staff] });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Attendance Register</h3>
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
        {currentlyClockedIn.map(staff => (
          <div key={staff} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
            <span className="text-sm font-bold text-slate-700">{staff}</span>
            <button
              type="button"
              onClick={() => toggleAccounted(staff)}
              disabled={readOnly}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                value[staff] 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {value[staff] ? 'Accounted' : 'Unaccounted'}
            </button>
          </div>
        ))}
        {currentlyClockedIn.length === 0 && (
          <p className="text-xs text-slate-400 italic">No staff currently clocked in.</p>
        )}
      </div>
    </div>
  );
};
