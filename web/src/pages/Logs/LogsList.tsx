import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  Clock,
  User,
  Shield,
  Eye,
  Key,
  Route,
  Activity,
  AlertCircle,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useFeedback } from '../../context/FeedbackContext';
import { ActivityLog } from '../../types';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';

export const LogsList: React.FC = () => {
  const { showSuccess, showError } = useFeedback();
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'auth' | 'operations' | 'admin'>('all');

  const {
    data: logs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ActivityLog[]>({
    queryKey: ['admin-logs'],
    queryFn: () => adminService.getAllLogs(),
  });

  // Category counts
  const counts = useMemo(() => {
    let auth = 0;
    let ops = 0;
    let admin = 0;

    for (const log of logs) {
      const act = (log.action || '').toLowerCase();
      if (act.includes('login') || act.includes('register') || act.includes('password') || act.includes('auth')) {
        auth++;
      } else if (
        act.includes('route') ||
        act.includes('assignment') ||
        act.includes('pickup') ||
        act.includes('stop') ||
        act.includes('collect') ||
        act.includes('dispute')
      ) {
        ops++;
      } else {
        admin++;
      }
    }

    return { total: logs.length, auth, ops, admin };
  }, [logs]);

  // Filter logs by selected category
  const filteredLogs = useMemo(() => {
    if (categoryFilter === 'all') return logs;
    return logs.filter((log) => {
      const act = (log.action || '').toLowerCase();
      if (categoryFilter === 'auth') {
        return (
          act.includes('login') ||
          act.includes('register') ||
          act.includes('password') ||
          act.includes('auth')
        );
      }
      if (categoryFilter === 'operations') {
        return (
          act.includes('route') ||
          act.includes('assignment') ||
          act.includes('pickup') ||
          act.includes('stop') ||
          act.includes('collect') ||
          act.includes('dispute')
        );
      }
      if (categoryFilter === 'admin') {
        return (
          !act.includes('login') &&
          !act.includes('register') &&
          !act.includes('route') &&
          !act.includes('assignment') &&
          !act.includes('pickup') &&
          !act.includes('stop') &&
          !act.includes('collect')
        );
      }
      return true;
    });
  }, [logs, categoryFilter]);

  const columns = useMemo<ColumnDef<ActivityLog>[]>(
    () => [
      {
        accessorFn: (row) => row.timestamp || row.createdAt || '',
        id: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {row.original.timestamp || row.original.createdAt
                ? new Date(row.original.timestamp || row.original.createdAt).toLocaleString()
                : '—'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action / Event',
        cell: ({ row }) => {
          const act = row.original.action || 'Event';
          const lower = act.toLowerCase();

          let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-200';
          if (lower.includes('login') || lower.includes('register')) {
            badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
          } else if (lower.includes('route') || lower.includes('assignment') || lower.includes('dispatch')) {
            badgeStyle = 'bg-teal-50 text-teal-700 border-teal-200';
          } else if (lower.includes('pickup') || lower.includes('collect') || lower.includes('verify')) {
            badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          } else if (lower.includes('deactivate') || lower.includes('reject') || lower.includes('cancel')) {
            badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
          } else if (lower.includes('activate') || lower.includes('admin')) {
            badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
          }

          return (
            <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border inline-block whitespace-nowrap ${badgeStyle}`}>
              {act}
            </span>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <p
            className="text-xs text-slate-700 font-medium max-w-xs sm:max-w-md truncate"
            title={row.original.description || row.original.action}
          >
            {row.original.description || row.original.action || 'Activity recorded'}
          </p>
        ),
      },
      {
        accessorFn: (row) => {
          const u = row.user || row.userId;
          return typeof u === 'object' && u ? `${u.name || ''} ${u.email || ''}` : 'System';
        },
        id: 'user',
        header: 'Actor / User',
        cell: ({ row }) => {
          const u = row.original.user || row.original.userId;
          if (typeof u === 'object' && u && u.name) {
            return (
              <div className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{u.name}</span>
                  {u.role && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {u.role}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 font-mono text-[11px] truncate max-w-[160px]">{u.email}</p>
              </div>
            );
          }
          return (
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
              System / Automation
            </span>
          );
        },
      },
      {
        accessorKey: 'ipAddress',
        header: 'Origin IP',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-500">
            {row.original.ipAddress || '127.0.0.1'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Payload',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLog(row.original);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline px-2 py-1 rounded hover:bg-teal-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Inspect</span>
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">System Activity Audit Logs</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable administrative event trail recording security events, route dispatches, and verification reviews.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            const res = await refetch();
            if (res.isError) {
              showError('Could not refresh audit logs.', 'Refresh Failed');
            } else {
              showSuccess('Audit logs refreshed.', 'Updated');
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Audit Events</span>
            <div className="p-2 rounded-lg bg-teal-50 text-brand-teal">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{counts.total}</p>
          <p className="text-xs text-slate-500 mt-0.5">Logged across system lifecycle</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security & Auth</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{counts.auth}</p>
          <p className="text-xs text-slate-500 mt-0.5">Logins & user registrations</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Operations</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Route className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{counts.ops}</p>
          <p className="text-xs text-slate-500 mt-0.5">Routes, pickups & collections</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin & System</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{counts.admin}</p>
          <p className="text-xs text-slate-500 mt-0.5">Status changes & governance</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            categoryFilter === 'all'
              ? 'bg-brand-teal text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Events ({counts.total})
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('auth')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            categoryFilter === 'auth'
              ? 'bg-brand-teal text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Security & Auth ({counts.auth})
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('operations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            categoryFilter === 'operations'
              ? 'bg-brand-teal text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Operations & Pickups ({counts.ops})
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('admin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            categoryFilter === 'admin'
              ? 'bg-brand-teal text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Admin & Config ({counts.admin})
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>Failed to load audit logs: {(error as any)?.message || 'Network error'}</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-2.5 py-1 bg-rose-600 text-white rounded font-medium hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        isLoading={isLoading}
        searchPlaceholder="Search audit events by action, description, or user..."
        emptyTitle="No audit logs found"
        emptyDescription="No system activities recorded for the selected filter."
        onRowClick={(log) => setSelectedLog(log)}
      />

      {/* JSON Payload Inspection Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event: ${selectedLog?.action || 'Log Details'}`}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="font-mono text-slate-800 font-medium">
                  {new Date(selectedLog.timestamp || selectedLog.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Origin IP:</span>
                <span className="font-mono text-slate-800 font-medium">
                  {selectedLog.ipAddress || '127.0.0.1'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Action / Event:</span>
                <span className="font-mono text-slate-800 font-medium">
                  {selectedLog.action}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Actor:</span>
                <span className="text-slate-800 font-medium">
                  {typeof selectedLog.user === 'object' && selectedLog.user?.name
                    ? `${selectedLog.user.name} (${selectedLog.user.role || 'user'})`
                    : 'System / Automation'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5">Event Description:</span>
              <p className="text-slate-800 font-medium p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                {selectedLog.description || selectedLog.action || 'No description provided'}
              </p>
            </div>

            <div>
              <p className="text-slate-700 font-semibold mb-1">Details & Metadata Payload</p>
              <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-64">
                {JSON.stringify(selectedLog.details && Object.keys(selectedLog.details).length > 0 ? selectedLog.details : selectedLog, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LogsList;
