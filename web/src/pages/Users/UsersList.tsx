import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Shield, Truck, UserCheck, Mail, Phone, Calendar } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { User } from '../../types';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorBanner from '../../components/common/ErrorBanner';

export const UsersList: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const {
    data: drivers = [],
    isLoading: driversLoading,
    error: driversError,
    refetch: refetchDrivers,
  } = useQuery<User[]>({
    queryKey: ['admin-drivers'],
    queryFn: () => adminService.getDrivers(),
  });

  const {
    data: residents = [],
    isLoading: residentsLoading,
    error: residentsError,
    refetch: refetchResidents,
  } = useQuery<User[]>({
    queryKey: ['admin-residents'],
    queryFn: () => adminService.getResidents(),
  });

  const allUsers = useMemo(() => {
    const list: User[] = [
      ...drivers.map((d) => ({ ...d, role: 'driver' as const })),
      ...residents.map((r) => ({ ...r, role: 'resident' as const })),
    ];
    if (roleFilter === 'all') return list;
    return list.filter((u) => u.role === roleFilter);
  }, [drivers, residents, roleFilter]);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'name',
        header: 'User Account',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
              {row.original.name ? row.original.name[0] : 'U'}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{row.original.name}</p>
              <p className="text-xs text-slate-400 font-mono">
                ID: {row.original._id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const role = row.original.role;
          if (role === 'admin') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <Shield className="w-3 h-3" /> Admin
              </span>
            );
          }
          if (role === 'driver') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-brand-teal border border-teal-200">
                <Truck className="w-3 h-3" /> Collector
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <UserCheck className="w-3 h-3" /> Resident
            </span>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Email Address',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone Number',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.original.phone || 'N/A'}</span>
          </div>
        ),
      },
      {
        id: 'location',
        header: 'LGA / Ward',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {row.original.localGovt || 'Akure'} &middot; {row.original.ward || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined On',
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '—'}
          </span>
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">System User Accounts</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Central repository of all administrator, driver, and registered resident credentials.
          </p>
        </div>
      </div>

      {/* Role Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: 'All Roles' },
          { key: 'driver', label: 'Collectors (Drivers)' },
          { key: 'resident', label: 'Residents' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setRoleFilter(item.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              roleFilter === item.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {(driversError || residentsError) && (
        <ErrorBanner
          error={driversError || residentsError}
          title="Failed to load user accounts"
          onRetry={() => {
            if (driversError) refetchDrivers();
            if (residentsError) refetchResidents();
          }}
        />
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={allUsers}
        isLoading={driversLoading || residentsLoading}
        searchPlaceholder="Search users by name, email, or phone..."
        emptyTitle="No users found"
        emptyDescription="No user accounts match your selected filter."
      />
    </div>
  );
};

export default UsersList;
