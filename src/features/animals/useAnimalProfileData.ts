import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Animal, LogEntry, Task } from '../../types';

export function useAnimalProfileData(animalId: string) {
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(!db || !animalId ? false : true);

  useEffect(() => {
    if (!db || !animalId) {
      return;
    }

    // Subscribe to animal (could be in live or archived)
    const animalSub = db.animals.findOne(animalId).$.subscribe(doc => {
      if (doc) {
        setAnimal(doc.toJSON() as Animal);
      } else {
        setAnimal(null);
      }
      setIsLoading(false);
    });

    // Subscribe to logs
    const logsSub = db.daily_records.find({
      selector: { animal_id: animalId }
    }).$.subscribe(docs => {
      setLogs(docs.map(d => d.toJSON() as LogEntry));
    });

    // Subscribe to tasks
    const tasksSub = db.tasks.find({
      selector: { animal_id: animalId }
    }).$.subscribe(docs => {
      setTasks(docs.map(d => d.toJSON() as Task));
    });

    return () => {
      animalSub.unsubscribe();
      logsSub.unsubscribe();
      tasksSub.unsubscribe();
    };
  }, [animalId]);

  const archiveAnimal = async (reason: string, type: NonNullable<Animal['archive_type']>) => {
    if (!db || !animal) return;
    const doc = await db.animals.findOne(animal.id).exec();
    if (doc) {
      await doc.patch({
        record_type: 'archived_animals',
        archived: true,
        archive_reason: reason,
        archive_type: type,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    animal,
    logs,
    tasks,
    orgProfile: { name: 'Kent Owl Academy', logo_url: '' },
    allAnimals: [],
    isLoading,
    archiveAnimal
  };
}
