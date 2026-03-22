import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { Animal, ConservationStatus } from '../../types';
import { batchGetSpeciesData } from '../../services/geminiService';

export function useIntelligenceData() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.animals.find({
      selector: { is_deleted: { $eq: false } }
    }).$.subscribe(docs => {
      setAnimals(docs.map(d => d.toJSON() as Animal));
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const updateAnimal = async (animal: Animal) => {
    try {
      await db.animals.upsert({
        ...animal,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to update animal:', err);
    }
  };

  const runIUCNScan = async (onProgress: (progress: number) => void) => {
    if (!navigator.onLine) {
      console.warn("Offline: IUCN Scan disabled.");
      alert("IUCN Scan requires an active internet connection.");
      return;
    }
    const animalsToScan = animals.filter(a => !a.red_list_status || !a.latin_name);
    const total = animalsToScan.length;
    
    if (total === 0) return;

    const batchSize = 5;
    for (let i = 0; i < total; i += batchSize) {
      const batch = animalsToScan.slice(i, i + batchSize);
      const speciesList = [...new Set(batch.map(a => a.species))];
      
      try {
        const enrichedData = await batchGetSpeciesData(speciesList);
        
        for (const animal of batch) {
          const data = enrichedData[animal.species];
          if (data) {
            await updateAnimal({
              ...animal,
              latin_name: data.latin_name,
              red_list_status: data.conservation_status as ConservationStatus,
              description: animal.description || data.fun_fact
            });
          }
        }
        
        onProgress(Math.min(100, Math.round(((i + batch.length) / total) * 100)));
      } catch (error) {
        console.error('Batch scan error:', error);
      }
    }
  };

  return { animals, isLoading, runIUCNScan };
}
