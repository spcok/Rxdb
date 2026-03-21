import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Animal, AnimalCategory } from '../../types';
import { 
    ClipboardCheck, Sun, Moon, Check, X, Droplets, Lock, 
    Heart, AlertTriangle, ShieldCheck, PenTool, Loader2, Calendar as CalendarIcon,
    Info, Snowflake, ChevronDown, ChevronRight, CornerDownRight, ChevronLeft
} from 'lucide-react';
import { useDailyRoundData } from './useDailyRoundData';

interface DailyRoundsProps {
    [key: string]: unknown;
}

import { usePermissions } from '../../hooks/usePermissions';

const DailyRounds: React.FC<DailyRoundsProps> = () => {
    const { view_daily_rounds } = usePermissions();
    const { isSidebarCollapsed } = useOutletContext<{ isSidebarCollapsed: boolean }>();
    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
    
    const handlePrevDay = () => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() - 1);
        setViewDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() + 1);
        setViewDate(d.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        setViewDate(new Date().toISOString().split('T')[0]);
    };

    const [expandedMobs, setExpandedMobs] = useState<Set<string>>(new Set());

    const toggleMob = (id: string) => {
        setExpandedMobs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const {
        categoryAnimals,
        isLoading,
        roundType,
        setRoundType,
        activeTab,
        setActiveTab,
        checks,
        progress,
        isComplete,
        isNoteRequired,
        signingInitials,
        setSigningInitials,
        generalNotes,
        setGeneralNotes,
        isSubmitting,
        isPastRound,
        toggleWater,
        toggleSecure,
        toggleHealth,
        handleSignOff,
        currentUser,
        completedChecks,
        totalAnimals,
        freezingRisks
    } = useDailyRoundData(viewDate);

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState<'HEALTH' | 'SECURITY'>('HEALTH');
    const [reportAnimalId, setReportAnimalId] = useState<string | null>(null);
    const [issueText, setIssueText] = useState('');

    const openReportModal = (type: 'HEALTH' | 'SECURITY', animalId: string) => {
        setReportType(type);
        setReportAnimalId(animalId);
        setIssueText('');
        setReportModalOpen(true);
    };

    const confirmIssue = () => {
        if (!reportAnimalId || !issueText) return;
        if (reportType === 'HEALTH') {
            toggleHealth(reportAnimalId, issueText);
        } else {
            toggleSecure(reportAnimalId, issueText);
        }
        setReportModalOpen(false);
        setReportAnimalId(null);
    };

    if (!view_daily_rounds) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
                    <Lock size={48} className="opacity-50" />
                    <h2 className="text-lg font-bold uppercase tracking-tight">Access Restricted</h2>
                    <p className="text-sm font-medium">You do not have permission to view the Daily Rounds. Please contact your administrator.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    const tabs = (Object.values(AnimalCategory) as string[]).filter(cat => !['ALL', 'REPTILES', 'INVERTEBRATES', 'AMPHIBIANS'].includes(cat)) as AnimalCategory[];

    const footerLeftClass = isSidebarCollapsed ? 'md:left-20' : 'md:left-64';
    const maxWidthClass = isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl';

    return (
        <div className="space-y-6">
            <div className="bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <ClipboardCheck className="text-emerald-600" size={24} /> Daily Rounds
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Manage daily animal checks and husbandry tasks.</p>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
                              <button 
                                onClick={handlePrevDay} 
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                                title="Previous Day"
                              >
                                <ChevronLeft size={16} />
                              </button>

                              <div className="flex items-center gap-2 px-2 border-x border-slate-200">
                                <CalendarIcon size={14} className="text-slate-400" />
                                <input 
                                  type="date" 
                                  value={viewDate}
                                  onChange={(e) => setViewDate(e.target.value)}
                                  className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none w-28 text-center cursor-pointer"
                                />
                              </div>

                              <button 
                                onClick={handleNextDay} 
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                                title="Next Day"
                              >
                                <ChevronRight size={16} />
                              </button>

                              <button 
                                onClick={handleToday}
                                className={`ml-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${viewDate === new Date().toISOString().split('T')[0] ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`}
                              >
                                Today
                              </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <button onClick={() => setRoundType('Morning')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${roundType === 'Morning' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Sun size={16} /> Morning</button>
                        <button onClick={() => setRoundType('Evening')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${roundType === 'Evening' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Moon size={16} /> Evening</button>
                    </div>
                </div>
                <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1 rounded-xl gap-0.5 sm:gap-1 mt-4">
                    {tabs.map((tab: AnimalCategory) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-fit sm:min-w-[100px] py-1.5 px-1 sm:py-2.5 text-[11px] sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
                    ))}
                </div>
            </div>

            <div className={`px-1 py-4 sm:p-4 space-y-3 pb-64 mx-auto w-full transition-all duration-300 ${maxWidthClass}`}>
                {(categoryAnimals || []).length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <Info className="mx-auto mb-2 text-slate-300" size={32}/>
                        <p className="font-bold text-slate-400 text-sm">No animals in this section.</p>
                    </div>
                ) : (
                    (() => {
                        const parentMobs = (categoryAnimals || []).filter(a => a.entity_type === 'GROUP');
                        const linkedChildren = (categoryAnimals || []).filter(a => a.entity_type !== 'GROUP' && a.parent_mob_id && parentMobs.some(p => p.id === a.parent_mob_id));
                        const independentAnimals = (categoryAnimals || []).filter(a => a.entity_type !== 'GROUP' && (!a.parent_mob_id || !parentMobs.some(p => p.id === a.parent_mob_id)));

                        const renderAnimalRow = (animal: Animal, isChild: boolean = false) => {
                            const state = checks[animal.id] || { isAlive: undefined, isWatered: false, isSecure: false };
                            const isDone = (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS) 
                                ? (state.isAlive !== undefined && (state.isSecure || !!state.securityIssue))
                                : (state.isAlive !== undefined && state.isWatered && (state.isSecure || !!state.securityIssue));
                            
                            const isFreezingRisk = freezingRisks[animal.id];
                            const isGroup = animal.entity_type === 'GROUP';
                            const isExpanded = expandedMobs.has(animal.id);

                            return (
                                <div key={animal.id} className={`bg-white border-2 rounded-2xl p-2 sm:p-3 md:p-4 flex items-center gap-1 sm:gap-3 md:gap-6 transition-all ${isDone ? 'border-emerald-100 shadow-sm' : (state.isAlive === false || state.securityIssue) ? 'border-rose-100 bg-rose-50' : 'border-slate-200'} ${isChild ? 'ml-8 sm:ml-12 bg-slate-50/50' : ''}`}>
                                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                        {isChild && <CornerDownRight className="text-slate-300 hidden sm:block" size={20} />}
                                        <div className="relative shrink-0 hidden sm:block">
                                            <img src={animal.image_url} alt={animal.name} className={`${isChild ? 'w-10 h-10' : 'w-14 h-14'} rounded-2xl object-cover bg-slate-200 shadow-sm`} referrerPolicy="no-referrer" />
                                            {isDone && (
                                                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                                                    <Check size={10} strokeWidth={4}/>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            {isGroup && (
                                                <button onClick={() => toggleMob(animal.id)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
                                                    {isExpanded ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                                                </button>
                                            )}
                                            <div className="min-w-0">
                                                <h3 className="font-black text-slate-800 text-xs sm:text-sm md:text-base truncate uppercase tracking-tight">
                                                    {String(animal.name)}
                                                    {isGroup && (
                                                        (() => {
                                                            const children = (categoryAnimals || []).filter(a => a.parent_mob_id === animal.id);
                                                            const displayCensus = children.length > 0 ? children.length : animal.census_count;
                                                            return displayCensus !== undefined ? (
                                                                <span className="ml-2 text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                                                    {displayCensus} individuals
                                                                </span>
                                                            ) : null;
                                                        })()
                                                    )}
                                                </h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">{String(animal.location)}</p>
                                                <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 sm:mt-1.5">
                                                    {state.isAlive === false && (<span className="text-[8px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest"><AlertTriangle size={10}/> Health Issue</span>)}
                                                    {state.securityIssue && (<span className="text-[8px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest"><ShieldCheck size={10}/> Security Alert</span>)}
                                                    {isFreezingRisk && (<span className="text-[8px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest"><Snowflake size={10}/> Ice Risk</span>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
                                        <button 
                                            onClick={() => state.isAlive === true ? openReportModal('HEALTH', animal.id) : toggleHealth(animal.id)} 
                                            disabled={isPastRound} 
                                            className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl border-2 transition-all ${state.isAlive === true ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : state.isAlive === false ? 'border-rose-200 bg-rose-100 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-300'} disabled:opacity-50 active:scale-95`}
                                        >
                                            <Heart size={18} fill={state.isAlive === true ? "currentColor" : "none"} className="sm:w-5 sm:h-5 md:w-6 md:h-6"/>
                                            <span className="text-[8px] font-black uppercase mt-1 hidden md:block">{state.isAlive === true ? 'Well' : state.isAlive === false ? 'Sick' : 'Health'}</span>
                                        </button>
                                        <button 
                                            onClick={() => toggleWater(animal.id)} 
                                            disabled={state.isAlive === false || isPastRound} 
                                            className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl border-2 transition-all ${state.isWatered ? 'border-blue-100 bg-blue-50 text-blue-500' : 'border-slate-100 bg-slate-50 text-slate-300'} disabled:opacity-50 active:scale-95`}
                                        >
                                            {state.isWatered ? <Check size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" strokeWidth={4} /> : <Droplets size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6"/>}
                                            <span className="text-[8px] font-black uppercase mt-1 hidden md:block">Water</span>
                                        </button>
                                        <button 
                                            onClick={() => state.isSecure ? openReportModal('SECURITY', animal.id) : toggleSecure(animal.id)} 
                                            disabled={state.isAlive === false || isPastRound} 
                                            className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl border-2 transition-all ${state.isSecure ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : (state.securityIssue ? 'border-rose-200 bg-rose-100 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-300')} disabled:opacity-50 active:scale-95`}
                                        >
                                            {state.isSecure ? <Check size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" strokeWidth={4} /> : (state.securityIssue ? <X size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" strokeWidth={4} /> : <Lock size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6"/>)}
                                            <span className="text-[8px] font-black uppercase mt-1 hidden md:block">{state.isSecure ? 'Safe' : (state.securityIssue ? 'Risk' : 'Secure')}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <>
                                {independentAnimals.map(animal => renderAnimalRow(animal, false))}
                                {parentMobs.map(mob => {
                                    const isExpanded = expandedMobs.has(mob.id);
                                    const children = linkedChildren.filter(c => c.parent_mob_id === mob.id);

                                    return (
                                        <React.Fragment key={mob.id}>
                                            {renderAnimalRow(mob, false)}
                                            {isExpanded && children.map(child => renderAnimalRow(child, true))}
                                        </React.Fragment>
                                    );
                                })}
                                {/* Explicit spacer to ensure last item clears the fixed footer */}
                                <div className="h-24 sm:h-32 w-full shrink-0 flex-none opacity-0"></div>
                            </>
                        );
                    })()
                )}
            </div>

            <div className={`bg-white border-t-2 border-slate-200 p-2 sm:p-4 fixed bottom-0 left-0 ${footerLeftClass} right-0 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300`}>
                <div className={`mx-auto flex flex-col landscape:flex-row md:flex-row gap-2 sm:gap-4 landscape:items-center md:items-center transition-all duration-300 ${maxWidthClass}`}>
                    <div className="w-full landscape:w-1/4 md:w-1/3">
                        <div className="flex justify-between items-end mb-1 sm:mb-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{String(activeTab)} Progress</span>
                            <span className={`text-[10px] sm:text-xs font-black ${isComplete ? 'text-emerald-600' : 'text-slate-800'}`}>{completedChecks}/{totalAnimals}</span>
                        </div>
                        <div className="h-2 sm:h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    <div className="w-full landscape:w-3/4 md:w-2/3 flex flex-col landscape:flex-row md:flex-row gap-2 sm:gap-4">
                        <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Initials" 
                                    maxLength={3} 
                                    value={signingInitials} 
                                    onChange={(e) => setSigningInitials(e.target.value.toUpperCase())} 
                                    disabled={isPastRound} 
                                    className="w-16 sm:w-20 bg-slate-50 border-2 border-slate-200 rounded-xl px-2 py-2 sm:py-3 text-center text-xs sm:text-sm font-black uppercase focus:outline-none focus:border-slate-400 transition-colors disabled:opacity-50" 
                                />
                                <input 
                                    type="text" 
                                    placeholder={isNoteRequired ? "MANDATORY: Why were waters skipped?" : "Section Notes..."} 
                                    value={generalNotes} 
                                    onChange={(e) => setGeneralNotes(e.target.value)} 
                                    disabled={isPastRound} 
                                    className={`flex-1 border-2 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium focus:outline-none transition-colors disabled:opacity-50 ${isNoteRequired ? 'bg-amber-50 border-amber-300 focus:border-amber-500 placeholder-amber-400 text-amber-800' : 'bg-slate-50 border-slate-200 focus:border-slate-400'}`}
                                />
                            </div>
                            {currentUser?.signature_data && signingInitials && (
                                <div className="hidden md:flex landscape:hidden lg:landscape:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 opacity-80">
                                    <PenTool size={12} className="text-slate-400"/>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2">Digital Sig:</span>
                                    <img src={currentUser.signature_data} alt="Sig" className="h-6 w-auto mix-blend-multiply" />
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={handleSignOff} 
                            disabled={!isComplete || isSubmitting || !signingInitials || isNoteRequired || isPastRound} 
                            className="bg-slate-900 text-white px-4 sm:px-6 py-2 sm:py-4 rounded-xl font-black uppercase text-[10px] sm:text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-all disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed active:scale-95 w-full landscape:w-auto md:w-auto whitespace-nowrap"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18}/>} 
                            <span className="sm:hidden">{isPastRound ? 'Signed Off' : 'Sign Off'}</span>
                            <span className="hidden sm:inline">{isPastRound ? 'Signed Off' : `Verify & Sign Off ${String(activeTab)}`}</span>
                        </button>
                    </div>
                </div>
            </div>

            {reportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-slate-200">
                        <div className={`p-6 border-b flex items-center gap-4 ${reportType === 'HEALTH' ? 'bg-rose-50 border-rose-100' : 'bg-orange-50 border-orange-100'}`}>
                            {reportType === 'HEALTH' ? <AlertTriangle className="text-rose-600" size={28} /> : <Lock className="text-orange-600" size={28}/>}
                            <div>
                                <h2 className={`font-black text-xl uppercase tracking-tight ${reportType === 'HEALTH' ? 'text-rose-900' : 'text-orange-900'}`}>
                                    {reportType === 'HEALTH' ? 'Report Health Issue' : 'Aviary Security Alert'}
                                </h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Incident Registry Entry</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                You are flagging <strong>{String((categoryAnimals || []).find(a => a.id === reportAnimalId)?.name || 'Unknown')}</strong>. 
                                {reportType === 'SECURITY' ? ' Please describe the security or maintenance fault preventing secure lock-up.' : ' Please describe the health observation.'}
                            </p>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mandatory Report Notes</label>
                                <textarea 
                                    autoFocus 
                                    value={issueText} 
                                    onChange={(e) => setIssueText(e.target.value)} 
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-sm font-medium h-32 resize-none focus:border-slate-400 focus:outline-none transition-all" 
                                    placeholder="Detailed observations required..."
                                />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setReportModalOpen(false)} className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                                <button 
                                    onClick={confirmIssue} 
                                    disabled={!issueText} 
                                    className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50 transition-all ${reportType === 'HEALTH' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'}`}
                                >
                                    Confirm Issue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyRounds;
