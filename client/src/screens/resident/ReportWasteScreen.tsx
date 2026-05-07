import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera, CheckCircle } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { pickupService } from '../../services/pickupService';
import { parseApiError } from '../../services/api';
import { Severity, WasteRequest } from '../../types';

const WASTE_TYPES: WasteRequest['type'][] = ['General', 'Recyclables', 'Hazardous', 'Bulky'];
const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

export const RequestPickupScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [form, setForm] = useState({
    type: 'General' as WasteRequest['type'],
    notes: '',
    scheduledDate: '',
    scheduledTime: '',
    amount: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdPickupId, setCreatedPickupId] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.notes.trim()) newErrors.notes = 'Description is required';
    if (!form.scheduledDate.trim()) newErrors.scheduledDate = 'Date is required';
    if (!form.scheduledTime.trim()) newErrors.scheduledTime = 'Time is required';
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
      const result = await pickupService.createPickupRequest(form.type, form.notes, {
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        amount: parseFloat(form.amount),
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // After successfully creating, redirect back to dashboard
        navigation.replace('ResidentTabs');
      }, 1500);
    } catch (e) {
      Alert.alert('Submission Failed', parseApiError(e));
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
              Pickup Requested!
            </AppText>
            <AppText variant="body" color={theme.colors.surface} style={{ marginTop: 8, textAlign: 'center', opacity: 0.9 }}>
              Thank you for keeping our city clean.
            </AppText>
          </Animatable.View>
        </View>
      )}

      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h2">Request Pickup</AppText>
        <AppText variant="body" color={theme.colors.textSecondary}>
          Provide details about the waste needing collection.
        </AppText>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={600}>
        <Selector 
          label="Waste Type" 
          options={WASTE_TYPES} 
          value={form.type} 
          onChange={(val: any) => setForm({ ...form, type: val })} 
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Animatable.View animation="fadeInUp" delay={850} style={{ flex: 1, marginRight: 8 }}>
          <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>
            Preferred Date
          </AppText>
          <TouchableOpacity 
            style={[styles.chip, { margin: 0, height: 48, justifyContent: 'center' }, errors.scheduledDate && { borderColor: theme.colors.error }]}
            onPress={() => setShowDatePicker(true)}
          >
            <AppText variant="body" color={form.scheduledDate ? theme.colors.text : theme.colors.textSecondary}>
              {form.scheduledDate || 'Select Date'}
            </AppText>
          </TouchableOpacity>
          {errors.scheduledDate && <AppText variant="caption" color={theme.colors.error} style={{ marginTop: 4 }}>{errors.scheduledDate}</AppText>}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(e, date) => {
                setShowDatePicker(false);
                if (date) {
                  setSelectedDate(date);
                  setForm({ ...form, scheduledDate: date.toISOString().split('T')[0] });
                }
              }}
            />
          )}
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={850} style={{ flex: 1, marginLeft: 8 }}>
          <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>
            Preferred Time
          </AppText>
          <TouchableOpacity 
            style={[styles.chip, { margin: 0, height: 48, justifyContent: 'center' }, errors.scheduledTime && { borderColor: theme.colors.error }]}
            onPress={() => setShowTimePicker(true)}
          >
            <AppText variant="body" color={form.scheduledTime ? theme.colors.text : theme.colors.textSecondary}>
              {form.scheduledTime || 'Select Time'}
            </AppText>
          </TouchableOpacity>
          {errors.scheduledTime && <AppText variant="caption" color={theme.colors.error} style={{ marginTop: 4 }}>{errors.scheduledTime}</AppText>}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display="default"
              onChange={(e, date) => {
                setShowTimePicker(false);
                if (date) {
                  setSelectedDate(date);
                  setForm({ ...form, scheduledTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
                }
              }}
            />
          )}
        </Animatable.View>
      </View>

      {/* Amount field removed as payment is physical */}

      <Animatable.View animation="zoomIn" delay={900} style={styles.imagePlaceholder}>
        <Camera color={theme.colors.textSecondary} size={32} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginTop: theme.spacing.sm }}>
          Tap to add a photo (Optional)
        </AppText>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={1000}>
        <AppButton 
          title="Submit Request" 
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
