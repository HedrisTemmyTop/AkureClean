import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Route, Eye, Calendar, User, CheckCircle2 } from 'lucide-react';
import { taskService } from '../../services/taskService';
import { AssignmentRoute } from '../../types';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorBanner from '../../components/common/ErrorBanner';

export const TaskList: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: tasks = [], isLoading, error, refetch } = useQuery<AssignmentRoute[]>({
    queryKey: ['collection-tasks'],
    queryFn: () => taskService.getAssignments(),
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (statusFilter === 'all') return tasks;
    return tasks.filter((t) => t.status?.toLowerCase() === statusFilter.toLowerCase());
  }, [tasks, statusFilter]);

  const columns = useMemo<ColumnDef<AssignmentRoute>[]>(
    () => [
      {
        accessorKey: '_id',
        header: 'Task ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            #{row.original._id.slice(-8).toUpperCase()}
          </span>
        ),
      },
      {
        id: 'driver',
        header: 'Assigned Collector',
        cell: ({ row }) => {
          const d = row.original.driver;
          if (typeof d === 'object' && d !== null) {
            return (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                  {d.name ? d.name[0] : 'D'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.phone || d.email}</p>
                </div>
              </div>
            );
          }
          return <span className="text-slate-400 text-xs">Driver {String(d).slice(-6)}</span>;
        },
      },
      {
        accessorKey: 'scheduledDate',
        header: 'Scheduled Date',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(row.original.scheduledDate).toLocaleDateString()}</span>
          </div>
        ),
      },
      {
        id: 'stops',
        header: 'Stops & Progress',
        cell: ({ row }) => {
          const stops = row.original.stops || [];
          const completed = stops.filter((s) => s.status === 'completed').length;
          const total = stops.length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div className="space-y-1 min-w-[120px]">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{completed} / {total} stops</span>
                <span className="font-medium text-slate-800">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-teal rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tasks/${row.original._id}`);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-teal bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Route</span>
            </button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Collection Tasks</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage and monitor OSRM-optimized collection routes dispatched to waste collectors.
          </p>
        </div>
        <button
          onClick={() => navigate('/tasks/create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-teal hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection Task</span>
        </button>
      </div>

      {/* Filter component */}
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'planned', 'in_progress', 'completed', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          title="Failed to load collection tasks"
          onRetry={() => refetch()}
        />
      )}

      {/* Tasks Table */}
      <DataTable
        columns={columns}
        data={filteredTasks}
        isLoading={isLoading}
        searchPlaceholder="Search by Task ID or collector name..."
        emptyTitle="No collection tasks found"
        emptyDescription={
          statusFilter !== 'all'
            ? `There are no collection tasks with status "${statusFilter}".`
            : 'No collection tasks have been created yet. Click "New Collection Task" to get started.'
        }
        onRowClick={(task) => navigate(`/tasks/${task._id}`)}
      />
    </div>
  );
};

export default TaskList;
