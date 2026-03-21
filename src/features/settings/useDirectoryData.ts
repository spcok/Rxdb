import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/db';
import { Contact } from '../../types';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';

export function useDirectoryData() {
  const contactsData = useHybridQuery<Contact[]>('contacts', () => db.contacts.toArray(), []);
  const isLoading = contactsData === undefined;
  const contacts = contactsData || [];

  const addContact = async (contact: Omit<Contact, 'id'>) => {
    const id = uuidv4();
    const newContact = { ...contact, id };
    await mutateOnlineFirst('contacts', newContact as unknown as Record<string, unknown>, 'upsert');
  };

  const updateContact = async (contact: Contact) => {
    await mutateOnlineFirst('contacts', contact as unknown as Record<string, unknown>, 'upsert');
  };

  const deleteContact = async (id: string) => {
    await mutateOnlineFirst('contacts', { id }, 'delete');
  };

  return { contacts, isLoading, addContact, updateContact, deleteContact };
}
