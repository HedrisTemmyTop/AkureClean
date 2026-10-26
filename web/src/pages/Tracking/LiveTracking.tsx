import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Navigation,
  Phone,
  Clock,
  Gauge,
  MapPin,
  ExternalLink,
  ChevronRight,
  Layers,
  Globe,
  Map as MapIcon,
  Mountain,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { authService } from '../../services/authService';
import { taskService } from '../../services/taskService';
import { parseApiError } from '../../services/api';
import { useFeedback } from '../../context/FeedbackContext';
import { DriverTelemetry, AssignmentRoute } from '../../types';
import { getReadableAddress } from '../../services/geocodingService';

// Akure center coordinates
const AKURE_CENTER: [number, number] = [7.2571, 5.2058];

type MapTypeKey = 'satellite' | 'hybrid' | 'roadmap' | 'terrain';

interface TileLayerConfig {
  name: string;
  url: string;
  subdomains?: string[];
  maxZoom: number;
  attribution: string;
}

// Google Maps satellite, hybrid, roadmap and terrain tile services
const MAP_LAYERS: Record<MapTypeKey, TileLayerConfig> = {
  satellite: {
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google Earth Satellite',
  },
  hybrid: {
    name: 'Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google Maps Hybrid Imagery',
  },
  roadmap: {
    name: 'Roadmap',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google Maps',
  },
  terrain: {
    name: 'Terrain',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google Maps Terrain',
  },
};

/**
 * Human-readable duration ago formatter:
 * <60s -> "Xs ago" (or "Just now")
 * 60s - 3599s -> "X min ago" / "X mins ago"
 * 3600s - 86399s -> "X hr ago" / "X hrs ago"
 * >= 86400s -> "X day ago" / "X days ago"
 */
export const formatDurationAgo = (seconds: number): string => {
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hr ago' : `${hours} hrs ago`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

/**
 * Custom truck marker with dynamic heading rotation and status colors
 */
const createTruckIcon = (
  heading: number = 0,
  isActive: boolean = true
) => {
  const bgClass = isActive ? 'bg-emerald-600' : 'bg-slate-500';

  const svgIcon = `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      ${
        isActive
          ? '<div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>'
          : ''
      }
      <div class="${bgClass} text-white shadow-lg border-2 border-white rounded-full flex items-center justify-center" style="width: 36px; height: 36px; transform: rotate(${heading}deg); transition: transform 0.5s ease-out;">
        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
          <path d="M15 18H9"></path>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
          <circle cx="17" cy="18" r="2"></circle>
          <circle cx="7" cy="18" r="2"></circle>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'truck-marker-icon',
    html: svgIcon,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21],
  });
};

/**
 * Map Controller to animate to selected driver or re-center
 */
const MapController: React.FC<{
  selectedDriver: DriverTelemetry | null;
  centerTarget: [number, number] | null;
}> = ({ selectedDriver, centerTarget }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedDriver) {
      map.flyTo([selectedDriver.latitude, selectedDriver.longitude], 16, {
        duration: 1.2,
      });
    }
  }, [selectedDriver, map]);

  useEffect(() => {
    if (centerTarget) {
      map.flyTo(centerTarget, 13, { duration: 1.0 });
    }
  }, [centerTarget, map]);

  return null;
};

export const LiveTracking: React.FC = () => {
  const { showError } = useFeedback();
  const [driversMap, setDriversMap] = useState<Map<string, DriverTelemetry>>(
    new Map()
  );
  const [driverAddresses, setDriverAddresses] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nowTime, setNowTime] = useState(Date.now());
  const [mapType, setMapType] = useState<MapTypeKey>('satellite');
  const [centerTarget, setCenterTarget] = useState<[number, number] | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Fetch all collection tasks to correlate driver taskId -> route metadata
  const { data: allTasks = [] } = useQuery<AssignmentRoute[]>({
    queryKey: ['collection-tasks'],
    queryFn: () => taskService.getAssignments(),
  });

  // Ticking timer for "last updated X seconds ago" calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Initial snapshot + periodic sync fetch via HTTP fallback
  useEffect(() => {
    const fetchLiveSnapshot = (isInitial = false) => {
      adminService
        .getLiveDrivers()
        .then((initial) => {
          if (Array.isArray(initial) && initial.length > 0) {
            setDriversMap((prev) => {
              const next = new Map(prev);
              for (const d of initial) {
                next.set(d.driverId, d);
              }
              return next;
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to load live drivers snapshot:', err);
          if (isInitial) {
            showError(parseApiError(err), 'Live Tracking Error');
          }
        });
    };

    fetchLiveSnapshot(true);
    const syncTimer = setInterval(() => fetchLiveSnapshot(false), 15000);
    return () => clearInterval(syncTimer);
  }, [showError]);

  // 2. WebSocket Real-time tracking connection
  const connectWebSocket = () => {
    const token = localStorage.getItem('smartenv_admin_access_token');
    if (!token) {
      setConnectionStatus('disconnected');
      return;
    }

    const base = import.meta.env.VITE_API_BASE_URL || 'https://akureclean.onrender.com/api';
    const wsBase = base
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://')
      .replace(/\/api\/?$/, '');
    const wsUrl = `${wsBase}/ws/tracking?token=${encodeURIComponent(token)}`;

    setConnectionStatus('connecting');

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[Admin WS] Connected to live tracking');
        setConnectionStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'INITIAL_DRIVER_LOCATIONS' && Array.isArray(payload.data)) {
            setDriversMap((prev) => {
              const next = new Map(prev);
              for (const d of payload.data) {
                next.set(d.driverId, d);
              }
              return next;
            });
          } else if (payload.type === 'DRIVER_LOCATION_UPDATE' && payload.data) {
            const update: DriverTelemetry = payload.data;
            setDriversMap((prev) => {
              const next = new Map(prev);
              next.set(update.driverId, update);
              return next;
            });
          } else if (payload.type === 'DRIVER_OFFLINE' && payload.data) {
            const { driverId, lastTelemetry } = payload.data;
            setDriversMap((prev) => {
              const next = new Map(prev);
              if (lastTelemetry) {
                next.set(driverId, { ...lastTelemetry, isOnline: false });
              } else if (next.has(driverId)) {
                next.set(driverId, { ...next.get(driverId)!, isOnline: false });
              }
              return next;
            });
          }
        } catch (err) {
          console.warn('[Admin WS] Error parsing message:', err);
        }
      };

      socket.onerror = (err) => {
        console.warn('[Admin WS] WebSocket error:', err);
      };

      socket.onclose = (event) => {
        console.log(`[Admin WS] Closed (${event.code}): ${event.reason}`);
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Auto-reconnect after 3 seconds (refreshing token first if rejected with 4401)
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(async () => {
          if (event.code === 4401) {
            try {
              await authService.getMe();
            } catch {
              return;
            }
          }
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.warn('[Admin WS] Connection attempt failed:', err);
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const driversList = useMemo(() => {
    return Array.from(driversMap.values());
  }, [driversMap]);

  // 3. Reverse Geocode all active driver GPS coordinates to human-readable addresses
  useEffect(() => {
    driversList.forEach((driver) => {
      if (driver.latitude && driver.longitude) {
        getReadableAddress(driver.latitude, driver.longitude).then((addr) => {
          setDriverAddresses((prev) => {
            if (prev[driver.driverId] === addr) return prev;
            return { ...prev, [driver.driverId]: addr };
          });
        });
      }
    });
  }, [driversList]);

  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return driversList;
    const q = searchQuery.toLowerCase();
    return driversList.filter(
      (d) =>
        d.driverName.toLowerCase().includes(q) ||
        d.truckPlate.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (driverAddresses[d.driverId] || '').toLowerCase().includes(q)
    );
  }, [driversList, searchQuery, driverAddresses]);

  const selectedDriver = useMemo(() => {
    return selectedDriverId ? driversMap.get(selectedDriverId) || null : null;
  }, [selectedDriverId, driversMap]);

  // Correlate selected driver's active task
  const activeTaskForSelected = useMemo(() => {
    if (!selectedDriver) return null;
    return allTasks.find((t) => {
      const matchesTaskId =
        selectedDriver.taskId &&
        (t._id === selectedDriver.taskId || t.id === selectedDriver.taskId);

      const driverObjId =
        typeof t.driverId === 'object' && t.driverId !== null
          ? (t.driverId as any)._id
          : t.driverId;
      const legacyDriverObjId =
        typeof t.driver === 'object' && t.driver !== null
          ? (t.driver as any)._id
          : t.driver;

      const matchesDriverId =
        driverObjId === selectedDriver.driverId ||
        legacyDriverObjId === selectedDriver.driverId;

      const isTaskActive =
        t.status === 'InProgress' ||
        t.status === 'Pending' ||
        t.status === 'in_progress' ||
        t.status === 'planned' ||
        t.status === 'Paused';

      return matchesTaskId || (matchesDriverId && isTaskActive);
    });
  }, [selectedDriver, allTasks]);

  const handleCenterAkure = () => {
    setCenterTarget([...AKURE_CENTER]);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Navigation className="w-5 h-5 text-brand-teal" />
              Live Driver Tracking
            </h1>
            {/* Status Pill */}
            {connectionStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream Connected
              </span>
            ) : connectionStatus === 'connecting' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                Reconnecting...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <WifiOff className="w-3 h-3 text-rose-600" />
                Disconnected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time GPS vehicle telemetry and street locations across Akure
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (wsRef.current) wsRef.current.close();
              connectWebSocket();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Reconnect Stream
          </button>
        </div>
      </div>

      {/* Main Container: Sidebar + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-210px)] min-h-[550px]">
        {/* Left: Driver Telemetry List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Search Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Drivers ({filteredDrivers.length})
              </span>
              <span className="text-[11px] text-slate-400">Updates every 10s</span>
            </div>
            <input
              type="text"
              placeholder="Search driver, plate, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal bg-white"
            />
          </div>

          {/* Drivers List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredDrivers.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No active drivers</p>
                <p className="text-xs text-slate-400 mt-1">
                  Drivers appear here when connected on their collector mobile app.
                </p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.driverId;
                const updateTimestamp =
                  driver.timestamp || new Date(driver.updatedAt).getTime();
                const secondsAgo = Math.max(
                  0,
                  Math.round((nowTime - updateTimestamp) / 1000)
                );
                const timeAgoFormatted = formatDurationAgo(secondsAgo);
                const isActive = Boolean(driver.isOnline) && secondsAgo <= 300;
                const address = driverAddresses[driver.driverId] || 'Resolving address...';

                return (
                  <div
                    key={driver.driverId}
                    onClick={() =>
                      setSelectedDriverId(isSelected ? null : driver.driverId)
                    }
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-teal-50/60 border-brand-teal shadow-xs'
                        : 'bg-white hover:bg-slate-50/80 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {driver.driverName}
                          </span>

                          {/* Active or Inactive badge */}
                          {isActive ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {driver.truckPlate}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <Gauge className="w-3 h-3 text-slate-500" />
                          {Math.round(driver.speed)} km/h
                        </span>
                      </div>
                    </div>

                    {/* Live Address Display */}
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-200/60 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-teal flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-[11px] leading-relaxed">
                        {address}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {isActive
                          ? `Updated ${timeAgoFormatted}`
                          : `Last active at ${timeAgoFormatted}`}
                      </span>
                      <span className="flex items-center gap-1 text-brand-teal font-medium">
                        Track on Map <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Map Container */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative flex flex-col">
          {/* Active Task Floating Banner (if a driver is selected) */}
          {selectedDriver && (
            <div className="absolute top-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-lg border border-slate-200/80 shadow-md flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate">
                      {selectedDriver.driverName}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({selectedDriver.truckPlate})
                    </span>
                    {Boolean(selectedDriver.isOnline) &&
                    Math.max(
                      0,
                      Math.round(
                        (nowTime -
                          (selectedDriver.timestamp ||
                            new Date(selectedDriver.updatedAt).getTime())) /
                          1000
                      )
                    ) <= 300 ? (
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Inactive
                      </span>
                    )}
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      {Math.round(selectedDriver.speed)} km/h • Heading {Math.round(selectedDriver.heading)}°
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px] truncate mt-0.5">
                    <MapPin className="w-3 h-3 text-brand-teal flex-shrink-0" />
                    <span className="font-medium text-slate-800 truncate">
                      {driverAddresses[selectedDriver.driverId] || `${selectedDriver.latitude.toFixed(5)}, ${selectedDriver.longitude.toFixed(5)}`}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500">
                      {selectedDriver.isOnline
                        ? `Updated ${formatDurationAgo(Math.max(0, Math.round((nowTime - (selectedDriver.timestamp || Date.now())) / 1000)))}`
                        : `Last active at ${formatDurationAgo(Math.max(0, Math.round((nowTime - (selectedDriver.timestamp || Date.now())) / 1000)))}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {activeTaskForSelected && (
                  <Link
                    to={`/tasks/${activeTaskForSelected._id}`}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-brand-teal text-white rounded-md hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    Open Task <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                <button
                  onClick={() => setSelectedDriverId(null)}
                  className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Deselect
                </button>
              </div>
            </div>
          )}

          {/* Floating Map Type Controls (Satellite, Hybrid, Roadmap, Terrain) */}
          <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-md">
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="High-definition Satellite Photography"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Satellite</span>
            </button>

            <button
              type="button"
              onClick={() => setMapType('hybrid')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mapType === 'hybrid'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Satellite with Street Names and Road Labels"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hybrid</span>
            </button>

            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mapType === 'roadmap'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Vector Street Map"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Roadmap</span>
            </button>

            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mapType === 'terrain'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Topographic Relief Map"
            >
              <Mountain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Terrain</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handleCenterAkure}
              className="px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Re-center map on Akure"
            >
              Center
            </button>
          </div>

          {/* Floating Driver GPS Status Legend (bottom-left) */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md hidden sm:flex items-center gap-3 text-[11px] font-semibold text-slate-700">
            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Vehicles:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700">Active</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-600">Inactive</span>
            </span>
          </div>

          {/* High-Performance Satellite & Map Canvas */}
          <div className="flex-1 w-full h-full relative z-0">
            <MapContainer
              center={AKURE_CENTER}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              {/* Active Tile Layer (Satellite, Hybrid, Roadmap, or Terrain) */}
              <TileLayer
                key={mapType}
                url={MAP_LAYERS[mapType].url}
                maxZoom={MAP_LAYERS[mapType].maxZoom}
                attribution={MAP_LAYERS[mapType].attribution}
              />

              <MapController
                selectedDriver={selectedDriver}
                centerTarget={centerTarget}
              />

              {/* Draw Live Driver Vehicle Markers */}
              {driversList.map((driver) => {
                const updateTimestamp =
                  driver.timestamp || new Date(driver.updatedAt).getTime();
                const secondsAgo = Math.max(
                  0,
                  Math.round((nowTime - updateTimestamp) / 1000)
                );
                const timeAgoFormatted = formatDurationAgo(secondsAgo);
                const isActive = Boolean(driver.isOnline) && secondsAgo <= 300;
                const address = driverAddresses[driver.driverId] || 'Resolving address...';

                return (
                  <Marker
                    key={driver.driverId}
                    position={[driver.latitude, driver.longitude]}
                    icon={createTruckIcon(driver.heading, isActive)}
                    eventHandlers={{
                      click: () => setSelectedDriverId(driver.driverId),
                    }}
                  >
                    <Popup>
                      <div className="p-2 text-xs min-w-[220px]">
                        <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                          <p className="font-bold text-slate-900 text-sm">
                            {driver.driverName}
                          </p>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-1 text-slate-600">
                          <p>
                            <span className="font-medium">Vehicle Plate:</span>{' '}
                            <span className="font-mono">{driver.truckPlate}</span>
                          </p>
                          <p>
                            <span className="font-medium">Speed:</span>{' '}
                            {Math.round(driver.speed)} km/h &bull; Heading {Math.round(driver.heading)}&deg;
                          </p>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200 my-1">
                            <p className="font-semibold text-brand-teal flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3 h-3" /> Current Address:
                            </p>
                            <p className="text-slate-700 text-xs mt-0.5 font-medium leading-relaxed">
                              {address}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {driver.latitude.toFixed(5)}, {driver.longitude.toFixed(5)}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {isActive
                              ? `Updated ${timeAgoFormatted}`
                              : `Last active at ${timeAgoFormatted}`}
                          </p>
                          {driver.phone && (
                            <p className="pt-1">
                              <span className="font-medium">Phone:</span>{' '}
                              <a
                                href={`tel:${driver.phone}`}
                                className="text-brand-teal underline"
                              >
                                {driver.phone}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
