import React from 'react';
import { changelogData } from '../../../data/changelog';
import { History, BadgeCheck, ShieldCheck } from 'lucide-react';

const Changelog: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <History className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Release Notes</h2>
          <p className="text-sm text-gray-500">Track updates and improvements to the system.</p>
        </div>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {changelogData.map((entry) => (
          <div key={entry.version} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-indigo-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <BadgeCheck className="w-5 h-5" />
            </div>
            
            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-bold text-slate-900">{entry.version}</div>
                <time className="font-mono text-xs font-medium text-indigo-500">{entry.date}</time>
              </div>
              <div className="mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  entry.type === 'Major' ? 'bg-purple-100 text-purple-800' :
                  entry.type === 'Minor' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {entry.type} Release
                </span>
              </div>
              <ul className="text-slate-500 text-sm space-y-2">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center text-center">
        <ShieldCheck className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">ZLA 1981 Compliance Verified</h3>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          All updates are rigorously tested for audit trail integrity and data preservation standards required by the Zoo Licensing Act.
        </p>
      </div>
    </div>
  );
};

export default Changelog;
