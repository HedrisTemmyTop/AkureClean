import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import {
  Route,
  Trash2,
  Users,
  Truck,
  CreditCard,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  Calendar,
  AlertCircle,
  Home,
  Check,
  Clock,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { adminService } from "../services/adminService";
import { taskService } from "../services/taskService";
import Card from "../components/common/Card";
import StatusBadge from "../components/common/StatusBadge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorBanner from "../components/common/ErrorBanner";

const getPresetRange = (type: "30days" | "month" | "7days" | "all") => {
  const end = new Date();
  const endDateStr = end.toISOString().split("T")[0];

  if (type === "all") {
    return { startDate: "all", endDate: "" };
  }
  if (type === "7days") {
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return { startDate: start.toISOString().split("T")[0], endDate: endDateStr };
  }
  if (type === "month") {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { startDate: start.toISOString().split("T")[0], endDate: endDateStr };
  }
  // Default: last 30 days (1 month)
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { startDate: start.toISOString().split("T")[0], endDate: endDateStr };
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Date range filter state (default: 30 days / 1 month)
  const [preset, setPreset] = useState<"30days" | "month" | "7days" | "all">("30days");
  const [dateRange, setDateRange] = useState(() => getPresetRange("30days"));

  // Fetch admin stats filtered by date range
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin-stats", dateRange.startDate, dateRange.endDate, preset],
    queryFn: () =>
      adminService.getDashboardStats({
        startDate: preset === "all" ? "all" : dateRange.startDate,
        endDate: preset === "all" ? undefined : dateRange.endDate,
      }),
  });

  // Fetch recent tasks
  const {
    data: recentTasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["admin-recent-tasks"],
    queryFn: () => taskService.getAssignments(),
  });

  // Chart 1 Data: Scheduled Route Collections (Houses)
  const collectionsData = useMemo(() => {
    const cb = stats?.collectionsBreakdown || {
      totalHouses: 0,
      completedHouses: 0,
      pendingHouses: 0,
      skippedHouses: 0,
    };
    return [
      { name: "Total Houses", value: cb.totalHouses, fill: "#0F766E", label: "Scheduled Total" },
      { name: "Completed", value: cb.completedHouses, fill: "#10B981", label: "Collected" },
      { name: "Pending", value: cb.pendingHouses, fill: "#F59E0B", label: "Pending Collection" },
      { name: "Skipped", value: cb.skippedHouses, fill: "#F43F5E", label: "Skipped Houses" },
    ];
  }, [stats]);

  // Chart 2 Data: Resident Pickup Requests
  const pickupsData = useMemo(() => {
    const pb = stats?.pickupsBreakdown || {
      totalPickups: 0,
      completedPickups: 0,
      pendingPickups: 0,
      rejectedPickups: 0,
    };
    return [
      { name: "Total Pickups", value: pb.totalPickups, fill: "#0F766E", label: "Requested Total" },
      { name: "Completed", value: pb.completedPickups, fill: "#10B981", label: "Collected" },
      { name: "Pending", value: pb.pendingPickups, fill: "#F59E0B", label: "Pending Accept/Collect" },
      { name: "Rejected", value: pb.rejectedPickups, fill: "#F43F5E", label: "Rejected by Driver" },
    ];
  }, [stats]);

  if (statsLoading || tasksLoading) {
    return (
      <div className="py-16">
        <LoadingSpinner message="Loading operations dashboard metrics..." />
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Collection Tasks",
      value: stats?.activeRoutes ?? 0,
      icon: Route,
      color: "text-teal-600 bg-teal-50 border-teal-200",
      description: "Truck routes currently in progress",
      link: "/tasks",
    },
    {
      title: "Pending Approvals",
      value: stats?.pendingVerifications ?? stats?.unverifiedPickups ?? 0,
      icon: CheckCircle2,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      description: "Collections awaiting admin review",
      link: "/tasks",
    },
    {
      title: "Total Pickups Logged",
      value: stats?.totalPickups ?? 0,
      icon: Trash2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      description: "Recorded resident collections",
      link: "/pickups",
    },
    {
      title: "Registered Residents",
      value: stats?.totalResidents ?? 0,
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      description: "Subscribed households & units",
      link: "/residents",
    },
    {
      title: "Active Waste Collectors",
      value: stats?.totalCollectors ?? stats?.totalDrivers ?? 0,
      icon: Truck,
      color: "text-purple-600 bg-purple-50 border-purple-200",
      description: "Authorized collection trucks",
      link: "/collectors",
    },
    {
      title: "Total Revenue Collected",
      value: stats?.totalRevenue
        ? `₦${Number(stats.totalRevenue).toLocaleString()}`
        : "₦0",
      icon: CreditCard,
      color: "text-slate-700 bg-slate-100 border-slate-200",
      description: "Settled bill payments via Paystack",
      link: "/payments",
    },
  ];

  const recentTaskList = Array.isArray(recentTasks)
    ? recentTasks.slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {(statsError || tasksError) && (
        <ErrorBanner
          error={statsError || tasksError}
          title="Failed to load dashboard metrics"
          onRetry={() => {
            if (statsError) refetchStats();
            if (tasksError) refetchTasks();
          }}
        />
      )}

      {/* Welcome Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-teal to-teal-800 rounded-2xl p-6 text-white shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Akure Waste Operations Overview
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-xl">
            Monitor real-time collection routes across Akure South & North,
            approve driver verifications, and dispatch smart pickup tasks.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => navigate("/tasks/create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-teal font-semibold text-sm hover:bg-teal-50 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Collection Task</span>
          </button>
        </div>
      </div>

      {/* Operations Date Range Filter (Default: 1 Month) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-brand-teal border border-teal-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Operations Time Window
              </p>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-brand-teal border border-teal-200">
                {preset === "30days"
                  ? "1 Month Range (Default)"
                  : preset === "month"
                  ? "This Month"
                  : preset === "7days"
                  ? "Past 7 Days"
                  : "All Time"}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mt-0.5">
              {preset === "all"
                ? "Viewing all recorded operations across system history"
                : `Filtering operations from ${dateRange.startDate} to ${dateRange.endDate}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setPreset("30days");
                setDateRange(getPresetRange("30days"));
              }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                preset === "30days"
                  ? "bg-white text-brand-teal font-bold shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              1 Month (Default)
            </button>
            <button
              type="button"
              onClick={() => {
                setPreset("month");
                setDateRange(getPresetRange("month"));
              }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                preset === "month"
                  ? "bg-white text-brand-teal font-bold shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                setPreset("7days");
                setDateRange(getPresetRange("7days"));
              }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                preset === "7days"
                  ? "bg-white text-brand-teal font-bold shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setPreset("all");
                setDateRange(getPresetRange("all"));
              }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                preset === "all"
                  ? "bg-white text-brand-teal font-bold shadow-sm"
                  : "hover:text-slate-900"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Custom Date Pickers */}
          {preset !== "all" && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateRange((prev) => ({ ...prev, startDate: e.target.value }));
                  }
                }}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20 text-xs"
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateRange((prev) => ({ ...prev, endDate: e.target.value }));
                  }
                }}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-teal/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {card.description}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl border ${card.color} group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Verification Attention Callout if pending */}
      {(stats?.pendingVerifications || stats?.unverifiedPickups || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Driver Verifications Require Attention
              </p>
              <p className="text-xs text-amber-700">
                There are collections waiting for admin sign-off or disputed by
                residents.
              </p>
            </div>
          </div>
          <Link
            to="/tasks"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span>Review Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 2 Operations Performance Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Scheduled Route Collections (House-to-House Tasks) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 text-brand-teal border border-teal-200">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Scheduled Route Collections
                  </h3>
                  <p className="text-xs text-slate-500">
                    House collection stops across admin-created route tasks
                  </p>
                </div>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-1 flex-shrink-0"
              >
                <span>View Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-4 gap-2 my-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Houses
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  {stats?.collectionsBreakdown?.totalHouses ?? 0}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
                  {stats?.collectionsBreakdown?.completedHouses ?? 0}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                  Pending
                </p>
                <p className="text-base sm:text-lg font-bold text-amber-700 mt-0.5">
                  {stats?.collectionsBreakdown?.pendingHouses ?? 0}
                </p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                  Skipped
                </p>
                <p className="text-base sm:text-lg font-bold text-rose-700 mt-0.5">
                  {stats?.collectionsBreakdown?.skippedHouses ?? 0}
                </p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="h-60 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg space-y-0.5">
                            <p className="font-semibold text-slate-200">{item.name}</p>
                            <p className="text-slate-400 text-[11px]">{item.label}</p>
                            <p className="text-white text-base font-bold mt-1">
                              {Number(item.value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {collectionsData.map((entry, index) => (
                      <Cell key={`cell-c-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Completion Rate Footer */}
          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Collection Completion Rate:{" "}
              <strong className="text-slate-800">
                {stats?.collectionsBreakdown?.totalHouses
                  ? Math.round(
                      ((stats.collectionsBreakdown.completedHouses || 0) /
                        stats.collectionsBreakdown.totalHouses) *
                        100
                    )
                  : 0}
                %
              </strong>
            </span>
            <span>
              Skipped Houses:{" "}
              <strong className="text-rose-600">
                {stats?.collectionsBreakdown?.skippedHouses ?? 0}
              </strong>
            </span>
          </div>
        </div>

        {/* CHART 2: Resident Pickup Requests */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Resident Pickup Requests
                  </h3>
                  <p className="text-xs text-slate-500">
                    On-demand waste pickup bookings submitted by residents
                  </p>
                </div>
              </div>
              <Link
                to="/pickups"
                className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-1 flex-shrink-0"
              >
                <span>View Pickups</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-4 gap-2 my-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Pickups
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  {stats?.pickupsBreakdown?.totalPickups ?? 0}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
                  {stats?.pickupsBreakdown?.completedPickups ?? 0}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                  Pending
                </p>
                <p className="text-base sm:text-lg font-bold text-amber-700 mt-0.5">
                  {stats?.pickupsBreakdown?.pendingPickups ?? 0}
                </p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                  Rejected
                </p>
                <p className="text-base sm:text-lg font-bold text-rose-700 mt-0.5">
                  {stats?.pickupsBreakdown?.rejectedPickups ?? 0}
                </p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="h-60 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pickupsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg space-y-0.5">
                            <p className="font-semibold text-slate-200">{item.name}</p>
                            <p className="text-slate-400 text-[11px]">{item.label}</p>
                            <p className="text-white text-base font-bold mt-1">
                              {Number(item.value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {pickupsData.map((entry, index) => (
                      <Cell key={`cell-p-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fulfillment Rate Footer */}
          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Fulfillment Rate:{" "}
              <strong className="text-slate-800">
                {stats?.pickupsBreakdown?.totalPickups
                  ? Math.round(
                      ((stats.pickupsBreakdown.completedPickups || 0) /
                        stats.pickupsBreakdown.totalPickups) *
                        100
                    )
                  : 0}
                %
              </strong>
            </span>
            <span>
              Rejected Requests:{" "}
              <strong className="text-rose-600">
                {stats?.pickupsBreakdown?.rejectedPickups ?? 0}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Recent Collection Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Recent Collection Tasks
            </h3>
            <p className="text-xs text-slate-500">
              Latest driver route assignments dispatched
            </p>
          </div>
          <Link
            to="/tasks"
            className="text-xs font-semibold text-brand-teal hover:text-teal-700 flex items-center gap-1"
          >
            <span>View All Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTaskList.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No collection tasks have been created yet.{" "}
            <Link
              to="/tasks/create"
              className="text-brand-teal font-medium hover:underline"
            >
              Create your first task
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Task / Route ID</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Stops</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTaskList.map((task) => (
                  <tr
                    key={task._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-800 font-medium">
                      {task._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {typeof task.driver === "object" && task.driver ? (
                        <div>
                          <p className="font-medium text-slate-900">
                            {task.driver.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {task.driver.phone || task.driver.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          Driver {String(task.driver).slice(-6)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {new Date(task.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {task.stops?.length || 0} stops
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/tasks/${task._id}`}
                        className="text-xs font-semibold text-brand-teal hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
