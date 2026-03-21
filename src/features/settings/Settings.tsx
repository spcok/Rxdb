import React, { useState } from 'react';
import { User, Palette, Building, ShieldCheck, History, Activity } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppData } from '../../context/Context';
import AccessControl from './tabs/AccessControl';
import Changelog from './tabs/Changelog';
import SystemHealth from './tabs/SystemHealth';

const Settings: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { orgProfile } = useAppData();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'organization' | 'access' | 'changelog' | 'health'>('profile');

  // UI State for placeholders
  const [highContrast, setHighContrast] = useState(false);
  const [compactTable, setCompactTable] = useState(false);

  if (!currentUser) return <div>Loading...</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account and app preferences.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'profile', label: 'User Profile', icon: User },
          { id: 'preferences', label: 'App Preferences', icon: Palette },
          { id: 'organization', label: 'Organisation', icon: Building },
          { id: 'access', label: 'Access Control', icon: ShieldCheck },
          { id: 'changelog', label: 'Changelog', icon: History },
          { id: 'health', label: 'System Health', icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'profile' | 'preferences' | 'organization' | 'access' | 'changelog' | 'health')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">User Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input type="text" defaultValue={currentUser.name} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Initials</label>
                <input type="text" defaultValue={currentUser.initials} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <input type="text" defaultValue={currentUser.role} disabled className="mt-1 block w-full rounded-md border-slate-300 bg-slate-50 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Job Position</label>
                <input type="text" defaultValue={currentUser.job_position} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Changes</button>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">App Preferences</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Enable High Contrast Mode</span>
              <button 
                onClick={() => setHighContrast(!highContrast)}
                className={`w-12 h-6 rounded-full transition-colors ${highContrast ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${highContrast ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Compact Table View</span>
              <button 
                onClick={() => setCompactTable(!compactTable)}
                className={`w-12 h-6 rounded-full transition-colors ${compactTable ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${compactTable ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'organization' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Organisation Details</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Organisation Name</label>
                <input type="text" defaultValue={orgProfile.name} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Logo URL</label>
                <input type="text" defaultValue={orgProfile.logo_url} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Organisation</button>
          </div>
        )}

        {activeTab === 'access' && <AccessControl />}
        {activeTab === 'changelog' && <Changelog />}
        {activeTab === 'health' && <SystemHealth />}
      </div>
    </div>
  );
};

export default Settings;
