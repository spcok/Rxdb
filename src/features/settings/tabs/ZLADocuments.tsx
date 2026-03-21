import React, { useState } from 'react';
import { FileText, Upload, Download, Trash2, X } from 'lucide-react';
import { useZLADocsData } from '../useZLADocsData';

const ZLADocuments: React.FC = () => {
  const { documents, isLoading, addDocument, deleteDocument } = useZLADocsData();
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState<{ category: string, file_url: string, name: string }>({ category: 'Licensing', file_url: '', name: '' });

  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setDocForm(prev => ({ ...prev, file_url: evt.target?.result as string, name: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDocument = async () => {
    if (!docForm.name || !docForm.file_url) return;
    await addDocument({
      name: docForm.name,
      category: docForm.category,
      file_url: docForm.file_url,
      upload_date: new Date()
    });
    setIsDocModalOpen(false);
    setDocForm({ category: 'Licensing', file_url: '', name: '' });
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Delete document permanently?')) {
      await deleteDocument(id);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-300 uppercase tracking-widest";

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
      <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-emerald-600" /> Statutory Files
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Licensing, Insurance & Safety Documentation</p>
        </div>
        <button onClick={() => { setDocForm({ category: 'Licensing', file_url: '', name: '' }); setIsDocModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md">
          <Upload size={14} /> Upload Document
        </button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Document Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Upload Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></div>
                      <span className="text-sm font-bold text-slate-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase tracking-widest">{doc.category}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                    {new Date(doc.upload_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2 whitespace-nowrap">
                    <a href={doc.file_url} download={doc.name} className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"><Download size={14} /></a>
                    <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-xs font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">No Documents on File</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Upload Document</h3>
              <button onClick={() => setIsDocModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Document Category</label>
                <select value={docForm.category} onChange={e => setDocForm({ ...docForm, category: e.target.value })} className={inputClass}>
                  <option value="Licensing">Licensing</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Safety">Safety</option>
                  <option value="Protocol">Protocol</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">File Upload</label>
                <input type="file" onChange={handleDocFileUpload} className={inputClass} />
              </div>
              {docForm.name && (
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                  <FileText size={14} /> {docForm.name}
                </div>
              )}
              <button onClick={handleSaveDocument} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg mt-2">Save to Registry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZLADocuments;
