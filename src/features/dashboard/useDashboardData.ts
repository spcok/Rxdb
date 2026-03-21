import { useState, useMemo } from 'react';
import { Animal, AnimalCategory, LogType, LogEntry } from '../../types';
import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useTaskData } from '../husbandry/useTaskData';
import { useHybridQuery } from '../../lib/dataEngine';

export interface EnhancedAnimal extends Animal {
  todayWeight?: LogEntry;
  todayFeed?: LogEntry;
  lastFedStr: string;
  displayId: string;
  nextFeedTask?: { due_date: string; notes?: string };
}

export interface AnimalStatsData {
  todayWeight?: { weight?: number; weight_unit?: string; weight_grams?: number; value?: string | number; log_date?: string | Date };
  previousWeight?: { weight?: number; weight_unit?: string; weight_grams?: number; value?: string | number; log_date?: string | Date };
  todayFeed?: { value?: string | number; log_date?: string | Date };
}

export interface PendingTask {
  id: string;
  title: string;
  due_date?: string;
}

export function useDashboardData(activeTab: AnimalCategory | 'ARCHIVED', viewDate: string) {
  const liveAnimalsRaw = useHybridQuery<Animal[]>(
    'animals', 
    supabase.from('animals').select('*'),
    () => db.animals.toArray(), 
    []
  );
  const archivedAnimalsRaw = useHybridQuery<Animal[]>(
    'archived_animals', 
    supabase.from('archived_animals').select('*'),
    () => db.archived_animals.toArray(), 
    []
  );
  const archivedAnimals = useMemo(() => archivedAnimalsRaw || [], [archivedAnimalsRaw]);
  const logsRaw = useHybridQuery<LogEntry[]>(
    'daily_logs', 
    supabase.from('daily_logs').select('*').eq('log_date', viewDate),
    () => db.daily_logs.where('log_date').equals(viewDate).toArray(), 
    [viewDate]
  );
  
  // Note: Following prompt instructions to optimize query, but this may impact historical feed tracking
  const allLogsRaw = useHybridQuery<LogEntry[]>(
    'daily_logs', 
    supabase.from('daily_logs').select('*').eq('log_date', viewDate),
    () => db.daily_logs.where('log_date').equals(viewDate).toArray(), 
    [viewDate]
  );
  
  const liveAnimals = useMemo(() => liveAnimalsRaw || [], [liveAnimalsRaw]);
  const logs = useMemo(() => logsRaw || [], [logsRaw]);
  const allLogs = useMemo(() => allLogsRaw || [], [allLogsRaw]);
  
  const isLoading = liveAnimalsRaw === undefined;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('alpha-asc');
  const [isOrderLocked, setIsOrderLocked] = useState(false);

  const { tasks } = useTaskData();

  const animalStats = useMemo(() => {
    let filtered = liveAnimals || [];
    if (activeTab && activeTab !== AnimalCategory.ALL && activeTab !== 'ARCHIVED') {
      filtered = filtered.filter(a => a.category === activeTab);
    }
    
    const filteredIds = new Set(filtered.map(a => a.id));
    const todayLogs = (logs || []).filter(l => filteredIds.has(l.animal_id));
    
    const weighed = todayLogs.filter(l => l.log_type === LogType.WEIGHT).length;
    const fed = todayLogs.filter(l => l.log_type === LogType.FEED).length;

    return {
      total: filtered.length,
      weighed,
      fed,
      animalData: new Map<string, AnimalStatsData>()
    };
  }, [liveAnimals, activeTab, logs]);

  const taskStats = useMemo(() => {
    const pendingTasks = (tasks || [])
      .filter(t => !t.completed && t.type !== 'HEALTH')
      .map(t => ({ id: t.id, title: t.title, due_date: t.due_date }));
      
    const pendingHealth = (tasks || [])
      .filter(t => !t.completed && t.type === 'HEALTH')
      .map(t => ({ id: t.id, title: t.title, due_date: t.due_date }));

    return { pendingTasks, pendingHealth };
  }, [tasks]);

  const filteredAnimals = useMemo(() => {
    let result = activeTab === 'ARCHIVED' ? [...archivedAnimals] : [...liveAnimals];
    
    if (activeTab && activeTab !== AnimalCategory.ALL && activeTab !== 'ARCHIVED') {
      result = result.filter(a => a.category === activeTab);
    }
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.name?.toLowerCase().includes(lowerTerm) || 
        a.species?.toLowerCase().includes(lowerTerm) ||
        (a.latin_name && a.latin_name.toLowerCase().includes(lowerTerm))
      );
    }
    
    if (sortOption === 'alpha-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'alpha-desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    return result.map(animal => {
      try {
        const animalLogs = allLogs.filter(l => l.animal_id === animal.id);
        const todayLogs = logs.filter(l => l.animal_id === animal.id);
        
        const todayWeight = todayLogs.find(l => l.log_type === LogType.WEIGHT);
        const todayFeed = todayLogs.find(l => l.log_type === LogType.FEED);
        
        const feedLogs = animalLogs
          .filter(l => l.log_type === LogType.FEED)
          .sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.log_date ? new Date(a.log_date).getTime() : 0);
            const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.log_date ? new Date(b.log_date).getTime() : 0);
            
            if (isNaN(timeA) || isNaN(timeB)) return 0;
            return timeB - timeA;
          });
        
        const lastFed = feedLogs[0];
        let lastFedStr = '-';
        if (lastFed) {
          const timePart = lastFed.created_at 
            ? new Date(lastFed.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : '';
          lastFedStr = `${lastFed.value}${timePart ? ' ' + timePart : ''}`;
        }
        
        const isBird = animal.category === AnimalCategory.OWLS || animal.category === AnimalCategory.RAPTORS;
        const displayId = isBird 
          ? (animal.ring_number || '-') 
          : (animal.microchip_id || '-');
  
        const upcomingFeeds = (tasks || [])
          .filter(t => (t.animal_id === animal.id) && (t.type === LogType.FEED) && !t.completed)
          .sort((a, b) => {
            const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
            const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
            if (isNaN(timeA) || isNaN(timeB)) return 0;
            return timeA - timeB;
          });
  
        const nextFeed = upcomingFeeds[0];
        const nextFeedTask = nextFeed ? { due_date: nextFeed.due_date, notes: nextFeed.notes } : undefined;
  
        return {
          ...animal,
          todayWeight,
          todayFeed,
          lastFedStr,
          displayId,
          nextFeedTask
        };
      } catch (err) {
        console.error('Error enhancing animal data:', animal.id, err);
        return {
          ...animal,
          lastFedStr: 'Error',
          displayId: animal.id.slice(0, 8)
        } as EnhancedAnimal;
      }
    });
  }, [liveAnimals, archivedAnimals, activeTab, searchTerm, sortOption, logs, allLogs, tasks]);

  const toggleOrderLock = (locked: boolean) => setIsOrderLocked(locked);
  const cycleSort = () => {
    setSortOption(prev => prev === 'alpha-asc' ? 'alpha-desc' : prev === 'alpha-desc' ? 'custom' : 'alpha-asc');
  };

  return {
    filteredAnimals,
    animalStats,
    taskStats,
    isLoading,
    searchTerm,
    setSearchTerm,
    sortOption,
    cycleSort,
    isOrderLocked,
    toggleOrderLock
  };
}
