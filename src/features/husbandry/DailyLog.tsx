import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Animal, LogEntry, LogType, AnimalCategory, EntityType } from '../../types';
import { useDailyLogData } from './useDailyLogData';
import { useWeatherSync } from './hooks/useWeatherSync';
import AddEntryModal from './AddEntryModal';
import { BirdRow } from './components/BirdRow';
import { MammalRow } from './components/MammalRow';
import { ExoticRow } from './components/ExoticRow';

const DailyLog: React.FC = () => {
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

  const [activeCategory, setActiveCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const [hideSubAccounts, setHideSubAccounts] = useState(true);
  const isProcessing = useRef<Set<string>>(new Set());
  
  const { animals, getTodayLog, addLogEntry, isLoading } = useDailyLogData(viewDate, activeCategory);
  const { isSyncing } = useWeatherSync(animals, getTodayLog, addLogEntry, viewDate, isProcessing);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedType, setSelectedType] = useState<LogType>(LogType.GENERAL);

  const visibleAnimals = hideSubAccounts 
    ? animals.filter(a => !(a.entity_type === EntityType.INDIVIDUAL && a.parent_mob_id))
    : animals;

  const categories = [
    AnimalCategory.OWLS,
    AnimalCategory.RAPTORS,
    AnimalCategory.MAMMALS,
    AnimalCategory.EXOTICS
  ];

  const handleCellClick = (animal: Animal, type: LogType) => {
    setSelectedAnimal(animal);
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const renderHeaders = () => {
    switch (activeCategory) {
      case AnimalCategory.EXOTICS:
        return (
          <tr>
            <th className="px-1 py-4 sm:p-4 text-left text-xs font-semibold text-slate-900 uppercase">Animal</th>
            <th className="px-1 py-4 sm:p-4 text-center text-xs font-semibold text-slate-900 uppercase">FEED</th>
            <th className="px-1 py-4 sm:p-4 text-center text-xs font-semibold text-slate-900 uppercase">MISTING</th>
            <th className="px-1 py-4 sm:p-4 text-center text-xs font-semibold text-slate-900 uppercase">ENV</th>
          </tr>
        );
      default:
        return (
          <tr>
            <th className="px-1 py-4 sm:p-4 text-left text-xs font-semibold text-slate-900 uppercase">Animal</th>
            <th className="px-1 py-4 sm:p-4 text-center text-xs font-semibold text-slate-900 uppercase">WT</th>
            <th className="px-1 py-4 sm:p-4 text-center text-xs font-semibold text-slate-900 uppercase">FEED</th>
            <th className="px-1 py-4 sm:p-4 text-center text-xs font-semibold text-slate-900 uppercase">ENV</th>
          </tr>
        );
    }
  };

  const renderRow = (animal: Animal) => {
    let parentMobName: string | undefined;
    if (animal.entity_type === EntityType.INDIVIDUAL && animal.parent_mob_id) {
      const parent = animals.find(a => a.id === animal.parent_mob_id);
      if (parent) {
        parentMobName = parent.name;
      }
    }

    switch (animal.category) {
      case AnimalCategory.OWLS:
      case AnimalCategory.RAPTORS:
        return <BirdRow key={animal.id} animal={animal} getTodayLog={getTodayLog} onCellClick={handleCellClick} parentMobName={parentMobName} />;
      case AnimalCategory.MAMMALS:
        return <MammalRow key={animal.id} animal={animal} getTodayLog={getTodayLog} onCellClick={handleCellClick} parentMobName={parentMobName} />;
      case AnimalCategory.EXOTICS:
        return <ExoticRow key={animal.id} animal={animal} getTodayLog={getTodayLog} onCellClick={handleCellClick} parentMobName={parentMobName} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">DAILY LOG</h1>
            <p className="text-sm text-slate-500 mt-1">Log and track daily animal activities.</p>
            <div className="flex items-center gap-1 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
              <button 
                onClick={handlePrevDay} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2 px-2 border-x border-slate-200">
                <Calendar size={14} className="text-slate-400" />
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
        {isSyncing && <span className="text-sm text-slate-500 animate-pulse">Syncing Weather...</span>}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1 rounded-xl gap-0.5 sm:gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex-1 min-w-fit sm:min-w-[100px] py-1.5 px-1 sm:py-2.5 text-[11px] sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === category 
                  ? 'bg-white text-blue-700 shadow-sm font-bold' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setHideSubAccounts(!hideSubAccounts)}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${hideSubAccounts ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          <Users size={14} />
          {hideSubAccounts ? 'Sub-Accounts Hidden' : 'Showing All'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            {renderHeaders()}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 animate-pulse">
                  <td className="px-1 py-4 sm:p-4 flex items-center gap-1 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 hidden sm:block"></div>
                    <div>
                      <div className="h-4 w-16 sm:w-24 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 w-12 sm:w-16 bg-slate-200 rounded"></div>
                    </div>
                  </td>
                  <td className="px-1 py-4 sm:p-4"><div className="h-8 w-full min-w-[40px] sm:w-16 bg-slate-200 rounded-lg"></div></td>
                  <td className="px-1 py-4 sm:p-4"><div className="h-8 w-full min-w-[40px] sm:w-16 bg-slate-200 rounded-lg"></div></td>
                  <td className="px-1 py-4 sm:p-4"><div className="h-8 w-full min-w-[40px] sm:w-16 bg-slate-200 rounded-lg"></div></td>
                </tr>
              ))
            ) : (
              visibleAnimals.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedAnimal && (
        <AddEntryModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={async (entry) => {
            if (entry.animal_id && isProcessing.current.has(entry.animal_id)) return;
            if (entry.animal_id) isProcessing.current.add(entry.animal_id);
            try {
              if (!entry.id) entry.id = uuidv4();
              await addLogEntry(entry as LogEntry);
              setIsModalOpen(false);
            } finally {
              if (entry.animal_id) isProcessing.current.delete(entry.animal_id);
            }
          }}
          animal={selectedAnimal}
          initialType={selectedType}
          existingLog={getTodayLog(selectedAnimal.id, selectedType)}
          initialDate={viewDate}
        />
      )}
    </div>
  );
};

export default DailyLog;
