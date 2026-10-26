import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

export type FreeMapType = "standard" | "satellite" | "terrain" | "hybrid";

export interface FreeMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  title?: string;
  description?: string;
}

export interface FreeMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface FreeMapViewRef {
  animateToRegion: (region: FreeMapRegion, duration?: number) => void;
  animateCamera: (
    camera: {
      center?: { latitude: number; longitude: number };
      zoom?: number;
    },
    opts?: { duration?: number },
  ) => void;
}

interface FreeMapViewProps {
  style?: StyleProp<ViewStyle>;
  initialRegion?: FreeMapRegion;
  region?: FreeMapRegion;
  mapType?: FreeMapType;
  driverPos?: { latitude: number; longitude: number } | null;
  markers?: (FreeMapMarker | null)[];
  polyline?: { latitude: number; longitude: number }[];
  polylineColor?: string;
  polylineWidth?: number;
  polygon?: { latitude: number; longitude: number }[];
  onPress?: (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => void;
}

function deltaToZoom(delta?: number): number {
  if (!delta || delta <= 0) return 15;
  if (delta <= 0.005) return 17;
  if (delta <= 0.015) return 16;
  if (delta <= 0.03) return 15;
  if (delta <= 0.06) return 14;
  return 13;
}

export const FreeMapView = forwardRef<FreeMapViewRef, FreeMapViewProps>(
  (
    {
      style,
      initialRegion = {
        latitude: 7.2507,
        longitude: 5.2103,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      region,
      mapType = "standard",
      driverPos = null,
      markers = [],
      polyline = [],
      polylineColor = "#2196F3",
      polylineWidth = 4,
      polygon = [],
      onPress,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const isLoadedRef = useRef(false);

    const initialCenter = useRef({
      lat: region?.latitude ?? initialRegion.latitude,
      lng: region?.longitude ?? initialRegion.longitude,
      zoom: deltaToZoom(region?.latitudeDelta ?? initialRegion.latitudeDelta),
    }).current;

    const sendCommand = (cmd: Record<string, any>) => {
      if (!isLoadedRef.current || !webViewRef.current) return;
      const script = `window.handleRNCommand && window.handleRNCommand(${JSON.stringify(
        cmd,
      )}); true;`;
      webViewRef.current.injectJavaScript(script);
    };

    useImperativeHandle(ref, () => ({
      animateToRegion: (targetRegion: FreeMapRegion) => {
        sendCommand({
          type: "ANIMATE_TO_REGION",
          latitude: targetRegion.latitude,
          longitude: targetRegion.longitude,
          zoom: deltaToZoom(targetRegion.latitudeDelta),
        });
      },
      animateCamera: (camera) => {
        if (camera?.center) {
          sendCommand({
            type: "ANIMATE_TO_REGION",
            latitude: camera.center.latitude,
            longitude: camera.center.longitude,
            zoom: camera.zoom,
          });
        }
      },
    }));

    useEffect(() => {
      if (region) {
        sendCommand({
          type: "ANIMATE_TO_REGION",
          latitude: region.latitude,
          longitude: region.longitude,
          zoom: deltaToZoom(region.latitudeDelta),
        });
      }
    }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

    useEffect(() => {
      sendCommand({
        type: "SET_MAP_TYPE",
        mapType,
      });
    }, [mapType]);

    useEffect(() => {
      sendCommand({
        type: "SET_DRIVER_POS",
        driverPos,
      });
    }, [driverPos?.latitude, driverPos?.longitude]);

    useEffect(() => {
      sendCommand({
        type: "SET_MARKERS",
        markers,
      });
    }, [markers]);

    useEffect(() => {
      sendCommand({
        type: "SET_POLYLINE",
        polyline,
        color: polylineColor,
        weight: polylineWidth,
      });
    }, [polyline, polylineColor, polylineWidth]);

    useEffect(() => {
      sendCommand({
        type: "SET_POLYGON",
        polygon,
      });
    }, [polygon]);

    const syncAllState = () => {
      sendCommand({ type: "SET_MAP_TYPE", mapType });
      sendCommand({ type: "SET_DRIVER_POS", driverPos });
      sendCommand({ type: "SET_MARKERS", markers });
      sendCommand({
        type: "SET_POLYLINE",
        polyline,
        color: polylineColor,
        weight: polylineWidth,
      });
      sendCommand({ type: "SET_POLYGON", polygon });
    };

    const htmlContent = useMemo(
      () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #e5e7eb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .driver-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: #ffffff;
      border-radius: 20px;
      border: 2.5px solid #1B5E20;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      font-size: 22px;
    }
    .stop-pin {
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2.5px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stop-pin-inner {
      width: 8px;
      height: 8px;
      background: #ffffff;
      border-radius: 50%;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      opacity: 0.75;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([${initialCenter.lat}, ${initialCenter.lng}], ${initialCenter.zoom});

    const tileLayers = {
      standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri'
      }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenTopoMap'
      }),
      hybridBase: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri'
      }),
      hybridLabels: L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      })
    };

    let currentLayerGroup = L.layerGroup([tileLayers.standard]).addTo(map);
    let driverMarker = null;
    let markersLayer = L.layerGroup().addTo(map);
    let routePolyline = null;
    let zonePolygon = null;

    map.on('click', function(e) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_PRESS',
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        }));
      }
    });

    function setMapType(type) {
      currentLayerGroup.clearLayers();
      if (type === 'satellite') {
        currentLayerGroup.addLayer(tileLayers.satellite);
      } else if (type === 'terrain') {
        currentLayerGroup.addLayer(tileLayers.terrain);
      } else if (type === 'hybrid') {
        currentLayerGroup.addLayer(tileLayers.hybridBase);
        currentLayerGroup.addLayer(tileLayers.hybridLabels);
      } else {
        currentLayerGroup.addLayer(tileLayers.standard);
      }
    }

    function setDriverPos(pos) {
      if (!pos || typeof pos.latitude !== 'number' || typeof pos.longitude !== 'number') {
        if (driverMarker) {
          map.removeLayer(driverMarker);
          driverMarker = null;
        }
        return;
      }
      const latLng = [pos.latitude, pos.longitude];
      if (!driverMarker) {
        const icon = L.divIcon({
          className: '',
          html: '<div class="driver-icon">🚛</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
        driverMarker = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(map);
      } else {
        driverMarker.setLatLng(latLng);
      }
    }

    function setMarkers(items) {
      markersLayer.clearLayers();
      if (!Array.isArray(items)) return;
      items.forEach(function(m) {
        if (typeof m.latitude !== 'number' || typeof m.longitude !== 'number') return;
        const color = m.color || '#F44336';
        const icon = L.divIcon({
          className: '',
          html: '<div class="stop-pin" style="background:' + color + ';"><div class="stop-pin-inner"></div></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24]
        });
        const marker = L.marker([m.latitude, m.longitude], { icon });
        if (m.title || m.description) {
          const titleHtml = m.title ? '<div style="font-weight:600;font-size:13px;color:#111;">' + m.title + '</div>' : '';
          const descHtml = m.description ? '<div style="font-size:12px;color:#555;margin-top:2px;">' + m.description + '</div>' : '';
          marker.bindPopup('<div style="min-width:130px;">' + titleHtml + descHtml + '</div>');
        }
        markersLayer.addLayer(marker);
      });
    }

    function setPolyline(coords, color, weight) {
      if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
      }
      if (!Array.isArray(coords) || coords.length < 2) return;
      const latLngs = coords
        .filter(c => c && typeof c.latitude === 'number' && typeof c.longitude === 'number')
        .map(c => [c.latitude, c.longitude]);
      if (latLngs.length >= 2) {
        routePolyline = L.polyline(latLngs, {
          color: color || '#2196F3',
          weight: weight || 4,
          opacity: 0.9
        }).addTo(map);
      }
    }

    function setPolygon(coords) {
      if (zonePolygon) {
        map.removeLayer(zonePolygon);
        zonePolygon = null;
      }
      if (!Array.isArray(coords) || coords.length < 2) return;
      const latLngs = coords
        .filter(c => c && typeof c.latitude === 'number' && typeof c.longitude === 'number')
        .map(c => [c.latitude, c.longitude]);
      if (latLngs.length >= 2) {
        zonePolygon = L.polygon(latLngs, {
          color: '#1B5E20',
          fillColor: '#4CAF50',
          fillOpacity: 0.3,
          weight: 2
        }).addTo(map);
      }
    }

    window.handleRNCommand = function(cmd) {
      if (!cmd || !cmd.type) return;
      switch (cmd.type) {
        case 'ANIMATE_TO_REGION':
          if (typeof cmd.latitude === 'number' && typeof cmd.longitude === 'number') {
            map.flyTo([cmd.latitude, cmd.longitude], cmd.zoom || map.getZoom(), {
              duration: 0.8
            });
          }
          break;
        case 'SET_MAP_TYPE':
          setMapType(cmd.mapType);
          break;
        case 'SET_DRIVER_POS':
          setDriverPos(cmd.driverPos);
          break;
        case 'SET_MARKERS':
          setMarkers(cmd.markers);
          break;
        case 'SET_POLYLINE':
          setPolyline(cmd.polyline, cmd.color, cmd.weight);
          break;
        case 'SET_POLYGON':
          setPolygon(cmd.polygon);
          break;
      }
    };
  </script>
</body>
</html>`,
      [],
    );

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "MAP_PRESS" && onPress) {
          onPress({
            nativeEvent: {
              coordinate: {
                latitude: data.latitude,
                longitude: data.longitude,
              },
            },
          });
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => {
            isLoadedRef.current = true;
            syncAllState();
          }}
          onMessage={handleMessage}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "#e5e7eb",
  },
});
