import React, { useState, useMemo } from 'react';
import { Plus, X, AlertCircle, CheckCircle2, Clock, Search, Trash2, Edit2, History, Lock } from 'lucide-react';
import { useMaintenanceData } from '../useMaintenanceData';
import { MaintenanceLog } from '../../../types';
import { usePermissions } from '../../../hooks/usePermissions';

const SiteMaintenance: React.FC = () => {
  const { view_maintenance } = usePermissions();
  const { logs, addLog, updateLog, deleteLog } = useMaintenanceData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);

  const [formEnclosureId, setFormEnclosureId] = useState('');
  const [formTaskType, setFormTaskType] = useState<'UV Replacement' | 'Structural Repair' | 'General'>('General');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<'Pending' | 'Completed'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Pending' | 'Completed'>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.enclosure_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'ALL' || log.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [logs, searchTerm, filterStatus]);

  if (!view_maintenance) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Site Maintenance. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const openModal = (log?: MaintenanceLog) => {
    if (log) {
      setEditingLog(log);
      setFormEnclosureId(log.enclosure_id);
      setFormTaskType(log.task_type);
      setFormDesc(log.description);
      setFormStatus(log.status);
    } else {
      setEditingLog(null);
      setFormEnclosureId('');
      setFormTaskType('General');
      setFormDesc('');
      setFormStatus('Pending');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const logData = {
      enclosure_id: formEnclosureId,
      task_type: formTaskType,
      description: formDesc,
      status: formStatus,
      date_logged: editingLog ? editingLog.date_logged : new Date().toISOString(),
    };

    if (editingLog) {
      await updateLog({ ...editingLog, ...logData });
    } else {
      await addLog(logData);
    }
    setIsModalOpen(false);
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Site Maintenance</h1>
          <p className="text-sm text-slate-500 mt-1">Work orders, repairs, and site safety logs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search orders..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus size={16}/> New Work Order
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'ALL', label: 'All Tasks' },
          { id: 'Pending', label: 'Pending' },
          { id: 'Completed', label: 'Completed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id as 'ALL' | 'Pending' | 'Completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filterStatus === tab.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLogs.length > 0 ? filteredLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200`}>
                    {log.task_type}
                  </span>
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    {log.status === 'Completed' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-slate-400" />} {log.status}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                  {log.enclosure_id}
                </h3>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal(log)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><Edit2 size={16}/></button>
                <button onClick={() => deleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={16}/></button>
              </div>
            </div>
            
            <div className="p-5 flex-1 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                {log.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {new Date(log.date_logged).toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-xl">
              {log.status !== 'Completed' && (
                <button 
                  onClick={() => updateLog({ ...log, status: 'Completed', date_completed: new Date().toISOString() })}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-2 py-1 hover:bg-emerald-50 rounded transition-colors"
                >
                  <CheckCircle2 size={14}/> Mark Completed
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-16 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
            <History size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-sm">No Active Work Orders</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingLog ? 'Update Work Order' : 'New Work Order'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enclosure ID</label>
                  <input required value={formEnclosureId} onChange={e => setFormEnclosureId(e.target.value)} className={inputClass} placeholder="e.g. Lion Enclosure North"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Task Type</label>
                  <select value={formTaskType} onChange={e => setFormTaskType(e.target.value as 'UV Replacement' | 'Structural Repair' | 'General')} className={inputClass}>
                    <option value="General">General</option>
                    <option value="UV Replacement">UV Replacement</option>
                    <option value="Structural Repair">Structural Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as 'Pending' | 'Completed')} className={inputClass}>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea 
                    required 
                    value={formDesc} 
                    onChange={e => setFormDesc(e.target.value)} 
                    className={`${inputClass} h-24 resize-none`} 
                    placeholder="Detailed description of the issue..."
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                  {editingLog ? <Edit2 size={16}/> : <Plus size={16}/>}
                  {editingLog ? 'Update Order' : 'Submit Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteMaintenance;
