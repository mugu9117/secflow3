import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAlert } from '../context/AlertContext';
import { gatepassService } from '../services/api';

const BLUE = '#1A429A';
const BTN_BLUE = '#1D5BBF';
const BG = '#EDF1F7';
const NAVY_TEXT = '#0F2242';

const REASONS = [
  'Medical Emergency',
  'Family Function',
  'Personal Work',
  'Official Work',
  'Other',
];

const fmtDateISO = (d) => d.toISOString().split('T')[0];
const fmtTimeHM = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const GatepassForm = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [visitDate, setVisitDate] = useState(new Date());
  const [outTime, setOutTime] = useState(new Date());
  const [visitPlace, setVisitPlace] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [focused, setFocused] = useState(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setTitleError('A title is required.');
      return;
    }
    setTitleError('');
    setLoading(true);
    setError('');

    try {
      await gatepassService.createGatepass({
        title: title.trim(),
        description,
        reason,
        visit_date: fmtDateISO(visitDate),
        out_time: fmtTimeHM(outTime),
        visit_place: visitPlace,
      });
      showAlert('Success', 'Gatepass application submitted successfully!', [
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
      {/* Header - LoginScreen style */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.logoImage} />
          <Text style={styles.logoTitle}>SEC Flow</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Gate Pass Request</Text>
          <Text style={styles.subtitleText}>Request your gate pass from here</Text>
        </View>
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
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>VISIT DETAILS</Text>
            <Text style={styles.fieldLabel}>Title <Text style={styles.required}>*</Text></Text>
            <View style={[styles.fakeInput, focused === 'title' && styles.inputFocused, !!titleError && styles.inputError]}>
              <MaterialIcons name="description" size={20} color={BLUE} style={styles.inboxIcon} />
              <TextInput
                style={styles.boxInput}
                value={title}
                onChangeText={(t) => { setTitle(t); if (t.trim()) setTitleError(''); }}
                onFocus={() => setFocused('title')}
                onBlur={() => setFocused(null)}
                placeholder="e.g., Weekend Gate Pass"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {!!titleError && <Text style={styles.fieldError}>{titleError}</Text>}

            <Text style={[styles.sectionLabel, styles.sectionGap]}>REASON FOR VISIT</Text>
            <Text style={styles.fieldLabel}>Reason</Text>
            <TouchableOpacity style={styles.fakeInput} onPress={() => setShowReasonPicker(true)}>
              <MaterialIcons name="list" size={20} color={BLUE} style={styles.inboxIcon} />
              <Text style={[styles.fakeInputText, styles.fakeGrow]}>{reason}</Text>
              <MaterialIcons name="expand-more" size={24} color={NAVY_TEXT} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Visit Date</Text>
            <TouchableOpacity style={styles.fakeInput} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="calendar-today" size={20} color={BLUE} style={styles.inboxIcon} />
              <Text style={[styles.fakeInputText, styles.fakeGrow]}>
                {fmtDateISO(visitDate)}
              </Text>
              <MaterialIcons name="calendar-today" size={22} color={NAVY_TEXT} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Out Time</Text>
            <TouchableOpacity style={styles.fakeInput} onPress={() => setShowTimePicker(true)}>
              <MaterialIcons name="schedule" size={20} color={BLUE} style={styles.inboxIcon} />
              <Text style={[styles.fakeInputText, styles.fakeGrow]}>{fmtTimeHM(outTime)}</Text>
              <MaterialIcons name="schedule" size={22} color={NAVY_TEXT} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Visit Place (Optional)</Text>
            <View style={[styles.fakeInput, focused === 'place' && styles.inputFocused]}>
              <MaterialIcons name="place" size={20} color={BLUE} style={styles.inboxIcon} />
              <TextInput
                style={styles.boxInput}
                value={visitPlace}
                onChangeText={setVisitPlace}
                onFocus={() => setFocused('place')}
                onBlur={() => setFocused(null)}
                placeholder="e.g., Home, Hospital"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <View style={styles.areaWrap}>
              <TextInput
                style={[styles.boxInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                onFocus={() => setFocused('desc')}
                onBlur={() => setFocused(null)}
                placeholder="Enter any additional details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <MaterialIcons name="description" size={20} color={NAVY_TEXT} style={styles.areaIcon} />
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

        {showDatePicker && (
          <DateTimePicker
            value={visitDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onValueChange={(event, d) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (d) setVisitDate(d);
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={outTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(event, d) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (d) setOutTime(d);
            }}
            onDismiss={() => setShowTimePicker(false)}
          />
        )}

        {/* Reason dropdown */}
        {showReasonPicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Reason</Text>
                <TouchableOpacity onPress={() => setShowReasonPicker(false)}>
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll} nestedScrollEnabled>
                {REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.modalItem, reason === r && styles.modalItemActive]}
                    onPress={() => {
                      setReason(r);
                      setShowReasonPicker(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, reason === r && styles.modalItemTextActive]}>
                      {r}
                    </Text>
                    {reason === r && <MaterialIcons name="check" size={20} color={BLUE} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BLUE, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  backBtn: { padding: 4 },
  logoImage: { width: 40, height: 40, borderRadius: 8 },
  logoTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  headerContent: { marginBottom: 10 },
  welcomeText: { color: 'white', fontSize: 34, fontWeight: '800', marginBottom: 8 },
  subtitleText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 8 },
  introBlock: { marginBottom: 16, paddingTop: 4 },
  pill: {
    alignSelf: 'flex-start', backgroundColor: '#DCE7FA',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, marginBottom: 10,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: BLUE, letterSpacing: 2 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: NAVY_TEXT, marginBottom: 6 },
  pageSub: { fontSize: 14, color: '#64748B', lineHeight: 21 },
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
  input: {
    backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0F172A',
  },
  textArea: { minHeight: 130, textAlignVertical: 'top', paddingVertical: 14, paddingRight: 36 },
  fakeInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  fakeInputText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  fakeGrow: { flex: 1, minWidth: 0 },
  inboxIcon: { marginRight: 10, flexShrink: 0 },
  boxInput: { flex: 1, minWidth: 0, fontSize: 15, color: '#0F172A', paddingVertical: 0, paddingHorizontal: 0 },
  areaWrap: {
    position: 'relative', backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6,
  },
  areaIcon: { position: 'absolute', top: 14, right: 14 },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: BLUE, letterSpacing: 2, marginBottom: 12,
  },
  sectionGap: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EDF1F7' },
  required: { color: '#EF4444' },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 6 },
  inputFocused: { borderColor: BLUE, backgroundColor: '#EFF4FF' },
  inputError: { borderColor: '#EF4444' },
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
    maxHeight: '70%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: NAVY_TEXT },
  modalScroll: { maxHeight: 320 },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalItemActive: { backgroundColor: '#EFF4FF' },
  modalItemText: { fontSize: 15, color: '#0F172A' },
  modalItemTextActive: { color: BLUE, fontWeight: '700' },
});

export default GatepassForm;
