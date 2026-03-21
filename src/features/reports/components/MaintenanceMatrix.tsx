import React from 'react';
import { MaintenanceLog, Animal, AnimalCategory } from '../../../types';

interface MaintenanceMatrixProps {
  animals: Animal[];
  logs: MaintenanceLog[];
}

export const MaintenanceMatrix: React.FC<MaintenanceMatrixProps> = ({ animals, logs }) => {
  const exotics = animals.filter(a => a.category === AnimalCategory.EXOTICS);
  
  const getBulbAge = (log: MaintenanceLog) => {
    const logDate = new Date(log.date_logged);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - logDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  };

  const uvLogs = logs.filter(l => l.task_type === 'UV Replacement');

  return (
    <div className="space-y-8">
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">UV Bulb Matrix (Exotics)</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Enclosure/Animal</th>
              <th className="px-4 py-3">Last UV Change</th>
              <th className="px-4 py-3">Bulb Age (Months)</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {exotics.map(animal => {
              const lastLog = uvLogs
                .filter(l => l.enclosure_id === animal.id)
                .sort((a, b) => new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime())[0];
              
              const age = lastLog ? getBulbAge(lastLog) : null;
              const isOld = age !== null && age > 6;

              return (
                <tr key={animal.id} className={isOld ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}>
                  <td className="px-4 py-3 font-medium">{animal.name}</td>
                  <td className="px-4 py-3">{lastLog ? new Date(lastLog.date_logged).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3">{age !== null ? age : 'N/A'}</td>
                  <td className="px-4 py-3 font-bold">{isOld ? 'REPLACE' : 'OK'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Pending Work Orders</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Enclosure/Animal</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Date Logged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.filter(l => l.status === 'Pending').map(log => (
              <tr key={log.id}>
                <td className="px-4 py-3">{log.enclosure_id}</td>
                <td className="px-4 py-3">{log.task_type}</td>
                <td className="px-4 py-3">{new Date(log.date_logged).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
