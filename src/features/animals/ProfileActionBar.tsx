import React from 'react';
import { Archive, Edit2, FileText } from 'lucide-react';
import { usePermissions } from '@/src/hooks/usePermissions';

import { UserRole } from '@/src/types';

interface Props {
  onEdit: () => void;
  onSign: () => void;
  onArchive: () => void;
}

export const ProfileActionBar: React.FC<Props> = ({ onEdit, onSign, onArchive }) => {
  const permissions = usePermissions();
  
  // RBAC: Archive permission check
  const canArchive = permissions.archive_animals || permissions.role === UserRole.ADMIN || permissions.role === UserRole.OWNER;

  return (
    <div className="flex gap-2 mt-4">
      <button 
        onClick={onEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition"
      >
        <Edit2 size={16} /> Edit
      </button>
      <button 
        onClick={onSign}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition"
      >
        <FileText size={16} /> Sign Generator
      </button>
      {canArchive && (
        <button 
          onClick={onArchive}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition"
          // Offline Failover: Archive action is queued in 14-day local cache if Supabase is unreachable.
        >
          <Archive size={16} /> Archive
        </button>
      )}
    </div>
  );
};