import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { FirstAidLog } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useFirstAidData() {
  const [logs, setLogs] = useState<FirstAidLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.first_aid_logs.find({
      selector: { is_deleted: { $eq: false } },
      sort: [{ date: 'desc' }]
    }).$.subscribe(docs => {
      setLogs(docs.map(d => d.toJSON() as FirstAidLog));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const addFirstAid = async (log: Omit<FirstAidLog, 'id'>) => {
    const newLog: FirstAidLog = {
      ...log,
      id: uuidv4(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as FirstAidLog;
    await db.first_aid_logs.upsert(newLog);
  };

  const deleteFirstAid = async (id: string) => {
    const logDoc = await db.first_aid_logs.findOne(id).exec();
    if (logDoc) {
      const log = logDoc.toJSON();
      await db.first_aid_logs.upsert({
        ...log,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    logs,
    isLoading,
    addFirstAid,
    deleteFirstAid
  };
}
