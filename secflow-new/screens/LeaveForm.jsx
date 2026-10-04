import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Image, Modal, KeyboardAvoidingView } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { leaveService } from '../services/api';

const BLUE = '#1A429A';
const BTN_BLUE = '#1D5BBF';
const BG = '#EDF1F7';
const NAVY_TEXT = '#0F2242';

const LEAVE_TYPES = [
  { label: 'Sick Leave', value: 'sick' },
  { label: 'Casual Leave', value: 'casual' },
  { label: 'Academic Leave', value: 'academic' },
  { label: 'Emergency', value: 'emergency' },
];

const fmtDateISO = (d) => d.toISOString().split('T')[0];

export default function LeaveForm() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typeError, setTypeError] = useState('');

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const selectedLabel = LEAVE_TYPES.find((t) => t.value === leaveType)?.label || '';

  const handleSubmit = async () => {
    if (!leaveType) {
      setTypeError('Please select a leave category.');
      return;
    }
    setTypeError('');

    setLoading(true);
    setError('');

    try {
      await leaveService.createLeave({
        title: `${LEAVE_TYPES.find(t => t.value === leaveType)?.label || 'Leave'} Request`,
        description: reason,
        leave_type: leaveType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      showAlert('Success', 'Leave application submitted successfully!', [
        { text: 'OK', onPress: () => router.replace('/student/status') }
      ]);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
          <View style={styles.headerText}>
            <Text style={styles.headerCollege}>SecFlow</Text>
            <Text style={styles.headerForm}>Leave Form</Text>
          </View>
        </View>
        <Image source={require('../assets/images/leaveavatar.png')} style={styles.headerAvatar} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Leave Type <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.fakeInput, !!typeError && styles.inputError]}
            onPress={() => setShowTypePicker(true)}
          >
            <MaterialIcons name="description" size={20} color={BLUE} style={styles.inboxIcon} />
            <Text style={[leaveType ? styles.fakeInputText : styles.fakePlaceholder, styles.fakeGrow]}>
              {selectedLabel || 'Select category'}
            </Text>
            <MaterialIcons name="expand-more" size={26} color={NAVY_TEXT} />
          </TouchableOpacity>
          {!!typeError && <Text style={styles.fieldError}>{typeError}</Text>}

          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>Start Date <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateBoxText} numberOfLines={1}>{fmtDateISO(startDate)}</Text>
                <MaterialIcons name="calendar-today" size={20} color={NAVY_TEXT} />
              </TouchableOpacity>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>End Date <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.dateBox} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateBoxText} numberOfLines={1}>{fmtDateISO(endDate)}</Text>
                <MaterialIcons name="calendar-today" size={20} color={NAVY_TEXT} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Reason <Text style={styles.required}>*</Text></Text>
          <View style={styles.areaWrap}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Please briefly explain why you are requesting leave..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <MaterialIcons name="edit" size={20} color={NAVY_TEXT} style={styles.areaIcon} />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <MaterialIcons name="send" size={22} color="white" />
            <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Request'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onValueChange={(event, d) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (d) {
              setStartDate(d);
              if (d > endDate) setEndDate(d);
            }
          }}
          onDismiss={() => setShowStartPicker(false)}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={startDate}
          onValueChange={(event, d) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (d) setEndDate(d);
          }}
          onDismiss={() => setShowEndPicker(false)}
        />
      )}

      {/* Leave type dropdown */}
      {showTypePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} nestedScrollEnabled>
              {LEAVE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.modalItem, leaveType === t.value && styles.modalItemActive]}
                  onPress={() => {
                    setLeaveType(t.value);
                    setTypeError('');
                    setShowTypePicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, leaveType === t.value && styles.modalItemTextActive]}>
                    {t.label}
                  </Text>
                  {leaveType === t.value && <MaterialIcons name="check" size={20} color={BLUE} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

function FieldRow({ icon, label, required, error, input }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.iconTile}>
        <MaterialIcons name={icon} size={24} color={BLUE} />
      </View>
      <View style={styles.fieldCol}>
        <Text style={styles.fieldLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        {input}
        {!!error && <Text style={styles.fieldError}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BLUE, paddingTop: 60, paddingBottom: 48, paddingHorizontal: 20,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerLogo: { width: 46, height: 46, borderRadius: 10 },
  headerText: { flex: 1, minWidth: 0 },
  headerCollege: { fontSize: 19, fontWeight: '800', color: 'white' },
  headerForm: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerAvatar: {
    width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginTop: 18,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  heroImage: { width: 130, height: 150, resizeMode: 'contain' },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 21, fontWeight: '800', color: NAVY_TEXT, lineHeight: 27 },
  heroSub: { fontSize: 16, color: '#8A93A6', marginTop: 6 },
  card: {
    backgroundColor: 'white', borderRadius: 24, padding: 18,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 4,
  },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 18, alignItems: 'flex-start' },
  iconTile: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#E4EDFB',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 26,
  },
  fieldCol: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 17, fontWeight: '800', color: NAVY_TEXT, marginBottom: 8 },
  required: { color: '#EF4444' },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 6 },
  input: {
    backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0F172A',
  },
  textArea: { minHeight: 150, textAlignVertical: 'top', paddingRight: 40 },
  inputError: { borderColor: '#EF4444' },
  fakeInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  fakeInputText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  fakePlaceholder: { fontSize: 16, color: '#9CA3AF' },
  inboxIcon: { marginRight: 10 },
  fakeGrow: { flex: 1, minWidth: 0 },
  areaWrap: { position: 'relative' },
  areaIcon: { position: 'absolute', top: 14, right: 14 },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  dateCol: { flex: 1, minWidth: 0 },
  dateLabel: { fontSize: 15, fontWeight: '800', color: NAVY_TEXT, marginBottom: 8 },
  dateBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 14, gap: 6,
  },
  dateBoxText: { flex: 1, minWidth: 0, fontSize: 13, color: '#4B5563' },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: BTN_BLUE, height: 60, borderRadius: 18, marginTop: 6,
    shadowColor: BTN_BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: 'white', fontSize: 18, fontWeight: '800' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white', borderRadius: 18, width: '85%',
    maxHeight: '60%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: NAVY_TEXT },
  modalScroll: { maxHeight: 300 },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalItemActive: { backgroundColor: '#EFF4FF' },
  modalItemText: { fontSize: 15, color: '#0F172A' },
  modalItemTextActive: { color: BLUE, fontWeight: '700' },
});
