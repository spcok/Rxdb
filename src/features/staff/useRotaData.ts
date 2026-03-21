import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Shift } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const useRotaData = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.staff_records.find({
      selector: { 
        is_deleted: { $eq: false },
        record_type: { $eq: 'shifts' }
      }
    }).$.subscribe(docs => {
      setShifts(docs.map(d => d.toJSON() as Shift));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const createShift = async (shift: Omit<Shift, 'id' | 'pattern_id'>, repeatDays: number[], weeksToRepeat: number) => {
    const pattern_id = uuidv4();
    const shiftsToCreate: Shift[] = [];
    
    if (repeatDays.length > 0 && weeksToRepeat > 0) {
      const startDate = new Date(shift.date);
      const startDay = startDate.getDay();
      const diffToMonday = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
      const anchorMonday = new Date(startDate);
      anchorMonday.setDate(diffToMonday);

      for (let week = 0; week < weeksToRepeat; week++) {
        for (const day of repeatDays) {
          const date = new Date(anchorMonday);
          const daysToAdd = (day === 0 ? 6 : day - 1) + (week * 7);
          date.setDate(anchorMonday.getDate() + daysToAdd);
          
          if (date >= startDate) {
            shiftsToCreate.push({ 
              ...shift, 
              id: uuidv4(), 
              record_type: 'shifts',
              date: date.toISOString().split('T')[0], 
              pattern_id,
              updated_at: new Date().toISOString(),
              is_deleted: false
            } as Shift);
          }
        }
      }
    } else {
      shiftsToCreate.push({ 
        ...shift, 
        id: uuidv4(), 
        record_type: 'shifts',
        date: shift.date,
        updated_at: new Date().toISOString(),
        is_deleted: false
      } as Shift);
    }

    for (const s of shiftsToCreate) {
      await db.staff_records.upsert(s);
    }
  };

  const updateShift = async (id: string, updates: Partial<Shift>, updateSeries: boolean = false) => {
    if (updateSeries && updates.pattern_id) {
      const seriesShifts = await db.staff_records.find({
        selector: { 
          pattern_id: { $eq: updates.pattern_id },
          is_deleted: { $eq: false },
          record_type: { $eq: 'shifts' }
        }
      }).exec();
      
      for (const sDoc of seriesShifts) {
        const s = sDoc.toJSON();
        await db.staff_records.upsert({ 
          ...s,
          ...updates, 
          id: s.id, 
          record_type: 'shifts',
          date: s.date,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      const shiftDoc = await db.staff_records.findOne(id).exec();
      if (shiftDoc) {
        const s = shiftDoc.toJSON();
        await db.staff_records.upsert({ 
          ...s,
          ...updates,
          record_type: 'shifts',
          updated_at: new Date().toISOString()
        });
      }
    }
  };

  const replaceShiftPattern = async (existingShift: Shift, newShiftData: Omit<Shift, 'id' | 'pattern_id'>, repeatDays: number[], weeksToRepeat: number) => {
    if (existingShift.pattern_id) {
      const futureShifts = await db.staff_records.find({
        selector: {
          pattern_id: { $eq: existingShift.pattern_id },
          date: { $gte: existingShift.date },
          is_deleted: { $eq: false },
          record_type: { $eq: 'shifts' }
        }
      }).exec();
      
      for (const sDoc of futureShifts) {
        const s = sDoc.toJSON();
        await db.staff_records.upsert({
          ...s,
          record_type: 'shifts',
          is_deleted: true,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      await db.staff_records.upsert({
        ...existingShift,
        record_type: 'shifts',
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
    await createShift(newShiftData, repeatDays, weeksToRepeat);
  };

  const deleteShift = async (shift: Shift, deleteSeries: boolean = false) => {
    if (deleteSeries && shift.pattern_id) {
      const seriesShifts = await db.staff_records.find({
        selector: {
          pattern_id: { $eq: shift.pattern_id },
          is_deleted: { $eq: false },
          record_type: { $eq: 'shifts' }
        }
      }).exec();
      
      for (const sDoc of seriesShifts) {
        const s = sDoc.toJSON();
        await db.staff_records.upsert({
          ...s,
          record_type: 'shifts',
          is_deleted: true,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      await db.staff_records.upsert({
        ...shift,
        record_type: 'shifts',
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return { shifts, isLoading, createShift, updateShift, replaceShiftPattern, deleteShift };
};
