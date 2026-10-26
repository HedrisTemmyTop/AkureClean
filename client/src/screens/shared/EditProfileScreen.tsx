import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Modal, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { parseApiError } from '../../services/api';
import { locationService, StructuredLocationsMap } from '../../services/locationService';

export const EditProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [locationsMap, setLocationsMap] = useState<StructuredLocationsMap>({});
  const [isLgaModalVisible, setIsLgaModalVisible] = useState(false);
  const [isWardModalVisible, setIsWardModalVisible] = useState(false);
  const [isPuModalVisible, setIsPuModalVisible] = useState(false);
  const [puSearchQuery, setPuSearchQuery] = useState('');

  // Initialize state with current user data
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [houseType, setHouseType] = useState(user?.houseType || '');
  const [numberOfRooms, setNumberOfRooms] = useState(user?.numberOfRooms?.toString() || '');
  const [numberOfShops, setNumberOfShops] = useState(user?.numberOfShops?.toString() || '');
  const [numberOfWorkersRange, setNumberOfWorkersRange] = useState(user?.numberOfWorkersRange || '');
  const [houseDescription, setHouseDescription] = useState(user?.houseDescription || '');
  const [localGovt, setLocalGovt] = useState(user?.localGovt || '');
  const [ward, setWard] = useState(user?.ward || '');
  const [pollingUnit, setPollingUnit] = useState(user?.pollingUnit || '');
  const [truckPlateNumber, setTruckPlateNumber] = useState(user?.truckPlateNumber || '');
  const [truckCapacity, setTruckCapacity] = useState(user?.truckCapacity || '');
  
  const [isHouseTypeModalVisible, setIsHouseTypeModalVisible] = useState(false);
  const [isWorkersModalVisible, setIsWorkersModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { updateProfile } = useAuth();

  useEffect(() => {
    locationService
      .getStructuredLocations()
      .then((res) => setLocationsMap(res))
      .catch((err) => console.error('Failed to fetch locations:', err));
  }, []);

  const getWards = (lga: string): string[] => {
    return Object.keys(locationsMap[lga] || {}).filter((w) => w !== 'Unknown Ward');
  };

  const getPUs = (lga: string, w: string): string[] => {
    return (locationsMap[lga]?.[w] || []).filter((p) => p.name).map((p) => p.name);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        name,
        phone,
        address,
        houseType,
        numberOfRooms: houseType === 'Residential building' ? parseInt(numberOfRooms) : undefined,
        numberOfShops: houseType === 'Shop' ? parseInt(numberOfShops) : undefined,
        numberOfWorkersRange: houseType === 'Company' ? numberOfWorkersRange : undefined,
        houseDescription,
        localGovt,
        ward,
        pollingUnit,
        truckPlateNumber,
        truckCapacity,
      });
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h1">Edit Profile</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Update your personal details
        </AppText>
      </Animatable.View>

      <View style={styles.form}>
        <Animatable.View animation="fadeInLeft" delay={200}>
          <AppInput
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={300}>
          <AppInput
            label="Phone Number"
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={400}>
          <AppInput
            label="Address"
            placeholder="Enter your full address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={450}>
          <AppText
            variant="caption"
            weight="600"
            color={theme.colors.textSecondary}
            style={{ marginBottom: 8, marginTop: 16 }}
          >
            House Type
          </AppText>
          <TouchableOpacity
            style={styles.selectorBtn}
            onPress={() => setIsHouseTypeModalVisible(true)}
          >
            <AppText
              variant="body"
              color={houseType ? theme.colors.text : theme.colors.textSecondary}
            >
              {houseType || "Select House Type..."}
            </AppText>
          </TouchableOpacity>
        </Animatable.View>

        {houseType === "Residential building" && (
          <Animatable.View animation="fadeInLeft" delay={500} style={{ marginTop: 16 }}>
            <AppInput
              label="Number of Rooms"
              placeholder="e.g. 5"
              value={numberOfRooms}
              onChangeText={setNumberOfRooms}
              keyboardType="numeric"
            />
          </Animatable.View>
        )}

        {houseType === "Shop" && (
          <Animatable.View animation="fadeInLeft" delay={500} style={{ marginTop: 16 }}>
            <AppInput
              label="Number of Shops"
              placeholder="e.g. 2"
              value={numberOfShops}
              onChangeText={setNumberOfShops}
              keyboardType="numeric"
            />
          </Animatable.View>
        )}

        {houseType === "Company" && (
          <Animatable.View animation="fadeInLeft" delay={500} style={{ marginTop: 16 }}>
            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={{ marginBottom: 8 }}
            >
              Number of Workers
            </AppText>
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => setIsWorkersModalVisible(true)}
            >
              <AppText
                variant="body"
                color={numberOfWorkersRange ? theme.colors.text : theme.colors.textSecondary}
              >
                {numberOfWorkersRange || "Select Number of Workers..."}
              </AppText>
            </TouchableOpacity>
          </Animatable.View>
        )}

        {user.role === 'resident' && (
          <>
            <Animatable.View animation="fadeInLeft" delay={550}>
              <AppInput
                label="House Description"
                placeholder="Enter house description"
                value={houseDescription}
                onChangeText={setHouseDescription}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            </Animatable.View>

            <Animatable.View animation="fadeInLeft" delay={600} style={{ marginTop: 12 }}>
              <AppText
                variant="caption"
                weight="600"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 8 }}
              >
                Local Government
              </AppText>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setIsLgaModalVisible(true)}
              >
                <AppText
                  variant="body"
                  color={localGovt ? theme.colors.text : theme.colors.textSecondary}
                >
                  {localGovt || "Select Local Government..."}
                </AppText>
              </TouchableOpacity>
            </Animatable.View>

            <Animatable.View animation="fadeInLeft" delay={650} style={{ marginTop: 16 }}>
              <AppText
                variant="caption"
                weight="600"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 8 }}
              >
                Ward
              </AppText>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => localGovt && setIsWardModalVisible(true)}
              >
                <AppText
                  variant="body"
                  color={ward ? theme.colors.text : theme.colors.textSecondary}
                >
                  {ward || "Select Ward..."}
                </AppText>
              </TouchableOpacity>
            </Animatable.View>

            <Animatable.View animation="fadeInLeft" delay={700} style={{ marginTop: 16 }}>
              <AppText
                variant="caption"
                weight="600"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 8 }}
              >
                Polling Unit
              </AppText>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => ward && setIsPuModalVisible(true)}
              >
                <AppText
                  variant="body"
                  color={pollingUnit ? theme.colors.text : theme.colors.textSecondary}
                >
                  {pollingUnit || "Select Polling Unit..."}
                </AppText>
              </TouchableOpacity>
            </Animatable.View>
          </>
        )}

        {user.role === 'driver' && (
          <>
            <Animatable.View animation="fadeInLeft" delay={550}>
              <AppInput
                label="Truck Plate Number"
                value={truckPlateNumber}
                onChangeText={setTruckPlateNumber}
                autoCapitalize="characters"
              />
            </Animatable.View>

            <Animatable.View animation="fadeInLeft" delay={600}>
              <AppInput
                label="Truck Capacity"
                value={truckCapacity}
                onChangeText={setTruckCapacity}
              />
            </Animatable.View>
          </>
        )}

        <Animatable.View animation="fadeInUp" delay={800}>
          <AppButton 
            title="Save Changes" 
            fullWidth 
            style={styles.saveBtn}
            loading={isLoading}
            onPress={handleSave}
          />
          <AppButton 
            title="Cancel" 
            variant="outline"
            fullWidth 
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          />
        </Animatable.View>
      </View>

      <Modal
        visible={isLgaModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h3" style={{ marginBottom: 16 }}>
              Select Local Government
            </AppText>
            <FlatList
              data={Object.keys(locationsMap)}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setLocalGovt(item);
                    setWard('');
                    setPollingUnit('');
                    setIsLgaModalVisible(false);
                  }}
                >
                  <AppText variant="body">{item}</AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton
              title="Close"
              variant="outline"
              onPress={() => setIsLgaModalVisible(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isWardModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h3" style={{ marginBottom: 16 }}>
              Select Ward ({localGovt})
            </AppText>
            <FlatList
              data={getWards(localGovt)}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setWard(item);
                    setPollingUnit('');
                    setIsWardModalVisible(false);
                  }}
                >
                  <AppText variant="body">{item}</AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton
              title="Close"
              variant="outline"
              onPress={() => setIsWardModalVisible(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPuModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h3" style={{ marginBottom: 16 }}>
              Select Polling Unit
            </AppText>
            <AppInput
              placeholder="Search polling unit..."
              value={puSearchQuery}
              onChangeText={setPuSearchQuery}
            />
            <FlatList
              data={getPUs(localGovt, ward).filter((n) =>
                n.toLowerCase().includes(puSearchQuery.toLowerCase())
              )}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setPollingUnit(item);
                    setIsPuModalVisible(false);
                    setPuSearchQuery('');
                  }}
                >
                  <AppText variant="body">{item}</AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton
              title="Close"
              variant="outline"
              onPress={() => setIsPuModalVisible(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isHouseTypeModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h3" style={{ marginBottom: 16 }}>
              Select House Type
            </AppText>
            <FlatList
              data={["Residential building", "Shop", "Company"]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setHouseType(item);
                    setIsHouseTypeModalVisible(false);
                  }}
                >
                  <AppText variant="body">{item}</AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton
              title="Close"
              variant="outline"
              onPress={() => setIsHouseTypeModalVisible(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isWorkersModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h3" style={{ marginBottom: 16 }}>
              Select Number of Workers
            </AppText>
            <FlatList
              data={[
                "0-10 workers",
                "11-50 workers",
                "51-100 workers",
                "101-500 workers",
                "500+ workers"
              ]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setNumberOfWorkersRange(item);
                    setIsWorkersModalVisible(false);
                  }}
                >
                  <AppText variant="body">{item}</AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton
              title="Close"
              variant="outline"
              onPress={() => setIsWorkersModalVisible(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  saveBtn: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  cancelBtn: {
    marginBottom: theme.spacing.xl,
  },
  selectorBtn: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: "70%",
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
});
