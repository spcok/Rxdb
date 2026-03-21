import { useState, useEffect } from 'react';
import { Animal } from '../../types';
import { db } from '../../lib/rxdb';

export function useAnimalsData() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) return;

    const sub = db.animals.find({
      selector: { is_deleted: { $eq: false } },
      sort: [{ name: 'asc' }]
    }).$.subscribe({
      next: (docs) => {
        setAnimals(docs.map(d => d.toJSON() as Animal));
        setIsLoading(false);
      },
      error: (err) => {
        console.error('Error fetching animals:', err);
        setError(err);
        setIsLoading(false);
      }
    });

    return () => sub.unsubscribe();
  }, []);

  return {
    animals,
    isLoading,
    error
  };
}
