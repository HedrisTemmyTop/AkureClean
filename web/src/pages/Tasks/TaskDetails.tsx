import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Navigation,
  Maximize2,
  Minimize2,
  Eye,
  Check,
  X,
  Shield,
  Home,
  Phone,
  Search,
  User,
  AlertTriangle,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { taskService } from '../../services/taskService';
import { verificationService } from '../../services/verificationService';
import { parseApiError } from '../../services/api';
import { useFeedback } from '../../context/FeedbackContext';
import { AssignmentRoute, RouteStop } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ErrorBanner from '../../components/common/ErrorBanner';

// Formats estimated duration reliably
const formatEstimatedDuration = (val: string | number | undefined | null): string => {
  if (!val || val === '—') return 'Est. 45 mins';
  if (typeof val === 'number') {
    if (val <= 0) return 'Est. 45 mins';
    const mins = val > 180 ? Math.round(val / 60) : Math.round(val);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h} hr${h > 1 ? 's' : ''}`;
    }
    return `${mins} mins`;
  }
  const str = String(val).trim();
  if (/\b(min|mins|minute|minutes|hr|hrs|hour|hours|h|m)\b/i.test(str)) {
    return str;
  }
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0) return 'Est. 45 mins';
  const mins = parsed > 180 ? Math.round(parsed / 60) : Math.round(parsed);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hr${h > 1 ? 's' : ''}`;
  }
  return `${mins} mins`;
};

// Formats distance reliably
const formatEstimatedDistance = (task: AssignmentRoute): string => {
  if (task.estimatedDistance && task.estimatedDistance !== '—') {
    return task.estimatedDistance;
  }
  if (task.totalDistance) {
    return `${(task.totalDistance / 1000).toFixed(1)} km`;
  }
  return 'Approx. 8.2 km';
};

// Helper hook to recalculate Leaflet map canvas dimensions when expanded
const MapResizer: React.FC<{ isExpanded?: boolean }> = ({ isExpanded }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map, isExpanded]);
  return null;
};

// Custom Map Marker using DivIcon reflecting verification and collection status
const createStopIcon = (number: number, status: string, verificationStatus?: string) => {
  const vNorm = (verificationStatus || '').toLowerCase();
  const sNorm = (status || '').toLowerCase().replace(/[\s_-]+/g, '');

  let bgColor = 'bg-amber-500 text-white';
  let borderStyle = 'border-2 border-white';

  if (vNorm === 'approved') {
    bgColor = 'bg-emerald-600 text-white';
    borderStyle = 'border-2 border-emerald-300 ring-2 ring-emerald-500/50';
  } else if (vNorm === 'rejected') {
    bgColor = 'bg-rose-600 text-white';
    borderStyle = 'border-2 border-rose-300 ring-2 ring-rose-500/50';
  } else if (vNorm === 'disputed') {
    bgColor = 'bg-amber-600 text-white';
    borderStyle = 'border-2 border-amber-300 ring-2 ring-amber-500/50';
  } else if (sNorm === 'completed' || sNorm === 'collected') {
    bgColor = 'bg-teal-600 text-white';
  } else if (sNorm === 'inprogress') {
    bgColor = 'bg-blue-600 text-white';
  } else if (sNorm === 'skipped') {
    bgColor = 'bg-slate-500 text-white';
  }

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div class="w-7 h-7 rounded-full ${bgColor} ${borderStyle} shadow-md flex items-center justify-center font-bold text-xs">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

/**
 * Checks whether an admin is currently allowed to approve/reject a collection.
 * Rule: If the resident and the driver have not both approved, the reject and approve
 * buttons are greyed out and disabled until 24hrs later.
 */
export const checkCanAdminReview = (stop: RouteStop, task?: AssignmentRoute | null) => {
  const vStat = (stop.verificationStatus || '').toLowerCase();
  const sStat = (stop.status || '').toLowerCase();

  const isApproved = vStat === 'approved';
  if (isApproved) {
    return {
      canReview: false,
      isApproved: true,
      reason: 'Already approved by admin',
      timeRemainingHours: 0,
    };
  }

  const driverCompleted = sStat === 'completed' || sStat === 'collected';
  const residentConfirmed = vStat === 'residentconfirmed';
  const residentDisputed = vStat === 'disputed';

  // If BOTH driver and resident have approved (or resident disputed needing admin intervention)
  if (driverCompleted && (residentConfirmed || residentDisputed)) {
    return {
      canReview: true,
      isApproved: false,
      reason: 'Ready for admin review (both confirmed)',
      timeRemainingHours: 0,
    };
  }

  // Otherwise, check if 24 hours have elapsed
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  // Use collectedAt if available, otherwise collectionDate or scheduledDate
  const refDateStr = stop.collectedAt || task?.collectionDate || task?.scheduledDate;
  if (refDateStr) {
    const refTime = new Date(refDateStr).getTime();
    if (!isNaN(refTime)) {
      const elapsed = now - refTime;
      if (elapsed >= TWENTY_FOUR_HOURS_MS) {
        return {
          canReview: true,
          isApproved: false,
          reason: '24 hours have elapsed since collection date',
          timeRemainingHours: 0,
        };
      } else {
        const remainingHours = Math.max(1, Math.ceil((TWENTY_FOUR_HOURS_MS - elapsed) / (1000 * 60 * 60)));
        return {
          canReview: false,
          isApproved: false,
          reason: `Driver and resident have not both approved yet. Unlocks in ${remainingHours}h (24hr window).`,
          timeRemainingHours: remainingHours,
        };
      }
    }
  }

  return {
    canReview: false,
    isApproved: false,
    reason: 'Driver and resident have not both approved yet. Unlocks 24 hours after collection date.',
    timeRemainingHours: 24,
  };
};

export const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showSuccessModal } = useFeedback();

  // House details modal state
  const [selectedHouseForDetails, setSelectedHouseForDetails] = useState<RouteStop | null>(null);

  // House rejection modal state
  const [stopToReject, setStopToReject] = useState<RouteStop | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Map view toggle state
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Table filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'needs_approval' | 'approved' | 'rejected' | 'pending'>('all');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Auto-dismiss banner after 4 seconds
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Close full-screen map on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapExpanded) {
        setIsMapExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapExpanded]);

  // Fetch the current task by ID
  const {
    data: task,
    isLoading,
    error: taskError,
    refetch: refetchTask,
  } = useQuery<AssignmentRoute>({
    queryKey: ['collection-task', id],
    queryFn: () => taskService.getAssignmentById(id!),
    enabled: !!id,
  });

  // Keep selected house updated if query refetches
  useEffect(() => {
    if (selectedHouseForDetails && task) {
      const updated = task.stops?.find(
        (s) => (s._id || s.id) === (selectedHouseForDetails._id || selectedHouseForDetails.id)
      );
      if (updated) setSelectedHouseForDetails(updated);
    }
  }, [task]);

  // Admin Single House Approval / Rejection mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      stopId,
      decision,
      note,
    }: {
      stopId: string;
      decision: 'approve' | 'reject';
      note?: string;
    }) => {
      if (!id) throw new Error('Missing task ID');
      return verificationService.reviewStop(id, stopId, decision, note);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection-task', id] });
      queryClient.invalidateQueries({ queryKey: ['collection-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setStopToReject(null);
      setRejectionNote('');
      setRejectionError(null);
      const msg =
        variables.decision === 'approve'
          ? 'House collection approved successfully.'
          : 'House collection rejected.';
      setSuccessBanner(msg);
      showSuccess(msg, variables.decision === 'approve' ? 'Approved' : 'Rejected');
    },
    onError: (err: any) => {
      const msg = parseApiError(err);
      setRejectionError(msg);
      showError(msg, 'Review Action Failed');
    },
  });

  // Batch Approval mutation (approve all eligible houses)
  const batchApproveMutation = useMutation({
    mutationFn: async (stopIds: string[]) => {
      if (!id) throw new Error('Missing task ID');
      for (const stopId of stopIds) {
        await verificationService.reviewStop(id, stopId, 'approve', 'Batch approved by admin');
      }
    },
    onSuccess: (_, stopIds) => {
      queryClient.invalidateQueries({ queryKey: ['collection-task', id] });
      queryClient.invalidateQueries({ queryKey: ['collection-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      const msg = `All ${stopIds.length} eligible completed collection${stopIds.length === 1 ? '' : 's'} have been approved.`;
      setSuccessBanner(msg);
      showSuccess(msg, 'Batch Approval Complete');
      showSuccessModal('Batch Approval Complete', msg);
    },
    onError: (err: unknown) => {
      showError(parseApiError(err), 'Batch Approval Failed');
    },
  });

  // Route status update mutation
  const updateRouteStatusMutation = useMutation({
    mutationFn: (status: 'planned' | 'in_progress' | 'completed' | 'cancelled') => {
      if (!id) throw new Error('Missing task ID');
      return taskService.updateAssignmentStatus(id, status);
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['collection-task', id] });
      queryClient.invalidateQueries({ queryKey: ['collection-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      const msg = `Task status updated to "${status.replace('_', ' ')}".`;
      setSuccessBanner(msg);
      showSuccess(msg, 'Task Status Updated');
    },
    onError: (err: unknown) => {
      showError(parseApiError(err), 'Failed to Update Task Status');
    },
  });

  if (isLoading) {
    return (
      <div className="py-16">
        <LoadingSpinner message="Loading collection task details..." />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="space-y-4">
        {taskError && (
          <ErrorBanner
            error={taskError}
            title="Failed to load collection task"
            onRetry={() => refetchTask()}
          />
        )}
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Collection Task Not Found</h3>
          <p className="text-sm text-slate-500 mt-1">The requested task ID could not be located.</p>
          <button
            onClick={() => navigate('/tasks')}
            className="mt-4 px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  const stops = task.stops || [];

  // Summary counts
  const totalHouses = stops.length;
  const driverCompletedStops = stops.filter((s) => s.status === 'Completed' || s.status === 'completed').length;
  const approvedHouses = stops.filter((s) => (s.verificationStatus || '').toLowerCase() === 'approved').length;
  const rejectedHouses = stops.filter((s) => (s.verificationStatus || '').toLowerCase() === 'rejected').length;
  const disputedHouses = stops.filter((s) => (s.verificationStatus || '').toLowerCase() === 'disputed').length;

  // Unapproved stops that are unlocked for admin review
  const eligibleUnapprovedStopIds = stops
    .filter((s) => {
      const reviewStatus = checkCanAdminReview(s, task);
      return reviewStatus.canReview;
    })
    .map((s) => s._id || s.id);

  // Filtered stops for the table
  const filteredStops = stops.filter((stop) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (stop.residentName || '').toLowerCase().includes(q);
      const addressMatch = (stop.address || '').toLowerCase().includes(q);
      const puMatch = (stop.pollingUnit || '').toLowerCase().includes(q);
      const phoneMatch = (stop.residentPhone || '').includes(q);
      if (!nameMatch && !addressMatch && !puMatch && !phoneMatch) return false;
    }

    const vStat = (stop.verificationStatus || '').toLowerCase();
    const sStat = (stop.status || '').toLowerCase();
    const reviewStatus = checkCanAdminReview(stop, task);

    if (filterTab === 'needs_approval') {
      return reviewStatus.canReview;
    }
    if (filterTab === 'approved') {
      return vStat === 'approved';
    }
    if (filterTab === 'rejected') {
      return vStat === 'rejected';
    }
    if (filterTab === 'pending') {
      return sStat === 'pending' || sStat === 'skipped';
    }
    return true;
  });

  // Akure default center or first stop
  const defaultCenter: [number, number] = [7.250771, 5.206992];
  const mapCenter: [number, number] =
    stops.length > 0 && stops[0].location?.coordinates
      ? [stops[0].location.coordinates[1], stops[0].location.coordinates[0]]
      : defaultCenter;

  const routePolylineCoords: [number, number][] = stops
    .filter((s) => s.location && s.location.coordinates && s.location.coordinates.length === 2)
    .map((s) => [s.location.coordinates[1], s.location.coordinates[0]]);

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Back to tasks list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Task #{task._id.slice(-8).toUpperCase()}
              </h1>
              <span className="text-slate-400 font-medium text-sm sm:text-base">&middot;</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700">{task.title}</span>
              <StatusBadge status={task.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled on{' '}
              {new Date(task.scheduledDate).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              &middot; {task.area}
            </p>
          </div>
        </div>

        {/* Route status toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">
            Route Status:
          </span>
          {(['planned', 'in_progress', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              disabled={task.status === st || updateRouteStatusMutation.isPending}
              onClick={() => updateRouteStatusMutation.mutate(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                task.status === st
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Houses */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Houses</span>
            <Home className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalHouses}</p>
          <p className="text-[11px] text-slate-400">Waypoints assigned</p>
        </div>

        {/* Driver Collected */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Driver Done</span>
            <Truck className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-bold text-teal-700 mt-1">
            {driverCompletedStops} <span className="text-xs font-normal text-slate-400">/ {totalHouses}</span>
          </p>
          <p className="text-[11px] text-slate-500">Marked collected</p>
        </div>

        {/* Admin Approved */}
        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Admin Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {approvedHouses} <span className="text-xs font-normal text-slate-400">/ {totalHouses}</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">Verified by admin</p>
        </div>

        {/* Ready for Review */}
        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ready for Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-800 mt-1">{eligibleUnapprovedStopIds.length}</p>
          <p className="text-[11px] text-amber-600 font-medium">Both done or 24h+ elapsed</p>
        </div>

        {/* Rejected or Disputed */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Issues / Rejected</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">{rejectedHouses + disputedHouses}</p>
          <p className="text-[11px] text-slate-400">{disputedHouses} resident disputes</p>
        </div>

        {/* Route Estimate */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Est. Duration</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {formatEstimatedDuration(task.estimatedDuration)}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{formatEstimatedDistance(task)}</p>
        </div>
      </div>

      {/* Driver & Route Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center font-bold text-sm flex-shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Driver:</span>
              <span className="text-sm font-bold text-slate-900">
                {typeof task.driver === 'object' && task.driver ? task.driver.name : task.driverName || 'Collector'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
              <span>Phone: {typeof task.driver === 'object' && task.driver ? task.driver.phone || 'N/A' : 'N/A'}</span>
              <span>&middot;</span>
              <span>Vehicle: {typeof task.driver === 'object' && task.driver ? task.driver.vehiclePlate || 'AKR-TRUCK' : 'AKR-TRUCK'}</span>
            </p>
          </div>
        </div>

        {/* Approval Progress Bar */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600">Admin Approval Progress:</span>
            <span className="text-brand-teal">
              {totalHouses > 0 ? Math.round((approvedHouses / totalHouses) * 100) : 0}% Complete ({approvedHouses}/{totalHouses} Approved)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${totalHouses > 0 ? (approvedHouses / totalHouses) * 100 : 0}%` }}
              title={`Approved: ${approvedHouses}`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${totalHouses > 0 ? (rejectedHouses / totalHouses) * 100 : 0}%` }}
              title={`Rejected: ${rejectedHouses}`}
            />
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Route Map */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-brand-teal" />
            <h3 className="font-bold text-slate-800 text-sm">Dispatched Route Map & Stops</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Akure, Ondo State &middot; OpenStreetMap</span>
            <button
              type="button"
              onClick={() => setIsMapExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-xs"
              title="Expand map to full screen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-brand-teal" />
              <span>Expand Map</span>
            </button>
          </div>
        </div>

        {/* Map Pins Legend */}
        <div className="flex flex-wrap items-center gap-3 pb-2.5 mb-2 border-b border-slate-100 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Pins Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="font-medium text-emerald-800">Approved by Admin</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            <span>Driver Collected</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-rose-700">Rejected by Admin</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Pending Collection</span>
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full rounded-lg overflow-hidden border border-slate-200 relative z-0">
          <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="h-full w-full">
            <MapResizer isExpanded={isMapExpanded} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routePolylineCoords.length > 1 && (
              <Polyline positions={routePolylineCoords} color="#0F766E" weight={4} opacity={0.8} dashArray="6, 8" />
            )}

            {stops.map((stop, idx) => {
              if (!stop.location || !stop.location.coordinates || stop.location.coordinates.length < 2) return null;
              const [lng, lat] = stop.location.coordinates;
              return (
                <Marker
                  key={stop._id || idx}
                  position={[lat, lng]}
                  icon={createStopIcon(idx + 1, stop.status, stop.verificationStatus)}
                >
                  <Popup>
                    <div className="p-1 space-y-1 text-xs">
                      <p className="font-bold text-slate-900">
                        Stop #{idx + 1}: {stop.residentName || 'Resident'}
                      </p>
                      <p className="text-slate-600">{stop.address}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedHouseForDetails(stop)}
                        className="mt-2 text-xs font-semibold text-brand-teal hover:underline block"
                      >
                        View Full Details &rarr;
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Main Houses Sequence Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Table Header with Filters & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <span>Houses & Collections in this Task</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredStops.length} of {totalHouses}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify driver collection records house by house and sign off or reject each premise.
              </p>
            </div>

            {/* Batch Approve Eligible Houses Button */}
            {eligibleUnapprovedStopIds.length > 0 && (
              <button
                type="button"
                disabled={batchApproveMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Approve all ${eligibleUnapprovedStopIds.length} eligible houses that are ready for review?`
                    )
                  ) {
                    batchApproveMutation.mutate(eligibleUnapprovedStopIds);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <CheckCheck className="w-4 h-4" />
                <span>
                  {batchApproveMutation.isPending
                    ? 'Approving...'
                    : `Approve All Ready (${eligibleUnapprovedStopIds.length})`}
                </span>
              </button>
            )}
          </div>

          {/* Search bar & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterTab === 'all'
                    ? 'bg-brand-teal text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Houses ({totalHouses})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('needs_approval')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  filterTab === 'needs_approval'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Ready for Review ({eligibleUnapprovedStopIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterTab === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Approved ({approvedHouses})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterTab === 'rejected'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                Rejected ({rejectedHouses})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterTab === 'pending'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Pending Collection ({totalHouses - driverCompletedStops})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search house by address, resident..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Houses Table */}
        {filteredStops.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Home className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No houses match your filter criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switching tabs.</p>
            <button
              type="button"
              onClick={() => {
                setFilterTab('all');
                setSearchQuery('');
              }}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">House / Resident</th>
                  <th className="py-3 px-4">Address & Location</th>
                  <th className="py-3 px-4">Driver Status</th>
                  <th className="py-3 px-4">Resident Status</th>
                  <th className="py-3 px-4">Admin Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStops.map((stop, idx) => {
                  const originalIndex = stops.findIndex((s) => (s._id || s.id) === (stop._id || stop.id));
                  const driverStatus = (stop.status || '').toLowerCase();
                  const residentStatus = (stop.verificationStatus || '').toLowerCase();
                  const isApproved = residentStatus === 'approved';
                  const isRejected = residentStatus === 'rejected';

                  // Review permission and 24hr rule check
                  const { canReview, reason: reviewLockReason } = checkCanAdminReview(stop, task);

                  return (
                    <tr
                      key={stop._id || idx}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isApproved ? 'bg-emerald-50/15' : isRejected ? 'bg-rose-50/15' : ''
                      }`}
                    >
                      {/* # Sequence Number */}
                      <td className="py-3.5 px-4 font-bold text-slate-700 text-xs">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-mono">
                          {originalIndex + 1}
                        </span>
                      </td>

                      {/* House / Resident Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 mt-0.5">
                            <Home className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {stop.residentName && stop.residentName !== 'N/A'
                                ? stop.residentName
                                : stop.userId
                                ? 'Resident Household'
                                : `Collection Point`}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {stop.residentPhone && stop.residentPhone !== 'N/A'
                                ? stop.residentPhone
                                : stop.userId
                                ? 'No phone registered'
                                : 'Waypoint Stop'}
                            </p>
                            <div className="mt-1">
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {stop.userId ? (stop.houseType || 'Residential building') : 'Polling Unit Waypoint'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Address & Polling Unit */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-800 text-xs font-medium truncate" title={stop.address}>
                          {stop.address}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={stop.pollingUnit}>
                          PU: {stop.pollingUnit || 'Standard Unit'}
                        </p>
                        {stop.landmark && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">Near: {stop.landmark}</p>
                        )}
                      </td>

                      {/* 1. Driver Status Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {driverStatus === 'completed' || driverStatus === 'collected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <Truck className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          ) : driverStatus === 'skipped' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Skipped
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}

                          {stop.collectedAt ? (
                            <p className="text-[11px] text-slate-500 font-mono">
                              {new Date(stop.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          ) : driverStatus === 'skipped' && stop.skipReason ? (
                            <p className="text-[10px] text-rose-600 font-medium truncate max-w-[130px]" title={stop.skipReason}>
                              {stop.skipReason}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Not collected yet</p>
                          )}
                        </div>
                      </td>

                      {/* 2. Resident Status Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {residentStatus === 'residentconfirmed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirmed
                            </span>
                          ) : residentStatus === 'disputed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Disputed
                            </span>
                          ) : driverStatus === 'completed' || driverStatus === 'collected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              Awaiting Resident
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200">
                              Pending Driver
                            </span>
                          )}

                          {stop.residentConfirmedAt ? (
                            <p className="text-[11px] text-blue-600 font-mono">
                              {new Date(stop.residentConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          ) : residentStatus === 'disputed' && stop.residentNote ? (
                            <p className="text-[10px] text-amber-700 truncate max-w-[130px]" title={stop.residentNote}>
                              {stop.residentNote}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* 3. Admin Status Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approved
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Rejected
                            </span>
                          ) : canReview ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              Ready for Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              <Clock className="w-3.5 h-3.5" />
                              Pending Review
                            </span>
                          )}

                          {stop.adminNote && (
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[140px]" title={stop.adminNote}>
                              Note: {stop.adminNote}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {/* If admin has approved: ONLY View Details button remains */}
                          {isApproved ? (
                            <button
                              type="button"
                              onClick={() => setSelectedHouseForDetails(stop)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-teal bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs"
                              title="View full house inspection details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>
                          ) : (
                            /* Else: All 3 buttons remain (View Details, Approve, Reject) */
                            <>
                              {/* 1. View Details Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedHouseForDetails(stop)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-brand-teal transition-colors shadow-2xs"
                                title="View full house inspection details"
                              >
                                <Eye className="w-3.5 h-3.5 text-brand-teal" />
                                <span>Details</span>
                              </button>

                              {/* 2. Approve Button */}
                              <button
                                type="button"
                                disabled={!canReview || reviewMutation.isPending}
                                onClick={() => {
                                  reviewMutation.mutate({
                                    stopId: stop._id || stop.id,
                                    decision: 'approve',
                                    note: 'Approved by admin',
                                  });
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  canReview
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                                }`}
                                title={canReview ? 'Approve collection for this house' : reviewLockReason}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              {/* 3. Reject Button */}
                              <button
                                type="button"
                                disabled={!canReview || reviewMutation.isPending}
                                onClick={() => {
                                  setStopToReject(stop);
                                  setRejectionNote('');
                                  setRejectionError(null);
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  canReview
                                    ? 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                                }`}
                                title={canReview ? 'Reject collection for this house' : reviewLockReason}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: VIEW HOUSE DETAILS MODAL */}
      <Modal
        isOpen={!!selectedHouseForDetails}
        onClose={() => setSelectedHouseForDetails(null)}
        title={`House Details: ${selectedHouseForDetails?.address || 'Collection Waypoint'}`}
      >
        {selectedHouseForDetails && (() => {
          const originalIndex = stops.findIndex(
            (s) => (s._id || s.id) === (selectedHouseForDetails._id || selectedHouseForDetails.id)
          );
          const driverStatus = (selectedHouseForDetails.status || '').toLowerCase();
          const residentStatus = (selectedHouseForDetails.verificationStatus || '').toLowerCase();
          const isApproved = residentStatus === 'approved';
          const { canReview, reason: reviewLockReason } = checkCanAdminReview(selectedHouseForDetails, task);

          return (
            <div className="space-y-4 text-xs">
              {/* Top 3 Statuses Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Driver Status Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Driver Status
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {driverStatus === 'completed' || driverStatus === 'collected' ? (
                      <span className="font-semibold text-teal-700 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : driverStatus === 'skipped' ? (
                      <span className="font-semibold text-rose-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Skipped
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending Collection
                      </span>
                    )}
                  </div>
                  {selectedHouseForDetails.collectedAt && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(selectedHouseForDetails.collectedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {/* Resident Status Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Resident Status
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {residentStatus === 'residentconfirmed' ? (
                      <span className="font-semibold text-blue-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    ) : residentStatus === 'disputed' ? (
                      <span className="font-semibold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Disputed
                      </span>
                    ) : driverStatus === 'completed' || driverStatus === 'collected' ? (
                      <span className="font-semibold text-amber-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Resident
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-400 flex items-center gap-1">
                        Pending Driver
                      </span>
                    )}
                  </div>
                  {selectedHouseForDetails.residentConfirmedAt && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(selectedHouseForDetails.residentConfirmedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {/* Admin Status Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Admin Status
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {isApproved ? (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : residentStatus === 'rejected' ? (
                      <span className="font-semibold text-rose-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    ) : canReview ? (
                      <span className="font-semibold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Ready for Review
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending Review
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {isApproved
                      ? 'Approved by admin'
                      : canReview
                      ? 'Actionable now'
                      : 'Locked (24h grace)'}
                  </p>
                </div>
              </div>

              {/* Resident & Property Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 shadow-2xs">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-brand-teal">
                  <User className="w-4 h-4" />
                  <span>Resident & Household Info</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Resident Name:</span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {selectedHouseForDetails.residentName || 'Household Occupant'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone Contact:</span>
                    {selectedHouseForDetails.residentPhone ? (
                      <a
                        href={`tel:${selectedHouseForDetails.residentPhone}`}
                        className="font-semibold text-brand-teal hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{selectedHouseForDetails.residentPhone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-500 font-mono">N/A</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Property Type:</span>
                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                      {selectedHouseForDetails.houseType || selectedHouseForDetails.housingType || 'Residential building'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address:</span>
                    <span className="text-slate-600 font-mono truncate block">
                      {selectedHouseForDetails.residentEmail || 'No email registered'}
                    </span>
                  </div>
                  {selectedHouseForDetails.houseDescription && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Building Description:</span>
                      <span className="text-slate-700 font-medium">{selectedHouseForDetails.houseDescription}</span>
                    </div>
                  )}
                  {(selectedHouseForDetails.numberOfRooms || selectedHouseForDetails.numberOfShops) && (
                    <div className="sm:col-span-2 flex items-center gap-4 text-slate-600">
                      {selectedHouseForDetails.numberOfRooms && (
                        <span>Rooms: <strong>{selectedHouseForDetails.numberOfRooms}</strong></span>
                      )}
                      {selectedHouseForDetails.numberOfShops && (
                        <span>Shops: <strong>{selectedHouseForDetails.numberOfShops}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Premise Location Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-2xs">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-brand-teal">
                  <MapPin className="w-4 h-4" />
                  <span>Premise Location & Polling Unit</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Full Street Address:</span>
                    <span className="font-medium text-slate-800">{selectedHouseForDetails.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Ward & LGA:</span>
                    <span className="text-slate-700 font-medium">
                      {selectedHouseForDetails.ward || task.area} &middot; {selectedHouseForDetails.lga || 'Akure'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Polling Unit:</span>
                    <span className="text-slate-700 font-medium">
                      {selectedHouseForDetails.pollingUnit || 'Standard Ward Unit'}
                    </span>
                  </div>
                  {selectedHouseForDetails.coordinates && (
                    <div className="sm:col-span-2 flex items-center justify-between bg-slate-50 p-2 rounded-lg text-[11px] font-mono text-slate-600">
                      <span>
                        GPS: {selectedHouseForDetails.coordinates.latitude.toFixed(6)},{' '}
                        {selectedHouseForDetails.coordinates.longitude.toFixed(6)}
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${selectedHouseForDetails.coordinates.latitude},${selectedHouseForDetails.coordinates.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-teal hover:underline flex items-center gap-1 font-sans font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Maps</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Collection Notes */}
              {(selectedHouseForDetails.collectionNote || selectedHouseForDetails.skipReason) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Driver Notes & Exceptions
                  </span>
                  {selectedHouseForDetails.collectionNote && (
                    <p className="text-slate-800">{selectedHouseForDetails.collectionNote}</p>
                  )}
                  {selectedHouseForDetails.skipReason && (
                    <p className="text-rose-600 font-medium">Skip: {selectedHouseForDetails.skipReason}</p>
                  )}
                </div>
              )}

              {/* Resident Feedback / Complaint */}
              {(selectedHouseForDetails.residentNote || selectedHouseForDetails.residentImage) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Resident Feedback & Photos</span>
                  </h4>
                  {selectedHouseForDetails.residentNote && (
                    <p className="text-amber-900 font-medium">{selectedHouseForDetails.residentNote}</p>
                  )}
                  {selectedHouseForDetails.residentImage && (
                    <div className="mt-2">
                      <a
                        href={selectedHouseForDetails.residentImage}
                        target="_blank"
                        rel="noreferrer"
                        className="block max-w-xs rounded-lg overflow-hidden border border-amber-300 hover:opacity-90"
                      >
                        <img
                          src={selectedHouseForDetails.residentImage}
                          alt="Resident Proof"
                          className="w-full h-36 object-cover"
                        />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Audit History */}
              {selectedHouseForDetails.adminNote && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-semibold">Admin Review Note:</span>
                  <p className="text-slate-800 font-medium mt-0.5">{selectedHouseForDetails.adminNote}</p>
                  {selectedHouseForDetails.adminReviewedAt && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Recorded at {new Date(selectedHouseForDetails.adminReviewedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* 24-hr Lock Banner if not reviewable */}
              {!isApproved && !canReview && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Approval & Rejection Locked</span>
                    <span>
                      {reviewLockReason || 'The resident and driver have not both approved this collection yet.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedHouseForDetails(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Close
                </button>

                {/* If already approved: show Approved badge, no approve/reject buttons */}
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Collection Approved by Admin</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canReview || reviewMutation.isPending}
                      onClick={() => {
                        setStopToReject(selectedHouseForDetails);
                        setRejectionNote('');
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        canReview
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                      }`}
                      title={canReview ? 'Reject collection' : reviewLockReason}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      disabled={!canReview || reviewMutation.isPending}
                      onClick={() => {
                        reviewMutation.mutate({
                          stopId: selectedHouseForDetails._id || selectedHouseForDetails.id,
                          decision: 'approve',
                          note: 'Approved by admin from house details view',
                        });
                        setSelectedHouseForDetails(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm ${
                        canReview
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                      }`}
                      title={canReview ? 'Approve collection' : reviewLockReason}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Collection</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 2: REJECT COLLECTION WITH REASON */}
      <Modal
        isOpen={!!stopToReject}
        onClose={() => {
          setStopToReject(null);
          setRejectionNote('');
          setRejectionError(null);
        }}
        title={`Reject Collection: ${stopToReject?.address || 'House'}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
            <p className="font-semibold">Confirm Collection Rejection</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Please enter the reason why this household's collection is being rejected. This notification will be logged and the resident informed.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rejection Reason / Admin Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="e.g. Resident reported waste was left behind; driver skipped gate; inadequate pickup photo..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {rejectionError && (
            <p className="text-rose-600 font-semibold">{rejectionError}</p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setStopToReject(null);
                setRejectionNote('');
                setRejectionError(null);
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectionNote.trim() || reviewMutation.isPending}
              onClick={() => {
                if (!stopToReject) return;
                reviewMutation.mutate({
                  stopId: stopToReject._id || stopToReject.id,
                  decision: 'reject',
                  note: rejectionNote.trim(),
                });
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {reviewMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: FULLSCREEN MAP MODAL */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white truncate">
                      Task #{task._id.slice(-8).toUpperCase()} &middot; {task.title}
                    </h2>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {stops.length} Houses &middot; Driver:{' '}
                    {typeof task.driver === 'object' && task.driver ? task.driver.name : task.driverName || 'Collector'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-slate-400 hidden md:inline">Press Esc to exit</span>
                <button
                  type="button"
                  onClick={() => setIsMapExpanded(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4 text-slate-700" />
                  <span>Exit Fullscreen</span>
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full relative z-0">
              <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="h-full w-full">
                <MapResizer isExpanded={isMapExpanded} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {routePolylineCoords.length > 1 && (
                  <Polyline positions={routePolylineCoords} color="#0F766E" weight={5} opacity={0.85} dashArray="6, 8" />
                )}

                {stops.map((stop, idx) => {
                  if (!stop.location || !stop.location.coordinates || stop.location.coordinates.length < 2) return null;
                  const [lng, lat] = stop.location.coordinates;

                  return (
                    <Marker
                      key={`fs-${stop._id || idx}`}
                      position={[lat, lng]}
                      icon={createStopIcon(idx + 1, stop.status, stop.verificationStatus)}
                    >
                      <Popup>
                        <div className="p-1 space-y-1 text-xs">
                          <p className="font-bold text-slate-900">
                            Stop #{idx + 1}: {stop.residentName || 'Resident'}
                          </p>
                          <p className="text-slate-600">{stop.address}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetails;
