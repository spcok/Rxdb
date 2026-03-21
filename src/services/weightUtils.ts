export const formatWeightDisplay = (grams: number, unit: 'g' | 'oz' | 'lbs_oz' | 'kg' = 'g'): string => {
  if (unit === 'kg') {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  if (unit === 'oz') {
    return `${(grams / 28.3495).toFixed(1)} oz`;
  }
  if (unit === 'lbs_oz') {
    const totalOz = grams / 28.3495;
    const lbs = Math.floor(totalOz / 16);
    const oz = (totalOz % 16).toFixed(1);
    return `${lbs} lb ${oz} oz`;
  }
  return `${Math.round(grams)} g`;
};

export const convertToGrams = (unit: 'g' | 'oz' | 'lb', values: { g?: number; lb?: number; oz?: number }): number => {
  if (unit === 'g') return values.g || 0;
  
  const ozInGrams = 28.3495;
  
  if (unit === 'oz') {
    return (values.oz || 0) * ozInGrams;
  }
  
  if (unit === 'lb') {
    const lbInGrams = ozInGrams * 16;
    return (values.lb || 0) * lbInGrams + (values.oz || 0) * ozInGrams;
  }
  
  return 0;
};

export const convertFromGrams = (grams: number, unit: 'g' | 'oz' | 'lb'): { g: number; lb: number; oz: number; eighths: number } => {
  const totalOz = grams / 28.3495;
  const eighths = Math.round((totalOz % 1) * 8);

  if (unit === 'g') return { g: Math.round(grams), lb: 0, oz: 0, eighths: 0 };
  
  if (unit === 'oz') {
    const oz = Math.floor(totalOz);
    return { g: 0, lb: 0, oz, eighths };
  }
  
  if (unit === 'lb') {
    const lb = Math.floor(totalOz / 16);
    const oz = Math.floor(totalOz % 16);
    return { g: 0, lb, oz, eighths };
  }
  
  return { g: 0, lb: 0, oz: 0, eighths: 0 };
};

export const parseLegacyWeightToGrams = (raw: string | undefined | null): number | null => {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/\s/g, '');
  const num = parseFloat(s);
  if (isNaN(num)) return null;

  if (s.includes('kg')) return num * 1000;
  if (s.includes('oz')) return num * 28.3495;
  if (s.includes('lb')) return num * 453.592;
  return num; // Default assumption is grams
};
