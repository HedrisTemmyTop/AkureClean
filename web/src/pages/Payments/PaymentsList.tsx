import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Users,
  Search,
  Receipt,
  FileText,
  AlertTriangle,
  Building,
  Home,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useFeedback } from '../../context/FeedbackContext';
import {
  Bill,
  ResidentBillingSummary,
  ResidentBillingLedger,
} from '../../types';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorBanner from '../../components/common/ErrorBanner';

export const PaymentsList: React.FC = () => {
  const { showSuccess } = useFeedback();
  // Tabs: 'arrears' | 'transactions'
  const [activeTab, setActiveTab] = useState<'arrears' | 'transactions'>('arrears');

  // Arrears Tab state
  const [arrearsFilter, setArrearsFilter] = useState<'all' | 'in_arrears' | 'up_to_date'>('all');
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

  // Transactions Tab state
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // 1. Fetch Resident Balances & Arrears
  const {
    data: billingData,
    isLoading: isLoadingBilling,
    error: billingError,
    refetch: refetchBilling,
  } = useQuery({
    queryKey: ['admin-residents-billing', arrearsFilter],
    queryFn: () => adminService.getResidentsBillingSummary({ filter: arrearsFilter }),
  });

  const residentSummaries = billingData?.data || [];
  const billingMeta = billingData?.meta || {
    totalResidents: 0,
    residentsInArrearsCount: 0,
    totalArrears: 0,
    totalCollected: 0,
  };

  // 2. Fetch Paystack Transaction Log
  const {
    data: bills = [],
    isLoading: isLoadingBills,
    error: billsError,
    refetch: refetchBills,
  } = useQuery<Bill[]>({
    queryKey: ['admin-payments'],
    queryFn: () => adminService.getAllPayments(),
  });

  // 3. Fetch Selected Resident Ledger History
  const {
    data: residentLedger,
    isLoading: isLoadingLedger,
    error: ledgerError,
    refetch: refetchLedger,
  } = useQuery<ResidentBillingLedger>({
    queryKey: ['admin-resident-ledger', selectedResidentId],
    queryFn: () => adminService.getResidentBillingHistory(selectedResidentId!),
    enabled: !!selectedResidentId,
  });

  const filteredBills = useMemo(() => {
    if (!bills) return [];
    if (transactionStatusFilter === 'all') return bills;
    return bills.filter((b) => b.status?.toLowerCase() === transactionStatusFilter.toLowerCase());
  }, [bills, transactionStatusFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    showSuccess(`Reference "${text}" copied to clipboard.`, 'Copied');
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // ── Resident Balances Table Columns ─────────────────────────────────────────
  const residentColumns = useMemo<ColumnDef<ResidentBillingSummary>[]>(
    () => [
      {
        id: 'resident',
        header: 'Resident Subscriber',
        cell: ({ row }) => {
          const r = row.original.resident;
          return (
            <div>
              <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
              <p className="text-xs text-slate-500">{r.phone || r.email}</p>
              {r.pollingUnit && (
                <span className="inline-block mt-0.5 text-[10px] text-teal-700 font-medium bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  PU: {r.pollingUnit}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'propertyType',
        header: 'Property Tariff Category',
        cell: ({ row }) => {
          const r = row.original.resident;
          const type = r.houseType || 'Residential building';
          let icon = <Home className="w-3.5 h-3.5 text-blue-500" />;
          if (type === 'Shop') icon = <Building className="w-3.5 h-3.5 text-amber-500" />;
          if (type === 'Company') icon = <Briefcase className="w-3.5 h-3.5 text-purple-500" />;

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                {icon}
                <span>{type}</span>
              </div>
              {type === 'Company' && r.numberOfWorkersRange && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {r.numberOfWorkersRange}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'monthlyTariff',
        header: 'Monthly Tariff',
        cell: ({ row }) => (
          <span className="font-semibold text-xs text-slate-800">
            ₦{Number(row.original.monthlyTariff || 0).toLocaleString()}/mo
          </span>
        ),
      },
      {
        id: 'lastPayment',
        header: 'Last Payment',
        cell: ({ row }) => {
          const d = row.original.lastPaymentDate;
          if (!d) return <span className="text-xs text-slate-400 italic">Never paid</span>;
          return (
            <div className="text-xs text-slate-600">
              <p className="font-medium text-slate-800">{new Date(d).toLocaleDateString()}</p>
              {row.original.lastPaymentReference && (
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                  {row.original.lastPaymentReference}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'outstandingMonths',
        header: 'Unpaid Cycles',
        cell: ({ row }) => {
          const months = row.original.outstandingMonths;
          if (months === 0) {
            return (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3" /> Up to date
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Clock className="w-3 h-3" /> {months} month{months > 1 ? 's' : ''}
            </span>
          );
        },
      },
      {
        accessorKey: 'outstandingAmount',
        header: 'Total Amount Owed',
        cell: ({ row }) => {
          const amt = row.original.outstandingAmount;
          if (amt === 0) {
            return <span className="text-xs font-bold text-emerald-600">₦0 (Cleared)</span>;
          }
          return (
            <span className="text-sm font-extrabold text-rose-600">
              ₦{Number(amt).toLocaleString()}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Ledger',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedResidentId(row.original.resident._id || row.original.resident.id);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-teal-50 text-brand-teal hover:bg-brand-teal hover:text-white rounded border border-teal-200 transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            View Ledger
          </button>
        ),
      },
    ],
    []
  );

  // ── Paystack Transactions Table Columns ─────────────────────────────────────
  const transactionColumns = useMemo<ColumnDef<Bill>[]>(
    () => [
      {
        accessorKey: '_id',
        header: 'Invoice ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            #{row.original._id.slice(-8).toUpperCase()}
          </span>
        ),
      },
      {
        id: 'resident',
        header: 'Resident Subscriber',
        cell: ({ row }) => {
          const u = row.original.userId;
          if (typeof u === 'object' && u) {
            return (
              <div>
                <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
                <p className="text-xs text-slate-500">{u.phone || u.email}</p>
              </div>
            );
          }
          return <span className="text-xs text-slate-500">User {String(u).slice(-6)}</span>;
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-bold text-sm text-slate-900">
            ₦{Number(row.original.amount || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'billingPeriod',
        header: 'Billing Period',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600 font-medium">
            {row.original.billingPeriod || 'Monthly Standard'}
          </span>
        ),
      },
      {
        id: 'reference',
        header: 'Paystack Reference',
        cell: ({ row }) => {
          const ref = row.original.paymentReference;
          if (!ref) return <span className="text-xs text-slate-400">—</span>;

          const isCopied = copiedRef === ref;
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
              <span className="truncate max-w-[130px]">{ref}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(ref);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="Copy Reference"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
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
        accessorKey: 'paymentDate',
        header: 'Paid Date',
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {row.original.paymentDate
              ? new Date(row.original.paymentDate).toLocaleDateString()
              : row.original.dueDate
              ? `Due ${new Date(row.original.dueDate).toLocaleDateString()}`
              : '—'}
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
              setSelectedBill(row.original);
            }}
            className="text-xs font-semibold text-brand-teal hover:underline"
          >
            Invoice
          </button>
        ),
      },
    ],
    [copiedRef]
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Payments & Billing</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit Paystack transactions, track resident arrears, and review individual payment ledgers.
          </p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settled Revenue</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            ₦{Number(billingMeta.totalCollected || 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Verified Paystack settlements</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding Arrears</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">
            ₦{Number(billingMeta.totalArrears || 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Unpaid cumulative waste levies</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Residents in Arrears</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">
            {billingMeta.residentsInArrearsCount}{' '}
            <span className="text-xs text-slate-400 font-normal">
              / {billingMeta.totalResidents}
            </span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Subscribers with overdue balances</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{bills.length}</p>
          <p className="text-xs text-slate-500 mt-1">Recorded bill records</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('arrears')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'arrears'
              ? 'border-brand-teal text-brand-teal bg-teal-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Resident Balances & Arrears
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
            {residentSummaries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'transactions'
              ? 'border-brand-teal text-brand-teal bg-teal-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Paystack Transaction Log
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
            {bills.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Resident Balances & Arrears */}
      {activeTab === 'arrears' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Subscribers' },
              { id: 'in_arrears', label: 'In Arrears (Owing)' },
              { id: 'up_to_date', label: 'Up To Date (Cleared)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setArrearsFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-colors ${
                  arrearsFilter === f.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {billingError && (
            <ErrorBanner
              error={billingError}
              title="Failed to load resident billing summary"
              onRetry={() => refetchBilling()}
            />
          )}

          <DataTable
            columns={residentColumns}
            data={residentSummaries}
            isLoading={isLoadingBilling}
            searchPlaceholder="Search residents by name, phone, email, PU, or address..."
            emptyTitle="No resident billing records found"
            emptyDescription="No subscriber matches the selected filter."
            onRowClick={(row) =>
              setSelectedResidentId(row.resident._id || row.resident.id)
            }
          />
        </div>
      )}

      {/* TAB 2: Paystack Transaction Log */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'paid', 'pending', 'overdue'].map((st) => (
              <button
                key={st}
                onClick={() => setTransactionStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  transactionStatusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {billsError && (
            <ErrorBanner
              error={billsError}
              title="Failed to load payment transactions"
              onRetry={() => refetchBills()}
            />
          )}

          <DataTable
            columns={transactionColumns}
            data={filteredBills}
            isLoading={isLoadingBills}
            searchPlaceholder="Search bills by invoice ID, resident, or Paystack reference..."
            emptyTitle="No billing records found"
            emptyDescription="No invoices or payment transactions recorded for this filter."
            onRowClick={(b) => setSelectedBill(b)}
          />
        </div>
      )}

      {/* ── Resident Ledger Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={!!selectedResidentId}
        onClose={() => setSelectedResidentId(null)}
        title={
          residentLedger
            ? `Billing Ledger: ${residentLedger.resident.name}`
            : 'Loading Ledger...'
        }
      >
        {isLoadingLedger ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner message="Loading resident billing ledger..." />
          </div>
        ) : ledgerError ? (
          <ErrorBanner
            error={ledgerError}
            title="Failed to load resident ledger"
            onRetry={() => refetchLedger()}
          />
        ) : residentLedger ? (
          <div className="space-y-5 text-xs">
            {/* Resident Profile Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {residentLedger.resident.name}
                  </h3>
                  <p className="text-slate-500">
                    {residentLedger.resident.phone} • {residentLedger.resident.email}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {residentLedger.resident.houseType || 'Residential building'}
                  </span>
                  {residentLedger.resident.pollingUnit && (
                    <p className="text-[10px] text-teal-700 font-mono mt-0.5">
                      Polling Unit: {residentLedger.resident.pollingUnit}
                    </p>
                  )}
                </div>
              </div>

              {residentLedger.resident.address && (
                <p className="text-slate-600">
                  <span className="font-medium text-slate-700">Address:</span>{' '}
                  {residentLedger.resident.address} ({residentLedger.resident.ward || 'Ward'}, {residentLedger.resident.localGovt || 'Akure South'})
                </p>
              )}
            </div>

            {/* Arrears & Tariff Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Monthly Rate</span>
                <span className="text-sm font-bold text-slate-900">
                  ₦{residentLedger.monthlyTariff.toLocaleString()}/mo
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Unpaid Cycles</span>
                <span className="text-sm font-bold text-amber-700">
                  {residentLedger.outstandingMonths} month{residentLedger.outstandingMonths > 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Amount Owed</span>
                <span className="text-sm font-extrabold text-rose-600">
                  ₦{residentLedger.outstandingAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block">Total Settled</span>
                <span className="text-sm font-bold text-emerald-700">
                  ₦{residentLedger.totalPaid.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Historical Bills Table */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Payment & Invoicing History ({residentLedger.bills.length})</span>
                {residentLedger.lastPaymentDate && (
                  <span className="text-[11px] font-normal text-slate-500">
                    Last paid: {new Date(residentLedger.lastPaymentDate).toLocaleDateString()}
                  </span>
                )}
              </h4>

              {residentLedger.bills.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <p className="text-slate-500 font-medium">No previous invoices or payments recorded</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Charges accrue monthly based on registration date.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Cycle</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Paystack Reference</th>
                        <th className="px-3 py-2">Date Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {residentLedger.bills.map((bill) => (
                        <tr key={bill.id || bill._id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {bill.month ? `Month ${bill.month}, ` : ''}{bill.year || 'Annual'}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            ₦{Number(bill.amount).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={bill.status} />
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                            {bill.paystackReference || '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedResidentId(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Close Ledger
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Transaction Invoice Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={`Invoice #${selectedBill?._id.slice(-8).toUpperCase()}`}
      >
        {selectedBill && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Invoice Amount</span>
                <span className="text-lg font-extrabold text-slate-900">
                  ₦{Number(selectedBill.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Status</span>
                <StatusBadge status={selectedBill.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Billing Period</span>
                <span className="font-semibold text-slate-800">
                  {selectedBill.billingPeriod || 'Standard Period'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Paystack Transaction Details</h4>
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedBill.paymentReference || selectedBill.paystackReference || 'Unsettled / Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel / Gateway:</span>
                  <span className="font-medium text-slate-800">Paystack Nigeria</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date Logged:</span>
                  <span className="text-slate-800">
                    {selectedBill.paymentDate
                      ? new Date(selectedBill.paymentDate).toLocaleString()
                      : selectedBill.createdAt
                      ? new Date(selectedBill.createdAt).toLocaleString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedBill(null)}
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

export default PaymentsList;
