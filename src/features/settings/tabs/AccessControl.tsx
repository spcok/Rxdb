import React, { useState, useEffect } from 'react';
import { Shield, Key, Users, Loader2, UserPlus, Trash2, WifiOff, Check } from 'lucide-react';
import { useUsersData } from '../useUsersData';
import UserFormModal from '../components/UserFormModal';
import { User, RolePermissionConfig } from '../../../types';

const UsersView: React.FC = () => {
  const { users, isLoading, deleteUser, updateUser, refresh } = useUsersData();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- NEW: Custom Delete Modal State ---
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Bypasses the blocked window.confirm() and opens our beautiful React modal
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSave = async (data: Partial<User>) => {
    if (editingUser) {
      await updateUser(editingUser.id, data);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 shadow-sm">
          <WifiOff size={20} className="flex-shrink-0" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest">Offline Mode Active</h4>
            <p className="text-sm font-medium mt-0.5">Administrative actions are securely locked. Reconnect to the internet to add or edit staff members.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Staff Directory</h3>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          disabled={!isOnline}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={16} />
          Add Staff Member
        </button>
      </div>

      <div className="overflow-hidden bg-white rounded-[1.5rem] border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Name</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Email</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Role</th>
              <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-bold text-slate-900">{user.name}</td>
                <td className="px-6 py-4 text-slate-600 font-medium">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => setEditingUser(user)} 
                      disabled={!isOnline}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(user)} 
                      disabled={!isOnline}
                      className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                  No staff members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight mb-2">Delete Account</h3>
            <p className="text-slate-500 text-center text-sm font-medium mb-6">
              Are you sure you want to permanently remove <span className="font-bold text-slate-900">{userToDelete.name}</span>? This action destroys their login and cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center uppercase tracking-widest">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => { setUserToDelete(null); setDeleteError(null); }}
                disabled={isDeleting}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UserFormModal 
        isOpen={!!editingUser} 
        onClose={() => setEditingUser(null)} 
        initialData={editingUser}
        onSave={handleEditSave} 
        onSuccess={refresh}
      />
      
      <UserFormModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={refresh}
      />
    </div>
  );
};

const RoleMatrixView: React.FC = () => {
  const { rolePermissions, isLoading, updateRolePermissions } = useUsersData();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updatingRow, setUpdatingRow] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const permissionGroups = [
    {
      title: 'Animals Dashboard',
      keys: ['view_animals', 'add_animals', 'edit_animals', 'archive_animals']
    },
    {
      title: 'Husbandry & Care',
      keys: ['view_daily_logs', 'create_daily_logs', 'edit_daily_logs', 'view_tasks', 'complete_tasks', 'manage_tasks', 'view_daily_rounds', 'log_daily_rounds']
    },
    {
      title: 'Veterinary & Medical',
      keys: ['view_medical', 'add_clinical_notes', 'prescribe_medications', 'administer_medications', 'manage_quarantine']
    },
    {
      title: 'Transfers & Logistics',
      keys: ['view_movements', 'log_internal_movements', 'manage_external_transfers']
    },
    {
      title: 'Site Safety & Maintenance',
      keys: ['view_incidents', 'report_incidents', 'manage_incidents', 'view_maintenance', 'report_maintenance', 'resolve_maintenance', 'view_safety_drills', 'view_first_aid']
    },
    {
      title: 'Staff Management',
      keys: ['submit_timesheets', 'manage_all_timesheets', 'request_holidays', 'approve_holidays']
    },
    {
      title: 'Compliance & Administration',
      keys: ['view_missing_records', 'view_archived_records', 'manage_zla_documents', 'generate_reports', 'view_settings', 'manage_users', 'manage_roles']
    }
  ];

  const handleToggle = async (roleConfig: RolePermissionConfig, key: keyof RolePermissionConfig) => {
    if (!isOnline || roleConfig.role === 'OWNER') return;
    
    setUpdatingRow(`${roleConfig.role}-${key}`);
    try {
      const currentValue = roleConfig[key] as boolean;
      await updateRolePermissions(roleConfig.role, { [key]: !currentValue });
    } catch (error) {
      console.error("Permission update failed:", error);
      alert("Failed to update permission. Please try again.");
    } finally {
      setUpdatingRow(null);
    }
  };

  const formatKeyToLabel = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 shadow-sm mb-4">
          <WifiOff size={20} className="flex-shrink-0" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest">Offline Mode Active</h4>
            <p className="text-sm font-medium mt-0.5">The role matrix is currently read-only. Reconnect to the internet to change permissions.</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-[1.5rem] border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-5 font-black text-slate-900 uppercase tracking-widest text-[10px] w-64 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">
                Permission Entity
              </th>
              {rolePermissions.map((role) => (
                <th key={role.role} className="px-4 py-5 font-black text-slate-500 uppercase tracking-widest text-[10px] text-center">
                  {role.role.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permissionGroups.map((group, groupIdx) => (
              <React.Fragment key={groupIdx}>
                <tr className="bg-slate-50/50">
                  <td colSpan={rolePermissions.length + 1} className="px-6 py-3 font-black text-indigo-700 text-[10px] uppercase tracking-widest border-y border-slate-200 sticky left-0 z-10 bg-slate-50/90 backdrop-blur-sm">
                    {group.title}
                  </td>
                </tr>
                
                {group.keys.map((key) => {
                  const typedKey = key as keyof RolePermissionConfig;
                  return (
                    <tr key={key} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-3 font-medium text-slate-700 text-xs sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10 transition-colors">
                        {formatKeyToLabel(key)}
                      </td>
                      {rolePermissions.map((roleConfig) => {
                        const isOwner = roleConfig.role === 'OWNER';
                        const isChecked = roleConfig[typedKey] as boolean;
                        const isUpdating = updatingRow === `${roleConfig.role}-${key}`;
                        
                        return (
                          <td key={roleConfig.role} className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggle(roleConfig, typedKey)}
                              disabled={!isOnline || isOwner || isUpdating}
                              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${
                                isOwner 
                                  ? 'bg-slate-200 cursor-not-allowed'
                                  : isUpdating
                                    ? 'bg-indigo-100 animate-pulse'
                                    : isChecked 
                                      ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700' 
                                      : 'bg-slate-100 border border-slate-200 text-transparent hover:bg-slate-200'
                              } ${(!isOnline || isOwner) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {(isChecked || isOwner) && !isUpdating && <Check size={14} className={isOwner ? 'text-slate-500' : 'text-white'} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AccessControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  return (
    <div className="max-w-6xl space-y-6 animate-in slide-in-from-right-4 duration-300 pb-24">
      <div className="border-b-2 border-slate-200 pb-6">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <Shield size={28} className="text-indigo-600" /> Access & Security
        </h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage staff accounts and permissions</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'users' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <Users size={16} /> Staff Directory
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'roles' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <Key size={16} /> Role Matrix
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'roles' && <RoleMatrixView />}
      </div>
    </div>
  );
};

export default AccessControl;