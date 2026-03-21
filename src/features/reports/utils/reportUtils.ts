import { Animal } from '../../../types';

export const calculateTotalInventory = (animalList: Animal[]) => {
  // First, find all IDs of individuals that belong to a group
  const linkedChildIds = new Set(animalList.filter(a => a.parent_mob_id).map(a => a.id));

  return animalList.reduce((total, animal) => {
    // Skip linked children to avoid double counting, as their parent's census_count already includes them
    if (linkedChildIds.has(animal.id)) return total;

    if (animal.entity_type === 'GROUP') {
      return total + (animal.census_count || 0);
    }
    return total + 1; // It's an independent individual
  }, 0);
};
