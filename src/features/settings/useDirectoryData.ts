import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/rxdb';
import { Contact } from '../../types';

export function useDirectoryData() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.admin_records.find({
      selector: {
        record_type: 'contact',
        is_deleted: { $eq: false }
      }
    }).$.subscribe(docs => {
      setContacts(docs.map(d => d.toJSON() as Contact));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const addContact = async (contact: Omit<Contact, 'id'>) => {
    const id = uuidv4();
    const newContact = {
      ...contact,
      id,
      record_type: 'contact',
      is_deleted: false,
      updated_at: new Date().toISOString()
    };
    try {
      await db.admin_records.upsert(newContact);
    } catch (err) {
      console.error('Failed to add contact:', err);
    }
  };

  const updateContact = async (contact: Contact) => {
    try {
      await db.admin_records.upsert({
        ...contact,
        record_type: 'contact',
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to update contact:', err);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const doc = await db.admin_records.findOne(id).exec();
      if (doc) {
        await doc.patch({
          is_deleted: true,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  return { contacts, isLoading, addContact, updateContact, deleteContact };
}
