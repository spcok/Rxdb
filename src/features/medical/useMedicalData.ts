import { useState, useEffect } from 'react';
import { ClinicalNote, MARChart, QuarantineRecord, Animal } from '../../types';
import { db } from '../../lib/rxdb';

export function useMedicalData() {
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [marCharts, setMarCharts] = useState<MARChart[]>([]);
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subs = [
      db.medical_logs.find({
        selector: { is_deleted: { $eq: false } },
        sort: [{ date: 'desc' }]
      }).$.subscribe(docs => setClinicalNotes(docs.map(d => d.toJSON() as ClinicalNote))),

      db.mar_charts.find({
        selector: { is_deleted: { $eq: false } },
        sort: [{ start_date: 'desc' }]
      }).$.subscribe(docs => setMarCharts(docs.map(d => d.toJSON() as MARChart))),

      db.quarantine_records.find({
        selector: { is_deleted: { $eq: false } },
        sort: [{ start_date: 'desc' }]
      }).$.subscribe(docs => setQuarantineRecords(docs.map(d => d.toJSON() as QuarantineRecord))),

      db.animals.find({
        selector: { is_deleted: { $eq: false } }
      }).$.subscribe(docs => {
        setAnimals(docs.map(d => d.toJSON() as Animal));
        setIsLoading(false);
      })
    ];

    return () => subs.forEach(sub => sub.unsubscribe());
  }, []);

  const addClinicalNote = async (note: Omit<ClinicalNote, 'id' | 'animal_name'>) => {
    const animalDoc = await db.animals.findOne(note.animal_id).exec();
    const newNote: ClinicalNote = {
      ...note,
      id: crypto.randomUUID(),
      animal_name: animalDoc?.name || 'Unknown',
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as ClinicalNote;
    await db.medical_logs.upsert(newNote);
  };

  const updateClinicalNote = async (note: ClinicalNote) => {
    await db.medical_logs.upsert({
      ...note,
      updated_at: new Date().toISOString()
    });
  };

  const addMarChart = async (chart: Omit<MARChart, 'id' | 'animal_name' | 'administered_dates' | 'status'>) => {
    const animalDoc = await db.animals.findOne(chart.animal_id).exec();
    const newChart: MARChart = {
      ...chart,
      id: crypto.randomUUID(),
      animal_name: animalDoc?.name || 'Unknown',
      administered_dates: [],
      status: 'Active',
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as MARChart;
    await db.mar_charts.upsert(newChart);
  };

  const updateMarChart = async (chart: MARChart) => {
    await db.mar_charts.upsert({
      ...chart,
      updated_at: new Date().toISOString()
    });
  };

  const signOffDose = async (chartId: string, dateIso: string) => {
    const chartDoc = await db.mar_charts.findOne(chartId).exec();
    if (chartDoc) {
      const chart = chartDoc.toJSON();
      await db.mar_charts.upsert({
        ...chart,
        administered_dates: [...chart.administered_dates, dateIso],
        updated_at: new Date().toISOString()
      });
    }
  };

  const addQuarantineRecord = async (record: Omit<QuarantineRecord, 'id' | 'animal_name' | 'status'>) => {
    const animalDoc = await db.animals.findOne(record.animal_id).exec();
    const newRecord: QuarantineRecord = {
      ...record,
      id: crypto.randomUUID(),
      animal_name: animalDoc?.name || 'Unknown',
      status: 'Active',
      updated_at: new Date().toISOString(),
      is_deleted: false
    } as QuarantineRecord;
    await db.quarantine_records.upsert(newRecord);
  };

  const updateQuarantineRecord = async (record: QuarantineRecord) => {
    await db.quarantine_records.upsert({
      ...record,
      updated_at: new Date().toISOString()
    });
  };

  return { 
    clinicalNotes, 
    marCharts, 
    quarantineRecords, 
    animals, 
    isLoading, 
    addClinicalNote, 
    updateClinicalNote, 
    addMarChart, 
    updateMarChart, 
    signOffDose, 
    addQuarantineRecord, 
    updateQuarantineRecord 
  };
}
