import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ShieldCheck, Users, FileText, Brain, 
  Database, List, Building, Bug,
  History, Activity
} from 'lucide-react';
import AccessControl from './tabs/AccessControl';
import Directory from './tabs/Directory';
import ZLADocuments from './tabs/ZLADocuments';
import Intelligence from './tabs/Intelligence';
import Migration from './tabs/Migration';
import OperationalLists from './tabs/OperationalLists';
import OrgProfile from './tabs/OrgProfile';
import SystemHealth from './tabs/SystemHealth';
import BugReports from './tabs/BugReports';
import Changelog from './tabs/Changelog';
import { usePermissions } from '../../hooks/usePermissions';

type TabType = 'access' | 'directory' | 'zla' | 'intelligence' | 'migration' | 'lists' | 'org' | 'health' | 'bugs' | 'changelog';

const SettingsLayout: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const activeTab = (tab as TabType) || 'org';

  const tabs: { id: TabType; label: string; icon: React.ElementType; permission?: keyof typeof permissions }[] = [
    { id: 'access', label: 'Access Control', icon: ShieldCheck, permission: 'manage_roles' },
    { id: 'directory', label: 'Directory', icon: Users, permission: 'manage_users' },
    { id: 'zla', label: 'ZLA Documents', icon: FileText, permission: 'manage_zla_documents' },
    { id: 'intelligence', label: 'Intelligence', icon: Brain, permission: 'view_settings' },
    { id: 'migration', label: 'Migration', icon: Database, permission: 'view_settings' },
    { id: 'lists', label: 'Operational Lists', icon: List, permission: 'view_settings' },
    { id: 'org', label: 'Organisation Profile', icon: Building, permission: 'view_settings' },
    { id: 'health', label: 'System Health', icon: Activity, permission: 'view_settings' },
    { id: 'bugs', label: 'Bug Reports', icon: Bug, permission: 'manage_incidents' },
    { id: 'changelog', label: 'Changelog', icon: History, permission: 'view_settings' },
  ];

  const visibleTabs = tabs.filter(t => !t.permission || permissions[t.permission]);

  // Ensure the active tab is valid and permitted
  useEffect(() => {
    if (tab && !visibleTabs.find(t => t.id === tab)) {
      navigate('/settings/org', { replace: true });
    }
  }, [tab, visibleTabs, navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'access': return <AccessControl />;
      case 'directory': return <Directory />;
      case 'zla': return <ZLADocuments />;
      case 'intelligence': return <Intelligence />;
      case 'migration': return <Migration />;
      case 'lists': return <OperationalLists />;
      case 'org': return <OrgProfile />;
      case 'health': return <SystemHealth />;
      case 'bugs': return <BugReports />;
      case 'changelog': return <Changelog />;
      default: return <OrgProfile />;
    }
  };

  return (
    <div className="p-2 md:p-4 max-w-[1920px] mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
      <div className="flex gap-6">
        <nav className="w-64 space-y-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/settings/${t.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t.id 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </nav>
        <main className="flex-1 bg-slate-50 p-2 md:p-4 rounded-2xl border border-slate-200">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;
