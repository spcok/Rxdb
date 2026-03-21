import React, { useState } from 'react';
import { Phone, Plus, Trash2, Mail, MapPin, X } from 'lucide-react';
import { useDirectoryData } from '../useDirectoryData';
import { Contact } from '../../../types';

const Directory: React.FC = () => {
  const { contacts, isLoading, addContact, updateContact, deleteContact } = useDirectoryData();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<Contact>({ id: '', name: '', role: '', phone: '', email: '', address: '' });

  const handleSaveContact = async () => {
    if (!contactForm.name || !contactForm.role) return;
    if (contactForm.id) {
      await updateContact(contactForm);
    } else {
      await addContact({ name: contactForm.name, role: contactForm.role, phone: contactForm.phone, email: contactForm.email, address: contactForm.address });
    }
    setIsContactModalOpen(false);
    setContactForm({ id: '', name: '', role: '', phone: '', email: '', address: '' });
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      await deleteContact(id);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-300 uppercase tracking-widest";

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">External Directory</h3>
        <button onClick={() => { setContactForm({ id: '', name: '', role: '', phone: '', email: '', address: '' }); setIsContactModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md">
          <Plus size={14} /> Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map(contact => (
          <div key={contact.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 transition-all shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{contact.name}</h4>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-widest">{contact.role}</span>
              </div>
              <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <Phone size={14} className="text-emerald-500" /> {contact.phone}
              </div>
              {contact.email && (
                <div className="flex items-center gap-3 text-xs font-medium text-slate-600 truncate">
                  <Mail size={14} className="text-emerald-500" /> {contact.email}
                </div>
              )}
              {contact.address && (
                <div className="flex items-start gap-3 text-xs font-medium text-slate-600 mt-2 pt-2 border-t border-slate-100">
                  <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{contact.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <Phone size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest">Directory Empty</p>
          </div>
        )}
      </div>

      {isContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{contactForm.id ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => setIsContactModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <input placeholder="Name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} className={inputClass} />
              <input placeholder="Role / Company" value={contactForm.role} onChange={e => setContactForm({ ...contactForm, role: e.target.value })} className={inputClass} />
              <input placeholder="Phone" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} className={inputClass} />
              <input placeholder="Email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className={inputClass} />
              <textarea placeholder="Address" value={contactForm.address || ''} onChange={e => setContactForm({ ...contactForm, address: e.target.value })} className={`${inputClass} h-24 resize-none`} />
              <button onClick={handleSaveContact} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg">Save Contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Directory;
