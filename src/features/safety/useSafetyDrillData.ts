import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { SafetyDrill } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useSafetyDrillData() {
  const [drills, setDrills] = useState<SafetyDrill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.safety_drills.find({
      selector: { is_deleted: { $eq: false } },
      sort: [{ date: 'desc' }]
    }).$.subscribe(docs => {
      setDrills(docs.map(d => d.toJSON() as SafetyDrill));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const addDrillLog = async (drill: Omit<SafetyDrill, 'id'>) => {
    const newDrill: SafetyDrill = {
      ...drill,
      id: uuidv4(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as SafetyDrill;
    await db.safety_drills.upsert(newDrill);
  };

  const deleteDrillLog = async (id: string) => {
    const drillDoc = await db.safety_drills.findOne(id).exec();
    if (drillDoc) {
      const drill = drillDoc.toJSON();
      await db.safety_drills.upsert({
        ...drill,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    drills,
    isLoading,
    addDrillLog,
    deleteDrillLog
  };
}
