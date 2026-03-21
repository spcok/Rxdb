import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Stethoscope, ClipboardList, ArrowLeft, ShieldAlert, Thermometer, Scale, AlertTriangle, GitMerge } from 'lucide-react';
import { useAnimalProfileData } from './useAnimalProfileData';
import { IUCNBadge } from './IUCNBadge';
import AnimalFormModal from './AnimalFormModal';
import SignGenerator from './SignGenerator';
import MedicalRecords from '../medical/MedicalRecords';
import { ProfileActionBar } from './ProfileActionBar';
import { HusbandryLogs } from '../husbandry/HusbandryLogs';
import { formatWeightDisplay } from '../../services/weightUtils';

export interface Props {
  animalId?: string;
  onBack?: () => void;
}

export default function AnimalProfile({ animalId, onBack }: Props) {
  const { id } = useParams<{ id: string }>();
  const effectiveId = animalId || id || '';
  const { animal, isLoading, archiveAnimal, orgProfile } = useAnimalProfileData(effectiveId);
  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'husbandry'>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSignGeneratorOpen, setIsSignGeneratorOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!animal) return <div className="p-8 text-center">Animal not found.</div>;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FileText },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'husbandry', label: 'Husbandry', icon: ClipboardList },
  ] as const;

  return (
    <div className="space-y-4 p-2 md:p-4">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft size={18} /> Back
        </button>
      )}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[280px] xl:h-[340px] rounded-xl overflow-hidden shadow-sm">
            <img
              src={animal.image_url || '/offline-media-fallback.svg'}
              alt={animal.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = '/offline-media-fallback.svg'; }}
            />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold text-slate-900">{animal.name}</h1>
              <IUCNBadge status={animal.red_list_status} />
            </div>
            <div className="flex flex-col gap-0.5 mb-4">
              <p className="text-slate-500 font-mono text-sm">ID: {animal.id}</p>
              <p className="text-slate-500 font-mono text-sm">Ring Number: {animal.ring_number || 'Un-ringed'}</p>
            </div>
            
            <div className="mb-4">
              <span className="text-slate-400 block mb-1">Location</span>
              <span className="font-medium text-slate-900">{animal.location || 'Unknown'}</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
              <div>
                <span className="text-slate-400 block mb-1">Species</span>
                <span className="font-medium text-slate-900">{animal.species}</span>
                {animal.latin_name && (
                  <span className="block text-slate-500 italic text-xs">{animal.latin_name}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Sex</span>
                <span className="font-medium text-slate-900">{animal.sex || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Status</span>
                <span className="font-medium text-slate-900">{animal.disposition_status || 'Active'}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Origin</span>
                <span className="font-medium text-slate-900">{animal.origin || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Date of Birth</span>
                <span className="font-medium text-slate-900">
                  {animal.dob ? new Date(animal.dob).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Acquisition</span>
                <span className="font-medium text-slate-900">
                  {animal.acquisition_date ? new Date(animal.acquisition_date).toLocaleDateString() : 'Unknown'}
                </span>
              </div>

              {/* Dynamic Weight Presentation Based on Preference */}
              {animal.flying_weight_g !== undefined && animal.flying_weight_g !== null && (
                <div>
                  <span className="text-slate-400 block mb-1">Flying Weight</span>
                  <span className="font-bold text-blue-600">
                    {formatWeightDisplay(animal.flying_weight_g, animal.weight_unit)}
                  </span>
                </div>
              )}
              {animal.winter_weight_g !== undefined && animal.winter_weight_g !== null && (
                <div>
                  <span className="text-slate-400 block mb-1">Winter Weight</span>
                  <span className="font-bold text-blue-600">
                    {formatWeightDisplay(animal.winter_weight_g, animal.weight_unit)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <ProfileActionBar
            onEdit={() => setIsEditModalOpen(true)}
            onSign={() => setIsSignGeneratorOpen(true)}
            onArchive={() => setIsArchiveOpen(true)}
          />
        </div>
      </div>

      {isEditModalOpen && (
        <AnimalFormModal
          isOpen={isEditModalOpen}
          initialData={animal}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {isSignGeneratorOpen && (
        <SignGenerator
          animal={animal}
          orgProfile={orgProfile}
          onClose={() => setIsSignGeneratorOpen(false)}
        />
      )}
      
      {isArchiveOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-lg font-bold">Archive Animal</h2>
            <p>Are you sure you want to archive {animal.name}?</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setIsArchiveOpen(false)} className="px-4 py-2 bg-slate-200 rounded">Cancel</button>
              <button onClick={() => { archiveAnimal('Archived by user', 'Disposition'); setIsArchiveOpen(false); }} className="px-4 py-2 bg-red-600 text-white rounded">Archive</button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 px-1 border-b-2 transition ${
                activeTab === tab.id 
                  ? 'border-emerald-500 text-emerald-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 min-h-[400px]">
        {activeTab === 'profile' && (
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Critical Husbandry Notes */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 lg:col-span-1 xl:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <h3 className="font-semibold text-red-900">Critical Husbandry Notes</h3>
                </div>
                {animal.critical_husbandry_notes && animal.critical_husbandry_notes.length > 0 ? (
                  <ul className="list-disc list-outside ml-8 text-sm text-red-800 space-y-1">
                    {animal.critical_husbandry_notes.map((note, idx) => <li key={idx}>{note}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-red-700">No critical notes.</p>
                )}
              </div>

              {/* Lineage & Genetics */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitMerge className="text-slate-500" size={20} />
                  <h3 className="font-semibold text-slate-900">Lineage & Genetics</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Sire:</span> {animal.sire_id ?? 'Unknown'}</p>
                  <p><span className="text-slate-500">Dam:</span> {animal.dam_id ?? 'Unknown'}</p>
                </div>
              </div>

              {/* Safety & Hazards */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="text-slate-500" size={20} />
                  <h3 className="font-semibold text-slate-900">Safety & Hazards</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Hazard Rating:</span> <span className={`font-medium ${animal.hazard_rating === 'HIGH' ? 'text-red-600' : animal.hazard_rating === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'}`}>{animal.hazard_rating ?? 'N/A'}</span></p>
                  {animal.is_venomous && <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><AlertTriangle size={14} /> VENOMOUS</div>}
                </div>
              </div>

              {/* Weight Management */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="text-slate-500" size={20} />
                  <h3 className="font-semibold text-slate-900">Weight Management</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Flying Weight:</span> {animal.flying_weight_g !== undefined ? formatWeightDisplay(animal.flying_weight_g, animal.weight_unit) : 'N/A'}</p>
                  <p><span className="text-slate-500">Winter Weight:</span> {animal.winter_weight_g !== undefined ? formatWeightDisplay(animal.winter_weight_g, animal.weight_unit) : 'N/A'}</p>
                </div>
              </div>

              {/* Environmental Targets */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer className="text-slate-500" size={20} />
                  <h3 className="font-semibold text-slate-900">Environmental Targets</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Day Temp Target:</span> {animal.target_day_temp_c ?? 'N/A'}°C</p>
                  <p><span className="text-slate-500">Night Temp Target:</span> {animal.target_night_temp_c ?? 'N/A'}°C</p>
                  <p><span className="text-slate-500">Humidity Target:</span> {animal.target_humidity_min_percent ?? 'N/A'}% - {animal.target_humidity_max_percent ?? 'N/A'}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'medical' && <MedicalRecords animalId={animal.id} variant="quick-view" />}
        {activeTab === 'husbandry' && <HusbandryLogs animalId={animal.id} animal={animal} />}
      </div>
    </div>
  );
}