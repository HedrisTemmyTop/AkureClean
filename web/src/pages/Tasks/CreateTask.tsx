import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  Check,
  Search,
  CheckCircle2,
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { taskService } from "../../services/taskService";
import { locationService, StructuredLocationsMap } from "../../services/locationService";
import { useFeedback } from "../../context/FeedbackContext";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorBanner from "../../components/common/ErrorBanner";

export const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showSuccessModal, showErrorModal } =
    useFeedback();

  // Form State
  const [title, setTitle] = useState("");
  const [driverId, setDriverId] = useState("");
  const [collectionDate, setCollectionDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0],
  );
  const [collectionTime, setCollectionTime] = useState("08:00 AM");

  // Fetch Structured Locations from Backend
  const { data: locationsData } = useQuery({
    queryKey: ["locations-structured"],
    queryFn: () => locationService.getStructuredLocations(),
  });

  const structuredPUs: StructuredLocationsMap = useMemo(
    () => locationsData?.structured || {},
    [locationsData]
  );

  // Cascade State
  const lgaOptions = useMemo(() => Object.keys(structuredPUs), [structuredPUs]);
  const [selectedLga, setSelectedLga] = useState<string>("");

  React.useEffect(() => {
    if (lgaOptions.length > 0 && !selectedLga) {
      setSelectedLga(
        lgaOptions.includes("Akure South") ? "Akure South" : lgaOptions[0]
      );
    }
  }, [lgaOptions, selectedLga]);

  const wardOptions = useMemo(() => {
    if (!selectedLga || !structuredPUs[selectedLga]) return [];
    return Object.keys(structuredPUs[selectedLga]);
  }, [selectedLga, structuredPUs]);

  const [selectedWard, setSelectedWard] = useState<string>("");

  const puList = useMemo(() => {
    if (
      !selectedLga ||
      !selectedWard ||
      !structuredPUs[selectedLga]?.[selectedWard]
    )
      return [];
    return structuredPUs[selectedLga][selectedWard];
  }, [selectedLga, selectedWard, structuredPUs]);

  const [selectedPUs, setSelectedPUs] = useState<string[]>([]);
  const [puSearch, setPuSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Drivers
  const {
    data: drivers = [],
    isLoading: driversLoading,
    error: driversError,
    refetch: refetchDrivers,
  } = useQuery<any[]>({
    queryKey: ["admin-drivers"],
    queryFn: () => adminService.getDrivers(),
  });

  // Fetch Residents with billing status to display live paid/unpaid count for selected area
  const { data: billingData } = useQuery({
    queryKey: ["admin-residents-billing", "all"],
    queryFn: () => adminService.getResidentsBillingSummary({ filter: "all" }),
  });

  const matchingResidentsStats = useMemo(() => {
    if (!selectedLga || !selectedWard || selectedPUs.length === 0 || !billingData?.data) {
      return null;
    }
    const cleanLga = selectedLga.trim().toLowerCase();
    const cleanWard = selectedWard.trim().toLowerCase();
    const puLower = selectedPUs.map((p) => p.trim().toLowerCase());
    const matching = billingData.data.filter((item) => {
      const r = item.resident;
      const rLga = (r.localGovt || "").trim().toLowerCase();
      const rWard = (r.ward || "").trim().toLowerCase();
      const rPu = (r.pollingUnit || "").trim().toLowerCase();
      return rLga === cleanLga && rWard === cleanWard && puLower.includes(rPu);
    });
    const paidCount = matching.filter(
      (item) => item.status === "up_to_date" && item.paidBillsCount > 0
    ).length;
    return {
      totalCount: matching.length,
      paidCount,
      unpaidCount: matching.length - paidCount,
    };
  }, [billingData, selectedLga, selectedWard, selectedPUs]);

  // Scroll to error banner if error occurs
  React.useEffect(() => {
    if (errorMessage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [errorMessage]);

  // Filtered PU items based on search
  const filteredPUs = useMemo(() => {
    if (!puSearch.trim()) return puList;
    return puList.filter((item) =>
      item.name.toLowerCase().includes(puSearch.toLowerCase().trim()),
    );
  }, [puList, puSearch]);

  // Create Assignment Mutation
  const createMutation = useMutation({
    mutationFn: taskService.createAssignment,
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["collection-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      const stopCount = newTask?.stops?.length || 0;
      const targetId = newTask.id || newTask._id;
      showSuccess("Collection task generated and dispatched successfully.");
      showSuccessModal(
        "Collection Task Created",
        `Route "${newTask.title || title}" has been optimized and dispatched with ${stopCount} household stop${stopCount === 1 ? "" : "s"}.`,
        () => navigate(`/tasks/${targetId}`),
        "View Route Details",
      );
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to generate collection task.";
      setErrorMessage(msg);
      showError(msg, "Unable to Generate Task");
      showErrorModal("Unable to Generate Task", msg);
    },
  });

  const handleLgaChange = (lga: string) => {
    setSelectedLga(lga);
    const wards = Object.keys(structuredPUs[lga] || {});
    setSelectedWard(wards[0] || "");
    setSelectedPUs([]);
  };

  const handleWardChange = (ward: string) => {
    setSelectedWard(ward);
    setSelectedPUs([]);
  };

  const togglePU = (name: string) => {
    setSelectedPUs((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  const handleSelectAllPUs = () => {
    if (selectedPUs.length === filteredPUs.length) {
      setSelectedPUs([]);
    } else {
      setSelectedPUs(filteredPUs.map((p) => p.name));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!driverId) {
      const msg = "Please select an active driver for this task.";
      setErrorMessage(msg);
      showError(msg, "Validation Error");
      return;
    }
    if (!title.trim()) {
      const msg = "Please enter a descriptive title for this task.";
      setErrorMessage(msg);
      showError(msg, "Validation Error");
      return;
    }
    if (!selectedLga || !selectedWard) {
      const msg = "Please choose both an LGA and a Ward.";
      setErrorMessage(msg);
      showError(msg, "Validation Error");
      return;
    }
    if (selectedPUs.length === 0) {
      const msg = "Please select at least one Polling Unit to collect from.";
      setErrorMessage(msg);
      showError(msg, "Validation Error");
      return;
    }

    const puDetails = selectedPUs.map((name) => {
      const match = puList.find((p) => p.name === name);
      return {
        name,
        coordinates: match ? match.coordinates : null,
      };
    });

    createMutation.mutate({
      driverId,
      title: title.trim(),
      collectionDate,
      collectionTime,
      lga: selectedLga,
      ward: selectedWard,
      pollingUnits: selectedPUs,
      pollingUnitLocations: puDetails,
    });
  };

  // Set default ward when options load
  React.useEffect(() => {
    if (wardOptions.length > 0 && !selectedWard) {
      setSelectedWard(wardOptions[0]);
    }
  }, [wardOptions, selectedWard]);

  const activeDrivers = drivers.filter(
    (d: any) => d.status === "active" || d.isActive !== false,
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/tasks")}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Create Collection Task
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dispatch driver routes with automated OSRM nearest-neighbor waypoint
            optimization.
          </p>
        </div>
      </div>

      {driversError && (
        <ErrorBanner
          error={driversError}
          title="Failed to load active drivers"
          onRetry={() => refetchDrivers()}
        />
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to Generate Task</p>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left Form: Parameters (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-teal" />
              <span>Task & Driver Information</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Task Location
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Alagbaka, Ward 08 - Akure Central"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Collector (Driver)
                </label>
                {driversLoading ? (
                  <p className="text-xs text-slate-500 py-2">
                    Loading collectors...
                  </p>
                ) : (
                  <select
                    required
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal bg-white text-slate-800"
                  >
                    <option value="">-- Choose Assigned Driver --</option>
                    {activeDrivers.map((driver: any) => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name} ({driver.phone || driver.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Collection Time Window
                </label>
                <input
                  type="text"
                  value={collectionTime}
                  onChange={(e) => setCollectionTime(e.target.value)}
                  placeholder="08:00 AM - 12:00 PM"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Scheduled Date
              </label>
              <input
                type="date"
                required
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full sm:w-1/2 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal text-slate-800"
              />
            </div>
          </div>

          {/* Card 2: LGA, Ward & Polling Units Cascade */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-teal" />
              <span>Geographic Targeting (Polling Units Cascade)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Local Government Area (LGA)
                </label>
                <select
                  value={selectedLga}
                  onChange={(e) => handleLgaChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal bg-white text-slate-800"
                >
                  {lgaOptions.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ward
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => handleWardChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal bg-white text-slate-800"
                >
                  {wardOptions.map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Polling Units Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select Polling Units ({selectedPUs.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllPUs}
                  className="text-xs font-semibold text-brand-teal hover:underline"
                >
                  {selectedPUs.length === filteredPUs.length &&
                  filteredPUs.length > 0
                    ? "Deselect All"
                    : "Select All Filtered"}
                </button>
              </div>

              {/* Search input for PU */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={puSearch}
                  onChange={(e) => setPuSearch(e.target.value)}
                  placeholder="Filter polling units by name..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal text-slate-800"
                />
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2.5 space-y-1.5 bg-slate-50/50">
                {filteredPUs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    No polling units match your filter.
                  </p>
                ) : (
                  filteredPUs.map((pu) => {
                    const isSelected = selectedPUs.includes(pu.name);
                    return (
                      <div
                        key={pu.name}
                        onClick={() => togglePU(pu.name)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? "bg-teal-50 border border-teal-300 text-teal-900 font-medium"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? "bg-brand-teal border-brand-teal text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span>{pu.name}</span>
                        </div>
                        {pu.coordinates && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {pu.coordinates[1].toFixed(4)},{" "}
                            {pu.coordinates[0].toFixed(4)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Summary & Dispatch (1 column) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Route Summary Preview
            </h3>

            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Area:</span>
                <span className="font-medium text-slate-800 text-right">
                  {selectedLga || "None"} / {selectedWard || "None"}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-medium text-slate-800">
                  {collectionDate || "—"}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Selected PUs:</span>
                <span className="font-bold text-brand-teal">
                  {selectedPUs.length} Units
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Optimization:</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  OSRM Engine Enabled
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs">
              <div className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Automated Routing Heuristic</span>
              </div>
              <p className="mt-1 text-[11px] text-teal-700 leading-relaxed">
                The backend will query paid residents registered in these polling
                units and order them into an optimal driving sequence.
              </p>
            </div>

            {/* Resident Availability Status Indicator */}
            {selectedPUs.length > 0 && matchingResidentsStats !== null && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  matchingResidentsStats.paidCount > 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-300 text-amber-900"
                }`}
              >
                {matchingResidentsStats.paidCount > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">
                        Eligible Paid Residents Found
                      </span>
                      <span className="text-[11px] block">
                        {matchingResidentsStats.paidCount} paid resident household
                        {matchingResidentsStats.paidCount === 1 ? "" : "s"} will be
                        added to the route
                        {matchingResidentsStats.unpaidCount > 0
                          ? ` (${matchingResidentsStats.unpaidCount} unpaid excluded).`
                          : "."}
                      </span>
                    </div>
                  </>
                ) : matchingResidentsStats.totalCount > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">
                        0 Paid Residents ({matchingResidentsStats.totalCount} Unpaid)
                      </span>
                      <span className="text-[11px] text-amber-800 leading-tight block mt-0.5">
                        Found {matchingResidentsStats.totalCount} registered resident
                        {matchingResidentsStats.totalCount === 1 ? "" : "s"} in the
                        selected unit(s), but none have paid their waste bill. Only
                        paid residents are added to routes.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">
                        0 Registered Residents
                      </span>
                      <span className="text-[11px] text-amber-800 leading-tight block mt-0.5">
                        No residents found in the selected polling unit(s).
                        Tasks require registered paid residents to generate
                        collection stops.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending || selectedPUs.length === 0}
              className="w-full py-3 px-4 bg-brand-teal hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {createMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Optimizing & Dispatching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Optimize & Create Task</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateTask;
