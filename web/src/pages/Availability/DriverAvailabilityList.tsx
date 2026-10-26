import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFeedback } from "../../context/FeedbackContext";
import { ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Eye,
  Phone,
  Mail,
  XCircle,
} from "lucide-react";
import {
  availabilityService,
  AdminAvailabilityResponse,
  AdminDriverAvailabilityItem,
} from "../../services/availabilityService";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import ErrorBanner from "../../components/common/ErrorBanner";

const pad2 = (n: number) => String(n).padStart(2, "0");

const getDefaultMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
};

export const DriverAvailabilityList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFeedback();
  const [monthKey, setMonthKey] = useState<string>(getDefaultMonthKey);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "awaiting" | "approved" | "rejected" | "pending"
  >("all");
  const [selectedItem, setSelectedItem] =
    useState<AdminDriverAvailabilityItem | null>(null);
  const [rejectingItem, setRejectingItem] =
    useState<AdminDriverAvailabilityItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<AdminAvailabilityResponse>({
    queryKey: ["admin-driver-availability", monthKey],
    queryFn: () => availabilityService.getAllDriversAvailability(monthKey),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => availabilityService.approveAvailability(id),
    onSuccess: () => {
      showSuccess("Availability approved. It is now visible to residents.");
      setSelectedItem(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-driver-availability", monthKey],
      });
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to approve availability"
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      availabilityService.rejectAvailability(id, reason),
    onSuccess: () => {
      showSuccess("Availability rejected with reason.");
      setRejectingItem(null);
      setRejectionReason("");
      setSelectedItem(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-driver-availability", monthKey],
      });
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to reject availability"
      );
    },
  });

  const filteredDrivers = useMemo(() => {
    const list = data?.drivers || [];
    if (statusFilter === "awaiting") {
      return list.filter(
        (d) => d.hasAvailability && d.approvalStatus === "pending"
      );
    }
    if (statusFilter === "approved") {
      return list.filter((d) => d.approvalStatus === "approved");
    }
    if (statusFilter === "rejected") {
      return list.filter((d) => d.approvalStatus === "rejected");
    }
    if (statusFilter === "pending") {
      return list.filter((d) => !d.hasAvailability);
    }
    return list;
  }, [data, statusFilter]);

  const formatShortDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const columns = useMemo<ColumnDef<AdminDriverAvailabilityItem>[]>(
    () => [
      {
        id: "driver",
        accessorFn: (row) =>
          `${row.driver.name} ${row.driver.email} ${row.driver.phone} ${row.coverage.localGovts.join(" ")} ${row.coverage.pollingUnits.join(" ")}`,
        header: "Collector (Driver)",
        cell: ({ row }) => {
          const drv = row.original.driver;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {drv.name ? drv.name[0] : "D"}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  {drv.name}
                </p>
                <p className="text-xs text-slate-500">
                  {drv.phone || drv.email} •{" "}
                  <span className="font-mono">{drv.truckPlateNumber}</span>
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "coverage",
        header: "Assigned Area (LGA & Polling Units)",
        cell: ({ row }) => {
          const cov = row.original.coverage;
          if (cov.pollingUnits.length === 0) {
            return (
              <span className="text-xs text-slate-400 italic">
                No Polling Units assigned yet
              </span>
            );
          }
          return (
            <div className="text-xs space-y-0.5 max-w-xs">
              <p className="font-semibold text-slate-800">
                {cov.localGovts.join(", ") || "Akure"} •{" "}
                {cov.wards.slice(0, 2).join(", ")}
                {cov.wards.length > 2 ? ` +${cov.wards.length - 2}` : ""}
              </p>
              <p
                className="text-[11px] text-slate-500 truncate"
                title={cov.pollingUnits.join(", ")}
              >
                {cov.pollingUnits.length} Polling Unit
                {cov.pollingUnits.length === 1 ? "" : "s"}:{" "}
                {cov.pollingUnits.slice(0, 2).join(", ")}
                {cov.pollingUnits.length > 2
                  ? ` +${cov.pollingUnits.length - 2} more`
                  : ""}
              </p>
            </div>
          );
        },
      },
      {
        id: "weeklySchedule",
        header: "Selected Weekly Pickup Days (1 Day / Week)",
        cell: ({ row }) => {
          const slots = row.original.slots || [];
          if (slots.length === 0) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>No days selected for {row.original.monthKey}</span>
              </span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1.5 max-w-md">
              {slots.map((slot) => (
                <div
                  key={slot.date}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-teal-50/80 border border-teal-200 text-teal-950"
                >
                  <span className="font-bold text-brand-teal">
                    W{slot.weekNumber}:
                  </span>
                  <span className="font-medium">
                    {formatShortDate(slot.date)}
                  </span>
                  {(slot.pickupsCount || 0) > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-teal text-white">
                      {slot.pickupsCount} booked
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: "bookings",
        header: "Resident Bookings",
        cell: ({ row }) => {
          const count = row.original.totalPickupsThisMonth || 0;
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span
                className={
                  count > 0
                    ? "font-semibold text-brand-teal"
                    : "text-slate-500"
                }
              >
                {count} Pickup{count === 1 ? "" : "s"}
              </span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Approval Status",
        cell: ({ row }) => {
          const st = row.original.approvalStatus;
          const cfg =
            st === "approved"
              ? {
                  cls: "bg-emerald-50 text-emerald-800 border border-emerald-200",
                  dot: "bg-emerald-600",
                  label: "Approved",
                }
              : st === "rejected"
                ? {
                    cls: "bg-rose-50 text-rose-800 border border-rose-200",
                    dot: "bg-rose-600",
                    label: "Rejected",
                  }
              : st === "pending" && row.original.hasAvailability
                ? {
                    cls: "bg-amber-50 text-amber-800 border border-amber-200",
                    dot: "bg-amber-500",
                    label: "Awaiting Approval",
                  }
                : {
                    cls: "bg-slate-100 text-slate-600 border border-slate-200",
                    dot: "bg-slate-400",
                    label: "Not Submitted",
                  };
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const item = row.original;
          const canAct =
            item.hasAvailability &&
            item.approvalStatus === "pending" &&
            !!item.availabilityId;
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-teal bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
              {canAct && (
                <>
                  <button
                    type="button"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      approveMutation.mutate(item.availabilityId!);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-brand-teal hover:opacity-90 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRejectingItem(item);
                      setRejectionReason("");
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [approveMutation.isPending, rejectMutation.isPending]
  );

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Collector Monthly Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review and approve the 1-day-per-week monthly pickup schedules set
            by assigned collectors. Residents only see approved days, and
            approved schedules can no longer be edited by the collector.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Month:
          </label>
          <input
            type="month"
            value={monthKey}
            onChange={(e) => e.target.value && setMonthKey(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
          />
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Total Collectors
              </p>
              <p className="text-xl font-bold text-slate-900">
                {summary.totalDrivers}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Approved &amp; Published
              </p>
              <p className="text-xl font-bold text-emerald-700">
                {summary.approvedCount}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Awaiting Approval
              </p>
              <p className="text-xl font-bold text-amber-700">
                {summary.awaitingApproval}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Rejected
              </p>
              <p className="text-xl font-bold text-rose-700">
                {summary.rejectedCount || 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Not Submitted
              </p>
              <p className="text-xl font-bold text-slate-700">
                {summary.driversPendingAvailability}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Scheduled Pickup Days
              </p>
              <p className="text-xl font-bold text-brand-teal">
                {summary.totalScheduledDays}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "All Collectors" },
            { key: "awaiting", label: "Awaiting Approval" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
            { key: "pending", label: "Not Submitted" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              statusFilter === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <ErrorBanner
          error={error}
          title="Failed to load collector availability"
          onRetry={() => refetch()}
        />
      )}

      {/* Collectors Availability Table */}
      <DataTable
        columns={columns}
        data={filteredDrivers}
        isLoading={isLoading}
        searchPlaceholder="Search by collector name, LGA, or polling unit..."
        emptyTitle="No collector availability records found"
        emptyDescription="No collectors match the current filter."
        onRowClick={(item) => setSelectedItem(item)}
      />

      {/* Collector Monthly Schedule Details Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => {
          if (!approveMutation.isPending && !rejectMutation.isPending) {
            setSelectedItem(null);
          }
        }}
        preventClose={approveMutation.isPending || rejectMutation.isPending}
        title={
          selectedItem
            ? `${selectedItem.driver.name} — ${selectedItem.monthKey} Availability`
            : "Collector Availability"
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Driver Info */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-slate-900 text-sm min-w-0 break-words">
                  {selectedItem.driver.name}
                </p>
                <span className="font-mono font-semibold px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800 flex-shrink-0">
                  {selectedItem.driver.truckPlateNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="min-w-0">
                  <p className="text-slate-400 inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </p>
                  <p className="font-medium text-slate-800 break-words">
                    {selectedItem.driver.phone || "N/A"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </p>
                  <p className="font-medium text-slate-800 break-all">
                    {selectedItem.driver.email}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 inline-flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Truck Capacity
                  </p>
                  <p className="font-medium text-slate-800 break-words">
                    {selectedItem.driver.truckCapacity || "N/A"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Address
                  </p>
                  <p className="font-medium text-slate-800 break-words">
                    {selectedItem.driver.address || "Not provided"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400">LGA / Ward</p>
                  <p className="font-medium text-slate-800 break-words">
                    {[selectedItem.driver.localGovt, selectedItem.driver.ward]
                      .filter(Boolean)
                      .join(" • ") || "Not provided"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400">Polling Unit</p>
                  <p className="font-medium text-slate-800 break-words">
                    {selectedItem.driver.pollingUnit || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly Slots Breakdown */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1-Day-Per-Week Schedule ({selectedItem.monthKey})
              </h4>

              {selectedItem.slots.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    This collector has not selected their available days for{" "}
                    {selectedItem.monthKey} yet.
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {selectedItem.slots.map((slot) => (
                    <div
                      key={slot.date}
                      className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-50 text-brand-teal border border-teal-200">
                            Week {slot.weekNumber}
                          </span>
                          <span className="font-semibold text-sm text-slate-900">
                            {new Date(
                              `${slot.date}T12:00:00`
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {slot.timeSlot || "08:00 AM"}
                        </span>
                      </div>

                      {slot.pickups && slot.pickups.length > 0 ? (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <p className="text-[11px] font-semibold text-brand-teal">
                            {slot.pickups.length} Resident Pickup Request
                            {slot.pickups.length === 1 ? "" : "s"} Scheduled on
                            This Day:
                          </p>
                          {slot.pickups.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {p.residentName}{" "}
                                  <span className="font-normal text-slate-500">
                                    ({p.type})
                                  </span>
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {p.pollingUnit} • {p.address}
                                </p>
                              </div>
                              <StatusBadge status={p.status} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          No resident pickup requests booked for this date yet.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedItem.notes && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-semibold text-slate-700">Collector Note:</p>
                <p className="text-slate-600 mt-0.5">{selectedItem.notes}</p>
              </div>
            )}

            {selectedItem.hasAvailability &&
              selectedItem.approvalStatus === "pending" && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Approving this schedule publishes these days to residents in
                  the collector's assigned area and locks the collector from
                  changing them. You can also reject it with a reason to request
                  changes.
                </div>
              )}
            {selectedItem.approvalStatus === "rejected" && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Rejected by Admin</span>
                </div>
                <p className="text-rose-800 pl-6">
                  Reason: "{selectedItem.rejectionReason || "No reason specified"}"
                </p>
                <p className="text-[11px] text-rose-600 pl-6">
                  The collector can edit their schedule and resubmit for approval.
                </p>
              </div>
            )}
            {selectedItem.approvalStatus === "approved" && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Approved
                  {selectedItem.approvedAt
                    ? ` on ${new Date(selectedItem.approvedAt).toLocaleDateString()}`
                    : ""}
                  . Visible to residents and locked for the collector.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              {selectedItem.hasAvailability &&
                selectedItem.approvalStatus === "pending" &&
                selectedItem.availabilityId && (
                  <>
                    <button
                      type="button"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      onClick={() =>
                        approveMutation.mutate(selectedItem.availabilityId!)
                      }
                      className="px-4 py-2 bg-brand-teal text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {approveMutation.isPending
                        ? "Approving..."
                        : "Approve Availability"}
                    </button>
                    <button
                      type="button"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      onClick={() => {
                        setRejectingItem(selectedItem);
                        setRejectionReason("");
                      }}
                      className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Reject Availability
                    </button>
                  </>
                )}
              <button
                type="button"
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={!!rejectingItem}
        onClose={() => {
          if (!rejectMutation.isPending) setRejectingItem(null);
        }}
        preventClose={rejectMutation.isPending}
        title={`Reject Availability: ${rejectingItem?.driver?.name || "Collector"}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide a clear reason why this availability schedule is being rejected.
            The collector will receive a notification and can update and resubmit their schedule.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Rejection <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              disabled={rejectMutation.isPending}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please pick Monday or Wednesday instead of Friday to prevent truck route conflict in Akure South."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={rejectMutation.isPending}
              onClick={() => setRejectingItem(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              onClick={() => {
                if (rejectingItem?.availabilityId && rejectionReason.trim()) {
                  rejectMutation.mutate({
                    id: rejectingItem.availabilityId,
                    reason: rejectionReason.trim(),
                  });
                }
              }}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DriverAvailabilityList;
