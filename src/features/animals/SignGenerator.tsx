import React, { useRef, useState, useEffect, useMemo, useTransition } from 'react';
import html2canvas from 'html2canvas-pro';
import { Animal, OrgProfile, AnimalCategory, HazardRating, SignContent } from '@/src/types';
import { X, Download, Info, Loader2, Globe, Edit2, Save, RefreshCw, Calendar, LayoutTemplate, Sun, Moon, Sparkles, Droplets } from 'lucide-react';
import { generateSignageContent, generateExoticSummary } from '@/src/services/geminiService';
import { IUCNBadge } from './IUCNBadge';

interface SignGeneratorProps {
  animal: Animal;
  orgProfile: OrgProfile | null;
  onClose: () => void;
}

// Moved outside component to prevent re-render focus loss
const EditTextArea = ({ value, onChange, className = "" }: { value: string, onChange: (val: string) => void, className?: string }) => (
    <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className={`w-full bg-yellow-50 border border-yellow-200 rounded p-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-yellow-400 resize-none ${className}`}
    />
);

// Moved outside component to prevent re-render focus loss
const EditInput = ({ value, onChange, className = "" }: { value: string, onChange: (val: string) => void, className?: string }) => (
    <input 
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-yellow-50 border border-yellow-200 rounded px-1 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-yellow-400 ${className}`}
    />
);

const DEFAULT_STATS = { lifespanWild: '', lifespanCaptivity: '', wingspan: '', weight: '' };

const SignGenerator: React.FC<SignGeneratorProps> = ({ animal, orgProfile, onClose }) => {
  const signRef = useRef<HTMLDivElement>(null);
  
  const [mapLayout, setMapLayout] = useState<'side' | 'bottom' | 'card'>('bottom');
  
  const [content, setContent] = useState<SignContent>({
      diet: [], 
      habitat: [], 
      didYouKnow: [], 
      speciesBrief: '', 
      wildOrigin: '', 
      speciesStats: { ...DEFAULT_STATS }
  });
  
  const [isPending, startTransition] = useTransition();
  const [isEditingText, setIsEditingText] = useState(false);

  const fetchContent = () => {
      if (!navigator.onLine) {
          console.warn("Offline: AI Signage Generation disabled.");
          return;
      }
      const species = animal.species;
      console.log(`📝 [SignGenerator] Triggered generation for: ${species}`);
      startTransition(async () => {
          try {
              const [mainContent, brief] = await Promise.all([
                  generateSignageContent(species),
                  generateExoticSummary(species)
              ]);
              console.log("Signage Content Received:", { mainContent, brief });
              setContent({ 
                  ...mainContent, 
                  speciesBrief: brief,
                  // Ensure speciesStats is never undefined
                  speciesStats: mainContent.speciesStats || { ...DEFAULT_STATS }
              });
          } catch (error) {
              console.error("❌ [SignGenerator] Error caught:", error);
          }
      });
  };

  useEffect(() => {
      fetchContent();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    if (signRef.current) {
        setIsEditingText(false);
        await new Promise(resolve => setTimeout(resolve, 100));
        const canvas = await html2canvas(signRef.current, { scale: 3, useCORS: true, allowTaint: true });
        const link = document.createElement('a');
        link.download = `${animal.name}_Signage.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    }
  };

  const getAge = (dob?: string) => {
      if (!dob) return 'Unknown';
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      if (age < 1) return '< 1 year';
      return `${age} years`;
  };

  const getArrivalYear = (date?: string) => {
      if (!date) return 'Unknown';
      return new Date(date).getFullYear();
  };

  const dynamicDimensionLabel = useMemo(() => {
      const s = animal.species.toLowerCase();
      const c = animal.category;
      if (s.includes('spider') || s.includes('tarantula') || s.includes('scorpion') || s.includes('millipede')) return 'LEG SPAN';
      if (c === AnimalCategory.MAMMALS || c === AnimalCategory.EXOTICS || s.includes('snake') || s.includes('lizard') || s.includes('frog') || s.includes('toad') || s.includes('monitor') || s.includes('iguana')) return 'LENGTH';
      return 'WINGSPAN';
  }, [animal.species, animal.category]);

  const theme = useMemo(() => {
      if (animal.is_venomous || animal.hazard_rating === HazardRating.HIGH) {
          return { bg: 'bg-rose-500', text: 'text-rose-500', textDark: 'text-rose-600', containerBg: 'bg-rose-50', border: 'border-rose-100' };
      }
      if (animal.hazard_rating === HazardRating.MEDIUM) {
          return { bg: 'bg-orange-500', text: 'text-orange-500', textDark: 'text-orange-600', containerBg: 'bg-orange-50', border: 'border-orange-100' };
      }
      return { bg: 'bg-emerald-500', text: 'text-emerald-500', textDark: 'text-emerald-600', containerBg: 'bg-[#f0fdf4]', border: 'border-emerald-100' };
  }, [animal.hazard_rating, animal.is_venomous]);

  const adoptionUrl = orgProfile?.adoption_portal || 'https://kentowlacademy.com';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(adoptionUrl)}&color=ffffff&bgcolor=10b981`;

  const handleListChange = (section: 'diet' | 'habitat' | 'didYouKnow', value: string) => {
      const items = value.split('\n').filter(line => line.trim() !== '');
      setContent(prev => ({ ...prev, [section]: items }));
  };

  const handleStatChange = (key: keyof SignContent['speciesStats'], value: string) => {
      setContent(prev => ({ 
          ...prev, 
          speciesStats: { 
              ...(prev.speciesStats || { ...DEFAULT_STATS }), 
              [key]: value 
          } 
      }));
  };

  const handleBriefChange = (value: string) => setContent(prev => ({ ...prev, speciesBrief: value }));
  const handleOriginChange = (value: string) => setContent(prev => ({ ...prev, wildOrigin: value }));
  const cycleLayout = () => setMapLayout(prev => prev === 'side' ? 'bottom' : prev === 'bottom' ? 'card' : 'side');

  const containerStyle = useMemo(() => {
      if (mapLayout === 'card') return { width: '800px', height: '600px', minWidth: '800px', minHeight: '600px' };
      return { width: '794px', height: '1123px', minWidth: '794px', minHeight: '1123px' };
  }, [mapLayout]);

  const isHighRisk = animal.hazard_rating === HazardRating.HIGH || animal.is_venomous;

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4">
        <div className="flex flex-col gap-4 max-h-screen w-full max-w-6xl">
            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-lg gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Info className="text-emerald-600"/> Enclosure Signage Studio
                    </h2>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <button onClick={cycleLayout} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors text-xs uppercase tracking-widest border border-slate-200">
                        <LayoutTemplate size={16}/>
                        Layout: {mapLayout === 'side' ? 'Portrait (Map Side)' : mapLayout === 'bottom' ? 'Landscape (Map Bottom)' : 'Registry Card (Landscape)'}
                    </button>
                    <button onClick={fetchContent} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold hover:bg-purple-200 transition-colors text-xs uppercase tracking-widest">
                        {isPending ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                        {isPending ? "Generating..." : "Regenerate Content"}
                    </button>
                    <button onClick={() => setIsEditingText(!isEditingText)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors text-xs uppercase tracking-widest border-2 ${isEditingText ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>
                        {isEditingText ? <Save size={16}/> : <Edit2 size={16}/>}
                        {isEditingText ? "Finish Editing" : "Edit Text"}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
                        <Download size={18}/> Download Print-Ready (.JPG)
                    </button>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-800 transition-colors bg-slate-100 rounded-lg"><X size={20}/></button>
                </div>
            </div>

            <div className="flex-1 overflow-auto flex justify-center bg-slate-800/50 rounded-xl p-8">
                <div ref={signRef} className="bg-white relative shadow-2xl flex flex-col overflow-hidden" style={containerStyle}>
                    {mapLayout === 'card' ? (
                        <div className="p-8 h-full flex flex-col relative bg-white">
                            <div className={`absolute top-0 left-0 right-0 h-3 ${theme.bg}`}></div>
                            <div className="mb-6 flex justify-between items-start pt-2">
                                <div>
                                    <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-1 flex items-center gap-4">
                                        {animal.name}
                                        {isHighRisk && <span className="bg-rose-500 text-white text-xs px-2 py-1 rounded tracking-widest align-middle font-bold transform -translate-y-1 shadow-sm">HIGH RISK</span>}
                                    </h1>
                                    <h2 className={`text-2xl font-bold uppercase tracking-wide ${theme.text}`}>{animal.species}</h2>
                                    <p className="text-lg font-serif italic text-slate-400 mt-1">{animal.latin_name}</p>
                                </div>
                                <div className="flex items-start gap-6">
                                     <div className="w-36 h-36 rounded-xl overflow-hidden border-4 border-white shadow-lg bg-slate-100 shrink-0">
                                         <img src={animal.image_url} alt={animal.name} className="w-full h-full object-cover" crossOrigin="anonymous"/>
                                     </div>
                                     <div className="mt-2"><IUCNBadge status={animal.red_list_status} size="lg" /></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-12 gap-8 flex-1">
                                <div className="col-span-7 flex flex-col gap-5">
                                     <div>
                                         <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-0.5">SUBJECT PROFILE</h3>
                                         <p className="text-sm font-bold text-slate-600 italic leading-snug">{animal.description || "No description recorded."}</p>
                                     </div>
                                     <div className={`${theme.containerBg} border ${theme.border} p-4 rounded-xl relative group flex-1`}>
                                         <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${theme.textDark}`}>
                                             <Sparkles size={12}/> SPECIES BRIEF (AI)
                                         </h3>
                                         {isEditingText ? (
                                             <EditTextArea value={content.speciesBrief || ''} onChange={handleBriefChange} className="h-full bg-white/50" />
                                         ) : (
                                             <p className={`text-xs font-bold leading-relaxed text-justify ${theme.textDark} opacity-90`}>
                                                 {content.speciesBrief || "Generative content loading..."}
                                             </p>
                                         )}
                                     </div>
                                     <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-auto">
                                         <div><h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ANIMAL AGE</h4><p className="font-black text-slate-800">{getAge(animal.dob)}</p></div>
                                         <div><h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">SEX</h4><p className="font-black text-slate-800 uppercase">{animal.sex}</p></div>
                                         <div>
                                             <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">NATIVE ORIGIN</h4>
                                             {isEditingText ? <EditInput value={content.wildOrigin || ''} onChange={handleOriginChange} /> : <p className="font-black text-slate-800 text-sm truncate">{content.wildOrigin || 'Generating...'}</p>}
                                         </div>
                                         {(animal.category === AnimalCategory.MAMMALS || animal.category === AnimalCategory.EXOTICS) ? (
                                             <div>
                                                 <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">HAZARD CLASS</h4>
                                                 <div className="flex items-center gap-2">
                                                     <p className={`font-black text-sm uppercase ${animal.hazard_rating === HazardRating.HIGH ? 'text-rose-600' : animal.hazard_rating === HazardRating.MEDIUM ? 'text-amber-600' : 'text-slate-800'}`}>{animal.hazard_rating}</p>
                                                     {animal.is_venomous && <span className="bg-rose-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">VENOMOUS</span>}
                                                 </div>
                                             </div>
                                         ) : (
                                             <div><h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">CHIP/RING</h4><p className="font-black text-slate-800 font-mono text-sm">{animal.microchip_id || animal.ring_number || 'N/A'}</p></div>
                                         )}
                                     </div>
                                </div>
                                <div className="col-span-5 flex flex-col gap-5">
                                     <div className="flex-1 flex flex-col">
                                         <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-0.5">NATIVE RANGE</h3>
                                         <div className="flex-1 w-full bg-slate-50 rounded-xl border border-slate-100 overflow-hidden flex items-center justify-center relative min-h-[140px]">
                                              {animal.distribution_map_url ? (
                                                  <img src={animal.distribution_map_url} alt="Range Map" className="w-full h-full object-contain p-2" crossOrigin="anonymous"/>
                                              ) : (
                                                  <div className="flex flex-col items-center justify-center text-slate-300">
                                                      <Globe size={32} className="mb-1"/><span className="text-[8px] font-black uppercase">No Map Data</span>
                                                  </div>
                                              )}
                                         </div>
                                     </div>
                                     <div className="flex flex-col gap-3">
                                         <div className="flex gap-3">
                                             <div className="flex-1 bg-orange-500 text-white p-3 rounded-xl shadow-lg flex items-center gap-3">
                                                 <Sun size={24} className="shrink-0" />
                                                 <div className="min-w-0"><p className="text-[8px] font-black opacity-80 uppercase tracking-widest whitespace-nowrap">DAY TARGET</p><p className="text-2xl font-black leading-none">{animal.target_day_temp_c || 28}°C</p></div>
                                             </div>
                                             <div className="flex-1 bg-emerald-600 text-white p-3 rounded-xl shadow-lg flex items-center gap-3">
                                                 <Moon size={24} className="shrink-0" />
                                                 <div className="min-w-0"><p className="text-[8px] font-black opacity-80 uppercase tracking-widest whitespace-nowrap">NIGHT TARGET</p><p className="text-2xl font-black leading-none">{animal.target_night_temp_c || 22}°C</p></div>
                                             </div>
                                         </div>
                                         {(animal.target_humidity_min_percent || animal.target_humidity_max_percent) && (
                                            <div className="bg-cyan-600 text-white p-3 rounded-xl shadow-lg flex items-center gap-3">
                                                 <Droplets size={24} className="shrink-0" />
                                                 <div className="min-w-0"><p className="text-[8px] font-black opacity-80 uppercase tracking-widest whitespace-nowrap">HUMIDITY RANGE</p><p className="text-2xl font-black leading-none">{animal.target_humidity_min_percent || '?'}-{animal.target_humidity_max_percent || '?'}%</p></div>
                                            </div>
                                         )}
                                     </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 text-right"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">KOA REGISTRY - {new Date().getFullYear()}</p></div>
                        </div>
                    ) : (
                        <>
                            <div className="h-28 bg-[#1e293b] flex items-center justify-between px-10 text-white shrink-0">
                                <h1 className="text-3xl font-black uppercase tracking-[0.2em]">{orgProfile?.name || 'KENT OWL ACADEMY'}</h1>
                                {orgProfile?.logo_url ? <img src={orgProfile.logo_url} alt="Logo" className="h-20 w-auto object-contain bg-white rounded-xl p-2 shadow-lg" /> : <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center text-slate-900 font-bold text-2xl">KOA</div>}
                            </div>
                            <div className="flex-1 py-8 pl-5 pr-8 grid grid-cols-12 gap-6 overflow-hidden">
                                <div className={`col-span-4 flex flex-col ${mapLayout === 'bottom' ? 'gap-2' : 'gap-4'}`}>
                                    <div className="aspect-[3/4] w-full rounded-[1.5rem] overflow-hidden border-4 border-[#1e293b] shadow-xl relative shrink-0"><img src={animal.image_url} alt={animal.name} className="w-full h-full object-cover" crossOrigin="anonymous"/></div>
                                    <div className="bg-[#1e293b] rounded-2xl p-4 flex items-center justify-between shadow-lg text-white shrink-0"><span className="text-xs font-black uppercase tracking-[0.25em] pl-2">STATUS</span><div className="scale-90 origin-right"><IUCNBadge status={animal.red_list_status} size="lg" /></div></div>
                                    {mapLayout === 'side' ? (
                                        <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 shadow-sm flex flex-col items-center flex-1 min-h-0">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] w-full text-left mb-2 pl-1">NATIVE RANGE</h3>
                                            <div className="rounded-xl overflow-hidden border border-slate-200 w-full bg-white relative flex items-center justify-center flex-1">{animal.distribution_map_url ? <img src={animal.distribution_map_url} alt="Range Map" className="w-full h-full object-cover" crossOrigin="anonymous"/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Globe size={48} /></div>}</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-3 border-b border-slate-200 pb-2"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0"><Info size={16}/></div><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">AGE</p><p className="font-bold text-slate-800 text-sm">{getAge(animal.dob)}</p></div></div>
                                                <div className="flex items-center gap-3 border-b border-slate-200 pb-2"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0"><Info size={16}/></div><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SEX</p><p className="font-bold text-slate-800 text-sm">{animal.sex}</p></div></div>
                                                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0"><Calendar size={16}/></div><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ARRIVED</p><p className="font-bold text-slate-800 text-sm">{getArrivalYear(animal.acquisition_date)}</p></div></div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 bg-[#f0fdf4] p-3 rounded-xl border border-emerald-100 flex-1 min-h-0 content-start overflow-auto no-scrollbar mb-6">
                                                <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center"><p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WILD LIFESPAN</p>{isEditingText ? <EditInput value={content.speciesStats?.lifespanWild || ''} onChange={(v) => handleStatChange('lifespanWild', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.lifespanWild || '-'}</p>}</div>
                                                <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center"><p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">CAPTIVE LIFESPAN</p>{isEditingText ? <EditInput value={content.speciesStats?.lifespanCaptivity || ''} onChange={(v) => handleStatChange('lifespanCaptivity', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.lifespanCaptivity || '-'}</p>}</div>
                                                <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center"><p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">{dynamicDimensionLabel}</p>{isEditingText ? <EditInput value={content.speciesStats?.wingspan || ''} onChange={(v) => handleStatChange('wingspan', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.wingspan || '-'}</p>}</div>
                                                <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center"><p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WEIGHT</p>{isEditingText ? <EditInput value={content.speciesStats?.weight || ''} onChange={(v) => handleStatChange('weight', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.weight || '-'}</p>}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className={`col-span-8 flex flex-col h-full ${mapLayout === 'bottom' ? 'gap-3' : 'gap-6'}`}>
                                    <div className="shrink-0">
                                        <h2 className="text-[4rem] font-black text-[#1e293b] uppercase leading-[0.8] tracking-tight mb-2">{animal.name}</h2>
                                        <h3 className="text-2xl font-bold text-[#10b981] uppercase tracking-wider">{animal.species}</h3>
                                        <p className="text-lg text-slate-400 font-serif italic mt-1 mb-4">{animal.latin_name}</p>
                                        <div className="h-1.5 w-32 bg-[#10b981] mb-2 rounded-full"></div>
                                        {mapLayout === 'side' && (
                                            <>
                                                <div className="flex gap-8 mb-6 mt-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200"><Info size={20}/></div><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AGE</p><p className="font-bold text-slate-800">{getAge(animal.dob)}</p></div></div>
                                                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200"><Info size={20}/></div><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SEX</p><p className="font-bold text-slate-800">{animal.sex}</p></div></div>
                                                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200"><Calendar size={20}/></div><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ARRIVED</p><p className="font-bold text-slate-800">{getArrivalYear(animal.acquisition_date)}</p></div></div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 bg-[#f0fdf4] p-3 rounded-xl border border-emerald-100">
                                                    <div className="text-center"><p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WILD LIFESPAN</p>{isEditingText ? <EditInput value={content.speciesStats?.lifespanWild || ''} onChange={(v) => handleStatChange('lifespanWild', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.lifespanWild || '-'}</p>}</div>
                                                    <div className="text-center border-l border-emerald-200"><p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">CAPTIVE LIFESPAN</p>{isEditingText ? <EditInput value={content.speciesStats?.lifespanCaptivity || ''} onChange={(v) => handleStatChange('lifespanCaptivity', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.lifespanCaptivity || '-'}</p>}</div>
                                                    <div className="text-center border-l border-emerald-200"><p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">{dynamicDimensionLabel}</p>{isEditingText ? <EditInput value={content.speciesStats?.wingspan || ''} onChange={(v) => handleStatChange('wingspan', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.wingspan || '-'}</p>}</div>
                                                    <div className="text-center border-l border-emerald-200"><p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WEIGHT</p>{isEditingText ? <EditInput value={content.speciesStats?.weight || ''} onChange={(v) => handleStatChange('weight', v)} /> : <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats?.weight || '-'}</p>}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-4 flex-1 min-h-0 justify-between overflow-hidden">
                                        <div className="flex-1 min-h-0"><h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">DIET</h4>{isEditingText ? <EditTextArea value={content.diet.join('\n')} onChange={v => handleListChange('diet', v)} className="h-full"/> : <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">{content.diet.length > 0 ? content.diet.slice(0, mapLayout === 'bottom' ? 2 : 3).map((item, i) => <li key={i}>{item}</li>) : <li>Generating diet info...</li>}</ul>}</div>
                                        <div className="flex-1 min-h-0"><h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">HABITAT</h4>{isEditingText ? <EditTextArea value={content.habitat.join('\n')} onChange={v => handleListChange('habitat', v)} className="h-full"/> : <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">{content.habitat.length > 0 ? content.habitat.slice(0, mapLayout === 'bottom' ? 2 : 3).map((item, i) => <li key={i}>{item}</li>) : <li>Generating habitat info...</li>}</ul>}</div>
                                        {mapLayout === 'side' && <div className="flex-1 min-h-0"><h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">DID YOU KNOW?</h4>{isEditingText ? <EditTextArea value={content.didYouKnow.join('\n')} onChange={v => handleListChange('didYouKnow', v)} className="h-full"/> : <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">{content.didYouKnow.length > 0 ? content.didYouKnow.slice(0, 2).map((item, i) => <li key={i}>{item}</li>) : <li>Gathering facts...</li>}</ul>}</div>}
                                        {mapLayout === 'bottom' && content.didYouKnow.length > 0 && <div className="flex-1 min-h-0"><h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">DID YOU KNOW?</h4>{isEditingText ? <EditTextArea value={content.didYouKnow.join('\n')} onChange={v => handleListChange('didYouKnow', v)} className="h-full"/> : <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">{content.didYouKnow.slice(0, 1).map((item, i) => <li key={i}>{item}</li>)}</ul>}</div>}
                                    </div>
                                    {mapLayout === 'bottom' && <div className="h-48 bg-slate-50 rounded-2xl p-3 border-2 border-slate-200 shadow-sm shrink-0 flex flex-col mt-auto"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] w-full text-left mb-1 pl-1">NATIVE RANGE</h3><div className="rounded-xl overflow-hidden border border-slate-200 w-full bg-white relative flex items-center justify-center flex-1">{animal.distribution_map_url ? <img src={animal.distribution_map_url} alt="Range Map" className="w-full h-full object-contain" crossOrigin="anonymous"/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Globe size={32} /></div>}</div></div>}
                                </div>
                            </div>
                            <div className="h-28 bg-[#10b981] flex items-center justify-between px-10 text-white relative overflow-hidden shrink-0"><div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2.5px)', backgroundSize: '24px 24px' }}></div><div className="relative z-10 max-w-[70%]"><h2 className="text-2xl font-black uppercase italic tracking-wide mb-1 shadow-black drop-shadow-sm">ADOPT {animal.name} TODAY!</h2><p className="text-xs font-medium opacity-95 leading-snug">Scan the code to adopt {animal.name}. Your support helps provide food, care, and enrichment for our collection.</p></div><div className="relative z-10 bg-white p-1.5 rounded-xl shadow-2xl shrink-0"><img src={qrCodeUrl} alt="Adoption QR" className="w-20 h-20" crossOrigin="anonymous"/></div></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default SignGenerator;
