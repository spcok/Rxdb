import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Check, Camera, Loader2, Zap, Shield, History, Info, Globe, Skull, Users, Thermometer, Scale } from 'lucide-react';
import { Animal, AnimalCategory, HazardRating, ConservationStatus, EntityType, MovementType, InternalMovement, ExternalTransfer, TransferType, TransferStatus } from '../../types';
import { useAnimalForm } from './useAnimalForm';
import { getAnimalIntelligence } from '../../services/geminiService';
import { convertToGrams, convertFromGrams } from '../../services/weightUtils';
import { mutateOnlineFirst } from '../../lib/dataEngine';
import { useOperationalLists } from '../../hooks/useOperationalLists';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';
import { queueFileUpload } from '../../lib/storageEngine';
import { useAuthStore } from '../../store/authStore';

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Animal | null;
}

const AnimalFormModal: React.FC<AnimalFormModalProps> = ({ isOpen, onClose, initialData }) => {
  const {
    form,
    handleImageUpload,
    isSubmitting,
    errors,
  } = useAnimalForm({ initialData, onClose });

  const { register, watch, setValue, getValues } = form;
  const { locations } = useOperationalLists();
  const { currentUser } = useAuthStore();

  // Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isUploadingCrop, setIsUploadingCrop] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null);
        setIsCropping(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      setIsUploadingCrop(true);
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      
      // Store the file for upload during form submission
      setPhotoFile(croppedFile);
      
      // Create a local URL for preview in the UI
      const previewUrl = URL.createObjectURL(croppedFile);
      setValue('image_url', previewUrl, { shouldValidate: true, shouldDirty: true });

      setIsCropping(false);
      setImageToCrop(null);
    } catch (error) {
      console.error('Crop failed:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsUploadingCrop(false);
    }
  };

  // Weight State
  const [weightUnit, setWeightUnit] = useState<'g' | 'lb' | 'oz'>(
    initialData?.weight_unit === 'lbs_oz' ? 'lb' : (initialData?.weight_unit as 'g' | 'oz') || 'g'
  );

  const [flightWeightValues, setFlightWeightValues] = useState(
    initialData?.flying_weight_g ? convertFromGrams(initialData.flying_weight_g, weightUnit) : { g: 0, lb: 0, oz: 0, eighths: 0 }
  );

  const [winterWeightValues, setWinterWeightValues] = useState(
    initialData?.winter_weight_g ? convertFromGrams(initialData.winter_weight_g, weightUnit) : { g: 0, lb: 0, oz: 0, eighths: 0 }
  );

  const handleFlightWeightChange = (field: string, value: string) => {
    setFlightWeightValues(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const handleWinterWeightChange = (field: string, value: string) => {
    setWinterWeightValues(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const onSubmit = form.handleSubmit(async (data) => {
    const flightGrams = convertToGrams(weightUnit, flightWeightValues);
    const winterGrams = convertToGrams(weightUnit, winterWeightValues);

    // Scrub empty strings from UUID fields to prevent Postgres syntax errors
    const sanitizedData = {
      ...data,
      parent_mob_id: data.parent_mob_id === "" ? null : data.parent_mob_id,
      sire_id: data.sire_id === "" ? null : data.sire_id,
      dam_id: data.dam_id === "" ? null : data.dam_id,
    };

    // Establish the target ID early
    const targetId = initialData?.id || crypto.randomUUID();
    let finalImageUrl = initialData?.image_url;

    if (photoFile) {
      try {
        // Upload the binary file to the bucket
        const uploadResult = await queueFileUpload(photoFile, 'animals', targetId, 'animals', 'image_url');
        finalImageUrl = uploadResult.attachment_url; // Map to the returned URL property
      } catch (error) {
        console.error('🛠️ [Storage] Failed to upload profile image:', error);
        alert('Image upload failed, but the profile will still be saved. Ensure your device is online or try a smaller image.');
      }
    }

    const payload = {
      ...sanitizedData,
      image_url: finalImageUrl,
      critical_husbandry_notes: sanitizedData.critical_husbandry_notes
        ? sanitizedData.critical_husbandry_notes.split('\n').map(n => n.trim()).filter(n => n.length > 0)
        : [],
      target_day_temp_c: sanitizedData.target_day_temp_c,
      target_night_temp_c: sanitizedData.target_night_temp_c,
      target_humidity_min_percent: sanitizedData.target_humidity_min_percent,
      target_humidity_max_percent: sanitizedData.target_humidity_max_percent,
      misting_frequency: sanitizedData.misting_frequency,
      flying_weight_g: flightGrams > 0 ? flightGrams : null,
      winter_weight_g: winterGrams > 0 ? winterGrams : null,
      weight_unit: weightUnit === 'lb' ? 'lbs_oz' : weightUnit
    };
    try {
      if (initialData) {
        if (initialData.location !== payload.location && initialData.location !== 'Main Aviary') {
          const internalMovement: InternalMovement = {
            id: crypto.randomUUID(),
            animal_id: initialData.id,
            animal_name: payload.name,
            log_date: new Date().toISOString(),
            movement_type: MovementType.TRANSFER,
            source_location: initialData.location || 'Unknown',
            destination_location: payload.location,
            created_by: currentUser?.initials || 'SYSTEM',
            notes: 'Auto-generated from profile location update.'
          };
          await mutateOnlineFirst('internal_movements', internalMovement, 'upsert');
        }
      } else {
        if (['BORN', 'TRANSFERRED_IN', 'RESCUE'].includes(payload.acquisition_type)) {
          const externalTransfer: ExternalTransfer = {
            id: crypto.randomUUID(),
            animal_id: targetId,
            animal_name: payload.name,
            transfer_type: TransferType.ARRIVAL,
            date: payload.acquisition_date || new Date().toISOString().split('T')[0],
            institution: payload.origin || 'Unknown',
            transport_method: 'N/A',
            cites_article_10_ref: 'N/A',
            status: TransferStatus.COMPLETED,
            notes: `Auto-generated from animal creation (Type: ${payload.acquisition_type}).`
          };
          await mutateOnlineFirst('external_transfers', externalTransfer, 'upsert');
        }
      }
    } catch (e) {
      console.error("Log failed", e);
    }
    
    try {
      const animalData: Animal = {
        ...initialData,
        ...payload,
        id: targetId,
      } as Animal;

      await mutateOnlineFirst('animals', animalData, 'upsert');
      onClose();
    } catch (error) {
      console.error('Failed to save animal:', error);
    }
  }, (errors) => {
    // Strip the DOM 'ref' from the errors object before logging to prevent Circular JSON crashes in the global bug reporter
    const safeErrors = Object.keys(errors).reduce((acc, key) => {
      const err = errors[key as keyof typeof errors];
      if (err) acc[key] = { message: err.message, type: err.type };
      return acc;
    }, {} as Record<string, { message: string | undefined; type: string | number | undefined }>);

    console.error("Validation Errors:", safeErrors);
    alert("Please check the form for missing required fields.");
  });

  const [isFetchingAI, setIsFetchingAI] = useState(false);

  const handleAutoFill = async () => {
    if (!navigator.onLine) {
      console.warn("Offline: AI Auto-Fill disabled.");
      alert("AI Auto-Fill requires an active internet connection.");
      return;
    }
    const currentSpecies = getValues('species'); 
    console.log("Manual Auto-Fill Triggered. Species:", currentSpecies);
    
    if (!currentSpecies) {
      console.warn("Auto-Fill aborted: No species name provided.");
      alert("Please enter a Common Name / Species first.");
      return;
    }

    setIsFetchingAI(true);
    try {
      console.log("Calling getAnimalIntelligence for:", currentSpecies);
      const data = await getAnimalIntelligence(currentSpecies);
      console.log("AI Data Received:", data);
      
      if (data.latin_name) {
        setValue('latin_name', data.latin_name, { shouldValidate: true, shouldDirty: true });
      }
      
      if (data.red_list_status) {
        setValue('red_list_status', data.red_list_status as ConservationStatus, { shouldValidate: true, shouldDirty: true });
      }
      
    } catch (error) {
      console.error("AI Fetch Error:", error);
      alert("Failed to fetch animal data. Please check your internet connection.");
    } finally {
      setIsFetchingAI(false);
    }
  };

  const category = watch('category');
  const imageUrl = watch('image_url');
  const distroUrl = watch('distribution_map_url');
  const currentEntityType = watch('entity_type');
  const isBird = category === AnimalCategory.OWLS || category === AnimalCategory.RAPTORS;

  const parentMobs = useLiveQuery(
    () => db.animals.filter(a => a.entity_type === 'GROUP' && a.id !== initialData?.id).toArray(),
    [initialData?.id]
  );

  const linkedChildrenCount = useLiveQuery(
    () => initialData?.id ? db.animals.filter(a => a.parent_mob_id === initialData.id).count() : 0,
    [initialData?.id]
  ) || 0;

  // Track if Environmental Controls are required
  const [envNa, setEnvNa] = useState<boolean>(
      initialData ? (!initialData.target_day_temp_c && !initialData.target_night_temp_c && !initialData.target_humidity_min_percent && !initialData.misting_frequency) : true
  );

  const handleEnvNaToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isNa = e.target.checked;
      setEnvNa(isNa);
      if (isNa) {
          // Clear out the values if N/A is checked so they wipe from the DB
          setValue('target_day_temp_c', null);
          setValue('target_night_temp_c', null);
          setValue('target_humidity_min_percent', null);
          setValue('target_humidity_max_percent', null);
          setValue('misting_frequency', null);
      }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-400";
  const errorClass = "text-red-600 text-xs mt-1";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit' : 'Add'} Animal Record</h2>
                    <p className="text-sm text-slate-500">ZLA 1981 Statutory Registry</p>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                <input type="hidden" {...register('image_url')} />
                <input type="hidden" {...register('distribution_map_url')} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 h-fit">
                        <section>
                            <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Profile Photo</h3>
                            <div className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                <img 
                                  src={imageUrl || `https://picsum.photos/seed/${uuidv4()}/400/400`} 
                                  alt="Subject" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <label className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                    <div className="bg-white/90 p-2 rounded-full shadow-sm"><Camera size={16} /></div>
                                    <input type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
                                </label>
                            </div>
                        </section>
                        <section className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
                            <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2"><Globe size={16}/> Range Map</h3>
                            <div className="relative group flex-1 rounded-md overflow-hidden border border-slate-200 bg-white">
                                {distroUrl ? (
                                    <img src={distroUrl} alt="Range Map" className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs">No Map</div>
                                )}
                                <label className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center transition-opacity">
                                    <span className="bg-white text-slate-900 px-2 py-1 rounded text-xs font-medium shadow-sm">Upload</span>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'distribution_map_url')} className="hidden" />
                                </label>
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        {/* Master Toggle */}
                        <div className="bg-slate-100 p-1.5 rounded-xl flex items-center w-full sm:w-fit mx-auto mb-8 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setValue('entity_type', EntityType.INDIVIDUAL)}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    currentEntityType === EntityType.INDIVIDUAL 
                                    ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Individual Animal
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('entity_type', EntityType.GROUP)}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    currentEntityType === EntityType.GROUP 
                                    ? 'bg-white text-amber-700 shadow-sm ring-1 ring-slate-200/50' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Group / Mob Entity
                            </button>
                        </div>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><Info size={18}/> Identification & Taxonomy</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-5">
                                    <label className={labelClass}>{currentEntityType === EntityType.GROUP ? 'Mob Name *' : 'Subject Name *'}</label>
                                    <input {...register('name')} className={inputClass} placeholder={currentEntityType === EntityType.GROUP ? "e.g. Meerkat Troop" : "e.g. Barnaby"} />
                                    {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                                </div>
                                <div className="sm:col-span-4">
                                    <label className={labelClass}>Section *</label>
                                    <select {...register('category')} className={inputClass}>
                                        {(Object.values(AnimalCategory) as string[]).filter(cat => cat !== 'ALL').map(cat => <option key={String(cat)} value={cat}>{cat}</option>)}
                                    </select>
                                    {errors.category && <p className={errorClass}>{errors.category.message}</p>}
                                </div>
                                <div className="sm:col-span-3">
                                    <label className={labelClass}>Location *</label>
                                    <input {...register('location')} list="location-list" className={inputClass} placeholder="Select location..." />
                                    <datalist id="location-list">
                                        {locations.map(loc => <option key={loc.id} value={loc.value} />)}
                                    </datalist>
                                    {errors.location && <p className={errorClass}>{errors.location.message}</p>}
                                </div>
                            </div>

                            {currentEntityType === EntityType.GROUP && (
                                <div className="md:col-span-12 bg-amber-50 p-4 rounded-xl border border-amber-200 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-amber-200 text-amber-600 shadow-sm"><Users size={18}/></div>
                                        <div className="flex-1">
                                            <span className="text-sm font-bold text-amber-900 block">Group Census</span>
                                            <span className="text-xs text-amber-700 block">Track the total number of individuals in this mob</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Census Count</label>
                                        {linkedChildrenCount > 0 ? (
                                            <div className="p-3 bg-white border border-amber-200 rounded-md">
                                                <span className="text-sm font-bold text-amber-900 block">{linkedChildrenCount} Linked Individuals</span>
                                                <span className="text-xs text-amber-700 block">Census is automatically managed based on linked individuals.</span>
                                                <input type="hidden" {...register('census_count', { setValueAs: v => (v === "" || Number.isNaN(Number(v))) ? null : Number(v) })} value={linkedChildrenCount} />
                                            </div>
                                        ) : (
                                            <input type="number" {...register('census_count', { setValueAs: v => (v === "" || Number.isNaN(Number(v))) ? null : Number(v) })} className={inputClass} placeholder="Manual Census (Leave blank if linking individuals later)" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentEntityType === EntityType.INDIVIDUAL && (
                                <div className="md:col-span-12 bg-indigo-50 p-4 rounded-xl border border-indigo-200 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-indigo-200 text-indigo-600 shadow-sm"><Users size={18}/></div>
                                        <div className="flex-1">
                                            <span className="text-sm font-bold text-indigo-900 block">Parent Mob Link</span>
                                            <span className="text-xs text-indigo-700 block">Optionally link this individual to a larger group</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Parent Mob</label>
                                        <select {...register('parent_mob_id')} className={inputClass}>
                                            <option value="">None (Independent)</option>
                                            {parentMobs?.map(mob => (
                                                <option key={mob.id} value={mob.id}>{mob.name} ({mob.species})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-7">
                                    <label className={labelClass}>Common Species *</label>
                                    <div className="flex gap-2">
                                        <input {...register('species')} className={inputClass} placeholder="e.g. Barn Owl" />
                                        <button 
                                          type="button" 
                                          onClick={(e) => { e.preventDefault(); handleAutoFill(); }}
                                          disabled={isFetchingAI}
                                          className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-3 rounded-2xl border border-indigo-100 font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                        >
                                          {isFetchingAI ? 'Fetching...' : 'Auto-Fill Details'}
                                        </button>
                                    </div>
                                    {errors.species && <p className={errorClass}>{errors.species.message}</p>}
                                </div>
                                <div className="sm:col-span-5">
                                    <label className={labelClass}>Scientific Name</label>
                                    <input {...register('latin_name')} className={`${inputClass} italic`} placeholder="e.g. Tyto alba" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                {currentEntityType === EntityType.INDIVIDUAL && (
                                    <>
                                        <div className="sm:col-span-4">
                                            <label className={labelClass}>Sex</label>
                                            <select {...register('sex')} className={inputClass}>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Unknown">Unknown</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className={labelClass}>Date of Birth</label>
                                                <div className="flex items-center gap-1">
                                                    <input type="checkbox" {...register('is_dob_unknown')} />
                                                    <span className="text-xs text-slate-500">Unknown</span>
                                                </div>
                                            </div>
                                            <input type="date" {...register('dob')} className={inputClass} />
                                        </div>
                                    </>
                                )}
                                <div className="col-span-12 sm:col-span-6">
                                    <label className={labelClass}>IUCN Status</label>
                                    <select {...register('red_list_status')} className={`${inputClass} text-sm sm:text-base`}>
                                        {(Object.values(ConservationStatus) as string[]).map(s => <option key={String(s)} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {currentEntityType === EntityType.INDIVIDUAL && (
                            <section className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                                    <History size={16} /> Statutory Acquisition & Pedigree
                                </h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className={labelClass}>Date of Arrival *</label>
                                        <input type="date" {...register('acquisition_date')} className={inputClass} />
                                        {errors.acquisition_date && <p className={errorClass}>{errors.acquisition_date.message}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Acquisition Type</label>
                                        <select {...register('acquisition_type')} className={inputClass}>
                                            <option value="UNKNOWN">Unknown</option>
                                            <option value="BORN">Born</option>
                                            <option value="TRANSFERRED_IN">Transferred In</option>
                                            <option value="RESCUE">Rescue</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Source / Origin *</label>
                                        <input {...register('origin')} className={inputClass} placeholder="e.g. International Centre for Birds of Prey" />
                                        {errors.origin && <p className={errorClass}>{errors.origin.message}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Sire (Father)</label>
                                        <input {...register('sire_id')} className={inputClass} placeholder="Ancestry ID or Name" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Dam (Mother)</label>
                                        <input {...register('dam_id')} className={inputClass} placeholder="Ancestry ID or Name" />
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><Zap size={18}/> Markers & Biometrics</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {currentEntityType === EntityType.INDIVIDUAL && (
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className={labelClass}>Identification</label>
                                            <div className="flex items-center gap-1">
                                                <input type="checkbox" {...register('has_no_id')} />
                                                <span className="text-xs text-slate-500">No ID</span>
                                            </div>
                                        </div>
                                        <div className={`grid ${isBird ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                            <input {...register('microchip_id')} className={`${inputClass} font-mono`} placeholder="Microchip..." />
                                            {isBird && <input {...register('ring_number')} className={`${inputClass} font-mono`} placeholder="Ring..." />}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass}>Hazard Class</label>
                                    <select {...register('hazard_rating')} className={inputClass}>
                                        {(Object.values(HazardRating) as string[]).map(h => <option key={String(h)} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                
                                {isBird ? (
                                    <div>
                                        <label className={labelClass}>Water Tipping Temp (°C)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            {...register('water_tipping_temp', { 
                                                setValueAs: v => (v === "" || Number.isNaN(parseFloat(v))) ? null : parseFloat(v) 
                                            })} 
                                            className={inputClass} 
                                            placeholder="e.g. 2.0" 
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className={labelClass}>Water Tipping Temp (°C)</label>
                                        <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-400 cursor-not-allowed text-center font-medium shadow-inner">
                                            N/A for {category}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col justify-end">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-md border border-slate-300 hover:border-blue-500 transition-all">
                                        <input type="checkbox" {...register('is_venomous')} />
                                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Skull size={14}/> Venomous</span>
                                    </label>
                                </div>
                            </div>

                            {/* WEIGHT SECTION */}
                            {currentEntityType === EntityType.INDIVIDUAL && (
                                <div className="bg-slate-50 p-4 rounded-lg border-2 border-dashed border-blue-300 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Scale size={14} className="text-blue-500" /> Weight Configuration
                                        </h4>
                                        <select 
                                            value={weightUnit} 
                                            onChange={(e) => {
                                                const newUnit = e.target.value as 'g' | 'lb' | 'oz';
                                                setWeightUnit(newUnit);
                                                setFlightWeightValues(convertFromGrams(convertToGrams(weightUnit, flightWeightValues), newUnit));
                                                setWinterWeightValues(convertFromGrams(convertToGrams(weightUnit, winterWeightValues), newUnit));
                                            }}
                                            className="text-[10px] font-bold bg-white border-2 border-slate-200 rounded-lg py-1 px-2 uppercase tracking-widest focus:ring-0 cursor-pointer"
                                        >
                                            <option value="g">Grams (g)</option>
                                            <option value="lb">Pounds (lb/oz)</option>
                                            <option value="oz">Ounces (oz)</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-3">
                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Flight Target</h5>
                                        </div>
                                        {weightUnit === 'g' && (
                                            <div className="sm:col-span-3">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Grams</label>
                                                <input 
                                                    type="number" 
                                                    value={flightWeightValues.g || ''} 
                                                    onChange={(e) => handleFlightWeightChange('g', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="e.g. 1050"
                                                />
                                            </div>
                                        )}

                                        {weightUnit === 'oz' && (
                                            <>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                                                    <input 
                                                        type="number" 
                                                        value={flightWeightValues.oz || ''} 
                                                        onChange={(e) => handleFlightWeightChange('oz', e.target.value)}
                                                        className={inputClass}
                                                        placeholder="oz"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                                                    <select 
                                                        value={flightWeightValues.eighths || 0} 
                                                        onChange={(e) => handleFlightWeightChange('eighths', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {weightUnit === 'lb' && (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pounds (lb)</label>
                                                    <input 
                                                        type="number" 
                                                        value={flightWeightValues.lb || ''} 
                                                        onChange={(e) => handleFlightWeightChange('lb', e.target.value)}
                                                        className={inputClass}
                                                        placeholder="lb"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                                                    <select 
                                                        value={flightWeightValues.oz || 0} 
                                                        onChange={(e) => handleFlightWeightChange('oz', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        {Array.from({length: 16}, (_, i) => i).map(n => <option key={n} value={n}>{n} oz</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                                                    <select 
                                                        value={flightWeightValues.eighths || 0} 
                                                        onChange={(e) => handleFlightWeightChange('eighths', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                                        <div className="sm:col-span-3">
                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Winter Target</h5>
                                        </div>
                                        {weightUnit === 'g' && (
                                            <div className="sm:col-span-3">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Grams</label>
                                                <input 
                                                    type="number" 
                                                    value={winterWeightValues.g || ''} 
                                                    onChange={(e) => handleWinterWeightChange('g', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="e.g. 1050"
                                                />
                                            </div>
                                        )}

                                        {weightUnit === 'oz' && (
                                            <>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                                                    <input 
                                                        type="number" 
                                                        value={winterWeightValues.oz || ''} 
                                                        onChange={(e) => handleWinterWeightChange('oz', e.target.value)}
                                                        className={inputClass}
                                                        placeholder="oz"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                                                    <select 
                                                        value={winterWeightValues.eighths || 0} 
                                                        onChange={(e) => handleWinterWeightChange('eighths', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {weightUnit === 'lb' && (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pounds (lb)</label>
                                                    <input 
                                                        type="number" 
                                                        value={winterWeightValues.lb || ''} 
                                                        onChange={(e) => handleWinterWeightChange('lb', e.target.value)}
                                                        className={inputClass}
                                                        placeholder="lb"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                                                    <select 
                                                        value={winterWeightValues.oz || 0} 
                                                        onChange={(e) => handleWinterWeightChange('oz', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        {Array.from({length: 16}, (_, i) => i).map(n => <option key={n} value={n}>{n} oz</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                                                    <select 
                                                        value={winterWeightValues.eighths || 0} 
                                                        onChange={(e) => handleWinterWeightChange('eighths', e.target.value)}
                                                        className={inputClass}
                                                    >
                                                        {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400 italic">
                                        Flight: {convertToGrams(weightUnit, flightWeightValues).toFixed(2)}g · Winter: {convertToGrams(weightUnit, winterWeightValues).toFixed(2)}g
                                    </p>
                                </div>
                            )}
                        </section>


                        {/* NEW: TARGET ENVIRONMENT SECTION */}
                        {currentEntityType === EntityType.INDIVIDUAL && (
                            <section className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Thermometer size={18}/> Target Environment
                                    </h3>
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={envNa} 
                                            onChange={handleEnvNaToggle}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-0.5">N/A (No Temp Controls)</span>
                                    </label>
                                </div>
                                
                                {!envNa ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div>
                                            <label className={labelClass}>Day Temp (°C)</label>
                                            <input type="number" step="0.1" {...register('target_day_temp_c', { setValueAs: v => (v === "" || Number.isNaN(parseFloat(v))) ? null : parseFloat(v) })} className={inputClass} placeholder="28.5" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Night Temp (°C)</label>
                                            <input type="number" step="0.1" {...register('target_night_temp_c', { setValueAs: v => (v === "" || Number.isNaN(parseFloat(v))) ? null : parseFloat(v) })} className={inputClass} placeholder="22.0" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Min Humidity %</label>
                                            <input type="number" {...register('target_humidity_min_percent', { setValueAs: v => (v === "" || Number.isNaN(parseInt(v))) ? null : parseInt(v) })} className={inputClass} placeholder="60" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Max Humidity %</label>
                                            <input type="number" {...register('target_humidity_max_percent', { setValueAs: v => (v === "" || Number.isNaN(parseInt(v))) ? null : parseInt(v) })} className={inputClass} placeholder="80" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Misting Freq.</label>
                                            <input type="text" {...register('misting_frequency')} className={inputClass} placeholder="e.g. Twice Daily" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full px-3 py-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-sm text-slate-400 text-center font-medium shadow-inner">
                                        Environmental controls disabled for this subject.
                                    </div>
                                )}
                            </section>
                        )}

                        {/* NEW: CRITICAL HUSBANDRY NOTES */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Shield size={18} className="text-amber-500" /> Critical Husbandry Notes
                            </h3>
                            <div>
                                <label className={labelClass}>Important Care Instructions (One per line)</label>
                                <textarea 
                                    {...register('critical_husbandry_notes')} 
                                    className={`${inputClass} min-h-[100px] resize-y`} 
                                    placeholder="e.g. Requires daily beak inspection&#10;Prone to bumblefoot, check perches" 
                                />
                            </div>
                        </section>

                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-200 pb-2">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Shield size={20}/>
                        <p className="text-xs font-medium">I verify this record is an accurate entry into the statutory stock ledger.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors">Discard</button>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                            {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Check size={16} />}
                            {isSubmitting ? 'Authorizing...' : 'Authorize'}
                        </button>
                    </div>
                </div>
            </form>

            {/* CROPPER OVERLAY */}
            {isCropping && imageToCrop && (
              <div className="fixed inset-0 z-[70] bg-black flex flex-col">
                <div className="relative flex-1 w-full h-full">
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={3 / 4}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                  />
                </div>
                <div className="bg-slate-900 p-6 pb-safe flex flex-col sm:flex-row items-center gap-4 justify-between border-t border-slate-800">
                  <input 
                      type="range" value={zoom} min={1} max={3} step={0.1}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full sm:w-1/2 accent-blue-500"
                  />
                  <div className="flex gap-3 w-full sm:w-auto">
                      <button type="button" onClick={() => { setIsCropping(false); setImageToCrop(null); }} className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors">
                          Cancel
                      </button>
                      <button type="button" onClick={handleCropConfirm} disabled={isUploadingCrop} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                          {isUploadingCrop ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                          {isUploadingCrop ? 'Uploading...' : 'Confirm Crop'}
                      </button>
                  </div>
                </div>
              </div>
            )}
        </div>
    </div>
  );
};

export default AnimalFormModal;
