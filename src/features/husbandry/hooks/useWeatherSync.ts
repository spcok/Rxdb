import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Animal, LogEntry, LogType, AnimalCategory } from '../../../types';
import { getMaidstoneDailyWeather } from '../../../services/weatherService';

export const useWeatherSync = (
  animals: Animal[],
  getTodayLog: (animalId: string, type: LogType) => LogEntry | undefined,
  addLogEntry: (entry: LogEntry) => Promise<void>,
  viewDate: string,
  isProcessing: React.MutableRefObject<Set<string>>
) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const syncWeather = async () => {
      const today = new Date().toISOString().split('T')[0];
      if (viewDate !== today) return;
      if (animals.length === 0) return;

      const birdsToSync = animals.filter(
        animal =>
          (animal.category === AnimalCategory.OWLS || animal.category === AnimalCategory.RAPTORS) &&
          !getTodayLog(animal.id, LogType.TEMPERATURE) &&
          !isProcessing.current.has(animal.id)
      );

      if (birdsToSync.length === 0) return;

      if (!isMounted.current) return;
      setIsSyncing(true);
      try {
        const weather = await getMaidstoneDailyWeather();
        
        for (const bird of birdsToSync) {
          if (isProcessing.current.has(bird.id)) continue;
          isProcessing.current.add(bird.id);
          try {
            await addLogEntry({
              id: uuidv4(),
              animal_id: bird.id,
              log_type: LogType.TEMPERATURE,
              log_date: viewDate,
              value: `${Math.round(weather.currentTemp)}°C`,
              notes: weather.description
            });
          } catch (error) {
            console.error('Fetch failed', error);
          } finally {
            isProcessing.current.delete(bird.id);
          }
        }
      } catch (error) {
        console.error('Failed to auto-sync weather for birds:', error);
        // If weather fetch fails, unlock all birds we intended to sync
        birdsToSync.forEach(bird => isProcessing.current.delete(bird.id));
      } finally {
        if (isMounted.current) setIsSyncing(false);
      }
    };

    syncWeather();
    return () => {
      isMounted.current = false;
    };
  }, [animals, getTodayLog, addLogEntry, viewDate, isProcessing]);

  return { isSyncing };
};