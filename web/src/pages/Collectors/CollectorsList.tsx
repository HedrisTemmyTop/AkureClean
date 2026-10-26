import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Truck, Phone, Mail, CheckCircle, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { parseApiError } from '../../services/api';
import { useFeedback } from '../../context/FeedbackContext';
import { User } from '../../types';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ErrorBanner from '../../components/common/ErrorBanner';

export const CollectorsList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showSuccessModal } = useFeedback();
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [targetStatus, setTargetStatus] = useState<boolean>(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const {
    data: drivers = [],
    isLoading,
    error,
    refetch,
  } = useQuery<User[]>({
    queryKey: ['admin-drivers'],
    queryFn: () => adminService.getDrivers(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { id: string; isActive: boolean; reason?: string }) =>
      adminService.updateDriverStatus(params.id, params.isActive, params.reason),
    onSuccess: (_, variables) => {
      const driverName = selectedDriver?.name || 'Collector';
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedDriver(null);
      setDeactivationReason('');
      setReasonError(null);
      const actionText = variables.isActive ? 'activated' : 'deactivated';
      showSuccess(`${driverName}'s account has been ${actionText}.`, 'Status Updated');
      showSuccessModal(
        variables.isActive ? 'Collector Activated' : 'Collector Deactivated',
        `${driverName}'s account has been ${actionText} successfully.`
      );
    },
    onError: (err: unknown) => {
      const msg = parseApiError(err);
      setReasonError(msg);
      showError(msg, 'Status Update Failed');
    },
  });

  const handleOpenStatusModal = (driver: User, newActiveState: boolean) => {
    setSelectedDriver(driver);
    setTargetStatus(newActiveState);
    setDeactivationReason('');
    setReasonError(null);
  };

  const handleConfirmStatusChange = () => {
    if (!selectedDriver) return;
    if (!targetStatus && !deactivationReason.trim()) {
      const msg = 'A valid reason is required to deactivate or suspend a collector.';
      setReasonError(msg);
      showError(msg, 'Reason Required');
      return;
    }

    updateStatusMutation.mutate({
      id: selectedDriver._id,
      isActive: targetStatus,
      reason: deactivationReason.trim(),
    });
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'name',
        header: 'Collector / Driver',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center font-bold text-xs uppercase">
              {row.original.name ? row.original.name[0] : 'D'}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{row.original.name}</p>
              <p className="text-xs text-slate-500 font-mono">
                ID: {row.original._id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone / Contact',
        cell: ({ row }) => (
          <div className="text-xs text-slate-700 space-y-0.5">
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{row.original.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{row.original.email}</span>
            </div>
          </div>
        ),
      },
      {
        id: 'vehicle',
        header: 'Vehicle / Plate',
        cell: ({ row }) => (
          <div className="text-xs">
            <span className="font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              {(row.original as any).vehiclePlate || (row.original as any).vehicleNumber || 'AKR-TRUCK'}
            </span>
          </div>
        ),
      },
      {
        id: 'zone',
        header: 'Operational Area',
        cell: ({ row }) => (
          <div className="text-xs text-slate-600">
            <p className="font-medium text-slate-800">{row.original.localGovt || 'Akure South'}</p>
            <p className="text-[11px] text-slate-400">{row.original.ward || 'Central Ward'}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Account Status',
        cell: ({ row }) => {
          const isActive = row.original.isActive !== false && row.original.status !== 'inactive';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-red-600'}`} />
              {isActive ? 'Active' : 'Suspended'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Administrative Action',
        cell: ({ row }) => {
          const isActive = row.original.isActive !== false && row.original.status !== 'inactive';
          return (
            <button
              type="button"
              onClick={() => handleOpenStatusModal(row.original, !isActive)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </button>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Waste Collectors (Drivers)</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Authorized waste collection drivers, truck assignments, and real-time operational status.
          </p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          error={error}
          title="Failed to load waste collectors"
          onRetry={() => refetch()}
        />
      )}

      {/* Collectors Table */}
      <DataTable
        columns={columns}
        data={drivers}
        isLoading={isLoading}
        searchPlaceholder="Search collectors by name, phone, or email..."
        emptyTitle="No waste collectors found"
        emptyDescription="No driver accounts have been registered yet."
      />

      {/* Activation / Deactivation Modal */}
      <Modal
        isOpen={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        title={targetStatus ? 'Activate Collector Account' : 'Deactivate Collector Account'}
      >
        <div className="space-y-4">
          {reasonError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              {reasonError}
            </div>
          )}

          <p className="text-sm text-slate-600">
            {targetStatus
              ? `Are you sure you want to reactivate the account for ${selectedDriver?.name}? They will be able to receive collection tasks and operate waste trucks immediately.`
              : `Deactivating ${selectedDriver?.name} will prevent them from logging into the mobile app and taking active routes. A formal reason is required for administrative audit logs.`}
          </p>

          {!targetStatus && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Reason for Suspension / Deactivation <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="e.g. Driver requested leave, truck under maintenance, disciplinary review"
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedDriver(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updateStatusMutation.isPending}
              onClick={handleConfirmStatusChange}
              className={`px-4 py-2 text-white rounded-lg text-sm font-semibold transition-colors ${
                targetStatus ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {updateStatusMutation.isPending
                ? 'Saving...'
                : targetStatus
                ? 'Confirm Activation'
                : 'Confirm Deactivation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CollectorsList;
