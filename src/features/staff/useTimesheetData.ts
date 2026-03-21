import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Timesheet, TimesheetStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useTimesheetData() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.staff_records.find({
      selector: { 
        is_deleted: { $eq: false },
        record_type: { $eq: 'timesheets' }
      },
      sort: [{ date: 'desc' }]
    }).$.subscribe(docs => {
      setTimesheets(docs.map(d => d.toJSON() as Timesheet));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const clockIn = async (staff_name: string) => {
    const newTimesheet: Timesheet = {
      id: uuidv4(),
      record_type: 'timesheets',
      staff_name,
      date: new Date().toISOString().split('T')[0],
      clock_in: new Date().toISOString(),
      status: TimesheetStatus.ACTIVE,
      updated_at: new Date().toISOString(),
      is_deleted: false
    };
    await db.staff_records.upsert(newTimesheet);
  };

  const clockOut = async (id: string) => {
    const timesheetDoc = await db.staff_records.findOne(id).exec();
    if (timesheetDoc) {
      const timesheet = timesheetDoc.toJSON();
      await db.staff_records.upsert({
        ...timesheet,
        record_type: 'timesheets',
        clock_out: new Date().toISOString(),
        status: TimesheetStatus.COMPLETED,
        updated_at: new Date().toISOString()
      });
    }
  };

  const getCurrentlyClockedInStaff = async () => {
    const active = await db.staff_records.find({
      selector: { 
        status: { $eq: TimesheetStatus.ACTIVE },
        is_deleted: { $eq: false },
        record_type: { $eq: 'timesheets' }
      }
    }).exec();
    return active.map(t => t.staff_name);
  };

  const addTimesheet = async (timesheet: Omit<Timesheet, 'id'>) => {
    const newTimesheet: Timesheet = {
      ...timesheet,
      id: uuidv4(),
      record_type: 'timesheets',
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as Timesheet;
    await db.staff_records.upsert(newTimesheet);
  };

  const deleteTimesheet = async (id: string) => {
    const timesheetDoc = await db.staff_records.findOne(id).exec();
    if (timesheetDoc) {
      const timesheet = timesheetDoc.toJSON();
      await db.staff_records.upsert({
        ...timesheet,
        record_type: 'timesheets',
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    timesheets,
    isLoading,
    clockIn,
    clockOut,
    getCurrentlyClockedInStaff,
    addTimesheet,
    deleteTimesheet
  };
}
