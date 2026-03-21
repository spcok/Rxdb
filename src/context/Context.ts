import { createContext, useContext } from 'react';
import { OrgProfile, User } from '../types';
import { RxDatabase } from 'rxdb';

export interface AppContextType {
  db: RxDatabase | null;
  foodOptions: string[];
  feedMethods: Record<string, string[]>;
  eventTypes: string[];
  activeShift: unknown;
  clockIn: (initials: string) => Promise<void>;
  clockOut: () => Promise<void>;
  orgProfile: OrgProfile;
  users: User[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
};
