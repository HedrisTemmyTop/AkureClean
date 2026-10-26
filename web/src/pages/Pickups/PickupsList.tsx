import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  Eye,
  MapPin,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  X,
  XCircle,
  Truck,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { pickupService } from "../../services/pickupService";
import { verificationService } from "../../services/verificationService";
import { PickupRequestData } from "../../types";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import ErrorBanner from "../../components/common/ErrorBanner";

export const PickupsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPickup, setSelectedPickup] =
    useState<PickupRequestData | null>(null);

  // Reject Modal State
  const [pickupToReject, setPickupToReject] =
    useState<PickupRequestData | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const {
    data: pickups = [],
    isLoading,
    error,
    refetch,
  } = useQuery<PickupRequestData[]>({
    queryKey: ["pickup-requests", statusFilter],
    queryFn: () =>
      pickupService.getPickups(
        statusFilter !== "all" ? { status: statusFilter } : undefined,
      ),
  });

  // Review mutation (Approve / Reject)
  const reviewMutation = useMutation({
    mutationFn: async ({
      pickupId,
      decision,
      note,
    }: {
      pickupId: string;
      decision: "approve" | "reject";
      note?: string;
    }) => {
      return verificationService.review(
        { kind: "pickup", id: pickupId, assignmentId: null },
        decision,
        note,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pickup-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPickupToReject(null);
      setRejectionNote("");
      setRejectionError("");
      setApprovingId(null);
      if (selectedPickup && selectedPickup.id === variables.pickupId) {
        setSelectedPickup((prev) =>
          prev
            ? {
                ...prev,
                status: variables.decision === "approve" ? "completed" : "rejected",
                verificationStatus:
                  variables.decision === "approve" ? "Approved" : "Rejected",
                adminNote: variables.note || null,
              }
            : null,
        );
      }
    },
    onError: (err: any) => {
      setApprovingId(null);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update pickup request review";
      setRejectionError(msg);
    },
  });

  const handleApprove = (pickupId: string) => {
    setApprovingId(pickupId);
    reviewMutation.mutate({
      pickupId,
      decision: "approve",
    });
  };

  const handleOpenReject = (pickup: PickupRequestData) => {
    setPickupToReject(pickup);
    setRejectionNote("");
    setRejectionError("");
  };

  const handleConfirmReject = () => {
    if (!pickupToReject) return;
    if (!rejectionNote.trim()) {
      setRejectionError("Please provide a reason for rejecting this pickup.");
      return;
    }
    reviewMutation.mutate({
      pickupId: pickupToReject.id,
      decision: "reject",
      note: rejectionNote.trim(),
    });
  };

  const columns = useMemo<ColumnDef<PickupRequestData>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Request ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            #{row.original.id.slice(-8).toUpperCase()}
          </span>
        ),
      },
      {
        accessorKey: "address",
        header: "Address / Location",
        cell: ({ row }) => {
          const displayAddress =
            row.original.address ||
            row.original.userId?.address ||
            "N/A";
          return (
            <p
              className="text-xs text-slate-700 max-w-[200px] truncate font-medium"
              title={displayAddress}
            >
              {displayAddress}
            </p>
          );
        },
      },
      {
        accessorKey: "wasteType",
        header: "Waste Type",
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
            {row.original.wasteType || row.original.type || "General"}
          </span>
        ),
      },
      {
        accessorKey: "scheduledDate",
        header: "Scheduled Date",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {row.original.scheduledDate
                ? new Date(row.original.scheduledDate).toLocaleDateString()
                : "Unscheduled"}
            </span>
          </div>
        ),
      },
      // 1. DRIVER STATUS
      {
        id: "driverStatus",
        header: "Driver Status",
        cell: ({ row }) => {
          const item = row.original;
          const status = (item.status || "").toLowerCase();
          const isCollected =
            status === "collected" || status === "completed" || !!item.collectedAt;
          const isDriverRejected =
            status === "rejected" && !!item.driverRejectReason;
          const isAccepted = status === "accepted";

          if (isDriverRejected) {
            return (
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Rejected
                </span>
                {item.driverRejectReason && (
                  <span
                    className="text-[10px] text-rose-600 truncate max-w-[130px]"
                    title={item.driverRejectReason}
                  >
                    {item.driverRejectReason}
                  </span>
                )}
              </div>
            );
          }

          if (isCollected) {
            return (
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Collected
                </span>
                {item.driverId?.name && (
                  <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {item.driverId.name}
                  </span>
                )}
              </div>
            );
          }

          if (isAccepted) {
            return (
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Accepted
                </span>
                {item.driverId?.name && (
                  <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {item.driverId.name}
                  </span>
                )}
              </div>
            );
          }

          if (status === "cancelled") {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                Cancelled
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Pending
            </span>
          );
        },
      },
      // 2. RESIDENT STATUS
      {
        id: "residentStatus",
        header: "Resident Status",
        cell: ({ row }) => {
          const item = row.original;
          const status = (item.status || "").toLowerCase();
          const vStatus = (item.verificationStatus || "").toLowerCase();

          if (status === "cancelled") {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                Cancelled
              </span>
            );
          }

          if (
            vStatus === "residentconfirmed" ||
            (status === "completed" && vStatus !== "disputed")
          ) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Confirmed
              </span>
            );
          }

          if (vStatus === "disputed") {
            return (
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Disputed
                </span>
                {item.residentNote && (
                  <span
                    className="text-[10px] text-rose-600 truncate max-w-[130px]"
                    title={item.residentNote}
                  >
                    {item.residentNote}
                  </span>
                )}
              </div>
            );
          }

          if (vStatus === "awaitingresident" || status === "collected") {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Awaiting Confirm
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
              Requested
            </span>
          );
        },
      },
      // 3. ADMIN STATUS
      {
        id: "adminStatus",
        header: "Admin Status",
        cell: ({ row }) => {
          const item = row.original;
          const status = (item.status || "").toLowerCase();
          const vStatus = (item.verificationStatus || "").toLowerCase();

          if (vStatus === "approved" || status === "completed") {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Approved
              </span>
            );
          }

          if (
            vStatus === "rejected" ||
            (status === "rejected" && !item.driverRejectReason)
          ) {
            return (
              <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Rejected
                </span>
                {item.adminNote && (
                  <span
                    className="text-[10px] text-rose-600 truncate max-w-[130px]"
                    title={item.adminNote}
                  >
                    {item.adminNote}
                  </span>
                )}
              </div>
            );
          }

          if (
            status === "collected" ||
            ["awaitingresident", "residentconfirmed", "disputed"].includes(vStatus)
          ) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Review
              </span>
            );
          }

          if (status === "cancelled") {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                Cancelled
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
              Pending Collection
            </span>
          );
        },
      },
      // 4. ACTION (Approve, Reject, Details)
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const item = row.original;
          const status = (item.status || "").toLowerCase();
          const vStatus = (item.verificationStatus || "").toLowerCase();
          const isApproved = vStatus === "approved" || status === "completed";
          const isAdminRejected =
            vStatus === "rejected" ||
            (status === "rejected" && !item.driverRejectReason);
          const isApprovingThis = approvingId === item.id;

          return (
            <div className="flex items-center gap-1.5">
              {isApproved ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Approved
                </span>
              ) : isAdminRejected ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                  <XCircle className="w-3 h-3 text-rose-600" />
                  Rejected
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(item.id);
                    }}
                    title="Approve pickup"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                  >
                    {isApprovingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReject(item);
                    }}
                    title="Reject pickup"
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                    <span>Reject</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPickup(item);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-teal bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                title="View pickup details"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>
            </div>
          );
        },
      },
    ],
    [approvingId, reviewMutation.isPending],
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Resident Pickup Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            On-demand and special waste pickup bookings submitted by households
            and businesses.
          </p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          "all",
          "pending",
          "accepted",
          "collected",
          "completed",
          "rejected",
          "cancelled",
        ].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === st
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {error && (
        <ErrorBanner
          error={error}
          title="Failed to load pickup requests"
          onRetry={() => refetch()}
        />
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={pickups}
        isLoading={isLoading}
        searchPlaceholder="Search by resident name or address..."
        emptyTitle="No pickup requests found"
        emptyDescription={
          statusFilter !== "all"
            ? `No pickup requests with status "${statusFilter}".`
            : "No resident pickup requests recorded in the system."
        }
        onRowClick={(item) => setSelectedPickup(item)}
      />

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedPickup}
        onClose={() => setSelectedPickup(null)}
        title={`Pickup Request #${selectedPickup?.id.slice(-8).toUpperCase()}`}
      >
        {selectedPickup && (
          <div className="space-y-4">
            {/* 3 Status Cards Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs">
              {/* Driver Card */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Driver Status</span>
                </div>
                <p className="font-bold text-slate-800 text-xs capitalize">
                  {selectedPickup.status === "rejected" && selectedPickup.driverRejectReason
                    ? "Rejected"
                    : selectedPickup.status === "collected" || selectedPickup.status === "completed" || selectedPickup.collectedAt
                    ? "Collected"
                    : selectedPickup.status === "accepted"
                    ? "Accepted"
                    : selectedPickup.status}
                </p>
                {selectedPickup.driverId?.name && (
                  <p className="text-[11px] text-slate-500 truncate">
                    Driver: {selectedPickup.driverId.name}
                  </p>
                )}
                {selectedPickup.driverRejectReason && (
                  <p className="text-[10px] text-rose-600 italic">
                    "{selectedPickup.driverRejectReason}"
                  </p>
                )}
              </div>

              {/* Resident Card */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Resident Status</span>
                </div>
                <p className="font-bold text-slate-800 text-xs">
                  {selectedPickup.verificationStatus === "ResidentConfirmed" ||
                  (selectedPickup.status === "completed" && selectedPickup.verificationStatus !== "Disputed")
                    ? "Confirmed"
                    : selectedPickup.verificationStatus === "Disputed"
                    ? "Disputed"
                    : selectedPickup.verificationStatus === "AwaitingResident" || selectedPickup.status === "collected"
                    ? "Awaiting Confirm"
                    : "Requested"}
                </p>
                {selectedPickup.residentNote && (
                  <p className="text-[10px] text-rose-600 italic">
                    Note: "{selectedPickup.residentNote}"
                  </p>
                )}
              </div>

              {/* Admin Card */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Admin Status</span>
                </div>
                <p className="font-bold text-slate-800 text-xs">
                  {selectedPickup.verificationStatus === "Approved" || selectedPickup.status === "completed"
                    ? "Approved"
                    : selectedPickup.verificationStatus === "Rejected"
                    ? "Rejected"
                    : ["collected", "accepted"].includes(selectedPickup.status) ||
                      ["AwaitingResident", "ResidentConfirmed", "Disputed"].includes(selectedPickup.verificationStatus)
                    ? "Pending Review"
                    : "Pending Collection"}
                </p>
                {selectedPickup.adminNote && (
                  <p className="text-[10px] text-rose-600 italic">
                    Note: "{selectedPickup.adminNote}"
                  </p>
                )}
              </div>
            </div>

            {/* Resident Info & Dates */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500">Resident Name</p>
                <p className="font-semibold text-slate-900 text-sm">
                  {selectedPickup.residentName || selectedPickup.userId?.name || "Resident"}
                </p>
                <p className="text-slate-500">{selectedPickup.residentPhone || selectedPickup.userId?.phone || "No phone"}</p>
                <p className="text-slate-500">{selectedPickup.residentEmail || selectedPickup.userId?.email || "No email"}</p>
              </div>

              <div>
                <p className="text-slate-500">Waste Type & Date</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedPickup.wasteType || selectedPickup.type || "General Household"}
                </p>
                <p className="text-slate-500 mt-1">
                  {selectedPickup.scheduledDate
                    ? new Date(`${selectedPickup.scheduledDate}T12:00:00`).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not scheduled"}{" "}
                  {selectedPickup.scheduledTime || selectedPickup.timeSlot ? `• ${selectedPickup.scheduledTime || selectedPickup.timeSlot}` : ""}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <MapPin className="w-4 h-4 text-brand-teal" />
                <span>User Address (Collection Location)</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 pl-5.5">
                {selectedPickup.address ||
                  selectedPickup.userId?.address ||
                  "Address not provided"}
              </p>
              {(selectedPickup.userId?.houseDescription || (selectedPickup as any).houseDescription) && (
                <p className="text-slate-600 pl-5.5 text-xs">
                  <span className="font-medium text-slate-500">House description: </span>
                  {selectedPickup.userId?.houseDescription || (selectedPickup as any).houseDescription}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pl-5.5 pt-0.5">
                {(selectedPickup.pollingUnit || selectedPickup.userId?.pollingUnit) && (
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-medium">
                    PU: {selectedPickup.pollingUnit || selectedPickup.userId?.pollingUnit}
                  </span>
                )}
                {(selectedPickup.ward || selectedPickup.userId?.ward) && (
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-medium">
                    Ward: {selectedPickup.ward || selectedPickup.userId?.ward}
                  </span>
                )}
                {(selectedPickup.localGovt || selectedPickup.userId?.localGovt) && (
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-medium">
                    LGA: {selectedPickup.localGovt || selectedPickup.userId?.localGovt}
                  </span>
                )}
              </div>
            </div>

            {selectedPickup.notes && (
              <div className="text-xs">
                <p className="text-slate-500 font-medium">Resident Notes</p>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 mt-1">
                  {selectedPickup.notes}
                </p>
              </div>
            )}

            {/* Pickup Request Picture */}
            {(selectedPickup.image || selectedPickup.proofImage) ? (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Pickup Request Picture</span>
                </p>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 p-1 flex items-center justify-center max-h-64">
                  <img
                    src={selectedPickup.image || selectedPickup.proofImage}
                    alt="Pickup Request"
                    className="w-full max-h-60 object-contain rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <span>No pickup picture was attached by the resident.</span>
              </div>
            )}

            {/* Modal Action Buttons Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedPickup(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedPickup.status === "completed" ||
                selectedPickup.verificationStatus === "Approved" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Approved by Admin</span>
                  </span>
                ) : selectedPickup.verificationStatus === "Rejected" ||
                  (selectedPickup.status === "rejected" && !selectedPickup.driverRejectReason) ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                    <XCircle className="w-4 h-4 text-rose-700" />
                    <span>Rejected by Admin</span>
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleOpenReject(selectedPickup)}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Pickup</span>
                    </button>

                    <button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => handleApprove(selectedPickup.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {approvingId === selectedPickup.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>Approve Pickup</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={!!pickupToReject}
        onClose={() => {
          if (!reviewMutation.isPending) {
            setPickupToReject(null);
            setRejectionNote("");
            setRejectionError("");
          }
        }}
        title={`Reject Pickup #${pickupToReject?.id.slice(-8).toUpperCase()}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Confirm Rejection</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Please enter the reason why this pickup is being rejected. This
                reason will be recorded and sent to the resident.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rejection Reason / Admin Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionNote}
              onChange={(e) => {
                setRejectionNote(e.target.value);
                if (rejectionError) setRejectionError("");
              }}
              placeholder="e.g. Waste type mismatch, inaccessible location, bin not placed outside, or resident reported uncollected..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800"
            />
          </div>

          {rejectionError && (
            <p className="text-rose-600 font-semibold">{rejectionError}</p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={reviewMutation.isPending}
              onClick={() => {
                setPickupToReject(null);
                setRejectionNote("");
                setRejectionError("");
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectionNote.trim() || reviewMutation.isPending}
              onClick={handleConfirmReject}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PickupsList;
