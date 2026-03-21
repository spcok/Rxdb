import React, { memo } from 'react';
import { Animal, LogType, LogEntry, EntityType } from '../../../types';

interface ExoticRowProps {
  animal: Animal;
  getTodayLog: (animalId: string, type: LogType) => LogEntry | undefined;
  onCellClick: (animal: Animal, type: LogType) => void;
  parentMobName?: string;
}

export const ExoticRow: React.FC<ExoticRowProps> = memo(({ animal, getTodayLog, onCellClick, parentMobName }) => {
  const isGroup = animal.entity_type === EntityType.GROUP;
  const feedLog = getTodayLog(animal.id, LogType.FEED);
  const mistingLog = getTodayLog(animal.id, LogType.MISTING);
  const tempLog = getTodayLog(animal.id, LogType.TEMPERATURE);

  const formatValue = (log: LogEntry | undefined, fallback: string) => {
    if (!log || !log.value) return fallback;
    return isGroup ? `${log.value} (Mob Total)` : log.value;
  };

  const getFeedTime = (log: LogEntry | undefined) => {
    if (!log || !log.notes) return null;
    try {
      const parsed = JSON.parse(log.notes);
      return parsed.feedTime ? `@ ${parsed.feedTime}` : null;
    } catch {
      return null;
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-1 py-3 sm:p-4 flex items-center gap-1 sm:gap-3">
        <img src={animal.image_url || '/placeholder.png'} alt={animal.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover hidden sm:block" referrerPolicy="no-referrer" />
        <div className="min-w-0">
          <div className="font-bold text-slate-800 text-xs sm:text-sm break-words flex items-center flex-wrap gap-1">
            {animal.name}
            {isGroup && (
              <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                Group Record (Census: {animal.census_count || 0})
              </span>
            )}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 break-words">{animal.species}</div>
          {animal.entity_type === EntityType.INDIVIDUAL && animal.parent_mob_id && parentMobName && (
            <div className="text-[10px] text-slate-500 italic">Part of {parentMobName}</div>
          )}
        </div>
      </td>
      <td className="px-1 py-3 sm:p-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => onCellClick(animal, LogType.FEED)} 
            className="w-full min-w-[40px] sm:min-w-[60px] px-1 sm:px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-xs font-bold text-emerald-800 text-center truncate"
          >
            {formatValue(feedLog, 'Feed')}
          </button>
          {getFeedTime(feedLog) && (
            <span className="text-[10px] font-bold text-slate-400">
              {getFeedTime(feedLog)}
            </span>
          )}
        </div>
      </td>
      <td className="px-1 py-3 sm:p-4 text-center">
        <button onClick={() => onCellClick(animal, LogType.MISTING)} className="w-full min-w-[40px] sm:min-w-[60px] px-1 sm:px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-xs font-bold text-blue-800 text-center truncate">
          {formatValue(mistingLog, 'Mist')}
        </button>
      </td>
      <td className="px-1 py-3 sm:p-4 text-center">
        <button 
          onClick={() => onCellClick(animal, LogType.TEMPERATURE)}
          className="w-full grid grid-cols-2 divide-x-2 divide-slate-200 border-2 border-slate-200 rounded-xl overflow-hidden hover:border-emerald-500 transition-all bg-white"
        >
          {tempLog ? (
            <>
              <div className="py-2 flex flex-col items-center bg-slate-50/50">
                <span className="text-[8px] font-black text-slate-400 uppercase">BASK</span>
                <span className="text-xs font-bold text-slate-800">
                  {getTodayLog(animal.id, LogType.TEMPERATURE)?.value?.split('|')[0] ?? '--'}
                </span>
              </div>
              <div className="py-2 flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase">COOL</span>
                <span className="text-xs font-bold text-slate-800">
                  {getTodayLog(animal.id, LogType.TEMPERATURE)?.value?.split('|')[1] ?? '--'}
                </span>
              </div>
            </>
          ) : (
            <div className="col-span-2 py-3 text-[10px] font-black text-slate-400 uppercase text-center">
              Add Temps
            </div>
          )}
        </button>
      </td>
    </tr>
  );
});
