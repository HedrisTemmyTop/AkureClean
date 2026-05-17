import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Search,
  User as UserIcon,
  CheckCircle,
  ChevronDown,
  ArrowLeft,
  Mail,
  UserCheck,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { theme } from "../../theme";
import { User, AssignmentRoute } from "../../types";
import { adminService } from "../../services/adminService";
import { assignmentService } from "../../services/routeService";
import { parseApiError } from "../../services/api";
import pollingUnitsData from "../../data/polling_units_structured.json";

// ── static data ───────────────────────────────────────────────────────────────
const data = pollingUnitsData as unknown as Record<
  string,
  Record<string, any[]>
>;
const lgas = Object.keys(data);

function getWards(lga: string) {
  return Object.keys(data[lga] || {}).filter((w) => w !== "Unknown Ward");
}

function getPUs(lga: string, ward: string): string[] {
  return (data[lga]?.[ward] || []).filter((p) => p.name).map((p) => p.name);
}

type ActiveModal = "lga" | "ward" | "pollingUnits" | null;

export const CreateAssignmentScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Flow State
  const [step, setStep] = useState<"SEARCH_DRIVER" | "CREATE_FORM">(
    "SEARCH_DRIVER",
  );
  const [driverSearchEmail, setDriverSearchEmail] = useState("");
  const [isSearchingDriver, setIsSearchingDriver] = useState(false);

  // Form State
  const [selectedLga, setSelectedLga] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [selectedPUs, setSelectedPUs] = useState<string[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [collectionTime, setCollectionTime] = useState("08:00 AM");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Success State
  const [successData, setSuccessData] = useState<AssignmentRoute | null>(null);

  // Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const handleSearchDriver = async () => {
    if (!driverSearchEmail.trim()) {
      Alert.alert("Error", "Please enter a driver email address.");
      return;
    }

    setIsSearchingDriver(true);
    try {
      const results = await adminService.getAllDrivers(
        driverSearchEmail.trim().toLowerCase(),
      );
      // Ensure we find the exact email match
      const driver = results.find(
        (d) => d.email.toLowerCase() === driverSearchEmail.trim().toLowerCase(),
      );

      if (driver) {
        setSelectedDriver(driver);
        setStep("CREATE_FORM");
      } else {
        Alert.alert(
          "Collector Not Found",
          "No collector found with that exact email address. Please check and try again.",
        );
      }
    } catch (e) {
      Alert.alert(
        "Search Failed",
        "Could not search for driver. Please try again.",
      );
    } finally {
      setIsSearchingDriver(false);
    }
  };

  const handleLgaSelect = (lga: string) => {
    setSelectedLga(lga);
    setSelectedWard("");
    setSelectedPUs([]);
    setActiveModal(null);
  };

  const handleWardSelect = (ward: string) => {
    setSelectedWard(ward);
    setSelectedPUs([]);
    setActiveModal(null);
  };

  const togglePU = (pu: string) => {
    if (selectedPUs.includes(pu)) {
      setSelectedPUs((prev) => prev.filter((p) => p !== pu));
    } else {
      setSelectedPUs((prev) => [...prev, pu]);
    }
  };

  const handleSave = async () => {
    if (!selectedLga || !selectedWard) {
      Alert.alert("Error", "Please select an LGA and Ward.");
      return;
    }
    if (selectedPUs.length === 0) {
      Alert.alert("Error", "Please select at least one Polling Unit.");
      return;
    }
    if (!selectedDriver) {
      Alert.alert("Error", "No driver selected.");
      return;
    }
    if (!collectionDate) {
      Alert.alert("Error", "Please select a collection date.");
      return;
    }

    setSaving(true);
    try {
      const assignment = await assignmentService.createAssignment({
        driverId: selectedDriver.id!,
        title: title.trim() || `${selectedWard} Collection`,
        collectionDate: new Date(collectionDate).toISOString(),
        collectionTime: collectionTime,
        lga: selectedLga,
        ward: selectedWard,
        pollingUnits: selectedPUs,
      });
      setSuccessData(assignment);
    } catch (e) {
      Alert.alert("Failed to Create Route", parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (successData) {
    return (
      <ScreenContainer scrollable>
        <View style={styles.successContainer}>
          <CheckCircle
            color={theme.colors.success}
            size={64}
            style={{ marginBottom: 16 }}
          />
          <AppText variant="h1" align="center" style={{ marginBottom: 8 }}>
            Route Generated!
          </AppText>
          <AppText
            variant="body"
            color={theme.colors.textSecondary}
            align="center"
            style={{ marginBottom: 32 }}
          >
            The optimized route has been created and assigned to{" "}
            {successData.driverName || "the driver"}.
          </AppText>

          <AppCard style={{ width: "100%", marginBottom: 24 }}>
            <View style={styles.statRow}>
              <AppText variant="body" weight="600">
                Total Residents Found:
              </AppText>
              <AppText variant="body">{successData.stops.length}</AppText>
            </View>
            <View style={styles.statRow}>
              <AppText variant="body" weight="600">
                Estimated Distance:
              </AppText>
              <AppText variant="body">{successData.estimatedDistance}</AppText>
            </View>
            <View
              style={[
                styles.statRow,
                { borderBottomWidth: 0, paddingBottom: 0 },
              ]}
            >
              <AppText variant="body" weight="600">
                Estimated Duration:
              </AppText>
              <AppText variant="body">{successData.estimatedDuration}</AppText>
            </View>
          </AppCard>

          <AppText
            variant="h3"
            style={{ alignSelf: "flex-start", marginBottom: 16 }}
          >
            Optimized Sequence
          </AppText>
          <AppCard style={{ width: "100%", padding: 0 }}>
            {successData.stops.slice(0, 10).map((stop, i) => (
              <View key={stop.id} style={styles.stopItem}>
                <View style={styles.stopIndex}>
                  <AppText variant="caption" weight="bold" color="#fff">
                    {i + 1}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="600" numberOfLines={1}>
                    {stop.address}
                  </AppText>
                  {stop.pollingUnit ? (
                    <AppText
                      variant="caption"
                      color={theme.colors.textSecondary}
                    >
                      {stop.pollingUnit}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
            {successData.stops.length > 10 && (
              <View style={styles.stopItem}>
                <AppText
                  variant="bodySmall"
                  color={theme.colors.textSecondary}
                  style={{ fontStyle: "italic" }}
                >
                  ...and {successData.stops.length - 10} more stops
                </AppText>
              </View>
            )}
          </AppCard>

          <AppButton
            title="Done"
            onPress={() => navigation.goBack()}
            style={{ width: "100%", marginTop: 32, marginBottom: 40 }}
          />
        </View>
      </ScreenContainer>
    );
  }

  const wardList = getWards(selectedLga);
  const puList = getPUs(selectedLga, selectedWard);

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            step === "CREATE_FORM"
              ? setStep("SEARCH_DRIVER")
              : navigation.goBack()
          }
          style={styles.backBtn}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <AppText variant="h2" style={{ flex: 1, textAlign: "center" }}>
          Create Task
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {step === "SEARCH_DRIVER" ? (
        <View style={styles.searchSection}>
          <View style={styles.searchHero}>
            <View style={styles.iconCircle}>
              <Mail color={theme.colors.primary} size={32} />
            </View>
            <AppText variant="h3" style={{ marginTop: 16 }}>
              Find Collector
            </AppText>
            <AppText
              variant="body"
              color={theme.colors.textSecondary}
              align="center"
              style={{ marginTop: 8, paddingHorizontal: 20 }}
            >
              Search for a registered collector by their email address to start
              creating an assignment.
            </AppText>
          </View>

          <View style={{ marginTop: 32 }}>
            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={styles.fieldLabel}
            >
              COLLECTOR EMAIL
            </AppText>
            <AppInput
              placeholder="e.g. collector@akureclean.com"
              value={driverSearchEmail}
              onChangeText={setDriverSearchEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <AppButton
              title="Find Collector"
              onPress={handleSearchDriver}
              loading={isSearchingDriver}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.formSection}>
          <AppCard style={styles.driverInfoCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.avatar}>
                <UserCheck color={theme.colors.primary} size={24} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <AppText variant="body" weight="600">
                  {selectedDriver?.name}
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {selectedDriver?.email}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setStep("SEARCH_DRIVER")}
                style={styles.changeBtn}
              >
                <AppText
                  variant="caption"
                  color={theme.colors.primary}
                  weight="600"
                >
                  Change
                </AppText>
              </TouchableOpacity>
            </View>
          </AppCard>

          <View style={styles.section}>
            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={styles.fieldLabel}
            >
              LOCAL GOVERNMENT
            </AppText>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setActiveModal("lga")}
            >
              <AppText
                variant="body"
                style={{ flex: 1 }}
                color={
                  selectedLga ? theme.colors.text : theme.colors.textSecondary
                }
              >
                {selectedLga || "Select LGA..."}
              </AppText>
              <ChevronDown color={theme.colors.textSecondary} size={18} />
            </TouchableOpacity>

            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={[styles.fieldLabel, { marginTop: 16 }]}
            >
              WARD
            </AppText>
            <TouchableOpacity
              style={[styles.selector, !selectedLga && styles.disabled]}
              onPress={() => selectedLga && setActiveModal("ward")}
              disabled={!selectedLga}
            >
              <AppText
                variant="body"
                style={{ flex: 1 }}
                color={
                  selectedWard ? theme.colors.text : theme.colors.textSecondary
                }
              >
                {selectedWard || "Select Ward..."}
              </AppText>
              <ChevronDown color={theme.colors.textSecondary} size={18} />
            </TouchableOpacity>

            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={[styles.fieldLabel, { marginTop: 16 }]}
            >
              POLLING UNITS
            </AppText>
            <TouchableOpacity
              style={[styles.selector, !selectedWard && styles.disabled]}
              onPress={() => selectedWard && setActiveModal("pollingUnits")}
              disabled={!selectedWard}
            >
              <AppText
                variant="body"
                style={{ flex: 1 }}
                color={
                  selectedPUs.length
                    ? theme.colors.text
                    : theme.colors.textSecondary
                }
                numberOfLines={1}
              >
                {selectedPUs.length
                  ? `${selectedPUs.length} selected`
                  : "Select Polling Units..."}
              </AppText>
              <ChevronDown color={theme.colors.textSecondary} size={18} />
            </TouchableOpacity>

            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={[styles.fieldLabel, { marginTop: 16 }]}
            >
              TASK TITLE
            </AppText>
            <AppInput
              placeholder="e.g. Morning Collection"
              value={title}
              onChangeText={setTitle}
            />

            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={[styles.fieldLabel, { marginTop: 16 }]}
            >
              COLLECTION DATE
            </AppText>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowDatePicker(true)}
            >
              <AppText
                variant="body"
                color={
                  collectionDate
                    ? theme.colors.text
                    : theme.colors.textSecondary
                }
              >
                {collectionDate || "Select Date"}
              </AppText>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={collectionDate ? new Date(collectionDate) : new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(e, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setCollectionDate(date.toISOString().split("T")[0]);
                  }
                }}
              />
            )}

            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.textSecondary}
              style={[styles.fieldLabel, { marginTop: 16 }]}
            >
              COLLECTION TIME
            </AppText>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowTimePicker(true)}
            >
              <AppText
                variant="body"
                color={
                  collectionTime
                    ? theme.colors.text
                    : theme.colors.textSecondary
                }
              >
                {collectionTime || "Select Time"}
              </AppText>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="default"
                is24Hour={false}
                onChange={(e, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const hours = date.getHours();
                    const minutes = date.getMinutes();
                    const ampm = hours >= 12 ? "PM" : "AM";
                    const h = hours % 12 || 12;
                    const m = minutes < 10 ? `0${minutes}` : minutes;
                    setCollectionTime(`${h}:${m} ${ampm}`);
                  }
                }}
              />
            )}
          </View>

          <AppButton
            title="Generate Route & Assign"
            onPress={handleSave}
            loading={saving}
            style={{
              marginTop: theme.spacing.lg,
              marginBottom: theme.spacing.xxl,
            }}
          />
        </View>
      )}

      {/* Modals */}
      <Modal visible={activeModal === "lga"} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppText variant="h3" style={{ marginBottom: 12 }}>
              Select Local Government
            </AppText>
            <FlatList
              data={lgas}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleLgaSelect(item)}
                >
                  <AppText
                    variant="body"
                    weight={item === selectedLga ? "600" : "400"}
                    color={
                      item === selectedLga
                        ? theme.colors.primary
                        : theme.colors.text
                    }
                  >
                    {item}
                  </AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setActiveModal(null)}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === "ward"} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppText variant="h3" style={{ marginBottom: 12 }}>
              Select Ward
            </AppText>
            <FlatList
              data={wardList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleWardSelect(item)}
                >
                  <AppText
                    variant="body"
                    weight={item === selectedWard ? "600" : "400"}
                    color={
                      item === selectedWard
                        ? theme.colors.primary
                        : theme.colors.text
                    }
                  >
                    {item}
                  </AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setActiveModal(null)}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === "pollingUnits"}
        animationType="slide"
        transparent
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <AppText variant="h3">Select Polling Units</AppText>
              <TouchableOpacity
                onPress={() => {
                  if (selectedPUs.length === puList.length) setSelectedPUs([]);
                  else setSelectedPUs([...puList]);
                }}
              >
                <AppText variant="bodySmall" color={theme.colors.primary}>
                  {selectedPUs.length === puList.length
                    ? "Deselect All"
                    : "Select All"}
                </AppText>
              </TouchableOpacity>
            </View>
            <FlatList
              data={puList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedPUs.includes(item);
                return (
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => togglePU(item)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxChecked,
                      ]}
                    >
                      {isSelected && <CheckCircle color="#fff" size={14} />}
                    </View>
                    <AppText variant="body" style={{ flex: 1, marginLeft: 12 }}>
                      {item}
                    </AppText>
                  </TouchableOpacity>
                );
              }}
            />
            <AppButton
              title="Done"
              onPress={() => setActiveModal(null)}
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    marginTop: 10,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  section: { marginBottom: theme.spacing.xl },
  fieldLabel: { marginBottom: 6 },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  disabled: { backgroundColor: theme.colors.background, opacity: 0.7 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: "80%",
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stopIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  searchSection: { flex: 1, paddingTop: 20 },
  searchHero: { alignItems: "center", justifyContent: "center" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  formSection: { flex: 1 },
  driverInfoCard: {
    padding: 16,
    marginBottom: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary + "20",
    borderRadius: theme.borderRadius.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  changeBtn: { padding: 4 },
});
