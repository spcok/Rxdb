import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { InternalMovement } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useMovementsData() {
  const [movements, setMovements] = useState<InternalMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.movements.find({
      selector: { is_deleted: { $eq: false } },
      sort: [{ log_date: 'desc' }]
    }).$.subscribe(docs => {
      setMovements(docs.map(d => d.toJSON() as InternalMovement));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const addMovement = async (movement: Omit<InternalMovement, 'id' | 'created_by'>) => {
    const newMovement: InternalMovement = {
      ...movement,
      id: uuidv4(),
      created_by: 'SYS', // Mock user
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as InternalMovement;
    await db.movements.upsert(newMovement);
  };

  return {
    movements,
    isLoading,
    addMovement
  };
}
