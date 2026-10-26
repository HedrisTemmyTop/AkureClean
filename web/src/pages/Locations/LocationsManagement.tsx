import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Plus,
  Upload,
  Trash2,
  Search,
  Building2,
  Layers,
  Navigation,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  locationService,
  LocalGovtItem,
  WardItem,
  PollingUnitItem,
} from "../../services/locationService";
import { useFeedback } from "../../context/FeedbackContext";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import Modal from "../../components/common/Modal";

const SAMPLE_CSV_CONTENT = `local_govt,ward,polling_unit,longitude,latitude
Akure South,WARD 04 - IJOMU/OBANLA,FUTA SOUTH GATE POLLING UNIT,5.1385,7.2982
Akure South,WARD 09 - OBA-ILE,OBA-ILE HOUSING ESTATE II,5.2421,7.2654
Akure North,WARD 02 - AYEDE/OGBESE,OGBESE MARKET SQUARE III,5.3612,7.2589`;

type ManualModalTab = "lga" | "ward" | "pu";

export const LocationsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Explorer selection state
  const [selectedLgaId, setSelectedLgaId] = useState<string>("");
  const [selectedWardId, setSelectedWardId] = useState<string>("");

  // Search filters
  const [wardSearch, setWardSearch] = useState("");
  const [puSearch, setPuSearch] = useState("");

  // Manual Creation Modal / Form state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTab, setManualTab] = useState<ManualModalTab>("pu");

  // Manual Form: Create Local Govt
  const [manualLgaName, setManualLgaName] = useState("");
  const [manualLgaState, setManualLgaState] = useState("Ondo");

  // Manual Form: Add Ward
  const [manualWardLgaId, setManualWardLgaId] = useState("");
  const [manualWardName, setManualWardName] = useState("");

  // Manual Form: Add Polling Unit
  const [manualPuLgaId, setManualPuLgaId] = useState("");
  const [manualPuWardId, setManualPuWardId] = useState("");
  const [manualPuName, setManualPuName] = useState("");
  const [manualPuLng, setManualPuLng] = useState("");
  const [manualPuLat, setManualPuLat] = useState("");

  // Bulk Upload Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadSummary, setUploadSummary] = useState<{
    totalRows: number;
    lgasCreated: number;
    wardsCreated: number;
    pollingUnitsCreated: number;
    pollingUnitsUpdated: number;
    errors: string[];
  } | null>(null);

  // Fetch all locations hierarchy
  const {
    data: locationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["locations-structured"],
    queryFn: () => locationService.getStructuredLocations(),
  });

  const lgas: LocalGovtItem[] = locationsData?.lgas || [];
  const wards: WardItem[] = locationsData?.wards || [];
  const pollingUnits: PollingUnitItem[] = locationsData?.pollingUnits || [];

  // Default select first LGA when loaded
  React.useEffect(() => {
    if (lgas.length > 0 && !selectedLgaId) {
      const akureSouth = lgas.find(
        (l) => l.name.toLowerCase() === "akure south"
      );
      const defaultId = akureSouth ? akureSouth._id : lgas[0]._id;
      setSelectedLgaId(defaultId);
      setManualWardLgaId(defaultId);
      setManualPuLgaId(defaultId);
    }
  }, [lgas, selectedLgaId]);

  const selectedLga = useMemo(
    () => lgas.find((l) => l._id === selectedLgaId) || null,
    [lgas, selectedLgaId]
  );

  const wardsForSelectedLga = useMemo(() => {
    if (!selectedLgaId) return [];
    return wards.filter((w) => String(w.localGovtId) === String(selectedLgaId));
  }, [wards, selectedLgaId]);

  // Wards for Manual Polling Unit modal dropdown
  const wardsForManualPuLga = useMemo(() => {
    if (!manualPuLgaId) return [];
    return wards.filter((w) => String(w.localGovtId) === String(manualPuLgaId));
  }, [wards, manualPuLgaId]);

  React.useEffect(() => {
    if (wardsForManualPuLga.length > 0) {
      const exists = wardsForManualPuLga.some((w) => w._id === manualPuWardId);
      if (!exists) {
        setManualPuWardId(wardsForManualPuLga[0]._id);
      }
    } else {
      setManualPuWardId("");
    }
  }, [wardsForManualPuLga, manualPuWardId]);

  // Default select first Ward when LGA changes in explorer
  React.useEffect(() => {
    if (wardsForSelectedLga.length > 0) {
      const stillValid = wardsForSelectedLga.some(
        (w) => w._id === selectedWardId
      );
      if (!stillValid) {
        setSelectedWardId(wardsForSelectedLga[0]._id);
      }
    } else {
      setSelectedWardId("");
    }
  }, [wardsForSelectedLga, selectedWardId]);

  const selectedWard = useMemo(
    () => wardsForSelectedLga.find((w) => w._id === selectedWardId) || null,
    [wardsForSelectedLga, selectedWardId]
  );

  const filteredWards = useMemo(() => {
    if (!wardSearch.trim()) return wardsForSelectedLga;
    const q = wardSearch.toLowerCase().trim();
    return wardsForSelectedLga.filter((w) => w.name.toLowerCase().includes(q));
  }, [wardsForSelectedLga, wardSearch]);

  const pusForSelectedWard = useMemo(() => {
    if (!selectedWardId) return [];
    return pollingUnits.filter(
      (p) => String(p.wardId) === String(selectedWardId)
    );
  }, [pollingUnits, selectedWardId]);

  const filteredPollingUnits = useMemo(() => {
    if (!puSearch.trim()) return pusForSelectedWard;
    const q = puSearch.toLowerCase().trim();
    return pusForSelectedWard.filter((p) => p.name.toLowerCase().includes(q));
  }, [pusForSelectedWard, puSearch]);

  // Helper counts
  const wardCountByLga = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of wards) {
      const key = String(w.localGovtId);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [wards]);

  const puCountByWard = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pollingUnits) {
      const key = String(p.wardId);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [pollingUnits]);

  const invalidateLocations = () => {
    queryClient.invalidateQueries({ queryKey: ["locations-structured"] });
  };

  // Open manual modal helper with pre-selected LGA / Ward
  const openManualModal = (tab: ManualModalTab) => {
    setManualTab(tab);
    if (selectedLgaId) {
      setManualWardLgaId(selectedLgaId);
      setManualPuLgaId(selectedLgaId);
    }
    if (selectedWardId) {
      setManualPuWardId(selectedWardId);
    }
    setIsManualModalOpen(true);
  };

  // Mutations
  const createLgaMutation = useMutation({
    mutationFn: (payload: { name: string; state?: string }) =>
      locationService.createLocalGovt(payload),
    onSuccess: (created) => {
      invalidateLocations();
      setManualLgaName("");
      setSelectedLgaId(created._id);
      setManualWardLgaId(created._id);
      setManualPuLgaId(created._id);
      showSuccess(`Local Government "${created.name}" created successfully!`);
      setIsManualModalOpen(false);
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to add Local Government"
      );
    },
  });

  const deleteLgaMutation = useMutation({
    mutationFn: (id: string) => locationService.deleteLocalGovt(id),
    onSuccess: () => {
      invalidateLocations();
      setSelectedLgaId("");
      showSuccess("Local Government deleted.");
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to delete Local Government"
      );
    },
  });

  const createWardMutation = useMutation({
    mutationFn: (payload: { name: string; localGovtId: string }) =>
      locationService.createWard(payload),
    onSuccess: (created) => {
      invalidateLocations();
      setManualWardName("");
      setSelectedLgaId(String(created.localGovtId));
      setSelectedWardId(created._id);
      showSuccess(`Ward "${created.name}" added to ${created.localGovtName}!`);
      setIsManualModalOpen(false);
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message || "Failed to add Ward");
    },
  });

  const deleteWardMutation = useMutation({
    mutationFn: (id: string) => locationService.deleteWard(id),
    onSuccess: () => {
      invalidateLocations();
      setSelectedWardId("");
      showSuccess("Ward deleted.");
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message || "Failed to delete Ward");
    },
  });

  const createPuMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      wardId: string;
      localGovtId: string;
      longitude?: string;
      latitude?: string;
    }) => locationService.createPollingUnit(payload),
    onSuccess: (created) => {
      invalidateLocations();
      setManualPuName("");
      setManualPuLng("");
      setManualPuLat("");
      setSelectedLgaId(String(created.localGovtId));
      setSelectedWardId(String(created.wardId));
      showSuccess(
        `Polling Unit "${created.name}" added to ${created.wardName}!`
      );
      setIsManualModalOpen(false);
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message || "Failed to add Polling Unit");
    },
  });

  const deletePuMutation = useMutation({
    mutationFn: (id: string) => locationService.deletePollingUnit(id),
    onSuccess: () => {
      invalidateLocations();
      showSuccess("Polling Unit deleted.");
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to delete Polling Unit"
      );
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: (text: string) => locationService.bulkUploadCsv(text),
    onSuccess: (res) => {
      invalidateLocations();
      setUploadSummary(res.data);
      showSuccess(res.message);
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to process bulk CSV upload"
      );
    },
  });

  // Manual Modal Form Handlers
  const handleManualCreateLga = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLgaName.trim()) {
      showError("Please enter a Local Government name.");
      return;
    }
    createLgaMutation.mutate({
      name: manualLgaName.trim(),
      state: manualLgaState.trim() || "Ondo",
    });
  };

  const handleManualCreateWard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWardLgaId) {
      showError("Please select a Local Government.");
      return;
    }
    if (!manualWardName.trim()) {
      showError("Please enter a Ward name.");
      return;
    }
    createWardMutation.mutate({
      name: manualWardName.trim(),
      localGovtId: manualWardLgaId,
    });
  };

  const handleManualCreatePu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPuLgaId) {
      showError("Please select a Local Government.");
      return;
    }
    if (!manualPuWardId) {
      showError("Please select a Ward.");
      return;
    }
    if (!manualPuName.trim()) {
      showError("Please enter a Polling Unit name.");
      return;
    }
    createPuMutation.mutate({
      name: manualPuName.trim(),
      localGovtId: manualPuLgaId,
      wardId: manualPuWardId,
      longitude: manualPuLng.trim() || undefined,
      latitude: manualPuLat.trim() || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setUploadSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || "");
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "locations_bulk_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Preview parsed CSV rows on the client
  const csvPreviewRows = useMemo(() => {
    if (!csvText.trim()) return [];
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) return [];
    return lines.slice(1, 8).map((line) => line.split(",").map((c) => c.trim()));
  }, [csvText]);

  const totalCsvRows = useMemo(() => {
    if (!csvText.trim()) return 0;
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return Math.max(0, lines.length - 1);
  }, [csvText]);

  if (isLoading) {
    return (
      <LoadingSpinner message="Loading Local Governments, Wards & Polling Units..." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Locations &amp; Polling Units
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manually create Local Governments, Wards, and Polling Units or bulk import via CSV.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-nowrap flex-shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => openManualModal("lga")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:border-brand-teal hover:text-brand-teal transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-brand-teal" />
            New Local Govt
          </button>

          <button
            type="button"
            onClick={() => openManualModal("ward")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:border-brand-teal hover:text-brand-teal transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            New Ward
          </button>

          <button
            type="button"
            onClick={() => openManualModal("pu")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-brand-teal text-white hover:bg-teal-800 transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Polling Unit
          </button>

          <button
            type="button"
            onClick={() => {
              setUploadSummary(null);
              setIsBulkModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
          >
            <Upload className="w-4 h-4" />
            Bulk CSV Upload
          </button>
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => refetch()} />}

      {/* Summary KPI Cards with Quick Add Action */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 text-brand-teal flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Local Governments
              </p>
              <p className="text-2xl font-bold text-slate-900">{lgas.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openManualModal("lga")}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-brand-teal hover:bg-teal-100 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Create LGA
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Wards
              </p>
              <p className="text-2xl font-bold text-slate-900">{wards.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openManualModal("ward")}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Ward
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Polling Units
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {pollingUnits.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openManualModal("pu")}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Unit
          </button>
        </div>
      </div>

      {/* 3-Column Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Local Governments */}
        <div className="lg:col-span-3">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  1. Local Governments
                </h2>
                <p className="text-xs text-slate-500">Select an LGA to view wards</p>
              </div>
              <button
                type="button"
                onClick={() => openManualModal("lga")}
                className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {lgas.map((lga) => {
                const isSelected = lga._id === selectedLgaId;
                const count = wardCountByLga[String(lga._id)] || 0;
                return (
                  <div
                    key={lga._id}
                    onClick={() => setSelectedLgaId(lga._id)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
                      isSelected
                        ? "bg-teal-50/80 border-brand-teal text-brand-teal font-semibold shadow-sm"
                        : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {lga.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {count} ward{count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Delete Local Government"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Delete "${lga.name}" and all its wards/polling units?`
                          )
                        ) {
                          deleteLgaMutation.mutate(lga._id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {lgas.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  No Local Governments found. Click "+ New Local Govt" to add one.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Column 2: Wards */}
        <div className="lg:col-span-4">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  2. Wards {selectedLga ? `(${selectedLga.name})` : ""}
                </h2>
                <p className="text-xs text-slate-500">
                  Select a Ward to view polling units
                </p>
              </div>
              <button
                type="button"
                onClick={() => openManualModal("ward")}
                className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Ward
              </button>
            </div>

            {/* Ward Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter wards..."
                value={wardSearch}
                onChange={(e) => setWardSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-brand-teal"
              />
            </div>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredWards.map((ward) => {
                const isSelected = ward._id === selectedWardId;
                const puCount = puCountByWard[String(ward._id)] || 0;
                return (
                  <div
                    key={ward._id}
                    onClick={() => setSelectedWardId(ward._id)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
                      isSelected
                        ? "bg-teal-50/80 border-brand-teal text-brand-teal font-semibold shadow-sm"
                        : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {ward.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {puCount} polling unit{puCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Delete Ward"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Delete ward "${ward.name}" and its polling units?`
                          )
                        ) {
                          deleteWardMutation.mutate(ward._id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {filteredWards.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  {selectedLga
                    ? 'No wards match. Click "+ New Ward" to add one.'
                    : "Select a Local Government on the left."}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Column 3: Polling Units */}
        <div className="lg:col-span-5">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <h2 className="text-sm font-bold text-slate-800 truncate">
                  3. Polling Units {selectedWard ? `(${selectedWard.name})` : ""}
                </h2>
                <p className="text-xs text-slate-500">
                  Polling Units &amp; Coordinates inside the selected Ward
                </p>
              </div>
              <button
                type="button"
                onClick={() => openManualModal("pu")}
                className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-0.5 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> New Unit
              </button>
            </div>

            {/* Polling Unit Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search polling units in this ward..."
                value={puSearch}
                onChange={(e) => setPuSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-brand-teal"
              />
            </div>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredPollingUnits.map((pu) => {
                const hasCoords =
                  Array.isArray(pu.coordinates) && pu.coordinates.length === 2;
                return (
                  <div
                    key={pu._id}
                    className="group flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-semibold text-slate-800 break-words">
                        {pu.name}
                      </p>
                      {hasCoords && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Navigation className="w-3 h-3 text-brand-teal" />
                          {Number(pu.coordinates[1]).toFixed(4)}°N,{" "}
                          {Number(pu.coordinates[0]).toFixed(4)}°E
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      title="Delete Polling Unit"
                      onClick={() => {
                        if (
                          window.confirm(`Delete polling unit "${pu.name}"?`)
                        ) {
                          deletePuMutation.mutate(pu._id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {filteredPollingUnits.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  {selectedWard
                    ? 'No polling units in this ward yet. Click "+ Add Polling Unit" or use Bulk CSV Upload.'
                    : "Select a Ward to view and add Polling Units."}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Manual Create Modal (Local Govt / Ward / Polling Unit) */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Add Location Manually"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setManualTab("lga")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                manualTab === "lga"
                  ? "bg-white text-brand-teal shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1. New Local Govt
            </button>
            <button
              type="button"
              onClick={() => setManualTab("ward")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                manualTab === "ward"
                  ? "bg-white text-brand-teal shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2. Add Ward
            </button>
            <button
              type="button"
              onClick={() => setManualTab("pu")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                manualTab === "pu"
                  ? "bg-white text-brand-teal shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3. Add Polling Unit
            </button>
          </div>

          {/* Tab 1: Create New Local Government */}
          {manualTab === "lga" && (
            <form onSubmit={handleManualCreateLga} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Local Government Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Akure South, Ifedore, Owo..."
                  value={manualLgaName}
                  onChange={(e) => setManualLgaName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  placeholder="Ondo"
                  value={manualLgaState}
                  onChange={(e) => setManualLgaState(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLgaMutation.isPending || !manualLgaName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-teal text-white hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {createLgaMutation.isPending
                    ? "Creating..."
                    : "Create Local Government"}
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Add Ward to a Local Government */}
          {manualTab === "ward" && (
            <form onSubmit={handleManualCreateWard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Local Government <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={manualWardLgaId}
                  onChange={(e) => setManualWardLgaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
                >
                  <option value="">-- Choose Local Government --</option>
                  {lgas.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ward Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WARD 04 - IJOMU/OBANLA"
                  value={manualWardName}
                  onChange={(e) => setManualWardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createWardMutation.isPending ||
                    !manualWardLgaId ||
                    !manualWardName.trim()
                  }
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-teal text-white hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {createWardMutation.isPending ? "Saving..." : "Add Ward"}
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Add Polling Unit to a Ward */}
          {manualTab === "pu" && (
            <form onSubmit={handleManualCreatePu} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Local Government <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={manualPuLgaId}
                  onChange={(e) => {
                    setManualPuLgaId(e.target.value);
                    setManualPuWardId("");
                  }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
                >
                  <option value="">-- Choose Local Government --</option>
                  {lgas.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Ward <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={!manualPuLgaId}
                  value={manualPuWardId}
                  onChange={(e) => setManualPuWardId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal disabled:bg-slate-50"
                >
                  <option value="">
                    {manualPuLgaId
                      ? "-- Choose Ward --"
                      : "Select a Local Government first"}
                  </option>
                  {wardsForManualPuLga.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Polling Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FUTA SOUTH GATE POLLING UNIT"
                  value={manualPuName}
                  onChange={(e) => setManualPuName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5.1385"
                    value={manualPuLng}
                    onChange={(e) => setManualPuLng(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 7.2982"
                    value={manualPuLat}
                    onChange={(e) => setManualPuLat(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createPuMutation.isPending ||
                    !manualPuLgaId ||
                    !manualPuWardId ||
                    !manualPuName.trim()
                  }
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-teal text-white hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {createPuMutation.isPending
                    ? "Saving..."
                    : "Add Polling Unit"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Bulk CSV Upload Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Upload Locations (CSV)"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-brand-teal" />
                Expected CSV Columns
              </p>
              <p>
                <code className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-800 font-mono">
                  local_govt,ward,polling_unit,longitude,latitude
                </code>{" "}
                (longitude &amp; latitude are optional)
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-brand-teal hover:bg-teal-50 transition-colors flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
          </div>

          {/* File Dropzone / Picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-brand-teal rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-teal-50/20 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-brand-teal mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              {selectedFileName
                ? `Selected: ${selectedFileName}`
                : "Click to select a CSV file"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Automatically creates missing Local Governments, Wards, and Polling Units
            </p>
          </div>

          {/* Or Paste CSV Text Directly */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Or Paste / Edit CSV Content Directly:
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setUploadSummary(null);
              }}
              placeholder={SAMPLE_CSV_CONTENT}
              className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
            />
          </div>

          {/* Preview */}
          {csvPreviewRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>CSV Preview (First {csvPreviewRows.length} rows)</span>
                <span className="text-brand-teal">
                  Total detected: {totalCsvRows} row{totalCsvRows === 1 ? "" : "s"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Local Govt</th>
                      <th className="py-2 px-3">Ward</th>
                      <th className="py-2 px-3">Polling Unit</th>
                      <th className="py-2 px-3">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreviewRows.map((cols, i) => (
                      <tr key={i} className="text-slate-700">
                        <td className="py-1.5 px-3 font-medium">
                          {cols[0] || "—"}
                        </td>
                        <td className="py-1.5 px-3">{cols[1] || "—"}</td>
                        <td className="py-1.5 px-3">{cols[2] || "—"}</td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-slate-400">
                          {cols[3] && cols[4] ? `${cols[3]}, ${cols[4]}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Result Banner */}
          {uploadSummary && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Bulk Import Completed
              </div>
              <p>
                Processed <strong>{uploadSummary.totalRows}</strong> rows:{" "}
                <strong>+{uploadSummary.lgasCreated}</strong> LGA(s),{" "}
                <strong>+{uploadSummary.wardsCreated}</strong> Ward(s),{" "}
                <strong>+{uploadSummary.pollingUnitsCreated}</strong> new Polling
                Unit(s), <strong>{uploadSummary.pollingUnitsUpdated}</strong>{" "}
                updated.
              </p>
              {uploadSummary.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200 text-amber-800">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Warnings ({uploadSummary.errors.length}):
                  </p>
                  <ul className="list-disc list-inside max-h-24 overflow-y-auto mt-1">
                    {uploadSummary.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!csvText.trim() || bulkUploadMutation.isPending}
              onClick={() => bulkUploadMutation.mutate(csvText)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-teal text-white hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {bulkUploadMutation.isPending
                ? "Importing CSV..."
                : "Upload & Import CSV"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LocationsManagement;
