import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Incident } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const useIncidentData = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  useEffect(() => {
    if (!db) return;

    const sub = db.incidents.find({
      selector: { is_deleted: { $eq: false } },
      sort: [{ date: 'desc' }]
    }).$.subscribe(docs => {
      setIncidents(docs.map(d => d.toJSON() as Incident));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = i.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'ALL' || i.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const addIncident = async (incident: Omit<Incident, 'id'>) => {
    const newIncident: Incident = { 
      ...incident, 
      id: uuidv4(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as Incident;
    await db.incidents.upsert(newIncident);
  };

  const deleteIncident = async (id: string) => {
    const incidentDoc = await db.incidents.findOne(id).exec();
    if (incidentDoc) {
      const incident = incidentDoc.toJSON();
      await db.incidents.upsert({
        ...incident,
        is_deleted: true,
        updated_at: new Date().toISOString()
      });
    }
  };

  return {
    incidents: filteredIncidents,
    isLoading,
    searchTerm,
    setSearchTerm,
    filterSeverity,
    setFilterSeverity,
    addIncident,
    deleteIncident
  };
};
