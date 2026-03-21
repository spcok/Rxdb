import React, { useState } from 'react';
import { MessageSquareWarning, X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../lib/db';
import { processSyncQueue } from '../../lib/syncEngine';

const GlobalBugReporter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('low');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false);

    const reportId = uuidv4();
    const payload = {
      id: reportId,
      created_at: new Date().toISOString(),
      message: `[${severity.toUpperCase()}] ${title.trim()}\n\n${message.trim()}`,
      is_online: navigator.onLine,
      url: window.location.href,
      role: currentUser?.role || 'Unknown',
      user_name: currentUser?.name || 'Unknown',
    };

    try {
      await db.sync_queue.add({
        table_name: 'bug_reports',
        record_id: reportId,
        operation: 'upsert',
        payload: payload,
        created_at: new Date().toISOString(),
        status: 'pending',
        priority: 5, // Lower priority (5) so clinical/medical data syncs first
        retry_count: 0
      });

      // Fire and forget background sync
      processSyncQueue().catch(console.error);

      setIsSuccess(true);
      setTitle('');
      setMessage('');
      setSeverity('low');
      
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to queue bug report:', err);
      setError('Failed to queue report. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[99999] p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 hover:scale-105 transition-all duration-200 flex items-center justify-center"
        title="Report a Bug"
      >
        <MessageSquareWarning size={24} />
      </button>

      {/* Full-Screen Takeover */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Report a Bug</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              {isSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Report submitted successfully!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Issue Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm"
                    placeholder="Brief summary of the issue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description / Steps to Reproduce</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-40 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-medium text-sm resize-none"
                    placeholder="Describe the issue in detail..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  {!isSubmitting && <Send size={16} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalBugReporter;
