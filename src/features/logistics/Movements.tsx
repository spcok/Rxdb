import { useState } from 'react';
import { Truck, Plus, History, MapPin, Calendar, User as UserIcon, ArrowRight, Plane, Lock } from 'lucide-react';
import { useMovementsData } from './useMovementsData';
import { useTransfersData } from './useTransfersData';
import AddMovementModal from './AddMovementModal';
import AddTransferModal from './AddTransferModal';
import { usePermissions } from '../../hooks/usePermissions';

export default function Movements() {
  const { view_movements } = usePermissions();
  const { movements } = useMovementsData();
  const { transfers } = useTransfersData();
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!view_movements) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold uppercase tracking-tight">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Logistics & Movements. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Logistics & Movements</h1>
          <p className="text-sm text-slate-500 mt-1">Record of internal transfers and external acquisitions/dispositions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18}/> Record {activeTab === 'internal' ? 'Movement' : 'Transfer'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('internal')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'internal' ? 'bg-blue-50 text-blue-700 rounded-xl font-bold' : 'text-slate-600 hover:bg-slate-100 rounded-xl'
          }`}
        >
          Internal Movements
        </button>
        <button
          onClick={() => setActiveTab('external')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'external' ? 'bg-blue-50 text-blue-700 rounded-xl font-bold' : 'text-slate-600 hover:bg-slate-100 rounded-xl'
          }`}
        >
          External Transfers
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {activeTab === 'internal' ? (
          (movements || []).map(movement => (
            <div key={movement.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{String(movement.animal_name)}</h3>
                  <p className="text-sm font-medium text-slate-500">{String(movement.movement_type)}</p>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center gap-4 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100">
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-slate-500 mb-1">Origin</p>
                  <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-900 text-sm">
                    <MapPin size={14} className="text-slate-400" />
                    {String(movement.source_location)}
                  </div>
                </div>
                <ArrowRight className="text-slate-300" size={20} />
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-slate-500 mb-1">Destination</p>
                  <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-900 text-sm">
                    <MapPin size={14} className="text-slate-400" />
                    {String(movement.destination_location)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 min-w-[150px]">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-sm">
                  <Calendar size={14} className="text-slate-400" />
                  {String(movement.log_date)}
                </div>
                <div className="text-sm font-medium text-slate-500 flex items-center gap-1">
                  <UserIcon size={12}/> {String(movement.created_by)}
                </div>
              </div>
            </div>
          ))
        ) : (
          (transfers || []).map(transfer => (
            <div key={transfer.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  transfer.transfer_type === 'Arrival' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Plane size={24} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{String(transfer.animal_name)}</h3>
                  <p className={`text-sm font-medium ${
                    transfer.transfer_type === 'Arrival' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>{String(transfer.transfer_type)}</p>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center gap-4 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100">
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-slate-500 mb-1">Institution</p>
                  <div className="font-semibold text-slate-900 text-sm">{String(transfer.institution)}</div>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm font-medium text-slate-500 mb-1">CITES / A10</p>
                  <div className="font-semibold text-slate-900 text-sm">{String(transfer.cites_article_10_ref)}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 min-w-[150px]">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-sm">
                  <Calendar size={14} className="text-slate-400" />
                  {String(transfer.date)}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  transfer.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {String(transfer.status)}
                </div>
              </div>
            </div>
          ))
        )}
        {(activeTab === 'internal' ? movements : transfers || []).length === 0 && (
          <div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-200">
            <History size={48} className="mx-auto mb-4 text-slate-200"/>
            <p className="text-slate-500 text-sm font-medium">No {activeTab} records found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        activeTab === 'internal' 
          ? <AddMovementModal onClose={() => setIsModalOpen(false)} />
          : <AddTransferModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
