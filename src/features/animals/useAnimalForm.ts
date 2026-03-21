import { useTransition, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '../../lib/storageEngine';
import { Animal, AnimalCategory, HazardRating, ConservationStatus, EntityType } from '../../types';
import { batchGetSpeciesData } from '../../services/geminiService';
import { db } from '../../lib/rxdb';

export const animalFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  species: z.string().min(1, 'Species is required'),
  latin_name: z.string().nullable().optional(),
  category: z.nativeEnum(AnimalCategory),
  dob: z.string().optional(),
  is_dob_unknown: z.boolean(),
  sex: z.enum(['Male', 'Female', 'Unknown']),
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional(),
  special_requirements: z.string().optional(),
  image_url: z.string().optional(),
  distribution_map_url: z.string().optional(),
  acquisition_date: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  sire_id: z.string().nullable().optional(),
  dam_id: z.string().nullable().optional(),
  microchip_id: z.string().optional(),
  ring_number: z.string().optional(),
  has_no_id: z.boolean(),
  hazard_rating: z.nativeEnum(HazardRating),
  is_venomous: z.boolean(),
  red_list_status: z.nativeEnum(ConservationStatus),
  entity_type: z.nativeEnum(EntityType).optional(),
  parent_mob_id: z.string().nullable().optional(),
  census_count: z.number().nullable().optional(),
  display_order: z.number(),
  archived: z.boolean(),
  is_quarantine: z.boolean(),
  water_tipping_temp: z.number().nullable().optional(),
  winter_weight_g: z.number().nullable().optional(),
  target_day_temp_c: z.number().nullable().optional(),
  target_night_temp_c: z.number().nullable().optional(),
  target_humidity_min_percent: z.number().nullable().optional(),
  target_humidity_max_percent: z.number().nullable().optional(),
  misting_frequency: z.string().optional(),
  acquisition_type: z.enum(['BORN', 'TRANSFERRED_IN', 'RESCUE', 'UNKNOWN']).optional(),
  critical_husbandry_notes: z.string().optional(),
});

export type AnimalFormData = z.infer<typeof animalFormSchema>;

interface UseAnimalFormProps {
  initialData?: Animal | null;
  onClose: () => void;
}

export function useAnimalForm({ initialData, onClose }: UseAnimalFormProps) {
  const [isAiPending, startAiTransition] = useTransition();

  const form = useForm<AnimalFormData>({
    resolver: zodResolver(animalFormSchema),
    defaultValues: initialData ? {
      name: initialData.name || '',
      species: initialData.species || '',
      latin_name: initialData.latin_name || '',
      category: initialData.category || AnimalCategory.OWLS,
      dob: initialData.dob ? new Date(initialData.dob).toISOString().split('T')[0] : '',
      is_dob_unknown: initialData.is_dob_unknown || false,
      sex: initialData.sex || 'Unknown',
      location: initialData.location || '',
      description: initialData.description || '',
      special_requirements: initialData.special_requirements || '',
      image_url: initialData.image_url || '',
      distribution_map_url: initialData.distribution_map_url || '',
      acquisition_date: initialData.acquisition_date ? new Date(initialData.acquisition_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      origin: initialData.origin || 'Unknown',
      sire_id: initialData.sire_id || '',
      dam_id: initialData.dam_id || '',
      microchip_id: initialData.microchip_id || '',
      ring_number: initialData.ring_number || '',
      has_no_id: initialData.has_no_id || false,
      hazard_rating: initialData.hazard_rating || HazardRating.LOW,
      is_venomous: initialData.is_venomous || false,
      red_list_status: initialData.red_list_status || ConservationStatus.NE,
      entity_type: initialData.entity_type || EntityType.INDIVIDUAL,
      parent_mob_id: initialData.parent_mob_id || '',
      census_count: initialData.census_count,
      display_order: initialData.display_order || 0,
      archived: initialData.archived || false,
      is_quarantine: initialData.is_quarantine || false,
      water_tipping_temp: initialData.water_tipping_temp,
      target_day_temp_c: initialData.target_day_temp_c,
      target_night_temp_c: initialData.target_night_temp_c,
      target_humidity_min_percent: initialData.target_humidity_min_percent,
      target_humidity_max_percent: initialData.target_humidity_max_percent,
      misting_frequency: initialData.misting_frequency || '',
      acquisition_type: initialData.acquisition_type || 'UNKNOWN',
      critical_husbandry_notes: initialData.critical_husbandry_notes?.join('\n') || '',
    } : {
      name: '',
      species: '',
      latin_name: '',
      category: AnimalCategory.OWLS,
      dob: new Date().toISOString().split('T')[0],
      is_dob_unknown: false,
      sex: 'Unknown',
      location: '',
      description: '',
      special_requirements: '',
      image_url: `https://picsum.photos/seed/${uuidv4()}/400/400`,
      distribution_map_url: '',
      acquisition_date: new Date().toISOString().split('T')[0],
      origin: 'Unknown',
      sire_id: '',
      dam_id: '',
      microchip_id: '',
      ring_number: '',
      has_no_id: false,
      hazard_rating: HazardRating.LOW,
      is_venomous: false,
      red_list_status: ConservationStatus.NE,
      entity_type: EntityType.INDIVIDUAL,
      parent_mob_id: '',
      census_count: undefined,
      display_order: 0,
      archived: false,
      is_quarantine: false,
      water_tipping_temp: undefined,
      target_day_temp_c: undefined,
      target_night_temp_c: undefined,
      target_humidity_min_percent: undefined,
      target_humidity_max_percent: undefined,
      misting_frequency: '',
      acquisition_type: 'UNKNOWN',
      critical_husbandry_notes: '',
    },
  });

  const species = useWatch({ control: form.control, name: 'species' });
  const redListStatus = useWatch({ control: form.control, name: 'red_list_status' });

  useEffect(() => {
    const handler = setTimeout(() => {
      if (species && species.length > 2 && (redListStatus === ConservationStatus.NE || !redListStatus)) {
        if (!navigator.onLine) {
          console.warn("Offline: Automatic AI Autofill disabled.");
          return;
        }
        console.log("Automatic AI Autofill Triggered. Species:", species);
        startAiTransition(async () => {
          try {
            const data = await batchGetSpeciesData([species]);
            console.log("Automatic AI Data Received:", data);
            if (data[species]) {
              form.setValue('latin_name', data[species].latin_name, { shouldDirty: true });
              form.setValue('red_list_status', data[species].conservation_status as ConservationStatus, { shouldDirty: true });
            }
          } catch (error) {
            console.error('Automatic AI Autofill failed:', error);
          }
        });
      }
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [species, redListStatus, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'distribution_map_url') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadFile(file, 'animals');
        form.setValue(field, url, { shouldDirty: true });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  const onSubmit = async (data: AnimalFormData) => {
    if (!db) return;
    try {
      // Sanitization pass: Remove NaN values that might have slipped through
      const sanitizedPayload = { ...data };
      (Object.keys(sanitizedPayload) as Array<keyof AnimalFormData>).forEach(key => {
        if (typeof sanitizedPayload[key] === 'number' && Number.isNaN(sanitizedPayload[key])) {
          delete sanitizedPayload[key];
        }
      });

      const animalData: Animal = {
        ...initialData,
        ...sanitizedPayload,
        id: initialData?.id || uuidv4(),
        weight_unit: initialData?.weight_unit || 'g',
        updated_at: new Date().toISOString(),
        is_deleted: false,
      } as Animal;

      await db.animals.upsert(animalData);
      
      onClose();
    } catch (error) {
      console.error('Failed to save animal:', error);
    }
  };

  return {
    form,
    isAiPending,
    handleImageUpload,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
  };
}
