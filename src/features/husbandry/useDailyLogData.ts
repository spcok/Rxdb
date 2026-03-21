import { useCallback, useMemo, useState, useEffect } from 'react';
import { LogEntry, LogType } from '../../types';
import { db } from '../../lib/rxdb';
import { useAnimalsData } from '../animals/useAnimalsData';

export const useDailyLogData = (viewDate: string, activeCategory: string) => {
  const { animals, isLoading: animalsLoading } = useAnimalsData();
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.daily_logs_v2.find({
      selector: { 
        log_date: { $eq: viewDate },
        is_deleted: { $eq: false }
      }
    }).$.subscribe(docs => {
      setAllLogs(docs.map(d => d.toJSON() as LogEntry));
      setIsLogsLoading(false);
    });

    return () => sub.unsubscribe();
  }, [viewDate]);

  const logs = useMemo(() => allLogs, [allLogs]);

  const getTodayLog = useCallback((animalId: string, type: LogType) => {
    return logs.find(log => log.animal_id === animalId && log.log_type === type);
  }, [logs]);

  const addLogEntry = useCallback(async (entry: Partial<LogEntry>) => {
    const payload = {
      ...entry,
      id: entry.id || crypto.randomUUID(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    };
    await db.daily_logs_v2.upsert(payload);
  }, []);

  const filteredAnimals = useMemo(() => {
    return animals.filter(a => activeCategory === 'all' || a.category === activeCategory);
  }, [animals, activeCategory]);

  return { animals: filteredAnimals, getTodayLog, addLogEntry, isLoading: animalsLoading || isLogsLoading };
};
