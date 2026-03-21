import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/rxdb';
import { AnimalCategory, OperationalList } from '../types';

export function useOperationalLists(category: AnimalCategory = AnimalCategory.ALL) {
  const [lists, setLists] = useState<OperationalList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.operational_lists.find({
      selector: { is_deleted: { $eq: false } }
    }).$.subscribe(docs => {
      setLists(docs.map(d => d.toJSON() as OperationalList));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const foodTypes = lists
    .filter(l => l.type === 'food' && (l.category === category || l.category === AnimalCategory.ALL))
    .sort((a, b) => a.value.localeCompare(b.value));
  const feedMethods = lists
    .filter(l => l.type === 'method' && (l.category === category || l.category === AnimalCategory.ALL))
    .sort((a, b) => a.value.localeCompare(b.value));
  const eventTypes = lists
    .filter(l => l.type === 'event')
    .sort((a, b) => a.value.localeCompare(b.value));
  const locations = lists
    .filter(l => l.type === 'location')
    .sort((a, b) => a.value.localeCompare(b.value));

  const addListItem = async (type: 'food' | 'method' | 'location' | 'event', value: string, itemCategory: AnimalCategory = category) => {
    if (!value.trim()) return;
    
    const val = value.trim();
    
    const exists = lists.find(l => 
      l.type === type && 
      l.value.toLowerCase() === val.toLowerCase() && 
      (type === 'location' || type === 'event' || l.category === itemCategory)
    );
    
    if (exists) return;

    const payload = {
      id: uuidv4(),
      type,
      category: (type === 'location' || type === 'event') ? AnimalCategory.ALL : itemCategory,
      value: val,
      updated_at: new Date().toISOString(),
      is_deleted: false
    };

    await db.operational_lists.upsert(payload);
  };

  const updateListItem = async (id: string, value: string) => {
    if (!value.trim()) return;
    
    const itemDoc = await db.operational_lists.findOne(id).exec();
    if (itemDoc) {
      const item = itemDoc.toJSON();
      await db.operational_lists.upsert({ 
        ...item, 
        value: value.trim(),
        updated_at: new Date().toISOString()
      });
    }
  };

  const removeListItem = async (id: string) => {
    const itemDoc = await db.operational_lists.findOne(id).exec();
    if (itemDoc) {
      const item = itemDoc.toJSON();
      await db.operational_lists.upsert({ 
        ...item, 
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    foodTypes,
    feedMethods,
    eventTypes,
    locations,
    addListItem,
    updateListItem,
    removeListItem,
    isLoading
  };
}
