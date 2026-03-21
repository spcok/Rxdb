import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Shift } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const useRotaData = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.shifts.find({
      selector: { is_deleted: { $eq: false } }
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
        date: shift.date,
        updated_at: new Date().toISOString(),
        is_deleted: false
      } as Shift);
    }

    for (const s of shiftsToCreate) {
      await db.shifts.upsert(s);
    }
  };

  const updateShift = async (id: string, updates: Partial<Shift>, updateSeries: boolean = false) => {
    if (updateSeries && updates.pattern_id) {
      const seriesShifts = await db.shifts.find({
        selector: { 
          pattern_id: { $eq: updates.pattern_id },
          is_deleted: { $eq: false }
        }
      }).exec();
      
      for (const sDoc of seriesShifts) {
        const s = sDoc.toJSON();
        await db.shifts.upsert({ 
          ...s,
          ...updates, 
          id: s.id, 
          date: s.date,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      const shiftDoc = await db.shifts.findOne(id).exec();
      if (shiftDoc) {
        const s = shiftDoc.toJSON();
        await db.shifts.upsert({ 
          ...s,
          ...updates,
          updated_at: new Date().toISOString()
        });
      }
    }
  };

  const replaceShiftPattern = async (existingShift: Shift, newShiftData: Omit<Shift, 'id' | 'pattern_id'>, repeatDays: number[], weeksToRepeat: number) => {
    if (existingShift.pattern_id) {
      const futureShifts = await db.shifts.find({
        selector: {
          pattern_id: { $eq: existingShift.pattern_id },
          date: { $gte: existingShift.date },
          is_deleted: { $eq: false }
        }
      }).exec();
      
      for (const sDoc of futureShifts) {
        const s = sDoc.toJSON();
        await db.shifts.upsert({
          ...s,
          is_deleted: true,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      await db.shifts.upsert({
        ...existingShift,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
    await createShift(newShiftData, repeatDays, weeksToRepeat);
  };

  const deleteShift = async (shift: Shift, deleteSeries: boolean = false) => {
    if (deleteSeries && shift.pattern_id) {
      const seriesShifts = await db.shifts.find({
        selector: {
          pattern_id: { $eq: shift.pattern_id },
          is_deleted: { $eq: false }
        }
      }).exec();
      
      for (const sDoc of seriesShifts) {
        const s = sDoc.toJSON();
        await db.shifts.upsert({
          ...s,
          is_deleted: true,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      await db.shifts.upsert({
        ...shift,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return { shifts, isLoading, createShift, updateShift, replaceShiftPattern, deleteShift };
};
