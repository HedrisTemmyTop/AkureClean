import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const norm = (status || '').toLowerCase().replace(/[\s_-]+/g, '');

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (norm === 'pending' || norm === 'awaitingresident' || norm === 'planned') {
    // PENDING / PLANNED — Amber / Yellow
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    dotColor = 'bg-amber-500';
  } else if (norm === 'inprogress' || norm === 'collecting') {
    // IN PROGRESS — Vibrant Blue
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-300';
    dotColor = 'bg-blue-600 animate-pulse';
  } else if (norm === 'paused' || norm === 'onbreak') {
    // PAUSED — Distinct Orange
    colorClasses = 'bg-orange-50 text-orange-800 border-orange-300';
    dotColor = 'bg-orange-500';
  } else if (
    norm === 'completed' ||
    norm === 'paid' ||
    norm === 'approved' ||
    norm === 'residentconfirmed' ||
    norm === 'collected'
  ) {
    // COMPLETED — Emerald Green
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    dotColor = 'bg-emerald-500';
  } else if (
    norm === 'cancelled' ||
    norm === 'rejected' ||
    norm === 'disputed' ||
    norm === 'deactivated' ||
    norm === 'suspended' ||
    norm === 'skipped'
  ) {
    // SKIPPED / CANCELLED — Rose Red
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300';
    dotColor = 'bg-rose-500';
  } else if (norm === 'scheduled' || norm === 'accepted' || norm === 'active') {
    // SCHEDULED / ACTIVE — Teal
    colorClasses = 'bg-teal-50 text-teal-800 border-teal-300';
    dotColor = 'bg-teal-500';
  }

  // Format label: e.g. InProgress -> IN PROGRESS
  const displayLabel = status
    ? status.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
    : 'UNKNOWN';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide border shadow-2xs ${colorClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
