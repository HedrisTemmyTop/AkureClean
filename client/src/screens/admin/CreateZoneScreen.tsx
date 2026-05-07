import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polygon, MapPressEvent } from 'react-native-maps';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { apiClient, parseApiError } from '../../services/api';

export const CreateZoneScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [coordinates, setCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMapPress = (e: MapPressEvent) => {
    setCoordinates([...coordinates, e.nativeEvent.coordinate]);
  };

  const handleUndo = () => {
    setCoordinates(coordinates.slice(0, -1));
  };

  const handleClear = () => {
    setCoordinates([]);
  };

  const handleCreateZone = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a zone name');
      return;
    }
    if (coordinates.length < 3) {
      Alert.alert('Error', 'A zone boundary must have at least 3 points');
      return;
    }

    // Convert coordinates to GeoJSON Polygon format: [[[lng, lat], [lng, lat], ...]]
    // Ensure the polygon is closed (first and last point are the same)
    const polygonCoords = coordinates.map(c => [c.longitude, c.latitude]);
    if (
      polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
      polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]
    ) {
      polygonCoords.push([...polygonCoords[0]]); // Close the polygon
    }

    const payload = {
      name,
      boundary: {
        type: 'Polygon',
        coordinates: [polygonCoords],
      }
    };

    setIsLoading(true);
    try {
      await apiClient.post('/zones', payload);
      Alert.alert('Success', 'Zone created successfully');
      setName('');
      setCoordinates([]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <AppText variant="h2" style={styles.title}>Create New Zone</AppText>
        <AppInput
          label="Zone Name"
          placeholder="e.g., Alagbaka North"
          value={name}
          onChangeText={setName}
        />
        <AppText variant="caption" color={theme.colors.textSecondary} style={styles.instruction}>
          Tap on the map to define the zone boundaries. Minimum 3 points required.
        </AppText>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 7.250771, // Akure
            longitude: 5.206992,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={handleMapPress}
        >
          {coordinates.length > 0 && (
            <Polygon
              coordinates={coordinates}
              fillColor="rgba(33, 150, 243, 0.3)"
              strokeColor={theme.colors.primary}
              strokeWidth={2}
            />
          )}
          {coordinates.map((coord, index) => (
            <Marker key={index} coordinate={coord} />
          ))}
        </MapView>
        
        <View style={styles.mapOverlayControls}>
          <TouchableOpacity style={styles.overlayBtn} onPress={handleUndo} disabled={coordinates.length === 0}>
            <AppText variant="caption" weight="600">Undo</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.overlayBtn} onPress={handleClear} disabled={coordinates.length === 0}>
            <AppText variant="caption" weight="600">Clear</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton
          title="Create Zone"
          onPress={handleCreateZone}
          loading={isLoading}
          disabled={coordinates.length < 3 || !name}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    zIndex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  instruction: {
    marginTop: theme.spacing.sm,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlayControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
  },
  overlayBtn: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    alignItems: 'center',
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
