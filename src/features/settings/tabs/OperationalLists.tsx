import React, { useState } from 'react';
import { 
  Utensils, 
  Ticket, 
  Plus, 
  Trash2, 
  Activity, 
  MapPin, 
  Check, 
  X, 
  Edit,
  ChevronRight
} from 'lucide-react';
import { AnimalCategory, OperationalList } from '../../../types';
import { useOperationalLists } from '../../../hooks/useOperationalLists';

const OperationalLists: React.FC = () => {
  const [listSection, setListSection] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState<{ [key: string]: string }>({});

  const { 
    foodTypes, 
    feedMethods, 
    eventTypes, 
    locations, 
    addListItem, 
    updateListItem, 
    removeListItem 
  } = useOperationalLists(listSection);

  const handleAdd = async (type: 'food' | 'method' | 'location' | 'event', category?: AnimalCategory) => {
    const val = newValue[type];
    if (!val) return;
    await addListItem(type, val, category);
    setNewValue(prev => ({ ...prev, [type]: '' }));
  };

  const handleUpdate = async (id: string) => {
    await updateListItem(id, editValue);
    setEditingId(null);
    setEditValue('');
  };

  const startEditing = (id: string, value: string) => {
    setEditingId(id);
    setEditValue(value);
  };

  const renderList = (items: OperationalList[], type: 'food' | 'method' | 'location' | 'event', title: string, icon: React.ReactNode, category?: AnimalCategory) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600">
            {icon}
          </div>
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-slate-200">
          {items.length} Items
        </span>
      </div>

      <div className="p-4 border-b border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue[type] || ''}
            onChange={(e) => setNewValue(prev => ({ ...prev, [type]: e.target.value }))}
            placeholder={`Add new ${title.toLowerCase()}...`}
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(type, category)}
          />
          <button
            onClick={() => handleAdd(type, category)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px]">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400 italic">No items defined yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white border border-blue-500 rounded text-sm focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(item.id)}
                    />
                    <button onClick={() => handleUpdate(item.id)} className="text-green-600 hover:text-green-700"><Check size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-slate-700 font-medium">{item.value}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(item.id, item.value)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => removeListItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Operational Lists</h2>
          <p className="text-sm text-slate-500">Manage dropdown options for husbandry and animal records.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[AnimalCategory.OWLS, AnimalCategory.RAPTORS, AnimalCategory.MAMMALS, AnimalCategory.REPTILES].map((cat) => (
            <button
              key={cat}
              onClick={() => setListSection(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                listSection === cat 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat === AnimalCategory.REPTILES ? 'EXOTICS' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderList(foodTypes, 'food', 'Food Types', <Utensils size={18} />, listSection)}
        {renderList(feedMethods, 'method', 'Feed Methods', <Activity size={18} />, listSection)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderList(eventTypes, 'event', 'Event Types', <Ticket size={18} />)}
        {renderList(locations, 'location', 'Animal Locations', <MapPin size={18} />)}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <div className="p-2 bg-white rounded-lg border border-amber-200 text-amber-600 h-fit">
          <ChevronRight size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900">Pro Tip: Data Consistency</h4>
          <p className="text-xs text-amber-700 mt-1">
            Food types and feed methods are scoped to the selected animal category (e.g. {listSection === AnimalCategory.REPTILES ? 'EXOTICS' : listSection}). 
            Event types and locations are global and available across all categories.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OperationalLists;
