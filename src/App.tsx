import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AppProvider } from './context/AppContext';
import { useAuthStore } from './store/authStore';
import LoginScreen from './features/auth/LoginScreen';
import LockScreen from './features/auth/LockScreen';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import DashboardContainer from './features/dashboard/DashboardContainer';
import WeatherView from './features/dashboard/WeatherView';
import Tasks from './features/husbandry/Tasks';
import FeedingSchedule from './features/husbandry/FeedingSchedule';
import DailyLog from './features/husbandry/DailyLog';
import DailyRounds from './features/husbandry/DailyRounds';
import MedicalRecords from './features/medical/MedicalRecords';
import Movements from './features/logistics/Movements';
import FlightRecords from './features/logistics/FlightRecords';
import Timesheets from './features/staff/Timesheets';
import Holidays from './features/staff/Holidays';
import StaffRota from './features/staff/StaffRota';
import MissingRecords from './features/compliance/MissingRecords';
import SettingsLayout from './features/settings/SettingsLayout';
import HelpSupport from './features/help/HelpSupport';
import Incidents from './features/safety/tabs/Incidents';
import FirstAidLog from './features/safety/tabs/FirstAid';
import SafetyDrills from './features/safety/tabs/SafetyDrills';
import SiteMaintenance from './features/safety/tabs/SiteMaintenance';
import ReportsDashboard from './features/reports/ReportsDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initDatabase, startReplication, stopReplication } from './lib/rxdb';
import { RxDatabase } from 'rxdb';
import { supabase, isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const { initialize, isLoading, session } = useAuthStore();
  const [db, setDb] = useState<RxDatabase | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [supabaseError] = useState<string | null>(() => 
    isSupabaseConfigured() ? null : 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. Some features may not work.'
  );
  useInactivityTimer();

  const handleEmergencyReset = () => {
    window.indexedDB.deleteDatabase('animaldb_v18');
    window.indexedDB.deleteDatabase('animaldb_v16');
    window.location.reload();
  };

  useEffect(() => {
    initDatabase()
      .then(setDb)
      .catch(err => {
        console.error('💾 [RxDB] CRITICAL INITIALIZATION FAILURE:', err);
        setInitError(err.message || 'Unknown database error');
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (db && session && isSupabaseConfigured()) {
      console.log('🚀 [App] Conditions met for replication. Starting...');
      startReplication(db, supabase).then(() => {
        if (!isMounted) stopReplication();
      });
    } else {
      console.log('🛑 [App] Conditions not met for replication. Stopping...');
      stopReplication();
    }

    return () => {
      isMounted = false;
      stopReplication();
    };
  }, [db, session]);

  useEffect(() => {
    let cleanup: () => void;
    initialize().then(c => {
      if (typeof c === 'function') cleanup = c;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, [initialize]);

  if (isLoading || (!db && !initError)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">Initializing...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-rose-950 text-white p-4">
        <div className="bg-black/50 p-8 rounded-3xl max-w-md w-full text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight text-rose-500 mb-4">Database Error</h1>
          <p className="text-slate-400 mb-8 font-mono text-xs">{initError}</p>
          <button
            onClick={handleEmergencyReset}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-colors"
          >
            Emergency Reset (Delete DB)
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        {supabaseError && (
          <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600/90 backdrop-blur-sm text-white text-[9px] py-1 px-4 text-center font-bold uppercase tracking-widest">
            ℹ️ Running in Offline Mode (Local Database)
          </div>
        )}
        <LockScreen />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* COMPLETED MILESTONE 1 ROUTES */}
              <Route index element={<DashboardContainer />} />
              <Route path="weather" element={<div className="-mx-2.5 md:-mx-[18px] lg:-mx-[26px]"><WeatherView /></div>} />
              <Route path="daily-log" element={<DailyLog />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="feeding-schedule" element={<FeedingSchedule />} />
              <Route path="daily-rounds" element={<DailyRounds />} />

              {/* PHASE 4: MEDICAL & QUARANTINE */}
              <Route path="medical" element={<MedicalRecords />} />
              <Route path="first-aid" element={<FirstAidLog />} />

              {/* PHASE 5: LOGISTICS & SAFETY */}
              <Route path="movements" element={<Movements />} />
              <Route path="flight-records" element={<FlightRecords />} />
              <Route path="maintenance" element={<SiteMaintenance />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="safety-drills" element={<SafetyDrills />} />

              {/* PHASE 6: STAFF & COMPLIANCE */}
              <Route path="timesheets" element={<Timesheets />} />
              <Route path="holidays" element={<Holidays />} />
              <Route path="rota" element={<StaffRota />} />
              <Route path="compliance" element={<MissingRecords />} />
              <Route path="reports" element={<ReportsDashboard />} />
              <Route path="missing-records" element={<MissingRecords />} />

              {/* PHASE 7: SETTINGS */}
              <Route path="settings" element={<SettingsLayout />} />
              <Route path="settings/:tab" element={<SettingsLayout />} />
              <Route path="help" element={<HelpSupport />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
