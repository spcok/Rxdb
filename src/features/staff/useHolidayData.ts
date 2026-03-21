import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Holiday } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useHolidayData() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.holidays.find({
      selector: { is_deleted: { $eq: false } },
      sort: [{ start_date: 'desc' }]
    }).$.subscribe(docs => {
      setHolidays(docs.map(d => d.toJSON() as Holiday));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const addHoliday = async (holiday: Omit<Holiday, 'id'>) => {
    const newHoliday: Holiday = {
      ...holiday,
      id: uuidv4(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as Holiday;
    await db.holidays.upsert(newHoliday);
  };

  const deleteHoliday = async (id: string) => {
    const holidayDoc = await db.holidays.findOne(id).exec();
    if (holidayDoc) {
      const holiday = holidayDoc.toJSON();
      await db.holidays.upsert({
        ...holiday,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    holidays,
    isLoading,
    addHoliday,
    deleteHoliday
  };
}
