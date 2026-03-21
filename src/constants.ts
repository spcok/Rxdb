import { AnimalCategory } from './types';

export const DEFAULT_FOOD_OPTIONS = [
  'Day Old Chick',
  'Mouse (Small)',
  'Mouse (Large)',
  'Rat (Small)',
  'Rat (Large)',
  'Quail',
  'Beef',
  'Insects'
];

export const DEFAULT_FEED_METHODS: Record<string, string[]> = {
  [AnimalCategory.OWLS]: ['Hand Feed', 'Bowl', 'Toss', 'Lure'],
  [AnimalCategory.RAPTORS]: ['Hand Feed', 'Bowl', 'Toss', 'Lure'],
  [AnimalCategory.MAMMALS]: ['Bowl', 'Scatter', 'Puzzle'],
  [AnimalCategory.REPTILES]: ['Tong Feed', 'Bowl']
};

export const DEFAULT_EVENT_TYPES = [
  'Public Display',
  'Educational Talk',
  'Off-site Event',
  'Training Session'
];
