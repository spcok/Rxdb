import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { InternalMovement } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useMovementsData() {
  const [movements, setMovements] = useState<InternalMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.logistics_records.find({
      selector: { 
        is_deleted: { $eq: false },
        record_type: { $eq: 'movements' }
      },
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
      record_type: 'movements',
      created_by: 'SYS', // Mock user
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as InternalMovement;
    await db.logistics_records.upsert(newMovement);
  };

  return {
    movements,
    isLoading,
    addMovement
  };
}
