import React, { useState } from 'react';
import { Task, Animal, LogType, User } from '../../types';
import { 
    Plus, Calendar, User as UserIcon, 
    AlertCircle, ListTodo, X, Check, UserCheck, Loader2, Search
} from 'lucide-react';
import AddEntryModal from './AddEntryModal';
import { useTaskData } from './useTaskData';

import { usePermissions } from '../../hooks/usePermissions';
import { Lock } from 'lucide-react';

const Tasks: React.FC = () => {
  const { view_tasks } = usePermissions();
  const { 
    tasks, animals, users, isLoading, filter, setFilter, 
    searchTerm, setSearchTerm, addTask, toggleTaskCompletion, currentUser 
  } = useTaskData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAnimalForEntry, setSelectedAnimalForEntry] = useState<Animal | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  // Form State for new task
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<LogType>(LogType.GENERAL);
  const [newAnimalId, setNewAnimalId] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAssignedTo, setNewAssignedTo] = useState(currentUser?.id || '');

  if (!view_tasks) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center gap-4 max-w-md text-center">
          <div className="p-3 bg-rose-50 rounded-full">
            <Lock size={32} className="text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-slate-600">You do not have permission to view the Duty Rota. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleTaskClick = (task: Task) => {
      if (task.completed) {
          toggleTaskCompletion(task);
          return;
      }
      if (task.type === LogType.HEALTH && task.animal_id) {
          const animal = animals.find(a => a.id === task.animal_id);
          if (animal) { 
              setCompletingTask(task);
              setSelectedAnimalForEntry(animal as Animal);
              setShowEntryModal(true);
              return;
          }
      }
      toggleTaskCompletion(task);
  };

  const handleCreateTask = (e: React.FormEvent) => {
      e.preventDefault();
      addTask({
          title: newTitle,
          type: newType,
          animal_id: newAnimalId || undefined,
          due_date: newDueDate,
          recurring: false,
          assigned_to: newAssignedTo || undefined,
          completed: false
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewAnimalId('');
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400";

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <ListTodo className="text-blue-600" size={24} /> Duty Rota
                </h1>
                <p className="text-sm text-slate-500 mt-1">Section Care Tasks & Assignments</p>
             </div>
             <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search duties..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button 
                    onClick={() => setShowAddModal(true)} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> Add Duty
                </button>
             </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto self-start inline-flex">
            {[
                { id: 'assigned', label: 'My Tasks' },
                { id: 'pending', label: 'All Tasks' },
                { id: 'completed', label: 'Completed' }
            ].map(f => (
                <button 
                    key={f.id} 
                    onClick={() => setFilter(f.id as 'assigned' | 'pending' | 'completed')} 
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {f.label}
                </button>
            ))}
        </div>

        <div className="space-y-4 pb-24">
            {tasks && tasks.length > 0 ? tasks.map((task: Task) => {
                const animal = animals.find(a => a.id === task.animal_id);
                const isOverdue = !task.completed && task.due_date && task.due_date < new Date().toISOString().split('T')[0];
                const assignedUser = users?.find((u: User) => u.id === task.assigned_to);

                return (
                    <div key={task.id} className={`bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm transition-all flex items-center gap-4 ${task.completed ? 'opacity-60' : ''}`}>
                        <button 
                          onClick={() => handleTaskClick(task)} 
                          className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-blue-500'}`}
                        >
                            {task.completed && <Check size={14} strokeWidth={3} />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${task.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {task.completed ? 'Completed' : 'Pending'}
                                </span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                  {String(task.type || 'General')}
                                </span>
                                {isOverdue && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                                    <AlertCircle size={12}/> Overdue
                                  </span>
                                )}
                            </div>
                            <h3 className={`font-semibold text-slate-900 truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>
                              {String(task.title)}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                {task.due_date && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar size={14} className="text-slate-400"/> {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {assignedUser && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <UserIcon size={14} className="text-slate-400"/> {String(assignedUser.name)}
                                  </span>
                                )}
                                {animal && (
                                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {String(animal.name)}
                                  </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleTaskClick(task)}
                            className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${task.completed ? 'text-slate-400 hover:text-slate-600' : 'text-blue-600 hover:bg-blue-50'}`}
                          >
                            {task.completed ? 'Re-open' : 'Complete'}
                          </button>
                        </div>
                    </div>
                );
            }) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <ListTodo size={48} className="mx-auto mb-4 text-slate-200"/>
                    <p className="text-slate-500 font-medium">No tasks found</p>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search</p>
                </div>
            )}
        </div>

        {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-0 animate-in zoom-in-95 border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Add Duty</h2>
                            <p className="text-sm text-slate-500 mt-1">Assign a new care task</p>
                        </div>
                        <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                          <X size={24}/>
                        </button>
                    </div>
                    <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Duty Description</label>
                                <input 
                                    type="text" required value={newTitle} 
                                    onChange={e => setNewTitle(e.target.value)} 
                                    className={inputClass} 
                                    placeholder="e.g. Annual Health Check"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duty Type</label>
                                    <select value={newType} onChange={e => setNewType(e.target.value as LogType)} className={inputClass}>
                                        {Object.values(LogType).map((t: LogType) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Subject</label>
                                    <select value={newAnimalId} onChange={e => setNewAnimalId(e.target.value)} className={inputClass}>
                                        <option value="">No specific animal</option>
                                        {animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                    <input type="date" required value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
                                    <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} className={inputClass}>
                                        <option value="">Unassigned</option>
                                        {(users || []).map((u: User) => <option key={u.id} value={u.id}>{u.name} ({u.initials})</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                            <UserCheck className="text-blue-600 shrink-0" size={20} />
                            <p className="text-xs text-blue-800 leading-relaxed">
                                Once committed, this duty will appear in the staff member's personal dashboard and statutory rota.
                            </p>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button 
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                          >
                            Commit to Rota
                          </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showEntryModal && selectedAnimalForEntry && (
            <AddEntryModal 
                isOpen={showEntryModal} 
                onClose={() => setShowEntryModal(false)} 
                onSave={() => {
                    toggleTaskCompletion(completingTask!);
                    setShowEntryModal(false);
                }} 
                animal={selectedAnimalForEntry} 
                initialType={completingTask?.type || LogType.GENERAL} 
                initialDate={new Date().toISOString().split('T')[0]} 
            />
        )}
    </div>
  );
};

export default Tasks;
