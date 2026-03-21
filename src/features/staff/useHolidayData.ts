import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Holiday } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useHolidayData() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.staff_records.find({
      selector: { 
        is_deleted: { $eq: false },
        record_type: { $eq: 'holidays' }
      },
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
      record_type: 'holidays',
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as Holiday;
    await db.staff_records.upsert(newHoliday);
  };

  const deleteHoliday = async (id: string) => {
    const holidayDoc = await db.staff_records.findOne(id).exec();
    if (holidayDoc) {
      const holiday = holidayDoc.toJSON();
      await db.staff_records.upsert({
        ...holiday,
        record_type: 'holidays',
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
