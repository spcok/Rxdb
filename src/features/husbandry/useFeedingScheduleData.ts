import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Animal, Task } from '../../types';

export function useFeedingScheduleData() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subs = [
      db.animals.find({
        selector: { is_deleted: { $eq: false } }
      }).$.subscribe(docs => {
        setAnimals(docs.map(d => d.toJSON() as Animal));
      }),

      db.tasks.find({
        selector: { is_deleted: { $eq: false } }
      }).$.subscribe(docs => {
        setTasks(docs.map(d => d.toJSON() as Task));
        setIsLoading(false);
      })
    ];

    return () => subs.forEach(sub => sub.unsubscribe());
  }, []);

  const addTasks = async (newTasks: Task[]) => {
    for (const task of newTasks) {
      await db.tasks.upsert({
        ...task,
        updated_at: new Date().toISOString(),
        is_deleted: false
      });
    }
  };

  const deleteTask = async (id: string) => {
    const taskDoc = await db.tasks.findOne(id).exec();
    if (taskDoc) {
      const task = taskDoc.toJSON();
      await db.tasks.upsert({
        ...task,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    animals,
    tasks,
    isLoading,
    addTasks,
    deleteTask
  };
}
