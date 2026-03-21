import React, { useState } from 'react';
import { BrainCircuit, Globe2, RefreshCw } from 'lucide-react';
import { useIntelligenceData } from '../useIntelligenceData';

const Intelligence: React.FC = () => {
  const { runIUCNScan } = useIntelligenceData();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const handleRunIUCNScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    
    await runIUCNScan((progress) => {
      setScanProgress(progress);
    });
    
    setIsScanning(false);
    setScanProgress(100);
  };

  return (
    <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-200 pb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <BrainCircuit size={28} className="text-purple-600" /> Species Intelligence
          </h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Automated Taxonomy & Conservation Status Sync</p>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
        <div className="p-4 bg-purple-50 text-purple-600 rounded-full mb-2">
          <Globe2 size={48} />
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Global IUCN Database Sync</h4>
          <p className="text-sm font-medium text-slate-500 max-w-lg mx-auto">
            Scan your entire animal collection against the IUCN Red List database to automatically update conservation status and scientific taxonomy.
          </p>
        </div>

        {isScanning ? (
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>Analyzing Collection...</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-purple-600 transition-all duration-300 ease-out flex items-center justify-center"
                style={{ width: `${scanProgress}%` }}
              >
                <div className="w-full h-full opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
              </div>
            </div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest animate-pulse">
              AI Processing Active - Do not close tab
            </p>
          </div>
        ) : (
          <button 
            onClick={handleRunIUCNScan} 
            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-purple-700 transition-all shadow-xl active:scale-95 flex items-center gap-3"
          >
            <RefreshCw size={18} /> Run Auto-Discovery
          </button>
        )}
      </div>
    </div>
  );
};

export default Intelligence;
