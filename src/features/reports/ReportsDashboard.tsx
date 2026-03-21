import React, { useState, useRef } from 'react';
import { 
  CalendarDays, 
  ListOrdered, 
  CheckSquare, 
  AlertTriangle, 
  ArrowRightLeft, 
  Download,
  Loader2,
  FileText,
  ChevronRight,
  Scale,
  Eye,
  Wrench
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { db } from '../../lib/db';
import { useHybridQuery } from '../../lib/dataEngine';
import { Animal, UserRole, Shift } from '../../types';
import { generateDailyLogDocx, generateInternalMovementsDocx, generateExternalTransfersDocx, generateSiteMaintenanceDocx, generateAnimalCensusDocx, generateSection9Docx, generateDeathCertificateDocx, generateStaffRotaDocx, generateInspectionPackage } from './utils/docxExportService';
import { useAuthStore } from '../../store/authStore';

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  exportFn: () => Promise<boolean>;
  columns: string[];
  category?: string;
}

const REPORTS: ReportDefinition[] = [
  {
    id: 'husbandry',
    title: 'Daily log',
    description: 'Export daily feeding, cleaning, and observation records.',
    icon: CalendarDays,
    exportFn: async () => { return true; },
    columns: ['Date', 'Animal ID', 'Log Type', 'Notes', 'Recorded By']
  },
  {
    id: 'internal_movements',
    title: 'Internal Movements Ledger',
    description: 'Log of all internal enclosure changes',
    category: 'facility',
    icon: ArrowRightLeft,
    exportFn: async () => { return true; },
    columns: ['Date', 'Animal', 'Species', 'From', 'To', 'Reason/Notes', 'Initials']
  },
  {
    id: 'external_transfers',
    title: 'External Transfers Ledger',
    description: 'Log of all acquisitions, loans, transfers, and deaths',
    category: 'facility',
    icon: ArrowRightLeft,
    exportFn: async () => { return true; },
    columns: ['Date', 'Animal', 'Species', 'Transfer Type', 'Origin / Destination', 'Notes', 'Initials']
  },
  {
    id: 'site_maintenance',
    title: 'Site Maintenance Ledger',
    description: 'Log of all site maintenance tasks, repairs, and statuses',
    category: 'facility',
    icon: Wrench,
    exportFn: async () => { return true; },
    columns: ['Date', 'Task / Title', 'Description', 'Priority', 'Status', 'Assigned / Initials']
  },
  {
    id: 'census',
    title: 'Annual Census',
    description: 'Complete inventory of all animals currently on site.',
    icon: ListOrdered,
    exportFn: async () => { return true; },
    columns: ['Name', 'Species', 'Category', 'Sex', 'Location']
  },
  {
    id: 'stocklist',
    title: 'Stock List (Section 9)',
    description: 'Statutory stocklist showing population changes over time.',
    icon: ArrowRightLeft,
    exportFn: async () => { return true; },
    columns: ['Species', 'Start Count', 'Births', 'Arrivals', 'Deaths', 'Departures', 'End Count']
  },
  {
    id: 'rounds',
    title: 'Rounds Checklist',
    description: 'Verification of completed daily operational rounds.',
    icon: CheckSquare,
    exportFn: async () => { return true; },
    columns: ['Date', 'Shift', 'Status', 'Completed By', 'Notes']
  },
  {
    id: 'incidents',
    title: 'Incident Log',
    description: 'Log of recorded operational and safety incidents.',
    icon: AlertTriangle,
    exportFn: async () => { return true; },
    columns: ['Date', 'Type', 'Severity', 'Description', 'Reported By']
  },
  {
    id: 'weight',
    title: 'Weight History',
    description: 'Historical weight records for all animals.',
    icon: Scale,
    exportFn: async () => { return true; },
    columns: ['Date', 'Animal', 'Weight', 'Change', 'Staff']
  },
  {
    id: 'death_certificate',
    title: 'Death Certificate',
    description: 'Generate a formal death certificate for a deceased animal.',
    icon: FileText,
    exportFn: async () => { return true; },
    columns: ['Name', 'Species', 'Date of Death']
  },
  {
    id: 'staff_rota',
    title: 'Staff Rota Schedule',
    description: 'Export scheduled staff shifts, times, and coverage areas.',
    icon: CalendarDays,
    exportFn: async () => { return true; },
    columns: ['Date', 'Staff Member', 'Role', 'Shift Type', 'Times', 'Assigned Area']
  },
  {
    id: 'inspection_package',
    title: 'Inspection Package',
    description: 'Comprehensive package including medical logs, MAR charts, and maintenance logs.',
    icon: FileText,
    exportFn: async () => { return true; },
    columns: ['Section', 'Details']
  }
];

export default function ReportsDashboard() {
  const [activeReportId, setActiveReportId] = useState('husbandry');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [rotaPeriod, setRotaPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Auto-calculate End Date based on the selected Rota Period
  React.useEffect(() => {
    if (activeReportId === 'staff_rota') {
      const start = new Date(startDate);
      const end = new Date(startDate);
      
      if (rotaPeriod === 'daily') {
        // End date is the same as start date
      } else if (rotaPeriod === 'weekly') {
        end.setDate(start.getDate() + 6);
      } else if (rotaPeriod === 'monthly') {
        end.setMonth(start.getMonth() + 1);
        end.setDate(end.getDate() - 1);
      }
      
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate, rotaPeriod, activeReportId]);
  
  const animals = useHybridQuery<Animal[]>('animals', () => db.animals.toArray(), []);
  const archivedAnimals = useHybridQuery<Animal[]>('archived_animals', () => db.archived_animals.toArray(), []);
  const rawShifts = useHybridQuery<Shift[]>('shifts', () => db.table('shifts').toArray(), []);
  const { currentUser } = useAuthStore();

  const uniqueSections = activeReportId === 'staff_rota'
    ? Object.values(UserRole)
    : Array.from(new Set((animals || []).map(a => (a as unknown as Record<string, string>).section || a.category).filter(Boolean))).sort();

  // Preview State
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const activeReport = REPORTS.find(r => r.id === activeReportId) || REPORTS[0];

  const generatePreview = async () => {
    setIsGenerating(true);
    setPreviewBlob(null);
    setError(null);

    try {
      const animalSectionMap = new Map(
        (animals || []).map(a => [a.id, (a as unknown as Record<string, string>).section || a.category])
      );
      const dynamicTitle = selectedSection ? `${activeReport.title} - ${selectedSection}` : activeReport.title;

      if (activeReportId === 'husbandry') {
        const dates = [];
        const currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);
        while (currentDate <= endDateObj) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const rawLogs = await db.daily_logs
          .where('log_date')
          .between(startDate, new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString(), true, true)
          .toArray();

        const logs = rawLogs.filter(log => {
          if (!selectedSection) return true;
          return animalSectionMap.get(log.animal_id) === selectedSection;
        });

        const blob = await generateDailyLogDocx(
          animals || [], 
          logs, 
          startDate, 
          endDate, 
          selectedSection || 'ALL', 
          orientation,
          {
            reportName: dynamicTitle,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          }
        );
        setPreviewBlob(blob);
        
        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'internal_movements') {
        const rawData = await db.internal_movements
          .where('log_date')
          .between(startDate, new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString(), true, true)
          .toArray();
          
        const filteredMovements = rawData.filter(m => {
          if (!selectedSection) return true;
          return animalSectionMap.get(m.animal_id) === selectedSection;
        });
        
        const sortedData = [...filteredMovements].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
        
        const blob = await generateInternalMovementsDocx(
          sortedData,
          animals || [],
          {
            reportName: dynamicTitle,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          }
        );
        setPreviewBlob(blob);
        
        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'external_transfers') {
        const rawData = await db.external_transfers
          .where('date')
          .between(startDate, endDate, true, true)
          .toArray();
          
        const filteredTransfers = rawData.filter(m => {
          if (!selectedSection) return true;
          return animalSectionMap.get(m.animal_id) === selectedSection;
        });
        
        const sortedData = [...filteredTransfers].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const blob = await generateExternalTransfersDocx(
          sortedData,
          animals || [],
          {
            reportName: dynamicTitle,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          }
        );
        setPreviewBlob(blob);
        
        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'site_maintenance') {
        const rawData = await db.maintenance_logs
          .where('date_logged')
          .between(startDate, endDate, true, true)
          .toArray();
        const sortedData = [...rawData].sort((a, b) => new Date(a.date_logged).getTime() - new Date(b.date_logged).getTime());
        
        const blob = await generateSiteMaintenanceDocx(
          sortedData,
          {
            reportName: activeReport.title,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          },
          orientation
        );
        setPreviewBlob(blob);
        
        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'census') {
        const allAnimals = (animals || []);
        const linkedChildIds = new Set(allAnimals.filter(a => a.parent_mob_id).map(a => a.id));

        const activeAnimals = allAnimals.filter(a => {
          const isActive = a.disposition_status !== 'Deceased' && 
                           a.disposition_status !== 'Transferred' && 
                           !a.archived;
          const matchesSection = selectedSection ? ((a as unknown as Record<string, string>).section === selectedSection || a.category === selectedSection) : true;
          return isActive && matchesSection && !linkedChildIds.has(a.id);
        });

        const tableData = activeAnimals.map(animal => {
          const count = animal.entity_type === 'GROUP' ? (animal.census_count || 0) : 1;
          const name = animal.entity_type === 'GROUP' ? `${animal.name || '--'} (Count: ${count})` : (animal.name || '--');
          return [
            name,
            animal.species || '--',
            animal.latin_name || '--',
            animal.sex || '--',
            animal.ring_number || (animal as unknown as Record<string, string>).id_number || '--',
            animal.location || (animal as unknown as Record<string, string>).enclosure || '--',
            animal.disposition_status || 'Active'
          ];
        });

        const blob = await generateAnimalCensusDocx(
          tableData,
          {
            reportName: dynamicTitle,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          },
          orientation
        );
        setPreviewBlob(blob);
        
        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'stocklist') {
        const speciesMap = new Map<string, {
          startCount: number;
          births: number;
          arrivals: number;
          deaths: number;
          departures: number;
          endCount: number;
        }>();

        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        // Add one day to end date to include the whole day
        const endInclusive = end + 24 * 60 * 60 * 1000 - 1;

        // Combine both arrays to ensure historical accuracy
        const allAnimals = [...(animals || []), ...(archivedAnimals || [])];

        // NEW: Hybrid Counting Logic
        const linkedChildIds = new Set(allAnimals.filter(a => a.parent_mob_id).map(a => a.id));

        allAnimals.forEach(animal => {
          if (selectedSection && animalSectionMap.get(animal.id) !== selectedSection) return;
          
          // NEW: Skip linked children
          if (linkedChildIds.has(animal.id)) return;

          // NEW: Calculate count
          const count = animal.entity_type === 'GROUP' ? (animal.census_count || 0) : 1;

          const species = animal.species || 'Unknown Species';
          if (!speciesMap.has(species)) {
            speciesMap.set(species, { startCount: 0, births: 0, arrivals: 0, deaths: 0, departures: 0, endCount: 0 });
          }
          const stats = speciesMap.get(species)!;

          const acqDate = animal.acquisition_date ? new Date(animal.acquisition_date).getTime() : 0;
          const dispDate = animal.transfer_date ? new Date(animal.transfer_date).getTime() : Infinity;

          if (acqDate < start && dispDate >= start) {
            stats.startCount += count;
          }

          if (acqDate >= start && acqDate <= endInclusive) {
            if (animal.acquisition_type === 'BORN') {
              stats.births += count;
            } else {
              stats.arrivals += count;
            }
          }

          if (dispDate >= start && dispDate <= endInclusive) {
            if (animal.disposition_status === 'Deceased') {
              stats.deaths += count;
            } else {
              stats.departures += count;
            }
          }

          if (acqDate <= endInclusive && dispDate > endInclusive) {
            stats.endCount += count;
          }
        });

        const tableData = Array.from(speciesMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([species, stats]) => [
            species,
            stats.startCount.toString(),
            stats.births.toString(),
            stats.arrivals.toString(),
            stats.deaths.toString(),
            stats.departures.toString(),
            stats.endCount.toString()
          ]);

        const blob = await generateSection9Docx(
          tableData,
          {
            reportName: dynamicTitle,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          },
          orientation
        );
        setPreviewBlob(blob);
        
        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'death_certificate') {
        const animal = (archivedAnimals || []).find(a => a.id === selectedSection);
        if (!animal) throw new Error('Animal not found');
        
        const blob = await generateDeathCertificateDocx(
          animal,
          {
            reportName: dynamicTitle,
            startDate: '',
            endDate: '',
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          }
        );
        setPreviewBlob(blob);
        
        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'staff_rota') {
        const filteredShifts = (rawShifts || []).filter(shift => {
          // 1. Filter by Date
          const sDate = new Date(shift.date).getTime();
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).setHours(23, 59, 59, 999);
          if (sDate < start || sDate > end) return false;

          // 2. Filter by Role (using selectedSection state)
          if (selectedSection && shift.user_role !== selectedSection) return false;

          return true;
        });

        const blob = await generateStaffRotaDocx(
          filteredShifts,
          {
            reportName: dynamicTitle,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'STAFF'
          },
          orientation
        );
        setPreviewBlob(blob);

        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      } else if (activeReportId === 'inspection_package') {
        const medicalLogs = await db.medical_logs
          .where('date')
          .between(startDate, endDate, true, true)
          .toArray();
        const marCharts = await db.mar_charts
          .where('start_date')
          .between(startDate, endDate, true, true)
          .toArray();
        const maintenanceLogs = await db.maintenance_logs
          .where('date_logged')
          .between(startDate, endDate, true, true)
          .toArray();

        const blob = await generateInspectionPackage(
          medicalLogs,
          marCharts,
          maintenanceLogs,
          animals || [],
          {
            reportName: dynamicTitle,
            startDate,
            endDate,
            generatedBy: currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'STAFF'
          }
        );
        setPreviewBlob(blob);

        if (previewContainerRef.current) {
          await renderAsync(blob, previewContainerRef.current, undefined, {
            className: 'docx-preview-page',
            inWrapper: true,
          });
        }
        return;
      }
      // ... handle other reports ...
    } catch (err) {
      console.error("Failed to generate preview:", err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (previewBlob) {
      const url = URL.createObjectURL(previewBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeReport.title.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 print:hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Reports</h2>
          </div>
          <p className="text-sm font-medium text-slate-500">Select report type</p>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          {REPORTS.map((report) => (
            <button
              key={report.id}
              onClick={() => {
                setActiveReportId(report.id);
                setPreviewBlob(null);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                activeReportId === report.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-sm font-medium">
                {report.title}
              </span>
              {activeReportId === report.id && (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col overflow-hidden space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {activeReport.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{activeReport.description}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm print:hidden">
          <div className="flex flex-wrap items-end gap-4">
            {activeReport?.id !== 'site_maintenance' && activeReport?.id !== 'death_certificate' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {activeReport?.id !== 'staff_rota' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                    <select 
                      value={rotaPeriod} 
                      onChange={(e) => setRotaPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Orientation</label>
              <select 
                value={orientation} 
                onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {activeReport?.id !== 'site_maintenance' && activeReport?.id !== 'death_certificate' && uniqueSections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {activeReportId === 'staff_rota' ? 'Filter by Role' : 'Animal Section'}
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{activeReportId === 'staff_rota' ? 'All Roles' : 'All Sections'}</option>
                  {uniqueSections.map(section => (
                    <option key={section as string} value={section as string}>{section as string}</option>
                  ))}
                </select>
              </div>
            )}

            {activeReport?.id === 'death_certificate' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Animal</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an animal...</option>
                  {(archivedAnimals || []).filter(a => a.archive_type === 'Death').map(animal => (
                    <option key={animal.id} value={animal.id}>{animal.name} ({animal.species})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={generatePreview}
              disabled={isGenerating}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 h-[38px]"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Generate Preview
            </button>
            <button
              onClick={handleDownload}
              disabled={!previewBlob}
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 h-[38px]"
            >
              <Download className="w-4 h-4" />
              Download Report (.docx)
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 bg-slate-200 rounded hover:bg-slate-300">-</button>
              <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 bg-slate-200 rounded hover:bg-slate-300">+</button>
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col p-4 overflow-hidden">
          {/* Preview Pane */}
          <div className="flex-grow flex flex-col overflow-hidden bg-slate-100/50 rounded-xl border border-slate-200">
            {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}
            {/* DOCX Preview Container */}
            <div style={{ zoom: zoom }} className="bg-white min-h-[600px] shadow-inner">
              <div ref={previewContainerRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
