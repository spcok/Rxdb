import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Download, Bug, Wifi, WifiOff, Clock, User, Link, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

interface BugReport {
  id: string;
  created_at: string;
  message: string;
  is_online: boolean;
  url: string;
  role: string;
  user_name: string;
}

interface ParsedMessage {
  severity: string;
  title: string;
  description: string;
}

const BugReports: React.FC = () => {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();

  const fetchReports = useCallback(async () => {
    if (!isOnline) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching bug reports:', err);
      setError('Failed to load bug reports from server.');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const parseMessage = (message: string): ParsedMessage => {
    const lines = message.split('\n');
    const firstLine = lines[0] || '';
    
    // Extract severity from [...]
    const severityMatch = firstLine.match(/\[(.*?)\]/);
    const severity = severityMatch ? severityMatch[1] : 'Medium';
    
    // Extract title (rest of first line)
    const title = firstLine.replace(/\[.*?\]/, '').trim() || 'Untitled Report';
    
    // Extract description (everything after double newline)
    const doubleNewlineIndex = message.indexOf('\n\n');
    const description = doubleNewlineIndex !== -1 
      ? message.substring(doubleNewlineIndex + 2).trim() 
      : lines.slice(1).join('\n').trim();

    return { severity, title, description };
  };

  const handleResolve = async (id: string) => {
    try {
      // Optimistic update
      const originalReports = [...reports];
      setReports(prev => prev.filter(r => r.id !== id));

      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', id);

      if (error) {
        setReports(originalReports);
        throw error;
      }
    } catch (err) {
      console.error('Error resolving bug report:', err);
      alert('Failed to resolve report. Please try again.');
    }
  };

  const getSeverityColor = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('critical')) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (s.includes('high')) return 'text-orange-600 bg-orange-50 border-orange-100';
    if (s.includes('medium')) return 'text-amber-600 bg-amber-50 border-amber-100';
    if (s.includes('low')) return 'text-blue-600 bg-blue-50 border-blue-100';
    return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;

    const headers = ['ID', 'Date', 'User', 'Role', 'URL', 'Status', 'Severity', 'Title', 'Description'];
    const csvContent = [
      headers.join(','),
      ...reports.map(report => {
        const parsed = parseMessage(report.message);
        return [
          report.id,
          new Date(report.created_at).toLocaleString().replace(/,/g, ''),
          `"${report.user_name}"`,
          report.role,
          report.url,
          report.is_online ? 'Online' : 'Offline',
          parsed.severity,
          `"${parsed.title.replace(/"/g, '""')}"`,
          `"${parsed.description.replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bug-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOnline && reports.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center">
        <WifiOff className="mx-auto h-12 w-12 text-amber-400 mb-4" />
        <h3 className="text-lg font-bold text-amber-900 mb-2">Offline Mode</h3>
        <p className="text-amber-700 max-w-md mx-auto">
          You are currently offline. Bug reports are stored on the server and cannot be retrieved until your connection is restored.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-800">
          <AlertTriangle size={20} className="text-rose-500 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          <p className="text-sm font-medium">
            You are currently offline. Showing cached reports (if any). Refreshing and resolving reports requires an active connection.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Beta Feedback & Bug Reports</h2>
          <p className="text-sm text-slate-500">Review and manage feedback submitted by users.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            disabled={isLoading || !isOnline}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh reports"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={reports.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {isLoading && reports.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Bug className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No reports yet</h3>
          <p className="text-slate-500">When users submit feedback, it will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Date & User</th>
                  <th className="px-6 py-4">Context</th>
                  <th className="px-6 py-4">Report Details</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const parsed = parseMessage(report.message);
                  return (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-6 align-top">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Clock size={12} />
                            {new Date(report.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                              <User size={14} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{report.user_name}</p>
                              <p className="text-xs text-slate-500 font-medium uppercase tracking-tighter">{report.role}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md w-fit">
                            <Link size={10} className="text-slate-400" />
                            <span className="truncate max-w-[150px]" title={report.url}>{report.url}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                            {report.is_online ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Wifi size={10} /> Online
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-600">
                                <WifiOff size={10} /> Offline
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="space-y-2 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getSeverityColor(parsed.severity)}`}>
                              {parsed.severity}
                            </span>
                            <h4 className="font-bold text-slate-900">{parsed.title}</h4>
                          </div>
                          <p className="text-slate-600 whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {parsed.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top text-right">
                        <button
                          onClick={() => handleResolve(report.id)}
                          disabled={!isOnline}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30"
                          title="Mark as Resolved"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugReports;
