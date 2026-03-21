import React, { useState, useMemo } from 'react';
import { Info, ChevronRight, ShieldAlert } from 'lucide-react';
import { useMissingRecordsData } from './useMissingRecordsData';

const MissingRecords: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Husbandry' | 'Details' | 'Health'>('Husbandry');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { alerts, complianceStats, categoryCompliance } = useMissingRecordsData();

  const categories = useMemo(() => ['ALL', ...Object.keys(categoryCompliance)], [categoryCompliance]);

  const filteredComplianceStats = useMemo(() => {
    if (selectedCategory === 'ALL') return complianceStats;
    return complianceStats.filter(stat => {
        const animal = alerts.find(a => a.animal_id === stat.animal_id);
        return animal?.animal_category === selectedCategory;
    });
  }, [complianceStats, alerts, selectedCategory]);

  const currentCategoryScores = useMemo(() => {
    if (selectedCategory === 'ALL') {
        const categories = Object.values(categoryCompliance);
        if (categories.length === 0) return { husbandry: 0, details: 0, health: 0 };
        return {
            husbandry: Math.round(categories.reduce((a, b) => a + b.husbandry, 0) / categories.length),
            details: Math.round(categories.reduce((a, b) => a + b.details, 0) / categories.length),
            health: Math.round(categories.reduce((a, b) => a + b.health, 0) / categories.length),
        };
    }
    return categoryCompliance[selectedCategory] || { husbandry: 0, details: 0, health: 0 };
  }, [categoryCompliance, selectedCategory]);

  const renderStatusDot = (score: number) => {
    const color = score === 100 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-rose-500';
    return <div className={`w-3 h-3 rounded-full ${color} shadow-sm flex-shrink-0`} />;
  };

  const renderComplianceList = () => (
    <div className="space-y-6">
        {/* Internal Compliance Bar */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg">{selectedCategory} Compliance</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Overall Category Health</p>
                </div>
            </div>
            
            <div className="flex gap-8 text-center bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Husbandry</p>
                    <p className={`text-2xl font-black ${currentCategoryScores.husbandry < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {currentCategoryScores.husbandry}%
                    </p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Details</p>
                    <p className={`text-2xl font-black ${currentCategoryScores.details < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {currentCategoryScores.details}%
                    </p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Health</p>
                    <p className={`text-2xl font-black ${currentCategoryScores.health < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {currentCategoryScores.health}%
                    </p>
                </div>
            </div>
        </div>

        {/* Master Card List */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {activeTab} Action Items
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Sorted by Urgency
                </span>
            </div>
            
            <div className="divide-y divide-slate-100">
                {filteredComplianceStats.map(stat => {
                    const animalAlert = alerts.find(a => a.animal_id === stat.animal_id && a.category === activeTab);
                    if (!animalAlert) return null;
                    
                    const score = activeTab === 'Details' ? stat.detailsScore : activeTab === 'Health' ? stat.healthScore : stat.husbandryScore;
                    
                    const missingContext = activeTab === 'Details' ? 'Scientific Name / Taxonomy' : 
                                           activeTab === 'Health' ? 'Clinical Check / Weight Record' : 
                                           'Feeding / Cleaning Log';

                    return (
                        <div key={stat.animal_id} className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all group">
                            
                            {/* Animal Info */}
                            <div className="flex items-center gap-5">
                                {renderStatusDot(score)}
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                                        {animalAlert.animal_name}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                        Missing: <span className="text-slate-800">{missingContext}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Badges & Actions */}
                            <div className="flex items-center gap-4 sm:gap-6">
                                <span className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    {animalAlert.days_overdue} Days Overdue
                                </span>
                                
                                <button className="flex items-center justify-center gap-1 text-emerald-700 font-black uppercase tracking-widest text-[10px] bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-xl hover:bg-emerald-100 hover:text-emerald-800 transition-all shadow-sm">
                                    Resolve <ChevronRight size={14} />
                                </button>
                            </div>

                        </div>
                    );
                })}
                {filteredComplianceStats.filter(stat => alerts.some(a => a.animal_id === stat.animal_id && a.category === activeTab)).length === 0 && (
                    <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
                            <ShieldAlert size={32} />
                        </div>
                        <div>
                            <p className="text-slate-900 font-bold text-lg">Fully Compliant</p>
                            <p className="text-slate-500 text-sm font-medium mt-1">No missing {activeTab.toLowerCase()} records found for this category.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <div className="">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">ZLA COMPLIANCE</h1>
          <p className="text-sm text-slate-500 mt-1">Track missing mandatory records for Zoo Licensing Act</p>
        </div>
        <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-tight text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm cursor-pointer"
        >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {(['Husbandry', 'Details', 'Health'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl border-2 whitespace-nowrap ${
              activeTab === tab
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderComplianceList()}

      <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex gap-5 items-start shadow-sm mt-8">
        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 flex-shrink-0">
          <Info size={24} />
        </div>
        <div>
          <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-1.5">Zoo Licensing Act Compliance Standard</h4>
          <p className="text-sm text-emerald-800 leading-relaxed font-medium">
            Standard ZLA requirements mandate regular health monitoring. Weights should be recorded at least fortnightly (14 days), feeds daily/weekly (7 days), and a clinical health check must be performed annually (365 days) for active animals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MissingRecords;
