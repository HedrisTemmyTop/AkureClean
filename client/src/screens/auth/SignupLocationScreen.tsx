import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Animatable from "react-native-animatable";
import * as Location from "expo-location";
import { TextInput, ActivityIndicator } from "react-native";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { MapPin } from "lucide-react-native";
import { parseApiError } from "../../services/api";
import {
  locationService,
  StructuredLocationsMap,
} from "../../services/locationService";

type NavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "SignupLocation"
>;
type SignupLocationRouteProp = RouteProp<AuthStackParamList, "SignupLocation">;

export const SignupLocationScreen: React.FC = () => {
  const [locationsMap, setLocationsMap] = useState<StructuredLocationsMap>({});
  const [address, setAddress] = useState("");
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [location, setLocation] = useState<{
    type: string;
    coordinates: number[];
  } | null>(null);
  const [houseDescription, setHouseDescription] = useState("");
  const [localGovt, setLocalGovt] = useState("");
  const [ward, setWard] = useState("");
  const [pollingUnit, setPollingUnit] = useState("");
  const [truckPlateNumber, setTruckPlateNumber] = useState("");
  const [truckCapacity, setTruckCapacity] = useState("");
  const [isWardModalVisible, setIsWardModalVisible] = useState(false);
  const [isLgaModalVisible, setIsLgaModalVisible] = useState(false);
  const [isPuModalVisible, setIsPuModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [puSearchQuery, setPuSearchQuery] = useState("");
  const [houseType, setHouseType] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [numberOfShops, setNumberOfShops] = useState("");
  const [numberOfWorkersRange, setNumberOfWorkersRange] = useState("");
  const [isHouseTypeModalVisible, setIsHouseTypeModalVisible] = useState(false);
  const [isWorkersModalVisible, setIsWorkersModalVisible] = useState(false);

  const { register } = useAuth();

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SignupLocationRouteProp>();

  const { name, email, phone, password, role } = route.params;

  useEffect(() => {
    locationService
      .getStructuredLocations()
      .then((res) => setLocationsMap(res))
      .catch((err) => console.error("Failed to fetch locations:", err));
  }, []);

  const getWards = (lga: string): string[] => {
    return Object.keys(locationsMap[lga] || {}).filter(
      (w) => w !== "Unknown Ward"
    );
  };

  const getPUs = (lga: string, w: string): string[] => {
    return (locationsMap[lga]?.[w] || [])
      .filter((p) => p.name)
      .map((p) => p.name);
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        setIsLocating(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const coords = [
        currentLocation.coords.longitude,
        currentLocation.coords.latitude,
      ];

      setLocation({
        type: "Point",
        coordinates: coords,
      });

      try {
        // Reverse geocoding using Nominatim for more accurate Nigerian addresses
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.coords.latitude}&lon=${currentLocation.coords.longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              "User-Agent": "SmartEnv/1.0",
              "Accept-Language": "en-US,en;q=0.9",
            },
          },
        );
        const data = await response.json();

        if (data && data.display_name) {
          setAddress(data.display_name);
        } else {
          // Fallback to Expo Location if Nominatim fails or returns nothing
          const geocode = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
          if (geocode && geocode.length > 0) {
            const place = geocode[0];
            const addressParts = [
              place.name,
              place.streetNumber,
              place.street,
              place.district,
              place.city,
              place.subregion,
              place.region,
              place.country,
            ]
              .filter(Boolean)
              .map((part) => String(part).trim())
              .filter((part) => part.length > 0);
            const uniqueParts = addressParts.filter(
              (item, index) => addressParts.indexOf(item) === index,
            );
            setAddress(uniqueParts.join(", ") || "Current Location");
          } else {
            setAddress("Current Location");
          }
        }
      } catch (err) {
        setAddress("Current Location");
      }
    } catch (error) {
      Alert.alert("Error", "Could not get current location");
    } finally {
      setIsLocating(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (role === "resident") {
      if (
        !address ||
        !houseDescription ||
        !localGovt ||
        !ward ||
        !pollingUnit ||
        !houseType
      ) {
        Alert.alert(
          "Error",
          "Please provide all address details (Address, House Description, House Type, Local Govt, Ward, and Polling Unit).",
        );
        return;
      }

      if (houseType === "Residential building" && !numberOfRooms) {
        Alert.alert("Error", "Please provide number of rooms.");
        return;
      }
      if (houseType === "Shop" && !numberOfShops) {
        Alert.alert("Error", "Please provide number of shops.");
        return;
      }
      if (houseType === "Company" && !numberOfWorkersRange) {
        Alert.alert("Error", "Please provide number of workers.");
        return;
      }
    } else if (role === "driver") {
      if (!address || !truckPlateNumber || !truckCapacity) {
        Alert.alert(
          "Error",
          "Please provide address, truck plate number and capacity.",
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await register({
        name,
        email,
        phone,
        password: password || "",
        role,
        address,
        houseDescription: role === "resident" ? houseDescription : undefined,
        localGovt,
        ward,
        pollingUnit,
        houseType: role === "resident" ? houseType : undefined,
        numberOfRooms:
          houseType === "Residential building"
            ? parseInt(numberOfRooms)
            : undefined,
        numberOfShops:
          houseType === "Shop" ? parseInt(numberOfShops) : undefined,
        numberOfWorkersRange:
          houseType === "Company" ? numberOfWorkersRange : undefined,
        location: location as any,
        truckPlateNumber: role === "driver" ? truckPlateNumber : undefined,
        truckCapacity: role === "driver" ? truckCapacity : undefined,
      });
      navigation.navigate("VerifyEmail", { email: result.email });
    } catch (e) {
      Alert.alert("Registration Failed", parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h1">Almost There!</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          We need your location for waste collection
        </AppText>
      </Animatable.View>

      <View style={styles.form}>
        {role === "resident" && (
          <>
            <View style={styles.lgSelectorContainer}>
              <AppText
                variant="caption"
                weight="600"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 8, marginTop: 8 }}
              >
                LOCAL GOVERNMENT:
              </AppText>
              <TouchableOpacity
                style={styles.wardSelectorBtn}
                onPress={() => setIsLgaModalVisible(true)}
              >
                <AppText
                  variant="body"
                  color={
                    localGovt ? theme.colors.text : theme.colors.textSecondary
                  }
                >
                  {localGovt || "Select Local Government..."}
                </AppText>
              </TouchableOpacity>
            </View>

            {localGovt ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <AppText
                  variant="caption"
                  weight="600"
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 8 }}
                >
                  CLOSEST WARD:
                </AppText>
                <TouchableOpacity
                  style={styles.wardSelectorBtn}
                  onPress={() => setIsWardModalVisible(true)}
                >
                  <AppText
                    variant="body"
                    color={
                      ward ? theme.colors.text : theme.colors.textSecondary
                    }
                  >
                    {ward || "Select your ward..."}
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : null}

            {ward ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <AppText
                  variant="caption"
                  weight="600"
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 8 }}
                >
                  CLOSEST POLLING UNIT:
                </AppText>
                <TouchableOpacity
                  style={styles.wardSelectorBtn}
                  onPress={() => setIsPuModalVisible(true)}
                >
                  <AppText
                    variant="body"
                    color={
                      pollingUnit
                        ? theme.colors.text
                        : theme.colors.textSecondary
                    }
                  >
                    {pollingUnit || "Select closest polling unit..."}
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}

        <View style={{ zIndex: 1 }}>
          <AppText
            variant="caption"
            weight="600"
            color={theme.colors.textSecondary}
            style={{ marginBottom: 8 }}
          >
            SEARCH FOR ADDRESS:
          </AppText>
          <View style={styles.autocompleteContainer}>
            <View style={{ position: "relative" }}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search street or landmark in Akure..."
                placeholderTextColor={theme.colors.textSecondary}
                value={addressSearchQuery}
                onChangeText={async (text) => {
                  setAddressSearchQuery(text);
                  setAddress(text);
                  if (text.trim().length < 3) {
                    setAddressSuggestions([]);
                    return;
                  }
                  setIsSearchingAddress(true);
                  try {
                    const res = await fetch(
                      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ng&limit=5&q=${encodeURIComponent(
                        text.trim(),
                      )}`,
                      {
                        headers: {
                          "User-Agent": "FUTA_SmartWasteApp/1.0",
                          "Accept-Language": "en-US,en;q=0.9",
                        },
                      },
                    );
                    const results = await res.json();
                    if (Array.isArray(results)) {
                      setAddressSuggestions(results);
                    }
                  } catch {
                    // Ignore network errors while typing
                  } finally {
                    setIsSearchingAddress(false);
                  }
                }}
              />
              {isSearchingAddress && (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                  style={{ position: "absolute", right: 14, top: 15 }}
                />
              )}
            </View>
            {addressSuggestions.length > 0 && (
              <View style={styles.listView}>
                {addressSuggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.lat}-${item.lon}-${idx}`}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderBottomWidth:
                        idx < addressSuggestions.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                    }}
                    onPress={() => {
                      setAddress(item.display_name);
                      setAddressSearchQuery(item.display_name);
                      setLocation({
                        type: "Point",
                        coordinates: [
                          parseFloat(item.lon),
                          parseFloat(item.lat),
                        ],
                      });
                      setAddressSuggestions([]);
                    }}
                  >
                    <AppText variant="bodySmall" numberOfLines={2}>
                      {item.display_name}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <AppText
            variant="caption"
            weight="600"
            color={theme.colors.textSecondary}
            style={{ marginBottom: 12, textAlign: "center" }}
          >
            OR
          </AppText>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleGetCurrentLocation}
            disabled={isLocating}
          >
            <MapPin color={theme.colors.surface} size={20} />
            <AppText
              variant="body"
              weight="600"
              color={theme.colors.surface}
              style={styles.locationBtnText}
            >
              {isLocating ? "Locating..." : "Use My Current Location"}
            </AppText>
          </TouchableOpacity>
        </View>

        {address ? (
          <View style={styles.selectedAddressContainer}>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Selected Address:
            </AppText>
            <AppText variant="body" weight="600">
              {address}
            </AppText>
          </View>
        ) : null}

        {role === "resident" && (
          <>
            <View style={{ marginTop: theme.spacing.lg }}>
              <AppText
                variant="caption"
                weight="600"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 8 }}
              >
                HOUSE TYPE:
              </AppText>
              <TouchableOpacity
                style={styles.wardSelectorBtn}
                onPress={() => setIsHouseTypeModalVisible(true)}
              >
                <AppText
                  variant="body"
                  color={
                    houseType ? theme.colors.text : theme.colors.textSecondary
                  }
                >
                  {houseType || "Select House Type..."}
                </AppText>
              </TouchableOpacity>
            </View>

            {houseType === "Residential building" && (
              <View style={{ marginTop: 16 }}>
                <AppInput
                  label="Number of People"
                  placeholder="e.g. 5"
                  value={numberOfRooms}
                  onChangeText={setNumberOfRooms}
                  keyboardType="numeric"
                />
              </View>
            )}

            {houseType === "Shop" && (
              <View style={{ marginTop: 16 }}>
                <AppInput
                  label="Number of Shops"
                  placeholder="e.g. 2"
                  value={numberOfShops}
                  onChangeText={setNumberOfShops}
                  keyboardType="numeric"
                />
              </View>
            )}

            {houseType === "Company" && (
              <View style={{ marginTop: 16 }}>
                <AppText
                  variant="caption"
                  weight="600"
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 8 }}
                >
                  NUMBER OF WORKERS:
                </AppText>
                <TouchableOpacity
                  style={styles.wardSelectorBtn}
                  onPress={() => setIsWorkersModalVisible(true)}
                >
                  <AppText
                    variant="body"
                    color={
                      numberOfWorkersRange
                        ? theme.colors.text
                        : theme.colors.textSecondary
                    }
                  >
                    {numberOfWorkersRange || "Select Number of Workers..."}
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ marginTop: theme.spacing.lg }}>
              <AppInput
                label="House Description"
                placeholder="e.g. 3 Bedroom apartment, opposite the transformer, along alagbaka roadside. closest landmark is futa main gate"
                value={houseDescription}
                onChangeText={setHouseDescription}
                multiline={true}
                numberOfLines={4}
                style={{ height: 100, textAlignVertical: "top" }}
              />
            </View>
          </>
        )}

        {role === "driver" && (
          <View style={{ marginTop: theme.spacing.lg }}>
            <AppInput
              label="Truck Plate Number"
              placeholder="e.g. AKR-123-AB"
              value={truckPlateNumber}
              onChangeText={setTruckPlateNumber}
              autoCapitalize="characters"
            />
            <View style={{ marginTop: 16 }}>
              <AppInput
                label="Truck Capacity"
                placeholder="e.g. 5 Tons"
                value={truckCapacity}
                onChangeText={setTruckCapacity}
              />
            </View>
          </View>
        )}

        <View style={{ marginTop: 20 }}>
          <AppButton
            title="Complete Sign Up"
            fullWidth
            style={styles.signUpBtn}
            loading={isLoading}
            onPress={handleCompleteSignup}
            disabled={
              role === "resident"
                ? !address ||
                  !houseDescription ||
                  !localGovt ||
                  !ward ||
                  !location
                : !address || !truckPlateNumber || !truckCapacity || !location
            }
          />
          <AppButton
            title="Back"
            fullWidth
            variant="outline"
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>

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
                  style={styles.wardItem}
                  onPress={() => {
                    setWard(item);
                    setPollingUnit("");
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
                  style={styles.wardItem}
                  onPress={() => {
                    setLocalGovt(item);
                    setWard("");
                    setPollingUnit("");
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
              // AFTER (correct)
              data={getPUs(localGovt, ward).filter((name) =>
                name.toLowerCase().includes(puSearchQuery.toLowerCase()),
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.wardItem}
                  onPress={() => {
                    setPollingUnit(item);
                    setIsPuModalVisible(false);
                    setPuSearchQuery("");
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
                  style={styles.wardItem}
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
                "500+ workers",
              ]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.wardItem}
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
    flex: 1,
  },
  lgSelectorContainer: {
    marginBottom: theme.spacing.md,
  },
  lgSelector: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lgBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
  },
  lgBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  wardSelectorBtn: {
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
  wardItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  locationBtnText: {
    marginLeft: theme.spacing.sm,
  },
  autocompleteContainer: {
    zIndex: 999, // Increased zIndex
  },
  searchContainer: {
    flex: 0,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 50,
    fontSize: 16,
    color: theme.colors.text,
  },
  listView: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "absolute", // Added absolute positioning
    top: 55, // Push below text input
    width: "100%",
    zIndex: 1000,
    elevation: 5, // For Android drop shadow
  },
  selectedAddressContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  signUpBtn: {
    marginTop: theme.spacing.md,
  },
  backBtn: {
    marginTop: theme.spacing.md,
  },
});
