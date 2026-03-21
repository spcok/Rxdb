export interface ChangelogEntry {
  version: string;
  date: string;
  title?: string;
  type: 'Major' | 'Minor' | 'Patch' | 'Hotfix';
  changes: string[];
}

export const changelogData: ChangelogEntry[] = [
  {
    version: 'V1.0.0 Beta',
    date: '2026-03-16',
    type: 'Major',
    changes: [
      'Initial Beta Release of Kent Owl Academy Management System.',
      'Enterprise PWA architecture with Background Sync and Hybrid Data Engine (Supabase + Dexie) for offline failover.',
      'Tier-2 Offline Sync Engine with real-time reconciliation.',
      'System Health & Diagnostics Dashboard with real-time monitoring.',
      'Role-Based Access Control (RBAC) and Soft delete system for ZLA 1981 compliance.',
      'Automated media upload queue and manual backup capabilities.',
      'UI standardization and improved bug reporting/resolution tools.'
    ]
  }
];
