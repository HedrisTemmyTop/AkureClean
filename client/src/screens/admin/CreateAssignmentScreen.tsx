import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, User as UserIcon, Plus, Trash2, ArrowRight, MapPin, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { User } from '../../types';
import { adminService } from '../../services/adminService';
import { assignmentService } from '../../services/routeService';
import { parseApiError } from '../../services/api';
import pollingUnitsData from '../../data/polling_units_structured.json';

// ── types ────────────────────────────────────────────────────────────────────

interface PollingUnit {
  name: string;
  coordinates: [number, number]; // [lng, lat]
}

interface Segment {
  id: string;
  start: PollingUnit | null;
  end: PollingUnit | null;
}

type PickerTarget = { segId: string; field: 'start' | 'end' } | null;
type ActiveModal = 'lga' | 'ward' | 'picker' | null;

// ── static data ───────────────────────────────────────────────────────────────

const data = pollingUnitsData as unknown as Record<string, Record<string, PollingUnit[]>>;
const lgas = Object.keys(data);

function getWards(lga: string) {
  return Object.keys(data[lga] || {}).filter((w) => w !== 'Unknown Ward');
}

function getPUs(lga: string, ward: string): PollingUnit[] {
  return (data[lga]?.[ward] || []).filter(
    (p) => p.name && Array.isArray(p.coordinates) && p.coordinates.length === 2,
  );
}

const uid = () => Math.random().toString(36).slice(2);

// ── component ─────────────────────────────────────────────────────────────────

export const CreateAssignmentScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Driver search
  const [emailSearch, setEmailSearch] = useState('');
  const [driver, setDriver] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // LGA / Ward selection (step 2)
  const [selectedLga, setSelectedLga] = useState<string>(lgas[0]);
  const [selectedWard, setSelectedWard] = useState<string>(getWards(lgas[0])[0] || '');

  // Current PUs for selected ward
  const wardPUs = getPUs(selectedLga, selectedWard);

  // Segments (step 3)
  const [segments, setSegments] = useState<Segment[]>([
    { id: uid(), start: null, end: null },
  ]);

  // Route details (step 4)
  const [title, setTitle] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [collectionTime, setCollectionTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [puSearch, setPuSearch] = useState('');

  // ── driver search ────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!emailSearch.trim()) return;
    setIsSearching(true);
    setDriver(null);
    try {
      const results = await adminService.getAllDrivers(emailSearch.trim());
      if (results.length > 0) {
        setDriver(results[0]);
      } else {
        Alert.alert('Not Found', 'No driver found with this email.');
      }
    } catch (e) {
      Alert.alert('Search Failed', parseApiError(e));
    } finally {
      setIsSearching(false);
    }
  };

  // ── LGA / Ward helpers ───────────────────────────────────────────────────

  const handleLgaSelect = (lga: string) => {
    setSelectedLga(lga);
    const wards = getWards(lga);
    setSelectedWard(wards[0] || '');
    setSegments([{ id: uid(), start: null, end: null }]);
    setActiveModal(null);
  };

  const handleWardSelect = (ward: string) => {
    setSelectedWard(ward);
    setSegments([{ id: uid(), start: null, end: null }]);
    setActiveModal(null);
  };

  // ── segment helpers ──────────────────────────────────────────────────────

  const addSegment = () =>
    setSegments((prev) => [...prev, { id: uid(), start: null, end: null }]);

  const removeSegment = (id: string) =>
    setSegments((prev) => prev.filter((s) => s.id !== id));

  const openPicker = (segId: string, field: 'start' | 'end') => {
    setPuSearch('');
    setPickerTarget({ segId, field });
    setActiveModal('picker');
  };

  const selectPU = (pu: PollingUnit) => {
    if (!pickerTarget) return;
    const { segId, field } = pickerTarget;
    setSegments((prev) =>
      prev.map((s) => (s.id === segId ? { ...s, [field]: pu } : s)),
    );
    setActiveModal(null);
    setPickerTarget(null);
  };

  // ── filtered PUs for picker ──────────────────────────────────────────────

  const filteredPUs = useCallback(() => {
    const q = puSearch.toLowerCase();
    if (!q) return wardPUs;
    return wardPUs.filter((p) => p.name.toLowerCase().includes(q));
  }, [puSearch, wardPUs])();

  // ── submit ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!driver) {
      Alert.alert('Error', 'Please search and select a driver first.');
      return;
    }
    if (!selectedWard) {
      Alert.alert('Error', 'Please select a Local Govt and Ward.');
      return;
    }
    const validSegments = segments.filter((s) => s.start && s.end);
    if (validSegments.length === 0) {
      Alert.alert('Error', 'Please complete at least one route segment (Start → End).');
      return;
    }
    if (!collectionDate.trim()) {
      Alert.alert('Error', 'Please enter a collection date (YYYY-MM-DD).');
      return;
    }
    if (!collectionTime.trim()) {
      Alert.alert('Error', 'Please enter a collection time.');
      return;
    }

    const areaNames = validSegments
      .map((s) => `${s.start!.name} → ${s.end!.name}`)
      .join(', ');

    setSaving(true);
    try {
      await assignmentService.createAssignment({
        driverEmail: driver.email,
        title: title.trim() || `${selectedWard} Route`,
        area: `${selectedLga} — ${selectedWard}`,
        collectionDate: new Date(collectionDate).toISOString(),
        collectionTime,
        segments: validSegments.map((s) => ({
          start: s.start!.coordinates,
          end: s.end!.coordinates,
        })),
      });
      Alert.alert('Success', 'Route generated and driver assigned!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed to Create', parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────

  const wardList = getWards(selectedLga);

  return (
    <ScreenContainer scrollable>

      {/* Header */}
      <View style={styles.header}>
        <AppButton title="Back" variant="ghost" size="small"
          onPress={() => navigation.goBack()} style={styles.backBtn} />
        <AppText variant="h2" style={{ flex: 1, textAlign: 'center' }}>Assign Driver</AppText>
        <View style={{ width: 60 }} />
      </View>

      {/* ── Step 1: Driver ── */}
      <View style={styles.section}>
        <AppText variant="h3" style={styles.sectionLabel}>1. Select Driver</AppText>
        <AppInput
          placeholder="Search driver by email..."
          value={emailSearch}
          onChangeText={setEmailSearch}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ marginBottom: theme.spacing.md }}
        />
        <AppButton
          title="Search"
          icon={<Search color={theme.colors.surface} size={18} />}
          onPress={handleSearch}
          loading={isSearching}
        />
      </View>

      {driver && (
        <>
          {/* Driver card */}
          <AppCard style={styles.driverCard}>
            <View style={styles.driverRow}>
              <View style={styles.avatar}>
                <UserIcon color={theme.colors.primary} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="h3">{driver.name}</AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{driver.email}</AppText>
              </View>
            </View>
          </AppCard>

          {/* ── Step 2: LGA & Ward ── */}
          <View style={styles.section}>
            <AppText variant="h3" style={styles.sectionLabel}>2. Select Coverage Area</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginBottom: 14 }}>
              Choose the local government and ward. Route segments will be built from polling units within this ward.
            </AppText>

            {/* LGA selector */}
            <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={styles.fieldLabel}>
              LOCAL GOVERNMENT:
            </AppText>
            <TouchableOpacity style={styles.selector} onPress={() => setActiveModal('lga')}>
              <AppText variant="body" style={{ flex: 1 }}>{selectedLga}</AppText>
              <ChevronDown color={theme.colors.textSecondary} size={18} />
            </TouchableOpacity>

            {/* Ward selector */}
            <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={[styles.fieldLabel, { marginTop: 14 }]}>
              WARD:
            </AppText>
            <TouchableOpacity style={styles.selector} onPress={() => setActiveModal('ward')}>
              <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {selectedWard || 'Select ward...'}
              </AppText>
              <ChevronDown color={theme.colors.textSecondary} size={18} />
            </TouchableOpacity>
          </View>

          {/* ── Step 3: Route Segments ── */}
          {selectedWard ? (
            <View style={styles.section}>
              <AppText variant="h3" style={styles.sectionLabel}>3. Build Route Segments</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginBottom: 14 }}>
                Pick a Start and End polling unit for each segment. All registered residents between those two points will be added to the route.
              </AppText>

              {wardPUs.length === 0 && (
                <AppText variant="bodySmall" color={theme.colors.error} style={{ marginBottom: 12 }}>
                  No polling units found for this ward. Choose a different ward.
                </AppText>
              )}

              {segments.map((seg, idx) => (
                <AppCard key={seg.id} style={styles.segCard}>
                  <View style={styles.segHeader}>
                    <AppText variant="bodySmall" weight="600" color={theme.colors.textSecondary}>
                      SEGMENT {idx + 1}
                    </AppText>
                    {segments.length > 1 && (
                      <TouchableOpacity onPress={() => removeSegment(seg.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Trash2 color={theme.colors.error} size={18} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Start */}
                  <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={styles.fieldLabel}>
                    START:
                  </AppText>
                  <TouchableOpacity
                    style={[styles.puBtn, seg.start && styles.puBtnFilled]}
                    onPress={() => openPicker(seg.id, 'start')}
                  >
                    <MapPin color={seg.start ? '#22c55e' : theme.colors.textSecondary} size={16} />
                    <AppText variant="body" style={{ flex: 1, marginLeft: 8 }}
                      color={seg.start ? theme.colors.text : theme.colors.textSecondary}
                      numberOfLines={1}>
                      {seg.start ? seg.start.name : 'Select start polling unit…'}
                    </AppText>
                  </TouchableOpacity>

                  {/* Arrow */}
                  <View style={styles.arrowRow}>
                    <View style={styles.arrowLine} />
                    <ArrowRight color={theme.colors.primary} size={20} />
                    <View style={styles.arrowLine} />
                  </View>

                  {/* End */}
                  <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={styles.fieldLabel}>
                    END:
                  </AppText>
                  <TouchableOpacity
                    style={[styles.puBtn, seg.end && styles.puBtnFilled]}
                    onPress={() => openPicker(seg.id, 'end')}
                  >
                    <MapPin color={seg.end ? '#ef4444' : theme.colors.textSecondary} size={16} />
                    <AppText variant="body" style={{ flex: 1, marginLeft: 8 }}
                      color={seg.end ? theme.colors.text : theme.colors.textSecondary}
                      numberOfLines={1}>
                      {seg.end ? seg.end.name : 'Select end polling unit…'}
                    </AppText>
                  </TouchableOpacity>

                  {seg.start && seg.end && (
                    <View style={styles.segNote}>
                      <AppText variant="caption" color={theme.colors.textSecondary}>
                        All residents registered between these two points will be added.
                      </AppText>
                    </View>
                  )}
                </AppCard>
              ))}

              <TouchableOpacity style={styles.addBtn} onPress={addSegment}>
                <Plus color={theme.colors.primary} size={18} />
                <AppText variant="body" weight="600" color={theme.colors.primary} style={{ marginLeft: 8 }}>
                  Add Another Segment
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Step 4: Details ── */}
          <View style={styles.section}>
            <AppText variant="h3" style={styles.sectionLabel}>4. Finalize Details</AppText>
            <AppInput
              label="Route Title (optional)"
              placeholder="e.g. Alagbaka Morning Route"
              value={title}
              onChangeText={setTitle}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>
                  COLLECTION DATE
                </AppText>
                <TouchableOpacity 
                  style={[styles.selector, { paddingVertical: 12 }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <AppText variant="body" color={collectionDate ? theme.colors.text : theme.colors.textSecondary}>
                    {collectionDate || 'Select Date'}
                  </AppText>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDateTime}
                    mode="date"
                    display="default"
                    onChange={(e, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        setSelectedDateTime(date);
                        setCollectionDate(date.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>
                  COLLECTION TIME
                </AppText>
                <TouchableOpacity 
                  style={[styles.selector, { paddingVertical: 12 }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <AppText variant="body" color={collectionTime ? theme.colors.text : theme.colors.textSecondary}>
                    {collectionTime || 'Select Time'}
                  </AppText>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedDateTime}
                    mode="time"
                    display="default"
                    onChange={(e, date) => {
                      setShowTimePicker(false);
                      if (date) {
                        setSelectedDateTime(date);
                        setCollectionTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                      }
                    }}
                  />
                )}
              </View>
            </View>
            <AppButton
              title="Generate Route & Assign"
              onPress={handleSave}
              loading={saving}
              style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xxl }}
            />
          </View>
        </>
      )}

      {/* ── LGA Modal ── */}
      <Modal visible={activeModal === 'lga'} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppText variant="h3" style={{ marginBottom: 12 }}>Select Local Government</AppText>
            <FlatList
              data={lgas}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.sheetItem} onPress={() => handleLgaSelect(item)}>
                  <AppText variant="body"
                    weight={item === selectedLga ? '600' : '400'}
                    color={item === selectedLga ? theme.colors.primary : theme.colors.text}>
                    {item}
                  </AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton title="Cancel" variant="outline"
              onPress={() => setActiveModal(null)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>

      {/* ── Ward Modal ── */}
      <Modal visible={activeModal === 'ward'} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppText variant="h3" style={{ marginBottom: 12 }}>Select Ward ({selectedLga})</AppText>
            <FlatList
              data={wardList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.sheetItem} onPress={() => handleWardSelect(item)}>
                  <AppText variant="body"
                    weight={item === selectedWard ? '600' : '400'}
                    color={item === selectedWard ? theme.colors.primary : theme.colors.text}
                    numberOfLines={2}>
                    {item}
                  </AppText>
                </TouchableOpacity>
              )}
            />
            <AppButton title="Cancel" variant="outline"
              onPress={() => setActiveModal(null)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>

      {/* ── PU Picker Modal ── */}
      <Modal visible={activeModal === 'picker'} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppText variant="h3" style={{ marginBottom: 8 }}>
              {pickerTarget?.field === 'start' ? '🟢 Start' : '🔴 End'} Polling Unit
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginBottom: 10 }}>
              {selectedWard}
            </AppText>
            <AppInput
              placeholder="Search…"
              value={puSearch}
              onChangeText={setPuSearch}
              style={{ marginBottom: 8 }}
            />
            <FlatList
              data={filteredPUs}
              keyExtractor={(item, i) => `${item.name}-${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.sheetItem} onPress={() => selectPU(item)}>
                  <MapPin color={theme.colors.primary} size={14} style={{ marginRight: 8 }} />
                  <AppText variant="body" style={{ flex: 1 }} numberOfLines={2}>{item.name}</AppText>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <AppText variant="bodySmall" color={theme.colors.textSecondary}
                  style={{ textAlign: 'center', padding: 20 }}>
                  No polling units found.
                </AppText>
              }
              style={{ maxHeight: 320 }}
            />
            <AppButton title="Cancel" variant="outline"
              onPress={() => setActiveModal(null)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
};

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xl },
  backBtn: { marginLeft: -theme.spacing.sm, width: 60 },

  section: { marginBottom: theme.spacing.xl },
  sectionLabel: { marginBottom: theme.spacing.sm },
  fieldLabel: { marginBottom: 6 },

  driverCard: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '30',
    borderWidth: 1,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    marginRight: theme.spacing.md,
  },

  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },

  segCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: theme.spacing.md,
  },
  puBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
  },
  puBtnFilled: {
    borderColor: theme.colors.primary + '60',
    backgroundColor: theme.colors.primary + '08',
  },
  arrowRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginVertical: 10,
  },
  arrowLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  segNote: {
    marginTop: 10, padding: 10,
    backgroundColor: theme.colors.primary + '08',
    borderRadius: theme.borderRadius.sm,
  },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.colors.primary,
    borderStyle: 'dashed', borderRadius: theme.borderRadius.md,
    padding: 14, marginTop: 4,
  },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '75%',
  },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
});
