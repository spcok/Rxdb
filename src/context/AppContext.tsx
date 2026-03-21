import React, { ReactNode, useEffect, useState } from 'react';
import { AnimalCategory, UserRole } from '../types';
import { AppContext, AppContextType } from './Context';
import { useTimesheetData } from '../features/staff/useTimesheetData';
import { useAuthStore } from '../store/authStore';
import { initDatabase, RxDatabase } from '../lib/rxdb';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { clockIn, clockOut, timesheets } = useTimesheetData();
  const { currentUser } = useAuthStore();
  const [db, setDb] = useState<RxDatabase | null>(null);

  useEffect(() => {
    initDatabase().then(setDb);
  }, []);

  const activeShift = timesheets.find(t => t.staff_name === currentUser?.name && !t.clock_out);

  const value: AppContextType = {
    db,
    foodOptions: ['Day Old Chick', 'Mouse (S)', 'Mouse (M)', 'Mouse (L)', 'Rat (S)', 'Rat (M)', 'Quail', 'Rabbit'],
    feedMethods: {
      [AnimalCategory.OWLS]: ['Hand Fed', 'Bowl Fed', 'Tongs'],
      [AnimalCategory.RAPTORS]: ['Hand Fed', 'Bowl Fed', 'Tongs'],
      [AnimalCategory.MAMMALS]: ['Bowl Fed', 'Scatter Fed'],
      [AnimalCategory.EXOTICS]: ['Tongs', 'Bowl Fed'],
    },
    eventTypes: ['Training', 'Public Display', 'Medical Treatment', 'Cleaning', 'Moulting'],
    activeShift: activeShift || null,
    clockIn: async () => await clockIn(currentUser?.name || 'Unknown'),
    clockOut: async () => {
      if (activeShift) await clockOut(activeShift.id);
    },
    orgProfile: {
      name: 'Kent Owl Academy',
      logo_url: 'https://picsum.photos/seed/koa/200/200',
    },
    users: [
      { id: '1', email: 'admin@koa.com', name: 'John Doe', role: UserRole.ADMIN, initials: 'JD' },
      { id: '2', email: 'volunteer@koa.com', name: 'Jane Smith', role: UserRole.VOLUNTEER, initials: 'JS' }
    ]
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
