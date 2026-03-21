import { db } from '../../lib/db';
import { Animal, ConservationStatus } from '../../types';
import { batchGetSpeciesData } from '../../services/geminiService';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';

export function useIntelligenceData() {
  const animalsData = useHybridQuery<Animal[]>('animals', () => db.animals.toArray(), []);
  const isLoading = animalsData === undefined;
  const animals = animalsData || [];

  const updateAnimal = async (animal: Animal) => {
    await mutateOnlineFirst('animals', animal, 'upsert');
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
