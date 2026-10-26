import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Users, Phone, Mail, MapPin, Home, Calendar, Eye } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { User } from '../../types';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ErrorBanner from '../../components/common/ErrorBanner';

export const ResidentsList: React.FC = () => {
  const [selectedResident, setSelectedResident] = useState<User | null>(null);

  const {
    data: residents = [],
    isLoading,
    error,
    refetch,
  } = useQuery<User[]>({
    queryKey: ['admin-residents'],
    queryFn: () => adminService.getResidents(),
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'name',
        header: 'Resident Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
              {row.original.name ? row.original.name[0] : 'R'}
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
        header: 'Contact',
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
        accessorKey: 'address',
        header: 'Street Address',
        cell: ({ row }) => (
          <div className="text-xs max-w-xs">
            <p className="text-slate-800 truncate" title={row.original.address}>
              {row.original.address || 'Akure'}
            </p>
            {row.original.houseDescription && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5" title={row.original.houseDescription}>
                {row.original.houseDescription}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'jurisdiction',
        header: 'LGA & Polling Unit',
        cell: ({ row }) => (
          <div className="text-xs text-slate-600">
            <p className="font-medium text-slate-800">{row.original.localGovt || 'Akure'}</p>
            <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
              {row.original.pollingUnit || row.original.ward || '—'}
            </p>
          </div>
        ),
      },
      {
        id: 'housing',
        header: 'Housing Type',
        cell: ({ row }) => {
          const ht = (row.original as any).housingType || 'Standard';
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
              <Home className="w-3 h-3 text-slate-400" />
              <span>{ht}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Registered',
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedResident(row.original);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-teal bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Profile</span>
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Registered Residents</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Directory of households and commercial waste subscribers across Akure South and North.
          </p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          error={error}
          title="Failed to load registered residents"
          onRetry={() => refetch()}
        />
      )}

      {/* Residents Table */}
      <DataTable
        columns={columns}
        data={residents}
        isLoading={isLoading}
        searchPlaceholder="Search residents by name, phone, address, or polling unit..."
        emptyTitle="No residents found"
        emptyDescription="There are currently no registered resident accounts in the system."
        onRowClick={(r) => setSelectedResident(r)}
      />

      {/* Resident Details Modal */}
      <Modal
        isOpen={!!selectedResident}
        onClose={() => setSelectedResident(null)}
        title={`Resident Profile: ${selectedResident?.name || 'Household'}`}
        maxWidth="lg"
      >
        {selectedResident && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 bg-slate-50 rounded-xl">
              <div className="min-w-0">
                <p className="text-slate-500">Contact Email</p>
                <p className="font-medium text-slate-800 text-sm mt-0.5 break-all">{selectedResident.email}</p>
              </div>
              <div className="min-w-0">
                <p className="text-slate-500">Phone Number</p>
                <p className="font-medium text-slate-800 text-sm mt-0.5 break-words">{selectedResident.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Location & Property Description</h4>
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-teal flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 break-words">{selectedResident.address || 'Akure'}</p>
                    <p className="text-slate-500 break-words">{selectedResident.houseDescription || 'No additional landmark details provided.'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <span className="text-slate-400 block">LGA:</span>
                    <span className="font-semibold text-slate-700 break-words">{selectedResident.localGovt || '—'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block">Ward:</span>
                    <span className="font-semibold text-slate-700 break-words">{selectedResident.ward || '—'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block">Polling Unit:</span>
                    <span className="font-semibold text-slate-700 break-words block">
                      {selectedResident.pollingUnit || '—'}
                    </span>
                  </div>
                </div>

                {selectedResident.location?.coordinates && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">GPS Coordinates:</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {selectedResident.location.coordinates[1].toFixed(6)},{' '}
                      {selectedResident.location.coordinates[0].toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedResident(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
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

export default ResidentsList;
