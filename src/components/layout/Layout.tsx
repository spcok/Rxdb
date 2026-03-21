import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, ListTodo, Map, CloudSun, CalendarDays,
  ArrowLeftRight, ShieldAlert, Stethoscope, Heart, Wrench,
  AlertOctagon, Clock, Settings as SettingsIcon, LogOut, Menu, Power, X,
  ChevronLeft, ChevronRight,
  HelpCircle, FileText, Calendar, ClipboardCheck, Wifi, WifiOff, ShieldCheck,
  ZoomIn, ZoomOut, Utensils
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppData } from '../../context/Context';
import { useOrgSettings } from '../../features/settings/useOrgSettings';
import GlobalBugReporter from '../ui/GlobalBugReporter';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { processSyncQueue } from '../../lib/syncEngine';
import { UpdateBanner } from './UpdateBanner';
import { InstallButton } from '../ui/InstallButton';

interface LayoutProps {
  fontScale?: number;
  setFontScale?: (scale: number) => void;
}

const NavItem = ({ to, icon: Icon, label, permission, isSidebarCollapsed, setIsMobileMenuOpen }: { 
  to: string, 
  icon: React.ElementType, 
  label: string, 
  permission: boolean,
  isSidebarCollapsed: boolean,
  setIsMobileMenuOpen: (open: boolean) => void
}) => {
  if (!permission) return null;
  return (
    <NavLink
      to={to}
      onClick={() => setIsMobileMenuOpen(false)}
      title={isSidebarCollapsed ? String(label) : ''}
      className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 transition-all duration-200 group relative w-full ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-r-4 border-transparent'
      } ${isSidebarCollapsed ? 'justify-center px-0 border-r-0' : ''}`}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} className={`transition-colors shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
          {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden text-sm font-medium">{String(label)}</span>}
          {isSidebarCollapsed && isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l"></div>}
        </>
      )}
    </NavLink>
  );
};

const SectionHeader = ({ title, isSidebarCollapsed }: { title: string, isSidebarCollapsed: boolean }) => {
  if (isSidebarCollapsed) return <div className="h-4"></div>;
  return (
    <div className="px-6 pt-6 pb-2 text-left">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{String(title)}</p>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = () => {
  const { currentUser, logout } = useAuthStore();
  const permissions = usePermissions();
  const { 
    view_daily_logs, view_tasks, view_medical, view_movements, 
    view_daily_rounds, view_maintenance, view_incidents, 
    view_first_aid, view_safety_drills, submit_timesheets, 
    request_holidays, view_missing_records, generate_reports, 
    view_settings 
  } = permissions;
  const { activeShift, clockIn, clockOut } = useAppData();
  const { settings: orgSettings } = useOrgSettings();
  const { isOnline } = useNetworkStatus();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌍 Network restored. Firing sync queue...');
      processSyncQueue();
    };
    window.addEventListener('online', handleOnline);
    // Also run once on initial load if online
    if (navigator.onLine) processSyncQueue();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    let isAllowed = true;

    if (path.startsWith('/medical') && !view_medical) isAllowed = false;
    else if (path.startsWith('/daily-log') && !view_daily_logs) isAllowed = false;
    else if (path.startsWith('/tasks') && !view_tasks) isAllowed = false;
    else if (path.startsWith('/daily-rounds') && !view_daily_rounds) isAllowed = false;
    else if (path.startsWith('/movements') && !view_movements) isAllowed = false;
    else if (path.startsWith('/maintenance') && !view_maintenance) isAllowed = false;
    else if (path.startsWith('/incidents') && !view_incidents) isAllowed = false;
    else if (path.startsWith('/first-aid') && !view_first_aid) isAllowed = false;
    else if (path.startsWith('/safety-drills') && !view_safety_drills) isAllowed = false;
    else if (path.startsWith('/timesheets') && !submit_timesheets) isAllowed = false;
    else if (path.startsWith('/holidays') && !request_holidays) isAllowed = false;
    else if (path.startsWith('/compliance') && !view_missing_records) isAllowed = false;
    else if (path.startsWith('/reports') && !generate_reports) isAllowed = false;
    else if (path.startsWith('/settings') && !view_settings) isAllowed = false;

    if (!isAllowed) {
      console.warn('🛠️ [Security QA] Unauthorized route access blocked.');
      alert('Unauthorized Access');
      navigate('/', { replace: true });
    }
  }, [
    location.pathname, navigate, view_medical, view_daily_logs, view_tasks, 
    view_daily_rounds, view_movements, view_maintenance, view_incidents, 
    view_first_aid, view_safety_drills, submit_timesheets, request_holidays, 
    view_missing_records, generate_reports, view_settings
  ]);

  const increaseTextSize = () => {
    const sizes: ('small' | 'medium' | 'large' | 'xlarge')[] = ['small', 'medium', 'large', 'xlarge'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex < sizes.length - 1) setFontSize(sizes[currentIndex + 1]);
  };

  const decreaseTextSize = () => {
    const sizes: ('small' | 'medium' | 'large' | 'xlarge')[] = ['small', 'medium', 'large', 'xlarge'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex > 0) setFontSize(sizes[currentIndex - 1]);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'small') root.style.fontSize = '14px';
    else if (fontSize === 'large') root.style.fontSize = '18px';
    else if (fontSize === 'xlarge') root.style.fontSize = '20px';
    else root.style.fontSize = '16px';
  }, [fontSize]);

  const handleLogout = async () => {
    logout();
  }

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-[#1c1c1e] text-slate-300 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} no-print shadow-xl md:shadow-none`}>
      <div className={`h-14 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-slate-800`}>
        {!isSidebarCollapsed && <span className="font-bold text-white tracking-tight">KOA Manager</span>}
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 overflow-hidden shrink-0">
          {orgSettings?.logo_url ? (
            <img 
              src={orgSettings.logo_url} 
              alt="Logo" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <ShieldCheck size={20} className="text-emerald-500" />
          )}
        </div>
      </div>
      <div className={`px-4 py-2 border-b border-slate-800/50 flex items-center gap-2 ${!isOnline ? 'bg-rose-900/20' : 'bg-emerald-900/10'}`}>
        {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}
        {!isSidebarCollapsed && (
          <span className={`text-[9px] font-black uppercase tracking-widest ${!isOnline ? 'text-rose-500' : 'text-emerald-500/70'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <SectionHeader title="Main Menu" isSidebarCollapsed={isSidebarCollapsed} />
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" permission={true} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/weather" icon={CloudSun} label="Weather" permission={true} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/daily-log" icon={ClipboardList} label="Daily Log" permission={view_daily_logs} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/daily-rounds" icon={ClipboardCheck} label="Daily Rounds" permission={view_daily_rounds} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/tasks" icon={ListTodo} label="To-Do List" permission={view_tasks} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/feeding-schedule" icon={Utensils} label="Feeding Schedule" permission={true} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <SectionHeader title="Animal Care" isSidebarCollapsed={isSidebarCollapsed} />
        <NavItem to="/medical" icon={Stethoscope} label="Medical Records" permission={view_medical} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/movements" icon={ArrowLeftRight} label="Movements" permission={view_movements} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/flight-records" icon={Map} label="Flight Records" permission={true} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <SectionHeader title="Site & Safety" isSidebarCollapsed={isSidebarCollapsed} />
        <NavItem to="/maintenance" icon={Wrench} label="Site Maintenance" permission={view_maintenance} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/incidents" icon={ShieldAlert} label="Incident Reports" permission={view_incidents} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/first-aid" icon={Heart} label="First Aid Log" permission={view_first_aid} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/safety-drills" icon={AlertOctagon} label="Safety Drills" permission={view_safety_drills} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <SectionHeader title="Staff" isSidebarCollapsed={isSidebarCollapsed} />
        <NavItem to="/timesheets" icon={Clock} label="Time Sheets" permission={submit_timesheets} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/holidays" icon={Calendar} label="Holiday Registry" permission={request_holidays} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/rota" icon={CalendarDays} label="Staff Rota" permission={true} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <SectionHeader title="Compliance" isSidebarCollapsed={isSidebarCollapsed} />
        <NavItem to="/compliance" icon={ShieldCheck} label="ZLA Compliance" permission={view_missing_records} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/reports" icon={FileText} label="Reports" permission={generate_reports} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <SectionHeader title="System" isSidebarCollapsed={isSidebarCollapsed} />
        <NavItem to="/settings" icon={SettingsIcon} label="Settings" permission={view_settings} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <NavItem to="/help" icon={HelpCircle} label="Help & Support" permission={true} isSidebarCollapsed={isSidebarCollapsed} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        {/* Text Size Controls */}
        <div className={`px-4 py-4 mt-4 border-t border-slate-800/30 ${isSidebarCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between'}`}>
          {!isSidebarCollapsed && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Text Size</span>}
          <div className="flex items-center gap-1">
            <button 
              onClick={decreaseTextSize} 
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Decrease Text Size"
            >
              <ZoomOut size={14} />
            </button>
            <button 
              onClick={increaseTextSize} 
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Increase Text Size"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-slate-800/50 bg-[#18181a]">
        {!isSidebarCollapsed ? (
          <>
            <div className="mb-4 hidden md:flex justify-center">
              <InstallButton />
            </div>
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs text-white border border-slate-600 shrink-0">
                {String(currentUser?.initials || '--')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate text-left">{String(currentUser?.name || 'Unknown')}</p>
                <p className="text-[9px] font-black text-emerald-500 truncate uppercase tracking-widest text-left">{String(currentUser?.job_position || currentUser?.role || 'Guest')}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors"><LogOut size={16}/></button>
            </div>
            {activeShift ? (
              <button onClick={() => { console.log('Clock Out clicked'); clockOut(); }} className="w-full bg-amber-500/10 border border-amber-500/50 text-amber-500 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all">
                <Power size={14}/> CLOCK OUT
              </button>
            ) : (
              <button onClick={() => { console.log('Clock In clicked'); clockIn(currentUser?.initials || ''); }} className="w-full bg-emerald-600 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">
                <Clock size={14}/> START SHIFT
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="hidden md:flex">
              <InstallButton />
            </div>
            <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Logout">
              <LogOut size={16}/>
            </button>
            {activeShift ? (
              <button onClick={() => { console.log('Clock Out clicked'); clockOut(); }} className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center hover:bg-amber-500/30 transition-colors" title="Clock Out">
                <Power size={16}/>
              </button>
            ) : (
              <button onClick={() => { console.log('Clock In clicked'); clockIn(currentUser?.initials || ''); }} className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors" title="Clock In">
                <Clock size={16}/>
              </button>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="w-full h-8 bg-[#151516] flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors border-t border-slate-800"
      >
        {isSidebarCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-900">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[70] md:hidden backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-[80] transform transition-all duration-300 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        <div className="relative h-full">
          {/* Mobile Close Button */}
          {isMobileMenuOpen && (
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 -right-12 p-2 bg-slate-900 text-white rounded-lg md:hidden shadow-xl"
            >
              <X size={20} />
            </button>
          )}
          {sidebarContent}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-x-hidden print:overflow-visible">
        {/* Update Banner */}
        <UpdateBanner />

        {/* Mobile Top Navbar */}
        <header className="md:hidden h-16 bg-[#1c1c1e] border-b border-slate-800 flex items-center justify-between px-4 z-50 no-print shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="text-slate-300 p-2 -ml-2 hover:bg-slate-800 rounded-lg transition-colors active:scale-90"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 overflow-hidden shrink-0">
                {orgSettings?.logo_url ? (
                  <img 
                    src={orgSettings.logo_url} 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <ShieldCheck size={20} className="text-emerald-500" />
                )}
              </div>
              <span className="text-sm font-bold text-white tracking-tight uppercase">KOA Manager</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <InstallButton />
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center font-black text-[10px] text-white border border-slate-600 shadow-inner">
              {String(currentUser?.initials || '--')}
            </div>
          </div>
        </header>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-900 z-[60] flex items-center justify-center gap-2 py-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] shrink-0 text-center">
            <WifiOff size={12} />
            Offline Mode: Changes will be saved locally.
          </div>
        )}

        {/* Content Area - STRICT ENTERPRISE FRAME */}
        <div className="flex-1 overflow-y-auto bg-slate-200 print:bg-white print:overflow-visible p-2 md:p-4 pb-24 md:pb-6 lg:pb-8 w-full">
          <Outlet context={{ isSidebarCollapsed }} />
        </div>
      </main>
      <GlobalBugReporter />
    </div>
  );
};

export default Layout;
