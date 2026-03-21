import React, { useState, useMemo, useTransition } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Animal, AnimalCategory, Task, LogType } from '../../types';
import { CalendarClock, Plus, Calendar, Trash2, Filter, Utensils, RefreshCw, Loader2, History, ArrowRight, Copy } from 'lucide-react';
import { useFeedingScheduleData } from './useFeedingScheduleData';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';

const FeedingSchedule: React.FC = () => {
  const { animals, tasks, addTasks, deleteTask, isLoading } = useFeedingScheduleData();

  const foodOptions = useLiveQuery(
    () => db.operational_lists
            .filter(item => item.type === 'food')
            .toArray(),
    []
  );

  const [selectedCategory, setSelectedCategory] = useState<AnimalCategory>(AnimalCategory.EXOTICS);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [withCalciDust, setWithCalciDust] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'interval'>('manual');
  
  const [isPending, startTransition] = useTransition();
  
  const [viewFilterAnimalId, setViewFilterAnimalId] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'upcoming' | 'history'>('upcoming');
  const [viewLayout, setViewLayout] = useState<'timeline' | 'animal'>('timeline');

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  
  const [intervalDays, setIntervalDays] = useState(3);
  const [intervalStart, setIntervalStart] = useState(new Date().toISOString().split('T')[0]);
  const [occurrences, setOccurrences] = useState(5);

  const filteredAnimals = animals.filter(a => a.category === selectedCategory && !a.archived);

  const toggleDate = (date: string) => {
      setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const handleGenerate = () => {
      if (!selectedAnimalId || !foodType || !quantity) return;
      
      startTransition(() => {
          const animal = animals.find(a => a.id === selectedAnimalId);
          if (!animal) return;

          let datesToSchedule: string[] = [];

          if (scheduleMode === 'manual') {
              datesToSchedule = selectedDates;
          } else {
              const [y, m, d] = intervalStart.split('-').map(Number);
              const startDate = new Date(y, m - 1, d);

              for (let i = 0; i < occurrences; i++) {
                  const current = new Date(startDate);
                  current.setDate(startDate.getDate() + (i * intervalDays));
                  const year = current.getFullYear();
                  const month = String(current.getMonth() + 1).padStart(2, '0');
                  const day = String(current.getDate()).padStart(2, '0');
                  datesToSchedule.push(`${year}-${month}-${day}`);
              }
          }

          const notes = `${quantity} ${foodType}${withCalciDust ? ' + Calci-dust' : ''}`;
          
          const newTasks: Task[] = datesToSchedule.map(date => ({
              id: uuidv4(),
              animal_id: selectedAnimalId,
              title: `Feed ${animal.name}`,
              type: LogType.FEED,
              due_date: date,
              completed: false,
              notes: notes,
              created_at: new Date().toISOString()
          } as unknown as Task));

          addTasks(newTasks);
          setSelectedDates([]);
      });
  };

  const handleQuickExtend = (animalId: string) => {
      // NOTE: Using fallback for task logic mapping depending on how schema handles animalId vs animal_id
      const animalTasks = tasks.filter(t => (t.animal_id === animalId) && (t.type === LogType.FEED));
      if (animalTasks.length === 0) return;
      
      animalTasks.sort((a, b) => (b.due_date).localeCompare(a.due_date));
      const lastTask = animalTasks[0];
      
      setSelectedCategory(animals.find(a => a.id === animalId)?.category || AnimalCategory.EXOTICS);
      setSelectedAnimalId(animalId);
      
      if (lastTask.notes) {
          const match = lastTask.notes.match(/^(\d+(\.\d+)?) (.+?)( \+ Calci-dust)?$/);
          if (match) {
              setQuantity(match[1]);
              setFoodType(match[3].trim());
              setWithCalciDust(!!match[4]);
          } else {
              setQuantity('1');
              setFoodType('');
          }
      }

      const lastDate = new Date(lastTask.due_date);
      lastDate.setDate(lastDate.getDate() + 1); 
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startDate = lastDate > new Date() ? lastDate : tomorrow;
      
      const y = startDate.getFullYear();
      const m = String(startDate.getMonth() + 1).padStart(2, '0');
      const d = String(startDate.getDate()).padStart(2, '0');
      
      setIntervalStart(`${y}-${m}-${d}`);
      setScheduleMode('interval');
      
      if (animalTasks.length > 1) {
          const secondLast = animalTasks[1];
          const diffTime = Math.abs(new Date(lastTask.due_date).getTime() - new Date(secondLast.due_date).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays > 0 && diffDays < 30) setIntervalDays(diffDays);
      }
  };

  const filteredTasks = useMemo(() => {
    return tasks
        .filter(t => (t.type === LogType.FEED))
        .filter(t => viewScope === 'upcoming' ? !t.completed : t.completed)
        .filter(t => viewFilterAnimalId === 'ALL' || (t.animal_id === viewFilterAnimalId))
        .sort((a, b) => viewScope === 'upcoming' ? (a.due_date).localeCompare(b.due_date) : (b.due_date).localeCompare(a.due_date));
  }, [tasks, viewFilterAnimalId, viewScope]);

  const animalGroups = useMemo(() => {
      const groups = new Map<string, { animal: Animal, tasks: Task[] }>();
      
      filteredTasks.forEach(task => {
          const aId = task.animal_id;
          if (!aId) return;
          if (!groups.has(aId)) {
              const animal = animals.find(a => a.id === aId);
              if (animal) groups.set(aId, { animal, tasks: [] });
          }
          groups.get(aId)?.tasks.push(task);
      });
      
      return Array.from(groups.values());
  }, [filteredTasks, animals]);

  const calendarDays = useMemo(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      for(let i=1; i<=daysInMonth; i++) {
          const d = new Date(year, month, i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          days.push(`${y}-${m}-${day}`);
      }
      return days;
  }, []);

  const inputClass = "w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm";

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <CalendarClock className="text-indigo-600" size={24} /> Feeding Schedule
                </h1>
                <p className="text-sm text-slate-500 mt-1">Plan and view future feeding tasks</p>
             </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            
            {/* LEFT COLUMN: CREATION */}
            <div className="xl:col-span-1 space-y-4">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Plus size={14} className="text-indigo-500"/> Schedule Feeds
                     </h4>
                     
                     <div className="space-y-4">
                        <div className="bg-slate-50 p-1 rounded-lg flex border border-slate-200 overflow-x-auto scrollbar-hide">
                            {[AnimalCategory.OWLS, AnimalCategory.RAPTORS, AnimalCategory.MAMMALS, AnimalCategory.EXOTICS].map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex-1 min-w-[70px] py-1 px-2 text-[10px] font-medium rounded-md transition-all ${selectedCategory === cat ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                                >
                                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Animal *</label>
                            <select value={selectedAnimalId} onChange={e => setSelectedAnimalId(e.target.value)} className={inputClass}>
                                <option value="">Select Animal...</option>
                                {filteredAnimals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Food Type *</label>
                                <select value={foodType} onChange={e => setFoodType(e.target.value)} className={inputClass} required>
                                    <option value="" disabled>Select a food type...</option>
                                    {foodOptions === undefined ? (
                                        <option value="" disabled>Loading food types...</option>
                                    ) : foodOptions.length === 0 ? (
                                        <option value="" disabled>No foods configured in Settings</option>
                                    ) : (
                                        foodOptions.map(f => <option key={f.id} value={f.value}>{f.value}</option>)
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity *</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} placeholder="1"/>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <input type="checkbox" id="calci" checked={withCalciDust} onChange={e => setWithCalciDust(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"/>
                            <label htmlFor="calci" className="text-xs font-medium text-slate-700 select-none cursor-pointer">Include Calci-dust</label>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                             <div className="flex flex-col gap-2 mb-3">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Schedule Method *</label>
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <input 
                                        type="checkbox" 
                                        id="intervalMode" 
                                        checked={scheduleMode === 'interval'} 
                                        onChange={(e) => setScheduleMode(e.target.checked ? 'interval' : 'manual')}
                                        className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="intervalMode" className="text-xs font-medium text-slate-700 select-none cursor-pointer">Auto-Interval Mode</label>
                                </div>
                             </div>

                             {scheduleMode === 'manual' ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                         <span className="text-xs font-bold text-slate-700">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                                            <div key={d} className="text-center text-[9px] text-slate-500 font-medium py-0.5">{d}</div>
                                        ))}
                                        {calendarDays.map(date => {
                                            const [y, m, d] = date.split('-').map(Number);
                                            const localDate = new Date(y, m-1, d);
                                            const dayNum = localDate.getDate();
                                            const colStart = localDate.getDay() + 1;
                                            const isSelected = selectedDates.includes(date);
                                            
                                            const style = dayNum === 1 ? { gridColumnStart: colStart } : {};

                                            return (
                                                <button 
                                                    key={date}
                                                    style={style}
                                                    onClick={() => toggleDate(date)}
                                                    className={`h-6 w-6 mx-auto rounded-full text-[10px] font-medium transition-all flex items-center justify-center ${
                                                        isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-transparent text-slate-700 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {dayNum}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[10px] text-slate-500 text-right">{selectedDates.length} dates selected</p>
                                </div>
                             ) : (
                                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-start gap-2">
                                        <RefreshCw size={14} className="text-indigo-500 shrink-0 mt-0.5"/>
                                        <div className="text-[10px] text-slate-600 leading-relaxed">
                                            Generate repeating tasks starting from a date.
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                                        <input type="date" value={intervalStart} onChange={e => setIntervalStart(e.target.value)} className={inputClass}/>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Repeat Every (Days)</label>
                                            <input type="number" min="1" value={intervalDays} onChange={e => setIntervalDays(parseInt(e.target.value))} className={inputClass}/>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Occurrences</label>
                                            <input type="number" min="1" max="50" value={occurrences} onChange={e => setOccurrences(parseInt(e.target.value))} className={inputClass}/>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={!selectedAnimalId || !foodType || !quantity || (scheduleMode === 'manual' && selectedDates.length === 0) || isPending}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-1.5 mt-2"
                        >
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={14} />}
                            {isPending ? 'Scheduling...' : 'Confirm Schedule'}
                        </button>
                     </div>
                 </div>
            </div>

            {/* RIGHT COLUMN: VIEWING */}
            <div className="xl:col-span-2 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 mb-4">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                             <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Utensils size={14} className="text-indigo-500"/> Scheduled Feeds
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">{filteredTasks.length} {viewScope} feeds found</p>
                             </div>
                             
                             <div className="flex flex-wrap items-center gap-2">
                                 {/* Scope Toggle */}
                                 <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200">
                                     <button onClick={() => setViewScope('upcoming')} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${viewScope === 'upcoming' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Upcoming</button>
                                     <button onClick={() => setViewScope('history')} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${viewScope === 'history' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><History size={12}/> History</button>
                                 </div>

                                 {/* Layout Toggle */}
                                 <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200 hidden sm:flex">
                                     <button onClick={() => setViewLayout('timeline')} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${viewLayout === 'timeline' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Timeline</button>
                                     <button onClick={() => setViewLayout('animal')} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${viewLayout === 'animal' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>By Animal</button>
                                 </div>
                             </div>
                         </div>

                         {/* Filter */}
                         <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full">
                             <Filter size={14} className="text-slate-400 ml-1" />
                             <select 
                                value={viewFilterAnimalId} 
                                onChange={(e) => setViewFilterAnimalId(e.target.value)}
                                className="bg-transparent text-xs font-medium text-slate-700 border-none focus:ring-0 cursor-pointer w-full outline-none"
                             >
                                 <option value="ALL">All Animals</option>
                                 {animals.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
                             </select>
                         </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[800px] pr-1">
                        {filteredTasks.length > 0 ? (
                            viewLayout === 'timeline' ? (
                                <div className="space-y-2">
                                    {filteredTasks.map(task => {
                                        const animal = animals.find(a => a.id === (task.animal_id));
                                        if (!animal) return null;
                                        
                                        const dateObj = new Date(task.due_date);
                                        const isToday = (task.due_date) === new Date().toISOString().split('T')[0];

                                        return (
                                            <div key={task.id} className={`flex items-center bg-white border border-slate-200 rounded-lg p-2.5 hover:bg-slate-50 transition-colors group ${task.completed ? 'opacity-60' : ''}`}>
                                                <div className={`w-10 h-10 rounded-md flex flex-col items-center justify-center mr-3 border ${isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                    <span className="text-[8px] uppercase font-bold">{dateObj.toLocaleString('default', {month: 'short'})}</span>
                                                    <span className="text-sm font-bold leading-none my-0.5">{dateObj.getDate()}</span>
                                                </div>
                                                
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <h3 className="text-xs font-bold text-slate-900">{animal.name}</h3>
                                                        <span className="text-[8px] font-medium text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-md">{animal.category}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600">{task.notes}</p>
                                                </div>

                                                <button 
                                                    onClick={() => deleteTask(task.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete Schedule Item"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {animalGroups.map(({ animal, tasks }) => (
                                        <div key={animal.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-200 transition-colors shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                                        {animal.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-bold text-slate-900">{animal.name}</h3>
                                                        <p className="text-[9px] text-slate-500">{tasks.length} {viewScope} entries</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleQuickExtend(animal.id)}
                                                    className="bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1"
                                                    title="Extend Schedule"
                                                >
                                                    <Copy size={12}/> Extend
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="bg-slate-50 p-2 rounded-md border border-slate-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-medium text-slate-500">Range</span>
                                                    <div className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                                                        {new Date(tasks[0].due_date).toLocaleDateString()} 
                                                        <ArrowRight size={10} className="text-slate-400"/> 
                                                        {new Date(tasks[tasks.length - 1].due_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-md border border-slate-100">
                                                    <span className="text-[10px] font-medium text-slate-500 block mb-0.5">Diet Info</span>
                                                    <div className="text-[11px] font-medium text-slate-700 truncate" title={tasks[0].notes}>{tasks[0].notes || 'See details'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <Calendar size={32} className="mb-3 opacity-20" />
                                <p className="text-xs font-medium text-slate-600">No {viewScope} feeds found</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">Use the creation tool to add new feeds</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FeedingSchedule;
