import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin, Navigation as NavIcon, Pause, CheckCircle, ChevronRight, XCircle } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { routeService } from '../../services/routeService';
import { AssignmentRoute } from '../../types';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<CollectorStackParamList, 'Route'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const RouteScreen: React.FC = () => {
  const routeParams = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const { routeId } = routeParams.params;

  const [route, setRoute] = useState<AssignmentRoute | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoute = async () => {
    try {
      const data = await routeService.getRouteById(routeId);
      if (data) {
        if (data.status === 'Pending') {
          await routeService.updateRouteStatus(routeId, 'InProgress');
          data.status = 'InProgress';
        }
        setRoute(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchRoute();
    }
  }, [routeId, isFocused]);

  if (loading || !route) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const completedStopsCount = route.stops.filter(s => s.status === 'Completed' || s.status === 'Skipped').length;
  const progressPercent = (completedStopsCount / route.stops.length) * 100;
  
  const pendingStops = route.stops.filter(s => s.status === 'Pending');
  const activeStop = pendingStops.length > 0 ? pendingStops[0] : null;

  const handlePause = async () => {
    await routeService.updateRouteStatus(routeId, 'Paused');
    navigation.goBack();
  };

  const handleFinish = async () => {
    const uncompleted = route.stops.filter(s => s.status === 'Pending').length;
    if (uncompleted > 0) {
      Alert.alert(
        "Unfinished Stops",
        `You still have ${uncompleted} stops pending. Are you sure you want to finish the route?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish Anyway", 
            style: "destructive",
            onPress: async () => {
              await routeService.updateRouteStatus(routeId, 'Completed');
              navigation.replace('RouteSummary', { routeId });
            }
          }
        ]
      );
    } else {
      await routeService.updateRouteStatus(routeId, 'Completed');
      navigation.replace('RouteSummary', { routeId });
    }
  };

  const mapRegion = activeStop ? {
    latitude: activeStop.coordinates.latitude,
    longitude: activeStop.coordinates.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : route.stops.length > 0 ? {
    latitude: route.stops[0].coordinates.latitude,
    longitude: route.stops[0].coordinates.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : undefined;

  const polylineCoords = route.stops.map(s => s.coordinates);

  const getMarkerColor = (status: string) => {
    if (status === 'Completed') return theme.colors.status.completed;
    if (status === 'Skipped') return theme.colors.status.cancelled;
    return theme.colors.status.pending;
  };

  return (
    <View style={styles.container}>
      {/* Map Section */}
      <View style={styles.mapContainer}>
        {mapRegion ? (
          <MapView 
            provider={PROVIDER_DEFAULT}
            style={styles.map} 
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            <Polyline coordinates={polylineCoords} strokeColor="#4D7DFB" strokeWidth={4} />
            {route.stops.map(stop => (
              <Marker 
                key={stop.id}
                coordinate={stop.coordinates}
                title={stop.address}
                pinColor={activeStop?.id === stop.id ? theme.colors.primary : getMarkerColor(stop.status)}
              />
            ))}
          </MapView>
        ) : (
          <View style={[styles.map, styles.centered, { backgroundColor: '#e0e0e0' }]}>
            <AppText>No Map Coordinates Available</AppText>
          </View>
        )}
      </View>

      {/* Floating Header Overlay */}
      <Animatable.View animation="slideInDown" duration={600} style={styles.headerOverlay}>
        <TouchableOpacity style={styles.headerBtn} onPress={handlePause}>
          <Pause color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <AppCard style={styles.progressCard} elevation="md">
           <AppText variant="bodySmall" weight="600" style={{ marginBottom: 4 }}>
             {completedStopsCount} of {route.stops.length} Stops Completed
           </AppText>
           <View style={styles.progressBarBg}>
             <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
           </View>
        </AppCard>
        <TouchableOpacity style={styles.headerBtn} onPress={handleFinish}>
          <CheckCircle color={theme.colors.status.active} size={20} />
        </TouchableOpacity>
      </Animatable.View>

      {/* Bottom Sheet Overlay */}
      <Animatable.View animation="slideInUp" duration={600} delay={200} style={styles.bottomSheet}>
        {activeStop ? (
          <>
            <AppText variant="caption" color={theme.colors.primary} weight="600" style={{ marginBottom: 8 }}>
              NEXT STOP
            </AppText>
            <AppText variant="h2" style={styles.stopName}>{activeStop.address}</AppText>
            <AppText variant="body" color={theme.colors.textSecondary} style={styles.stopDesc}>
              {activeStop.wasteType} Waste • {activeStop.severity} Severity
            </AppText>

            <TouchableOpacity 
              style={styles.arriveBtn}
              onPress={() => navigation.navigate('StopDetails', { routeId, stopId: activeStop.id })}
              activeOpacity={0.8}
            >
              <AppText variant="bodyLarge" weight="600" color={theme.colors.surface}>
                View Stop Details
              </AppText>
              <ChevronRight color={theme.colors.surface} size={24} />
            </TouchableOpacity>

            {pendingStops.length > 1 && (
              <View style={styles.upcomingPreview}>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  Then: {pendingStops[1].address}
                </AppText>
              </View>
            )}
          </>
        ) : (
          <View style={styles.centered}>
            <CheckCircle color={theme.colors.status.completed} size={64} style={{ marginBottom: 16 }} />
            <AppText variant="h2" align="center">All Stops Cleared!</AppText>
            <AppText variant="body" color={theme.colors.textSecondary} align="center" style={{ marginVertical: 16 }}>
              You have completed all pickups on this route.
            </AppText>
            <TouchableOpacity style={styles.arriveBtn} onPress={handleFinish} activeOpacity={0.8}>
              <AppText variant="bodyLarge" weight="600" color={theme.colors.surface}>
                Finish Route
              </AppText>
            </TouchableOpacity>
          </View>
        )}
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressCard: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  stopName: {
    marginBottom: theme.spacing.xs,
  },
  stopDesc: {
    marginBottom: theme.spacing.xl,
  },
  arriveBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  upcomingPreview: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  }
});
