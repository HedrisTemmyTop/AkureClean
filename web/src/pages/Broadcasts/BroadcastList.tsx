import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  Megaphone,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Users,
  Send,
  Eye,
  Sparkles,
  CheckCircle,
  Clock,
  Radio,
} from 'lucide-react';
import { broadcastService, CreateBroadcastPayload } from '../../services/broadcastService';
import { Broadcast } from '../../types';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ErrorBanner from '../../components/common/ErrorBanner';
import { useFeedback } from '../../context/FeedbackContext';

const TEMPLATES = [
  {
    title: 'Driver / Collection Delay Notice',
    message: 'Good day residents, our waste collection truck scheduled for today has experienced a temporary mechanical delay. Driver won\'t be coming today. Collections will take place tomorrow morning. Thank you for your patience.',
    priority: 'urgent' as const,
  },
  {
    title: 'Public Holiday Collection Schedule',
    message: 'Notice to all residents: There will be no municipal waste collection on the upcoming public holiday. Normal collection operations will resume on the next working day.',
    priority: 'info' as const,
  },
  {
    title: 'Heavy Rain / Weather Advisory',
    message: 'Due to severe rainfall and flooding in parts of Akure, collection rounds are temporarily delayed today to protect road safety. Pickup will resume as soon as the weather clears.',
    priority: 'urgent' as const,
  },
  {
    title: 'Monthly Environmental Sanitation Reminder',
    message: 'Reminder: The state-wide environmental sanitation exercise takes place this Saturday from 7:00 AM to 10:00 AM. Please ensure your waste bags are securely tied and placed at designated points.',
    priority: 'normal' as const,
  },
];

export const BroadcastList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFeedback();

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [viewingBroadcast, setViewingBroadcast] = useState<Broadcast | null>(null);

  // Compose Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'info'>('normal');
  const [targetAudience, setTargetAudience] = useState<'all_residents' | 'all_users' | 'drivers'>('all_residents');

  // Queries
  const { data: broadcasts = [], isLoading, error } = useQuery<Broadcast[]>({
    queryKey: ['broadcasts'],
    queryFn: broadcastService.getBroadcasts,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateBroadcastPayload) => broadcastService.createBroadcast(payload),
    onSuccess: (data) => {
      showSuccess(`Broadcast successfully dispatched to ${data.recipientsCount} recipient(s)!`);
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      setIsComposeOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Failed to dispatch broadcast');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => broadcastService.deleteBroadcast(id),
    onSuccess: () => {
      showSuccess('Broadcast deleted from history.');
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Failed to delete broadcast');
    },
  });

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setPriority('normal');
    setTargetAudience('all_residents');
  };

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setPriority(tmpl.priority);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showError('Please provide both a title and message body.');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      priority,
      targetAudience,
    });
  };

  // Metrics
  const totalBroadcasts = broadcasts.length;
  const totalRecipientsReached = broadcasts.reduce((acc, b) => acc + (b.recipientsCount || 0), 0);
  const urgentCount = broadcasts.filter((b) => b.priority === 'urgent').length;

  const columns = useMemo<ColumnDef<Broadcast>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date & Time',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800">
              {new Date(info.getValue() as string).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-[11px] text-slate-400">
              {new Date(info.getValue() as string).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: (info) => {
          const val = info.getValue() as string;
          if (val === 'urgent') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                URGENT
              </span>
            );
          }
          if (val === 'info') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                INFO
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
              NOTICE
            </span>
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Announcement',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="max-w-md">
              <div className="text-sm font-bold text-slate-900 truncate">{row.title}</div>
              <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{row.message}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'targetAudience',
        header: 'Audience',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {row.targetAudience === 'all_residents' ? 'All Residents' : row.targetAudience}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'recipientsCount',
        header: 'Recipients',
        cell: (info) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
            {Number(info.getValue() || 0)} residents
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewingBroadcast(row.original)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
              title="View full broadcast details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete broadcast "${row.original.title}" from history?`)) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Delete broadcast"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resident Broadcasts</h1>
            <p className="text-sm text-slate-500 mt-1">
              Dispatch official announcements, driver delay notices, and urgent alerts directly to
              residents' inboxes and mobile push notifications.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsComposeOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Compose Broadcast
        </button>
      </div>

      {error && <ErrorBanner error={error} />}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Dispatched</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{totalBroadcasts}</div>
          <p className="text-xs text-slate-500 mt-1">Announcements sent to date</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Reached</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{totalRecipientsReached}</div>
          <p className="text-xs text-slate-500 mt-1">Total resident inbox deliveries</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Urgent Alerts</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-600 mt-3">{urgentCount}</div>
          <p className="text-xs text-slate-500 mt-1">High-priority service notices</p>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Broadcast History</h2>
          <span className="text-xs font-medium text-slate-400">Showing {broadcasts.length} past dispatches</span>
        </div>
        <DataTable
          columns={columns}
          data={broadcasts}
          isLoading={isLoading}
          searchPlaceholder="Search broadcasts by title or message content..."
        />
      </div>

      {/* Compose Broadcast Modal */}
      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="Compose Broadcast Announcement"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick Templates Pill Bar */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition text-left"
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all_residents">All Registered Residents</option>
                <option value="all_users">All Users (Residents & Drivers)</option>
                <option value="drivers">Drivers Only</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="normal">Normal Notice (Green Badge)</option>
                <option value="urgent">Urgent Alert (Red Banner & Push)</option>
                <option value="info">Information (Blue Badge)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Broadcast Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Driver Won't Be Coming Today / Schedule Delay"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Message Content</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message clearly to residents..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Information Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              This will immediately insert in-app inbox messages for all target residents and send
              push notifications to devices with registered push tokens.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsComposeOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {createMutation.isPending ? 'Dispatching...' : 'Send Broadcast Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Broadcast Details Modal */}
      {viewingBroadcast && (
        <Modal
          isOpen={Boolean(viewingBroadcast)}
          onClose={() => setViewingBroadcast(null)}
          title="Broadcast Announcement Details"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    viewingBroadcast.priority === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : viewingBroadcast.priority === 'info'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {viewingBroadcast.priority.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(viewingBroadcast.createdAt).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-600">
                {viewingBroadcast.recipientsCount} Recipients
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{viewingBroadcast.title}</h3>
              <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                {viewingBroadcast.message}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Audience: {viewingBroadcast.targetAudience}</span>
              <span>Dispatched by: {viewingBroadcast.senderName || 'Admin'}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default BroadcastList;
