import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { MaintenanceLog } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useMaintenanceData() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.maintenance_logs.find({
      selector: { is_deleted: { $eq: false } },
      sort: [{ date: 'desc' }]
    }).$.subscribe(docs => {
      setLogs(docs.map(d => d.toJSON() as MaintenanceLog));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const addLog = async (log: Omit<MaintenanceLog, 'id'>) => {
    const newLog: MaintenanceLog = {
      ...log,
      id: uuidv4(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as MaintenanceLog;
    await db.maintenance_logs.upsert(newLog);
  };

  const updateLog = async (log: MaintenanceLog) => {
    await db.maintenance_logs.upsert({
      ...log,
      updated_at: new Date().toISOString()
    });
  };

  const deleteLog = async (id: string) => {
    const logDoc = await db.maintenance_logs.findOne(id).exec();
    if (logDoc) {
      const log = logDoc.toJSON();
      await db.maintenance_logs.upsert({
        ...log,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    logs,
    isLoading,
    addLog,
    updateLog,
    deleteLog
  };
}
