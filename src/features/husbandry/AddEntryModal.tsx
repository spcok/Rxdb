import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { v4 as uuidv4 } from 'uuid';
import { X, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { Animal, LogType, LogEntry, AnimalCategory } from '../../types';
import { getMaidstoneDailyWeather } from '../../services/weatherService';
import { mutateOnlineFirst } from '../../lib/dataEngine';
import { useOperationalLists } from '../../hooks/useOperationalLists';
import { convertToGrams, convertFromGrams } from '../../services/weightUtils';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<LogEntry>) => void;
  animal: Animal; // Safety enforced by parent
  initialType: LogType;
  existingLog?: LogEntry;
  initialDate: string;
  defaultTemperature?: number;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  animal,
  initialType,
  existingLog,
  initialDate,
  defaultTemperature
}) => {
  const { currentUser } = useAuthStore();
  
  // Hard Hook Protection: Prevents crash if DB record is missing a category
  const safeCategory = animal?.category || AnimalCategory.MAMMALS;
  const { foodTypes, feedMethods, eventTypes } = useOperationalLists(safeCategory);
  
  const [logType, setLogType] = useState<LogType>(initialType);
  const [date, setDate] = useState(initialDate);
  const [value, setValue] = useState(existingLog?.value || '');
  const [feedItems, setFeedItems] = useState<{type: string, quantity: string}[]>(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.value) {
      return existingLog.value.split(', ').map(item => {
        const parts = item.split(' - ');
        return { type: parts[0] || '', quantity: parts[1] || '' };
      });
    }
    return [{ type: '', quantity: '' }];
  });

  useEffect(() => {
    if (foodTypes.length > 0 && feedItems.length === 1 && !feedItems[0].type && !existingLog) {
      setFeedItems([{ ...feedItems[0], type: foodTypes[0].value }]);
    }
    if (logType === LogType.EVENT && !value && eventTypes.length > 0) {
      setValue(eventTypes[0].value);
    }
  }, [foodTypes, eventTypes, logType, feedItems, existingLog, value]);

  const [notes, setNotes] = useState(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.notes) {
      try {
        const parsed = JSON.parse(existingLog.notes);
        return parsed.userNotes || '';
      } catch {
        return existingLog.notes;
      }
    }
    return existingLog?.notes || '';
  });
  
  const [feedTime, setFeedTime] = useState(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.notes) {
      try {
        const parsed = JSON.parse(existingLog.notes);
        return parsed.feedTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
    }
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  const [cast, setCast] = useState<'AM' | 'PM' | 'NO' | 'N/A'>(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.notes) {
      try {
        const parsed = JSON.parse(existingLog.notes);
        return parsed.cast || 'N/A';
      } catch {
        return 'N/A';
      }
    }
    return 'N/A';
  });

  const targetUnit = animal?.weight_unit === 'lbs_oz' ? 'lb' : (animal?.weight_unit === 'oz' ? 'oz' : 'g');
  const [weightValues, setWeightValues] = useState<{ g: number; lb: number; oz: number; eighths: number }>(() => {
    if (existingLog?.weight_grams) {
      return convertFromGrams(existingLog.weight_grams, targetUnit as 'g' | 'oz' | 'lb');
    }
    return { g: 0, lb: 0, oz: 0, eighths: 0 };
  });

  const handleWeightChange = (field: string, val: string) => {
    const num = parseInt(val) || 0;
    setWeightValues(prev => ({ ...prev, [field]: num }));
  };

  const [baskingTemp, setBaskingTemp] = useState<number | ''>(existingLog?.basking_temp_c || '');
  const [coolTemp, setCoolTemp] = useState<number | ''>(existingLog?.cool_temp_c || '');
  const [temperature, setTemperature] = useState<number | ''>(existingLog?.temperature_c ?? defaultTemperature ?? '');
  const [healthRecordType, setHealthRecordType] = useState(existingLog?.health_record_type || '');
  const [litterSize, setLitterSize] = useState<number | ''>('');
  const [litterHealth, setLitterHealth] = useState<string>('Healthy');
  const [userInitials, setUserInitials] = useState(currentUser?.initials || '');
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Early Return Guard
  if (!isOpen || !animal) return null;

  const handleFetchWeatherInsideModal = async () => {
    if (isWeatherLoading) return;
    setIsWeatherLoading(true);
    try {
      const weather = await getMaidstoneDailyWeather();
      setTemperature(Math.round(weather.currentTemp));
      setNotes(prev => prev ? `${prev} | ${weather.description}` : weather.description);
    } catch (err) {
      console.error('Failed to auto-fetch weather', err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!date) return setError('Date is required.');
    if (!userInitials || userInitials.trim().length < 2) return setError('Staff initials are required (min 2 characters).');
    if (!animal?.id) return setError('Animal ID is missing.');

    if (logType === LogType.FEED && feedItems.some(item => !item.type || !item.quantity)) {
      return setError('All Food Items must have both Type and Quantity.');
    }

    if (logType === LogType.WEIGHT && convertToGrams(targetUnit as 'g' | 'oz' | 'lb', weightValues) <= 0) {
      return setError('Weight is required and must be greater than 0.');
    }

    if (logType === LogType.TEMPERATURE) {
      if (animal.category === AnimalCategory.EXOTICS && (baskingTemp === '' || coolTemp === '')) {
        return setError('Both Basking and Cool temperatures are required for exotics.');
      } else if (animal.category !== AnimalCategory.EXOTICS && temperature === '') {
        return setError('Temperature is required.');
      }
    }

    if (logType === LogType.HEALTH && !healthRecordType) return setError('Health Record Type is required.');
    if (logType === LogType.EVENT && !value) return setError('Event Type is required.');
    if ([LogType.MISTING, LogType.WATER, LogType.GENERAL, LogType.FLIGHT, LogType.TRAINING].includes(logType) && !value.trim()) {
      return setError(`${logType} detail is required.`);
    }
    if (logType === LogType.BIRTH && (litterSize === '' || !litterHealth)) return setError('Litter Size and Health are required for birth logs.');

    setIsSubmitting(true);
    
    try {
      const finalValue = logType === LogType.FEED ? feedItems.map(item => `${item.type} - ${item.quantity}`).join(', ') : (value || logType);
      
      const entry: Partial<LogEntry> = {
        id: existingLog?.id || uuidv4(),
        animal_id: animal.id,
        log_type: logType,
        log_date: date,
        value: finalValue,
        user_initials: userInitials.toUpperCase(),
        notes: logType === LogType.FEED ? JSON.stringify({ cast, feedTime, userNotes: notes }) : notes,
      };

      if (logType === LogType.WEIGHT) {
        const totalGrams = convertToGrams(targetUnit as 'g' | 'oz' | 'lb', weightValues);
        entry.weight_grams = totalGrams;
        entry.weight = totalGrams;
        entry.weight_unit = animal.weight_unit;
        // Keep DB string raw to not destroy historical formatting expectations
        entry.value = `${totalGrams}g`; 
      }

      if (logType === LogType.TEMPERATURE) {
        if (animal.category === AnimalCategory.EXOTICS && baskingTemp !== '' && coolTemp !== '') {
          entry.basking_temp_c = Number(baskingTemp);
          entry.cool_temp_c = Number(coolTemp);
          entry.value = `${baskingTemp}°C | ${coolTemp}°C`;
          entry.notes = JSON.stringify({ basking: Number(baskingTemp), cool: Number(coolTemp) });
        } else if (temperature !== '') {
          entry.temperature_c = Number(temperature);
          entry.value = `${temperature}°C`;
        }
      }

      if (logType === LogType.HEALTH) {
        entry.health_record_type = healthRecordType;
        entry.value = healthRecordType;
      }

      if (logType === LogType.BIRTH) {
        entry.value = `Litter Size: ${litterSize} (${litterHealth})`;
        if (!existingLog && typeof litterSize === 'number' && litterSize > 0) {
          const pups = Array.from({ length: litterSize }).map((_, i) => ({
            id: uuidv4(),
            name: `Pup ${i + 1} (${animal.name})`,
            species: animal.species,
            category: animal.category,
            dob: date,
            is_dob_unknown: false,
            sex: 'Unknown',
            location: animal.location,
            acquisition_date: date,
            acquisition_type: 'BORN',
            origin: 'Captive Bred',
            dam_id: animal.sex === 'Female' ? animal.id : undefined,
            sire_id: animal.sex === 'Male' ? animal.id : undefined,
            parent_mob_id: animal.entity_type === 'GROUP' ? animal.id : animal.parent_mob_id,
            archived: false,
            is_quarantine: false,
            display_order: 0,
          } as Animal));
          
          for (const pup of pups) {
            await mutateOnlineFirst('animals', pup, 'upsert');
          }
        }
      }

      onSave(entry);
    } catch (err) {
      console.error('🛠️ [Husbandry QA] Error saving entry:', err);
      setError('An error occurred while saving. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFields = () => {
    switch (logType) {
      case LogType.WEIGHT:
        return (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Weight ({targetUnit})</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {targetUnit === 'g' && (
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Grams</label>
                  <input type="number" value={weightValues.g || ''} onChange={(e) => handleWeightChange('g', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all" placeholder="e.g. 1050" />
                </div>
              )}
              {targetUnit === 'oz' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                    <input type="number" value={weightValues.oz || ''} onChange={(e) => handleWeightChange('oz', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all" placeholder="oz" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                    <select value={weightValues.eighths || 0} onChange={(e) => handleWeightChange('eighths', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all">
                      {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                    </select>
                  </div>
                </>
              )}
              {targetUnit === 'lb' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pounds (lb)</label>
                    <input type="number" value={weightValues.lb || ''} onChange={(e) => handleWeightChange('lb', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all" placeholder="lb" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                    <select value={weightValues.oz || 0} onChange={(e) => handleWeightChange('oz', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all">
                      {Array.from({length: 16}, (_, i) => i).map(n => <option key={n} value={n}>{n} oz</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                    <select value={weightValues.eighths || 0} onChange={(e) => handleWeightChange('eighths', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all">
                      {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <p className="text-[10px] font-medium text-slate-400 italic">Calculated Value: {convertToGrams(targetUnit as 'g' | 'oz' | 'lb', weightValues).toFixed(2)}g</p>
          </div>
        );
      case LogType.FEED:
        return (
          <div className="space-y-4">
            {feedItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Food Type</label>
                  <select value={item.type} onChange={e => { const newItems = [...feedItems]; newItems[index].type = e.target.value; setFeedItems(newItems); }} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm">
                    {foodTypes.map(opt => <option key={opt.id} value={opt.value}>{opt.value}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Quantity</label>
                  <input type="text" value={item.quantity} onChange={e => { const newItems = [...feedItems]; newItems[index].quantity = e.target.value; setFeedItems(newItems); }} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm" placeholder="e.g. 2x, 50g" required />
                </div>
                {feedItems.length > 1 && (
                  <button type="button" onClick={() => setFeedItems(feedItems.filter((_, i) => i !== index))} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setFeedItems([...feedItems, { type: foodTypes[0]?.value || '', quantity: '' }])} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Add Another Item
            </button>
            {feedMethods.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Method</label>
                <div className="flex flex-wrap gap-2">
                  {feedMethods.map(method => (
                    <button key={method.id} type="button" onClick={() => setNotes(prev => prev ? `${prev} | ${method.value}` : method.value)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors">
                      {method.value}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Time of Feed</label>
                <input type="time" value={feedTime} onChange={e => setFeedTime(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cast</label>
                <select value={cast} onChange={(e) => setCast(e.target.value as 'AM' | 'PM' | 'NO' | 'N/A')} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold">
                  <option value="AM">AM</option><option value="PM">PM</option><option value="NO">NO</option><option value="N/A">N/A</option>
                </select>
              </div>
            </div>
          </div>
        );
      case LogType.TEMPERATURE:
        if (animal.category === AnimalCategory.EXOTICS) {
          return (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Basking Temp (°C)</label>
                <input type="number" value={baskingTemp} onChange={e => setBaskingTemp(e.target.value ? Number(e.target.value) : '')} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cool Temp (°C)</label>
                <input type="number" value={coolTemp} onChange={e => setCoolTemp(e.target.value ? Number(e.target.value) : '')} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" required />
              </div>
            </div>
          );
        }
        return (
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Temperature (°C)</label>
                <input type="number" value={temperature} onChange={e => setTemperature(e.target.value ? Number(e.target.value) : '')} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" required disabled={isWeatherLoading} />
              </div>
              {animal.category === AnimalCategory.MAMMALS && (
                <button type="button" onClick={handleFetchWeatherInsideModal} disabled={isWeatherLoading} className="px-4 py-3 bg-sky-50 text-sky-700 border-2 border-sky-200 rounded-xl font-bold text-xs uppercase hover:bg-sky-100 flex items-center gap-2 transition-colors disabled:opacity-50">
                  {isWeatherLoading ? <Loader2 size={14} className="animate-spin" /> : '☁️ Fetch 13:00'}
                </button>
              )}
            </div>
            {!isWeatherLoading && defaultTemperature !== undefined && !existingLog && temperature === defaultTemperature && <p className="text-xs text-slate-500 mt-1">Auto-filled from local weather</p>}
          </div>
        );
      case LogType.EVENT:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Event Type</label>
              <select value={value} onChange={e => setValue(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" required>
                <option value="">Select Event...</option>
                {eventTypes.map(type => <option key={type.id} value={type.value}>{type.value}</option>)}
              </select>
            </div>
          </div>
        );
      case LogType.HEALTH:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Record Type</label>
              <input type="text" value={healthRecordType} onChange={e => setHealthRecordType(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" placeholder="e.g. Medication, Vet Visit, Observation" required />
            </div>
          </div>
        );
      case LogType.BIRTH:
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Litter Size</label>
              <input type="number" value={litterSize} onChange={e => setLitterSize(e.target.value ? Number(e.target.value) : '')} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Health</label>
              <select value={litterHealth} onChange={e => setLitterHealth(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" required>
                <option value="Healthy">Healthy</option><option value="Complications">Complications</option><option value="Stillborn">Stillborn</option>
              </select>
            </div>
          </div>
        );
      case LogType.MISTING:
      case LogType.WATER:
      case LogType.GENERAL:
      default:
        return (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Value / Detail</label>
            <input type="text" value={value} onChange={e => setValue(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold" placeholder={logType === LogType.MISTING ? 'e.g. Heavy mist' : logType === LogType.WATER ? 'e.g. Changed water' : 'Enter detail...'} />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {existingLog ? 'Edit' : 'Add'} {logType}
            </h2>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{animal.name} ({animal.species})</p>
              {animal.entity_type === 'GROUP' && (
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Group Record (Census: {animal.census_count || 0})
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-xs" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Type</label>
              <select value={logType} onChange={e => setLogType(e.target.value as LogType)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-xs">
                {Object.values(LogType).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Staff Initials <span className="text-red-500">*</span>
            </label>
            <input type="text" value={userInitials} onChange={e => setUserInitials(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:ring-0 transition-all font-bold text-xs" placeholder="e.g. JD" required minLength={2} />
          </div>

          {renderFields()}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-medium text-xs min-h-[100px] resize-none" placeholder="Add any additional observations..." />
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:border-slate-300 transition-all">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {existingLog ? 'Update' : 'Save'} Entry
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEntryModal;