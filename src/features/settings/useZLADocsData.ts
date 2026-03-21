import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { ZLADocument } from '../../types';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useZLADocsData() {
  const documentsData = useHybridQuery<ZLADocument[]>(
    'zla_documents',
    supabase.from('zla_documents').select('*'),
    () => db.zla_documents.toArray(),
    []
  );
  const isLoading = documentsData === undefined;
  const documents = documentsData || [];

  const addDocument = async (doc: Omit<ZLADocument, 'id'>) => {
    const id = uuidv4();
    const newDoc = { ...doc, id };
    await mutateOnlineFirst('zla_documents', newDoc as Record<string, unknown>, 'upsert');
  };

  const deleteDocument = async (id: string) => {
    await mutateOnlineFirst('zla_documents', { id }, 'delete');
  };

  return { documents, isLoading, addDocument, deleteDocument };
}
