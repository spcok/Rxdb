import React from 'react';
import { Animal } from '../../../types';

interface DispositionReportProps {
  animals: Animal[];
}

export const DispositionReport: React.FC<DispositionReportProps> = ({ animals }) => {
  const dispositionAnimals = animals
    .filter(a => a.disposition_status === 'Transferred' || a.disposition_status === 'Deceased' || a.origin_location)
    .sort((a, b) => (b.transfer_date || '').localeCompare(a.transfer_date || ''));

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 print:block">Animal Disposition & Transfer Ledger</h2>
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Animal Name / Species</th>
            <th className="px-4 py-3">Microchip ID</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Origin / Destination</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {dispositionAnimals.map(animal => (
            <tr key={animal.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">{animal.transfer_date || 'N/A'}</td>
              <td className="px-4 py-3 font-medium">{animal.name} ({animal.species})</td>
              <td className="px-4 py-3">{animal.microchip_id || 'N/A'}</td>
              <td className="px-4 py-3">{animal.disposition_status || 'Arrival'}</td>
              <td className="px-4 py-3">{animal.origin_location || animal.destination_location || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-12 pt-8 border-t border-slate-300 print:block hidden">
        <p className="text-sm font-medium">Inspector Signature: __________________________ Date: __________</p>
      </div>
    </div>
  );
};
