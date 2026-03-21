import { useState } from 'react';
import Dashboard from './Dashboard';
import AnimalProfile from '../animals/AnimalProfile';
import { Animal, AnimalCategory } from '../../types';

export default function DashboardContainer() {
  const [activeTab, setActiveTab] = useState<AnimalCategory | 'ARCHIVED'>(AnimalCategory.OWLS);
  const [viewDate, setViewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  if (selectedAnimalId) {
    return (
      <AnimalProfile 
        animalId={selectedAnimalId} 
        onBack={() => setSelectedAnimalId(null)} 
      />
    );
  }

  return (
    <Dashboard 
      onSelectAnimal={(animal: Animal) => setSelectedAnimalId(animal.id)}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      viewDate={viewDate}
      setViewDate={setViewDate}
    />
  );
}
