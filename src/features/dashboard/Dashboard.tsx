import React, { useState } from 'react';
import { AnimalCategory } from '../../types';
import { Heart, AlertCircle, Plus, Calendar, Scale, Drumstick, ArrowUpDown, Loader2, ClipboardCheck, CheckCircle, ChevronUp, ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react';
import { formatWeightDisplay } from '../../services/weightUtils';
import AnimalFormModal from '../animals/AnimalFormModal';
import { useDashboardData, EnhancedAnimal } from './useDashboardData';
import { usePermissions } from '../../hooks/usePermissions';

interface DashboardProps {
  onSelectAnimal: (animal: EnhancedAnimal) => void;
  activeTab: AnimalCategory | 'ARCHIVED';
  setActiveTab: (tab: AnimalCategory | 'ARCHIVED') => void;
  viewDate: string;
  setViewDate: (date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    onSelectAnimal, activeTab, setActiveTab, viewDate, setViewDate
}) => {
  const permissions = usePermissions();
  const {
    filteredAnimals,
    animalStats,
    taskStats,
    isLoading,
    cycleSort,
    sortOption,
    isOrderLocked,
    toggleOrderLock
  } = useDashboardData(activeTab, viewDate);

  const [isCreateAnimalModalOpen, setIsCreateAnimalModalOpen] = useState(false);
  const [isBentoMinimized, setIsBentoMinimized] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (!permissions.view_animals) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold uppercase tracking-tight">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view the animal directory. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const getWeightDisplay = (log?: { weight?: number; weight_unit?: string; weight_grams?: number; value?: string | number }, unit: 'g' | 'oz' | 'lbs_oz' | 'kg' = 'g') => {
      if (!log) return '-';
      if (log.weight) return `${log.weight}${log.weight_unit || 'g'}`;
      if (log.weight_grams) return formatWeightDisplay(log.weight_grams, unit);
      return typeof log.value === 'string' ? log.value : String(log.value || '-');
  };

  const getSafeDate = (dateStr?: string | Date | null) => {
      if (!dateStr) return 'N/A';
      try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return 'N/A';
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      } catch {
          return 'N/A';
      }
  };

  if (isLoading) {
    return (
          <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading Dashboard...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 pt-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-0.5 flex items-center gap-2 text-xs">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} <span className="text-slate-300">|</span> 🌤️ 14°C Partly Cloudy
          </p>
        </div>
      </div>

      {/* Tasks & Health Rota Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><ClipboardCheck size={18} /></div>
                      <h2 className="text-base font-semibold text-slate-800">Pending Duties</h2>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{taskStats?.pendingTasks?.length || 0}</span>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          {isBentoMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                  </div>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-3 flex-1 overflow-y-auto max-h-48 pr-2 space-y-2 scrollbar-hide">
                      {(taskStats?.pendingTasks?.length || 0) > 0 ? (
                          (taskStats?.pendingTasks || []).map(t => (
                              <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all group">
                                  <div className="mt-1 p-0.5 bg-amber-100 rounded-full">
                                    <AlertCircle size={12} className="text-amber-600 shrink-0"/>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-900 leading-tight truncate">{t.title}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <Calendar size={10} className="text-slate-400" />
                                        <p className="text-[10px] text-slate-500">Due: {getSafeDate(t.due_date)}</p>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                              <div className="p-2 bg-emerald-50 rounded-full mb-2">
                                <CheckCircle size={24} className="text-emerald-500 opacity-80"/>
                              </div>
                              <p className="text-xs font-medium text-slate-500">All Duties Satisfied</p>
                          </div>
                      )}
                  </div>
              )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><Heart size={18} /></div>
                      <h2 className="text-base font-semibold text-slate-800">Health Rota</h2>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{taskStats?.pendingHealth?.length || 0}</span>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          {isBentoMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                  </div>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-3 flex-1 overflow-y-auto max-h-48 pr-2 space-y-2 scrollbar-hide">
                      {(taskStats?.pendingHealth?.length || 0) > 0 ? (
                          (taskStats?.pendingHealth || []).map(t => (
                              <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg bg-rose-50/30 border border-rose-100 hover:border-rose-300 hover:bg-white transition-all group">
                                  <div className="mt-1 p-0.5 bg-rose-100 rounded-full">
                                    <Heart size={12} className="text-rose-600 shrink-0"/>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-900 leading-tight truncate">{t.title}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <Calendar size={10} className="text-slate-400" />
                                        <p className="text-[10px] text-slate-500">Mandatory: {getSafeDate(t.due_date)}</p>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                              <div className="p-2 bg-rose-50 rounded-full mb-2">
                                <Heart size={24} className="text-rose-300 opacity-60"/>
                              </div>
                              <p className="text-xs font-medium text-slate-500">Collection Stable</p>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-[#0fa968] rounded-xl p-4 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-[10px] font-medium opacity-90 mb-0.5">Weighed Today</div>
            <div className="text-xl lg:text-2xl font-bold">
              {animalStats?.weighed || 0}<span className="text-xs lg:text-sm opacity-80">/{animalStats?.total || 0}</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Scale size={20} className="text-white" />
          </div>
        </div>
        <div className="bg-[#f97316] rounded-xl p-4 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-[10px] font-medium opacity-90 mb-0.5">Fed Today</div>
            <div className="text-xl lg:text-2xl font-bold">
              {animalStats?.fed || 0}<span className="text-xs lg:text-sm opacity-80">/{animalStats?.total || 0}</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Drumstick size={20} className="text-white" />
          </div>
        </div>
      </div>

      {/* Viewing Options Control Bar */}
      <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Row 1: Date Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium whitespace-nowrap text-[10px] lg:text-xs">
            <Calendar size={16} className="text-blue-600" />
            Viewing Date:
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().split('T')[0]); }} className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">← Prev</button>
            <div className="relative flex-1 sm:flex-none min-w-[120px]">
              <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="w-full pl-2 pr-8 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d.toISOString().split('T')[0]); }} className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">Next →</button>
            <button onClick={() => setViewDate(new Date().toISOString().split('T')[0])} className="px-2 py-1 border border-slate-200 rounded-lg text-[10px] lg:text-xs hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">Today</button>
          </div>
        </div>
        
        {/* Row 2: Sort, Lock, Add */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
            <button onClick={cycleSort} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] lg:text-xs font-medium hover:bg-slate-50 text-slate-700 bg-white min-w-[80px]">
              <ArrowUpDown size={14} /> {sortOption === 'alpha-asc' ? 'A-Z' : sortOption === 'alpha-desc' ? 'Z-A' : 'Custom'}
            </button>
            <button onClick={() => toggleOrderLock(!isOrderLocked)} className={`shrink-0 p-2 border border-slate-200 rounded-lg ${isOrderLocked ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
              {isOrderLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          {permissions.add_animals && (
            <button onClick={() => setIsCreateAnimalModalOpen(true)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] lg:text-xs font-medium hover:bg-blue-700 shadow-sm whitespace-nowrap w-full sm:w-auto">
              <Plus size={14} /> Add {activeTab ? (activeTab.charAt(0) + activeTab.slice(1).toLowerCase()) : 'Animal'}
            </button>
          )}
        </div>
      </div>


      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1 rounded-xl gap-0.5 sm:gap-1">
        {[AnimalCategory.OWLS, AnimalCategory.RAPTORS, AnimalCategory.MAMMALS, AnimalCategory.EXOTICS].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-1 min-w-fit sm:min-w-[100px] py-1.5 px-1 sm:py-2 sm:px-4 text-[11px] sm:text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
        {(permissions.isAdmin || permissions.isOwner) && (
          <button
            onClick={() => setActiveTab('ARCHIVED')}
            className={`shrink-0 sm:flex-1 min-w-[80px] sm:min-w-[100px] py-1.5 px-3 sm:py-2 sm:px-4 text-[11px] sm:text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'ARCHIVED' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Archived
          </button>
        )}
      </div>

      {/* List Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-2xl font-semibold text-slate-800">Your {activeTab ? (activeTab.charAt(0) + activeTab.slice(1).toLowerCase()) : 'Animals'}</h2>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-normal break-words min-w-[90px] max-w-[140px] md:max-w-[250px] leading-tight">Name</th>
                <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap hidden xl:table-cell">Species</th>
                <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap hidden 2xl:table-cell">Ring/Microchip</th>
                {activeTab === 'ARCHIVED' ? (
                    <>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Status</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Date Archived</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Reason</th>
                    </>
                ) : (
                    <>
                        <th className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : ''}`}>Today's Weight</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Today's Feed</th>
                        <th className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-normal leading-tight ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS ? '' : 'hidden md:table-cell')}`}>Last Fed</th>
                        <th className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap ${activeTab === AnimalCategory.EXOTICS ? '' : 'hidden'}`}>Next Feed</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap hidden md:table-cell">Location</th>
                    </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const grouped = new Map<string, EnhancedAnimal[]>();
                const standalone: EnhancedAnimal[] = [];
                
                (filteredAnimals || []).forEach(animal => {
                  if (animal.parent_mob_id) {
                    if (!grouped.has(animal.parent_mob_id)) {
                      grouped.set(animal.parent_mob_id, []);
                    }
                    grouped.get(animal.parent_mob_id)!.push(animal);
                  } else {
                    standalone.push(animal);
                  }
                });

                const renderRow = (animal: EnhancedAnimal, isGrouped: boolean = false) => (
                  <tr key={animal.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${isGrouped ? 'bg-slate-50/30' : ''}`} onClick={() => onSelectAnimal(animal)}>
                    <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-sm md:text-base font-bold text-slate-900 whitespace-normal break-words min-w-[90px] max-w-[140px] md:max-w-[250px] leading-tight ${isGrouped ? 'pl-4 md:pl-8' : ''}`}>
                      {isGrouped && <span className="text-slate-300 mr-2">↳</span>}
                      {animal.name}
                    </td>
                    <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-500 whitespace-nowrap hidden xl:table-cell">{animal.species}</td>
                    <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-nowrap hidden 2xl:table-cell">{animal.displayId}</td>
                    {activeTab === 'ARCHIVED' ? (
                        <>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-600 whitespace-nowrap">{animal.disposition_status}</td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-600 whitespace-nowrap">{animal.archived_at ? new Date(animal.archived_at).toLocaleDateString('en-GB') : '-'}</td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-600 whitespace-normal">{animal.archive_reason}</td>
                        </>
                    ) : (
                        <>
                            <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-nowrap ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : ''}`}>
                            {animal.todayWeight ? getWeightDisplay(animal.todayWeight, animal.weight_unit) : '-'}
                            </td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-nowrap">
                            {animal.todayFeed ? (typeof animal.todayFeed.value === 'string' ? animal.todayFeed.value : String(animal.todayFeed.value || 'Fed')) : '-'}
                            </td>
                            <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-normal leading-tight min-w-[60px] ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS ? '' : 'hidden md:table-cell')}`}>{animal.lastFedStr}</td>
                            <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-500 whitespace-normal min-w-[90px] ${activeTab === AnimalCategory.EXOTICS ? '' : 'hidden'}`}>
                            {animal.nextFeedTask ? (
                                <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">
                                    {new Date(animal.nextFeedTask.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                                    {animal.nextFeedTask.notes || 'Scheduled'}
                                </span>
                                </div>
                            ) : (
                                <span className="text-slate-300">-</span>
                            )}
                            </td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-blue-500 whitespace-nowrap hidden md:table-cell">{animal.location}</td>
                        </>
                    )}
                  </tr>
                );

                const rows: React.ReactNode[] = [];

                // Render groups
                Array.from(grouped.entries()).forEach(([parentMobId, animals]) => {
                  const isExpanded = expandedGroups[parentMobId];
                  const parentMob = standalone.find(a => a.id === parentMobId);
                  const displayName = parentMob ? parentMob.name : 'Unknown Group';
                  
                  rows.push(
                    <tr key={`group-${parentMobId}`} className="bg-slate-100/50 border-y border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleGroup(parentMobId)}>
                      <td colSpan={8} className="px-2 py-3 lg:px-4 lg:py-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                          <span className="font-bold text-slate-800">{displayName}</span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{animals.length} individuals</span>
                        </div>
                      </td>
                    </tr>
                  );

                  if (isExpanded) {
                    animals.forEach(animal => rows.push(renderRow(animal, true)));
                  }
                });

                // Render standalone animals (excluding those that are parent mobs)
                standalone.filter(a => !grouped.has(a.id)).forEach(animal => rows.push(renderRow(animal)));

                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </div>
      
      {isCreateAnimalModalOpen && (
          <AnimalFormModal isOpen={isCreateAnimalModalOpen} onClose={() => setIsCreateAnimalModalOpen(false)} />
      )}
    </div>
  );
};

export default Dashboard;
