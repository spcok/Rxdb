import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { ExternalTransfer } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function useTransfersData() {
  const [transfers, setTransfers] = useState<ExternalTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.logistics_records.find({
      selector: { 
        is_deleted: { $eq: false },
        record_type: { $eq: 'transfers' }
      },
      sort: [{ date: 'desc' }]
    }).$.subscribe(docs => {
      setTransfers(docs.map(d => d.toJSON() as ExternalTransfer));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const addTransfer = async (transfer: Omit<ExternalTransfer, 'id'>) => {
    const newTransfer: ExternalTransfer = {
      ...transfer,
      id: uuidv4(),
      record_type: 'transfers',
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as ExternalTransfer;
    await db.logistics_records.upsert(newTransfer);
  };

  return {
    transfers,
    isLoading,
    addTransfer
  };
}
