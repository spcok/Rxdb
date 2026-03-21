import { db } from '../../lib/db';
import { useHybridQuery, archiveAnimal as archiveAnimalDataEngine } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';
import { Animal, LogEntry, Task } from '../../types';

export function useAnimalProfileData(animalId: string) {
  // 1. Fetch from live collection
  const liveAnimal = useHybridQuery<Animal | null>(
    'animals',
    supabase.from('animals').select('*').eq('id', animalId).maybeSingle(),
    async () => {
      if (!animalId) return null;
      const a = await db.animals.get(animalId);
      return a || null; // Force null if undefined
    },
    [animalId]
  );

  // 2. Fetch from archived collection
  const archivedAnimal = useHybridQuery<Animal | null>(
    'archived_animals',
    supabase.from('archived_animals').select('*').eq('id', animalId).maybeSingle(),
    async () => {
      if (!animalId) return null;
      const a = await db.archived_animals.get(animalId);
      return a || null; // Force null if undefined
    },
    [animalId]
  );

  const logs = useHybridQuery<LogEntry[]>(
    'daily_logs',
    supabase.from('daily_logs').select('*').eq('animal_id', animalId),
    () => (animalId ? db.daily_logs.where('animal_id').equals(animalId).toArray() : []),
    [animalId]
  );

  const tasks = useHybridQuery<Task[]>(
    'tasks',
    supabase.from('tasks').select('*').eq('animal_id', animalId),
    () => (animalId ? db.tasks.where('animal_id').equals(animalId).toArray() : []),
    [animalId]
  );

  // 3. Resolve Loading State
  // It is ONLY loading if the queries are strictly undefined (initial fetch state)
  const isLoading = liveAnimal === undefined || archivedAnimal === undefined || logs === undefined || tasks === undefined;

  // 4. Determine Active Record
  const animal = liveAnimal || archivedAnimal || null;

  const archiveAnimal = async (reason: string, type: NonNullable<Animal['archive_type']>) => {
    if (animal) {
      await archiveAnimalDataEngine(animal, reason, type);
    }
  };

  return {
    animal: animal || null,
    logs: logs || [],
    tasks: tasks || [],
    orgProfile: { name: 'Kent Owl Academy', logo_url: '' },
    allAnimals: [],
    isLoading,
    archiveAnimal
  };
}
