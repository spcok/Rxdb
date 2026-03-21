import React, { useState } from 'react';
import { useMedicalData } from './useMedicalData';
import { usePermissions } from '../../hooks/usePermissions';
import { Pill, ClipboardList, AlertTriangle, Plus, Edit2, Download, CheckCircle, Lock, FileText, Printer } from 'lucide-react';
import { AddClinicalNoteModal } from './AddClinicalNoteModal';
import { AddMarChartModal } from './AddMarChartModal';
import { AddQuarantineModal } from './AddQuarantineModal';
import { generateMarChartDocx } from './exportMarChart';
import { ClinicalNote } from '../../types';

interface MedicalRecordsProps {
  animalId?: string;
  variant?: 'full' | 'quick-view';
}

const MedicalRecords: React.FC<MedicalRecordsProps> = ({ animalId, variant = 'full' }) => {
  const permissions = usePermissions();
  const { clinicalNotes, marCharts, quarantineRecords, animals, isLoading, addClinicalNote, updateClinicalNote, addMarChart, addQuarantineRecord, updateQuarantineRecord } = useMedicalData();
  const [activeTab, setActiveTab] = useState<'notes' | 'mar' | 'quarantine'>(variant === 'quick-view' ? 'notes' : 'notes');
  const [selectedPatient, setSelectedPatient] = useState<string>(animalId || 'All');
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);
  const [isMarModalOpen, setIsMarModalOpen] = useState(false);
  const [isQuarantineModalOpen, setIsQuarantineModalOpen] = useState(false);

  const [isCorrection, setIsCorrection] = useState(false);

  if (!permissions.view_medical) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Medical Records. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading Clinical Records...</div>;

  const handleAdd = () => {
    if (activeTab === 'notes') {
      setEditingNote(null);
      setIsCorrection(false);
      setIsNoteModalOpen(true);
    }
    else if (activeTab === 'mar') setIsMarModalOpen(true);
    else setIsQuarantineModalOpen(true);
  };

  const handleEditNote = (note: ClinicalNote) => {
    setEditingNote(note);
    setIsCorrection(false);
    setIsNoteModalOpen(true);
  };

  const handleAddCorrection = (note: ClinicalNote) => {
    console.log('🛠️ [Medical QA] Creating correction for sealed record:', note.id);
    setEditingNote({
      ...note,
      id: crypto.randomUUID(),
      note_text: `[CORRECTION to record from ${new Date(note.date).toLocaleDateString('en-GB')}]\n\n`,
      integrity_seal: undefined,
      staff_initials: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsCorrection(true);
    setIsNoteModalOpen(true);
  };

  const handlePrintNote = (note: ClinicalNote) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Clinical Note - ${note.animal_name}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { margin-bottom: 8px; }
              .label { font-weight: bold; }
              .section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
            </style>
          </head>
          <body>
            <h1>Clinical Note: ${note.animal_name}</h1>
            <p><span class="label">Date:</span> ${new Date(note.date).toLocaleDateString('en-GB')}</p>
            <p><span class="label">Type:</span> ${note.note_type}</p>
            <p><span class="label">Staff:</span> ${note.staff_initials}</p>
            ${note.diagnosis ? `<p><span class="label">Diagnosis:</span> ${note.diagnosis}</p>` : ''}
            ${note.bcs ? `<p><span class="label">BCS:</span> ${note.bcs}/5</p>` : ''}
            ${note.weight ? `<p><span class="label">Weight:</span> ${note.weight}${note.weight_unit || 'g'}</p>` : note.weight_grams ? `<p><span class="label">Weight:</span> ${note.weight_grams}g</p>` : ''}
            
            <div class="section">
              <h3>Clinical Observation</h3>
              <p style="white-space: pre-wrap;">${note.note_text}</p>
            </div>

            ${note.treatment_plan ? `
              <div class="section">
                <h3>Treatment Plan</h3>
                <p style="white-space: pre-wrap;">${note.treatment_plan}</p>
              </div>
            ` : ''}

            ${note.recheck_date ? `<div class="section"><p><span class="label">Recheck Date:</span> ${new Date(note.recheck_date).toLocaleDateString('en-GB')}</p></div>` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredNotes = (clinicalNotes || [])
    .filter(n => selectedPatient === 'All' || n.animal_id === selectedPatient)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredMarCharts = (marCharts || [])
    .filter(m => selectedPatient === 'All' || m.animal_id === selectedPatient);

  const filteredQuarantineRecords = (quarantineRecords || [])
    .filter(q => selectedPatient === 'All' || q.animal_id === selectedPatient);

  return (
    <div className="space-y-6">
      {variant === 'full' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Clinical Records</h1>
            <p className="text-sm text-slate-500 mt-1">Manage clinical notes, medication charts, and quarantine records.</p>
          </div>
          { (activeTab === 'notes' && permissions.add_clinical_notes) || (activeTab === 'mar' && permissions.prescribe_medications) || (activeTab === 'quarantine' && permissions.manage_quarantine) ? (
            <button 
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> Add {activeTab === 'notes' ? 'Note' : activeTab === 'mar' ? 'Medication' : 'Record'}
            </button>
          ) : null}
        </div>
      )}
      
      {variant === 'quick-view' && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Clinical Notes</h2>
          <div className="flex items-center gap-2">
            <a href="/medical" className="text-sm text-blue-600 hover:underline font-medium">View Full Records</a>
            {permissions.add_clinical_notes && (
              <button 
                onClick={handleAdd}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Add Note
              </button>
            )}
          </div>
        </div>
      )}
      
      <AddClinicalNoteModal 
        isOpen={isNoteModalOpen} 
        onClose={() => { setIsNoteModalOpen(false); setIsCorrection(false); }} 
        onSave={editingNote && !isCorrection ? updateClinicalNote : addClinicalNote} 
        animals={animals}
        initialData={editingNote}
        preselectedAnimalId={selectedPatient !== 'All' ? selectedPatient : undefined}
      />
      
      <AddMarChartModal 
        isOpen={isMarModalOpen} 
        onClose={() => setIsMarModalOpen(false)} 
        onSave={addMarChart} 
        animals={animals} 
      />

      <AddQuarantineModal
        isOpen={isQuarantineModalOpen}
        onClose={() => setIsQuarantineModalOpen(false)}
        onSave={addQuarantineRecord}
        animals={animals}
      />
      
      {variant === 'full' && (
        <div className="flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto">
          {[
            { id: 'notes', label: 'Clinical Notes', icon: ClipboardList },
            { id: 'mar', label: 'MAR Charts', icon: Pill },
            { id: 'quarantine', label: 'Quarantine', icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'notes' | 'mar' | 'quarantine')}
              className={`flex items-center gap-2 ${activeTab === tab.id ? 'px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold transition-colors' : 'px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors'}`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-6">
          {variant === 'full' && (
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700">Filter by Patient:</label>
              <select 
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="All">All Patients</option>
                {animals?.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Column: Master List */}
            <div className="flex-1 w-full lg:w-2/3 flex flex-col gap-4">
              {filteredNotes.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => setSelectedNote(n)}
                  className={`bg-white border rounded-xl p-5 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedNote?.id === n.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900">{n.animal_name}</h3>
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                          {n.note_type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 font-medium">
                        <span>{new Date(n.date).toLocaleDateString('en-GB')}</span>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <span>By: {String(n.staff_initials)}</span>
                      </div>
                      {n.diagnosis && (
                        <p className="text-sm text-slate-600 font-medium mt-1">
                          Dx: <span className="text-slate-800">{n.diagnosis}</span>
                        </p>
                      )}
                      <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                        {String(n.note_text)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredNotes.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">No clinical notes found for this selection.</p>
                </div>
              )}
            </div>

            {/* Right Column: Detail Pane */}
            <div className="w-full lg:w-1/3 bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-6">
              {selectedNote ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedNote.animal_name}</h2>
                      <p className="text-sm text-slate-500 font-medium">{new Date(selectedNote.date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedNote.integrity_seal ? (
                        <div className="flex items-center gap-2">
                          <span title="Record Sealed"><Lock size={16} className="text-emerald-600" /></span>
                          <button 
                            onClick={() => handleAddCorrection(selectedNote)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1 flex items-center gap-1 text-xs font-bold" 
                            title="Add Correction"
                          >
                            <Plus size={14} /> Correction
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleEditNote(selectedNote)}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1" 
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => handlePrintNote(selectedNote)}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1" 
                        title="Print"
                      >
                        <Printer size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                      {selectedNote.note_type}
                    </span>
                    {selectedNote.bcs && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                        BCS: {selectedNote.bcs}/5
                      </span>
                    )}
                    {selectedNote.weight ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium">
                        Weight: {selectedNote.weight}{selectedNote.weight_unit || 'g'}
                      </span>
                    ) : selectedNote.weight_grams ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium">
                        Weight: {selectedNote.weight_grams}g
                      </span>
                    ) : null}
                  </div>

                  {selectedNote.diagnosis && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1">Diagnosis</h3>
                      <p className="text-slate-800 font-medium">{selectedNote.diagnosis}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">Clinical Observation</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedNote.note_text}
                    </p>
                  </div>

                  {selectedNote.treatment_plan && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">Treatment Plan</h3>
                      <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedNote.treatment_plan}
                      </p>
                    </div>
                  )}

                  {(selectedNote.thumbnail_url || selectedNote.attachment_url) && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">Attachment</h3>
                      <div 
                        className="relative rounded-xl overflow-hidden border border-slate-200 group cursor-pointer"
                        onClick={() => {
                          if (selectedNote.attachment_url && !selectedNote.attachment_url.startsWith('local://')) {
                            if (navigator.onLine) {
                              window.open(selectedNote.attachment_url, '_blank');
                            } else {
                              alert('Internet connection required to view high-res image.');
                            }
                          } else if (selectedNote.attachment_url?.startsWith('local://')) {
                            alert('High-res image is still uploading.');
                          }
                        }}
                      >
                        <img 
                          src={selectedNote.thumbnail_url || selectedNote.attachment_url} 
                          alt="Clinical attachment" 
                          className="w-full h-auto object-cover max-h-64"
                          referrerPolicy="no-referrer"
                        />
                        {selectedNote.attachment_url && !selectedNote.attachment_url.startsWith('local://') && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-sm font-medium px-4 py-2 bg-black/50 rounded-lg backdrop-blur-sm">
                              Tap to download high-res (Internet Required)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-sm text-slate-500">
                    <span>Recorded by: <span className="font-medium text-slate-700">{selectedNote.staff_initials}</span></span>
                    {selectedNote.recheck_date && (
                      <span className="text-amber-600 font-medium">Recheck: {new Date(selectedNote.recheck_date).toLocaleDateString('en-GB')}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">Select a clinical note to view full details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {variant === 'full' && (activeTab === 'mar' || activeTab === 'quarantine') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto overflow-y-hidden">
            {activeTab === 'mar' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Medication</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Animal</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Dosage & Freq</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Start-End</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMarCharts.map(m => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 text-base font-semibold text-slate-900">{String(m.medication)}</td>
                      <td className="px-6 py-4 text-slate-600">{String(m.animal_name)}</td>
                      <td className="px-6 py-4 text-slate-600">{String(m.dosage)} / {String(m.frequency)}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(m.start_date).toLocaleDateString('en-GB')} - {m.end_date ? new Date(m.end_date).toLocaleDateString('en-GB') : 'Ongoing'}</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {String(m.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {m.integrity_seal ? (
                          <span title="Record Sealed"><Lock size={16} className="text-emerald-600" /></span>
                        ) : (
                          <button className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                        )}
                        <button onClick={() => generateMarChartDocx(m)} className="text-slate-400 hover:text-blue-600 transition-colors"><Download size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'quarantine' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Animal</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Reason</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Start</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Target Release</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Notes</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuarantineRecords.map(q => (
                    <tr key={q.id}>
                      <td className="px-6 py-4 text-base font-semibold text-slate-900">{String(q.animal_name)}</td>
                      <td className="px-6 py-4 text-slate-600">{String(q.reason)}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(q.start_date).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(q.end_date).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${q.status === 'Active' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {String(q.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-600">{String(q.isolation_notes)}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                        {q.status === 'Active' && (
                          <button 
                            onClick={() => updateQuarantineRecord({...q, status: 'Cleared'})}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
