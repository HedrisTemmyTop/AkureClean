import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera, CheckCircle } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { Severity, WasteRequest } from '../../types';

const WASTE_TYPES: WasteRequest['type'][] = ['General', 'Recyclables', 'Hazardous', 'Bulky'];
const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

export const ReportWasteScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [form, setForm] = useState({
    lga: 'Akure South', // Mock default
    ward: '',
    street: user?.address || '',
    landmark: '',
    type: 'General' as WasteRequest['type'],
    severity: 'Medium' as Severity,
    notes: '',
    preferredDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.ward.trim()) newErrors.ward = 'Ward is required';
    if (!form.street.trim()) newErrors.street = 'Street is required';
    if (!form.notes.trim()) newErrors.notes = 'Description is required';
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      await reportService.submitReport({
        residentId: user!.id,
        locationId: user!.locationId || 'loc1', // Mocking location resolution
        street: form.street,
        landmark: form.landmark,
        type: form.type,
        severity: form.severity,
        notes: form.notes,
        preferredDate: form.preferredDate ? new Date(form.preferredDate).toISOString() : undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 2000);
    } catch (e) {
      Alert.alert('Error', 'Could not submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Selector = ({ label, options, value, onChange }: any) => (
    <View style={styles.selectorContainer}>
      <AppText variant="bodySmall" weight="600" color={theme.colors.textSecondary} style={styles.label}>
        {label}
      </AppText>
      <View style={styles.chipsRow}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <AppText 
              variant="caption" 
              weight={value === opt ? '600' : '400'}
              color={value === opt ? theme.colors.primary : theme.colors.text}
            >
              {opt}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenContainer scrollable>
      {showSuccess && (
        <View style={StyleSheet.absoluteFillObject}>
          <Animatable.View 
            animation="fadeIn" 
            duration={300} 
            style={styles.successOverlay}
          />
          <Animatable.View 
            animation="zoomIn" 
            duration={500} 
            style={styles.successContent}
          >
            <CheckCircle color={theme.colors.success} size={80} />
            <AppText variant="h2" color={theme.colors.surface} style={{ marginTop: 24, textAlign: 'center' }}>
              Report Submitted!
            </AppText>
            <AppText variant="body" color={theme.colors.surface} style={{ marginTop: 8, textAlign: 'center', opacity: 0.9 }}>
              Thank you for keeping our city clean.
            </AppText>
          </Animatable.View>
        </View>
      )}

      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h2">Report Waste</AppText>
        <AppText variant="body" color={theme.colors.textSecondary}>
          Provide details about the waste needing collection.
        </AppText>
      </Animatable.View>

      <Animatable.View animation="fadeInLeft" delay={200}>
        <AppInput
          label="Local Government (LGA)"
          value={form.lga}
          onChangeText={(val) => setForm({ ...form, lga: val })}
        />
      </Animatable.View>
      <Animatable.View animation="fadeInRight" delay={300}>
        <AppInput
          label="Ward"
          value={form.ward}
          onChangeText={(val) => setForm({ ...form, ward: val })}
          error={errors.ward}
          placeholder="e.g. Obanla"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInLeft" delay={400}>
        <AppInput
          label="Street Address"
          value={form.street}
          onChangeText={(val) => setForm({ ...form, street: val })}
          error={errors.street}
          placeholder="e.g. 15 FUTA South Gate Road"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInRight" delay={500}>
        <AppInput
          label="Nearest Landmark / House No."
          value={form.landmark}
          onChangeText={(val) => setForm({ ...form, landmark: val })}
          placeholder="Optional but helpful"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInLeft" delay={550}>
        <AppInput
          label="Preferred Pickup Date"
          value={form.preferredDate}
          onChangeText={(val) => setForm({ ...form, preferredDate: val })}
          placeholder="YYYY-MM-DD (Optional)"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={600}>
        <Selector 
          label="Waste Type" 
          options={WASTE_TYPES} 
          value={form.type} 
          onChange={(val: any) => setForm({ ...form, type: val })} 
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={700}>
        <Selector 
          label="Severity" 
          options={SEVERITIES} 
          value={form.severity} 
          onChange={(val: any) => setForm({ ...form, severity: val })} 
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={800}>
        <AppInput
          label="Description"
        value={form.notes}
        onChangeText={(val) => setForm({ ...form, notes: val })}
        error={errors.notes}
        placeholder="Describe the waste..."
        multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />
      </Animatable.View>

      <Animatable.View animation="zoomIn" delay={900} style={styles.imagePlaceholder}>
        <Camera color={theme.colors.textSecondary} size={32} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginTop: theme.spacing.sm }}>
          Tap to add a photo (Optional)
        </AppText>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={1000}>
        <AppButton 
          title="Submit Report" 
        onPress={handleSubmit} 
          loading={isSubmitting}
          style={styles.submitBtn}
        />
      </Animatable.View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.xl,
  },
  selectorContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: theme.colors.border + '50',
    borderRadius: theme.borderRadius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  submitBtn: {
    marginBottom: theme.spacing.xl,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.primary,
    opacity: 0.95,
    zIndex: 10,
  },
  successContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
    padding: 32,
  }
});
