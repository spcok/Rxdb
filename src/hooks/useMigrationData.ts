import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db, AppDatabase } from '../lib/db';
import { Table } from 'dexie';
import { syncDataToSupabase } from '../services/syncService';
import { 
  Animal, 
  AnimalCategory, 
  LogEntry, 
  LogType, 
  InternalMovement, 
  MovementType, 
  ClinicalNote,
  HazardRating,
  ConservationStatus,
  EntityType
} from '../types';

// Define Legacy Interfaces for Type Safety
interface LegacyLog {
  id: string;
  date: string;
  type: string;
  value?: string;
  notes?: string;
  user?: string;
  // Movement specific
  movementType?: string;
  source?: string;
  destination?: string;
  // Medical specific
  treatment?: string;
  // Weight specific
  weight?: string;
}

interface LegacyAnimal {
  id: string;
  name: string;
  species: string;
  latinName?: string;
  sex: string;
  category: string;
  dob: string;
  isGroup: boolean;
  hasNoId: boolean;
  imageUrl: string;
  weightUnit: string;
  hazardRating?: string;
  origin?: string;
  arrivalDate?: string;
  redListStatus?: string;
  specialRequirements?: string;
  logs: LegacyLog[];
}

interface LegacyImportData {
  data: {
    animals: LegacyAnimal[];
  }
}

export const useMigrationData = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    animalCount: number;
    logCount: number;
    animals: LegacyAnimal[];
  } | null>(null);

  const parseFile = async (file: File) => {
    setError(null);
    setPreviewData(null);
    
    try {
      const text = await file.text();
      const json = JSON.parse(text) as LegacyImportData;

      if (!json.data || !Array.isArray(json.data.animals)) {
        throw new Error("Invalid JSON structure. Expected { data: { animals: [] } }");
      }

      const totalLogs = json.data.animals.reduce((acc, animal) => acc + (animal.logs?.length || 0), 0);

      setPreviewData({
        animalCount: json.data.animals.length,
        logCount: totalLogs,
        animals: json.data.animals
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON file");
    }
  };

  const runImport = async () => {
    if (!previewData) return;
    
    setIsImporting(true);
    setProgress(0);
    setError(null);

    try {
      const animalsToImport: Animal[] = [];
      const logsToImport: LogEntry[] = [];
      const movementsToImport: InternalMovement[] = [];
      const medicalToImport: ClinicalNote[] = [];

      // Process Data
      previewData.animals.forEach((legacyAnimal) => {
        const newAnimalId = uuidv4();

        // Map Animal
        const animal: Animal = {
          id: newAnimalId,
          name: legacyAnimal.name || 'Unknown',
          species: legacyAnimal.species || 'Unknown',
          latin_name: legacyAnimal.latinName || undefined,
          category: mapCategory(legacyAnimal.category),
          location: 'Main Aviary',
          image_url: legacyAnimal.imageUrl || undefined,
          hazard_rating: mapHazardRating(legacyAnimal.hazardRating),
          is_venomous: false,
          weight_unit: mapWeightUnit(legacyAnimal.weightUnit),
          dob: legacyAnimal.dob === "" ? undefined : legacyAnimal.dob,
          is_dob_unknown: legacyAnimal.dob === "",
          sex: mapSex(legacyAnimal.sex),
          entity_type: legacyAnimal.isGroup ? EntityType.GROUP : EntityType.INDIVIDUAL,
          has_no_id: !!legacyAnimal.hasNoId,
          origin: legacyAnimal.origin || undefined,
          acquisition_date: legacyAnimal.arrivalDate || new Date().toISOString(),
          red_list_status: mapRedListStatus(legacyAnimal.redListStatus),
          special_requirements: legacyAnimal.specialRequirements || undefined,
          archived: false,
          display_order: 0
        };
        animalsToImport.push(animal);

        // Map Logs
        if (Array.isArray(legacyAnimal.logs)) {
          legacyAnimal.logs.forEach(legacyLog => {
            const newLogId = uuidv4();
            const rawDate = legacyLog.date || new Date().toISOString();
            const logDate = rawDate.split('T')[0]; // Strips time and standardizes to YYYY-MM-DD
            const userInitials = legacyLog.user || 'SYS';
            const logTypeUpper = (legacyLog.type || '').toUpperCase();

            switch (logTypeUpper) {
              case 'MOVEMENT':
              case 'TRANSFER':
                movementsToImport.push({
                  id: newLogId,
                  animal_id: newAnimalId,
                  animal_name: animal.name,
                  log_date: logDate,
                  movement_type: mapMovementType(legacyLog.movementType),
                  source_location: legacyLog.source || 'Unknown',
                  destination_location: legacyLog.destination || 'Unknown',
                  notes: legacyLog.notes,
                  created_by: userInitials
                });
                break;
              case 'MEDICAL':
              case 'VET':
              case 'HEALTH':
                medicalToImport.push({
                  id: newLogId,
                  animal_id: newAnimalId,
                  animal_name: animal.name,
                  date: logDate,
                  note_type: 'General',
                  note_text: legacyLog.notes || legacyLog.value || legacyLog.treatment || 'Medical entry',
                  staff_initials: userInitials
                });
                break;
              default:
                logsToImport.push({
                  id: newLogId,
                  animal_id: newAnimalId,
                  log_type: mapLogType(legacyLog.type),
                  log_date: logDate,
                  value: legacyLog.value || legacyLog.weight || '',
                  notes: legacyLog.notes,
                  user_initials: userInitials,
                  created_at: new Date().toISOString(),
                  created_by: userInitials
                });
                break;
            }
          });
        }
      });

      const allData: { table: string, data: (Animal | LogEntry | InternalMovement | ClinicalNote)[], chunkSize: number }[] = [
        { table: 'animals', data: animalsToImport, chunkSize: 50 },
        { table: 'daily_logs', data: logsToImport, chunkSize: 250 },
        { table: 'internal_movements', data: movementsToImport, chunkSize: 250 },
        { table: 'medical_logs', data: medicalToImport, chunkSize: 250 }
      ];
      
      let totalItems = 0;
      allData.forEach(d => totalItems += d.data.length);
      let processedItems = 0;
      
      for (const item of allData) {
        const chunks = chunkArray(item.data, item.chunkSize);
        for (const chunk of chunks) {
          try {
            // Dexie first
            await (db[item.table as keyof AppDatabase] as Table<Record<string, unknown>, string>).bulkPut(chunk as unknown as Record<string, unknown>[]);
            // Supabase second
            await syncDataToSupabase(item.table, chunk as unknown as Record<string, unknown>[]);
          } catch (err) {
            console.error(`[MIGRATION] Error importing chunk into ${item.table}:`, err);
            setError(`Some items failed to sync to Supabase for ${item.table}.`);
          }
          processedItems += chunk.length;
          setProgress((processedItems / totalItems) * 100);
        }
      }

      setPreviewData(null); // Clear preview on success
    } catch (err) {
      console.error("Migration failed:", err);
      setError(err instanceof Error ? err.message : "Migration failed during database commit.");
    } finally {
      setIsImporting(false);
    }
  };

  return {
    parseFile,
    runMigration: runImport,
    previewData,
    isImporting,
    progress,
    error,
    reset: () => {
      setPreviewData(null);
      setError(null);
      setProgress(0);
    }
  };
};

// --- Helper Mappers ---
function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}
// ... (keep existing mappers)

// --- Helper Mappers ---

function mapCategory(cat: string): AnimalCategory {
  const upper = (cat || '').toUpperCase();
  if (upper.includes('OWL')) return AnimalCategory.OWLS;
  if (upper.includes('RAPTOR') || upper.includes('FALCON') || upper.includes('HAWK') || upper.includes('EAGLE') || upper.includes('BIRD OF PREY')) return AnimalCategory.RAPTORS;
  if (upper.includes('MAMMAL')) return AnimalCategory.MAMMALS;
  if (upper.includes('REPTILE')) return AnimalCategory.REPTILES;
  if (upper.includes('INVERT') || upper.includes('BUG') || upper.includes('SPIDER')) return AnimalCategory.INVERTEBRATES;
  if (upper.includes('AMPHIBIAN') || upper.includes('FROG') || upper.includes('TOAD')) return AnimalCategory.AMPHIBIANS;
  if (upper.includes('EXOTIC')) return AnimalCategory.EXOTICS;
  return AnimalCategory.ALL; // Default fallback
}

function mapHazardRating(rating: string | undefined): HazardRating {
  const upper = (rating || '').toUpperCase();
  if (upper === 'HIGH') return HazardRating.HIGH;
  if (upper === 'LOW') return HazardRating.LOW;
  return HazardRating.MEDIUM;
}

function mapRedListStatus(status: string | undefined): ConservationStatus {
  const s = (status || '').toUpperCase();
  if (s === 'NE') return ConservationStatus.NE;
  if (s === 'DD') return ConservationStatus.DD;
  if (s === 'LC') return ConservationStatus.LC;
  if (s === 'NT') return ConservationStatus.NT;
  if (s === 'VU') return ConservationStatus.VU;
  if (s === 'EN') return ConservationStatus.EN;
  if (s === 'CR') return ConservationStatus.CR;
  if (s === 'EW') return ConservationStatus.EW;
  if (s === 'EX') return ConservationStatus.EX;
  return ConservationStatus.NE;
}

function mapWeightUnit(unit: string): 'g' | 'oz' | 'lbs_oz' | 'kg' {
  if (unit === 'oz') return 'oz';
  if (unit === 'kg') return 'kg';
  return 'g';
}

function mapSex(sex: string): 'Male' | 'Female' | 'Unknown' {
  const s = (sex || '').toLowerCase();
  if (s === 'male' || s === 'm') return 'Male';
  if (s === 'female' || s === 'f') return 'Female';
  return 'Unknown';
}

function mapMovementType(type: string | undefined): MovementType {
  const t = (type || '').toLowerCase();
  if (t.includes('acquis')) return MovementType.ACQUISITION;
  if (t.includes('disp')) return MovementType.DISPOSITION;
  return MovementType.TRANSFER;
}

function mapLogType(type: string): LogType {
  const t = (type || '').toLowerCase();
  if (t.includes('weight')) return LogType.WEIGHT;
  if (t.includes('feed') || t.includes('diet')) return LogType.FEED;
  if (t.includes('train') || t.includes('flight')) return LogType.TRAINING;
  if (t.includes('medic') || t.includes('health') || t.includes('vet')) return LogType.HEALTH;
  if (t.includes('temp')) return LogType.TEMPERATURE;
  if (t.includes('mist') || t.includes('spray')) return LogType.MISTING;
  if (t.includes('water')) return LogType.WATER;
  if (t.includes('event')) return LogType.EVENT;
  if (t.includes('husbandry') || t.includes('daily') || t.includes('clean')) return LogType.GENERAL;
  return LogType.GENERAL;
}
