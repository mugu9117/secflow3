import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '../context/AlertContext';
import { bonafideService } from '../services/api';

const BLUE = '#1A429A';
const BTN_BLUE = '#1D5BBF';
const BG = '#EDF1F7';
const NAVY_TEXT = '#0F2242';

const PURPOSES = [
  'Scholarship Application',
  'Internship Purpose',
  'Higher Studies',
  'Government Exam',
  'Other',
];

const CERTIFICATE_TYPES = [
  'Bonafide Certificate',
  'Character Certificate',
  'Income Certificate',
];

const STUDY_LEVELS = ['Graduate', 'Post Graduate'];
const CATEGORIES = ['Hosteller', 'Day Scholar'];
const COLLEGE_TYPES = ['Government', 'Management'];

const BonafideForm = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [certificateType, setCertificateType] = useState(CERTIFICATE_TYPES[0]);
  const [studyLevel, setStudyLevel] = useState(STUDY_LEVELS[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [collegeType, setCollegeType] = useState(COLLEGE_TYPES[0]);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [showPurposePicker, setShowPurposePicker] = useState(false);
  const [showCertPicker, setShowCertPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [focused, setFocused] = useState(null);

  const handleSubmit = async () => {
    let valid = true;
    if (!title.trim()) {
      setTitleError('A title is required.');
      valid = false;
    } else {
      setTitleError('');
    }
    if (!address.trim()) {
      setAddressError('Please enter your current address.');
      valid = false;
    } else {
      setAddressError('');
    }
    if (!valid) return;

    setLoading(true);
    setError('');

    try {
      await bonafideService.createBonafide({
        title: title.trim(),
        description: description.trim(),
        purpose,
        certificate_type: certificateType.toLowerCase().replace(/ /g, '_'),
        study_level: studyLevel,
        student_category: category,
        college_type: collegeType,
        address: address.trim(),
      });

      showAlert('Success', 'Bonafide application submitted successfully!', [
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
          <Image source={require('../assets/images/sec_logo.png')} style={styles.logoImage} />
          <Text style={styles.headerTitle}>Apply Bonafide</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.gearBtn} hitSlop={12}>
            <MaterialIcons name="settings" size={24} color="white" />
          </TouchableOpacity>
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
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Bonafide Certificate Request</Text>
              <Text style={styles.heroSub}>
                Request your bonafide certificate for academic and official purposes.
              </Text>
              <View style={styles.heroAccent} />
            </View>
            <Image source={require('../assets/images/bonafideavatar.png')} style={styles.heroImage} />
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Title <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputBox, focused === 'title' && styles.inputFocused, !!titleError && styles.inputError]}>
              <MaterialIcons name="description" size={20} color={BLUE} style={styles.inboxIcon} />
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={(t) => { setTitle(t); if (t.trim()) setTitleError(''); }}
                onFocus={() => setFocused('title')}
                onBlur={() => setFocused(null)}
                placeholder="e.g., Bonafide for Scholarship"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {!!titleError && <Text style={styles.fieldError}>{titleError}</Text>}

            <Text style={styles.fieldLabel}>Purpose <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.inputBox} onPress={() => setShowPurposePicker(true)}>
              <MaterialIcons name="gps-fixed" size={20} color={BLUE} style={styles.inboxIcon} />
              <Text style={[styles.boxText, styles.boxGrow]} numberOfLines={1}>{purpose}</Text>
              <MaterialIcons name="expand-more" size={24} color={NAVY_TEXT} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Certificate Type <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.inputBox} onPress={() => setShowCertPicker(true)}>
              <MaterialIcons name="badge" size={20} color={BLUE} style={styles.inboxIcon} />
              <Text style={[styles.boxText, styles.boxGrow]} numberOfLines={1}>{certificateType}</Text>
              <MaterialIcons name="expand-more" size={24} color={NAVY_TEXT} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Year of Study <Text style={styles.required}>*</Text></Text>
            <View style={styles.radioRow}>
              {STUDY_LEVELS.map((o) => (
                <TouchableOpacity key={o} style={styles.radioOpt} onPress={() => setStudyLevel(o)}>
                  <View style={[styles.radioOuter, studyLevel === o && styles.radioOuterActive]}>
                    {studyLevel === o && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel} numberOfLines={1} adjustsFontSizeToFit>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Student Category <Text style={styles.required}>*</Text></Text>
            <View style={styles.boxRow}>
              {CATEGORIES.map((o) => (
                <TouchableOpacity
                  key={o}
                  style={[styles.boxOpt, category === o && styles.boxOptActive]}
                  onPress={() => setCategory(o)}
                >
                  <View style={[styles.radioOuter, category === o && styles.radioOuterActive]}>
                    {category === o && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel} numberOfLines={1} adjustsFontSizeToFit>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>College Type <Text style={styles.required}>*</Text></Text>
            <View style={styles.boxRow}>
              {COLLEGE_TYPES.map((o) => (
                <TouchableOpacity
                  key={o}
                  style={[styles.boxOpt, collegeType === o && styles.boxOptActive]}
                  onPress={() => setCollegeType(o)}
                >
                  <View style={[styles.radioOuter, collegeType === o && styles.radioOuterActive]}>
                    {collegeType === o && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel} numberOfLines={1} adjustsFontSizeToFit>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Student Address <Text style={styles.required}>*</Text></Text>
            <View style={[styles.areaWrap, !!addressError && styles.inputError]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={(t) => { setAddress(t); if (t.trim()) setAddressError(''); }}
                onFocus={() => setFocused('address')}
                onBlur={() => setFocused(null)}
                placeholder="Enter your current address..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <MaterialIcons name="place" size={20} color={NAVY_TEXT} style={styles.areaIcon} />
            </View>
            {!!addressError && <Text style={styles.fieldError}>{addressError}</Text>}

            <Text style={styles.fieldLabel}>Additional Details <Text style={styles.optional}>(Optional)</Text></Text>
            <View style={styles.areaWrap}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                onFocus={() => setFocused('desc')}
                onBlur={() => setFocused(null)}
                placeholder="Enter any additional details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
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
      </KeyboardAvoidingView>

      {/* Purpose dropdown */}
      {showPurposePicker && (
        <PickerModal
          title="Select Purpose"
          options={PURPOSES}
          selected={purpose}
          onSelect={(v) => { setPurpose(v); setShowPurposePicker(false); }}
          onClose={() => setShowPurposePicker(false)}
        />
      )}

      {/* Certificate type dropdown */}
      {showCertPicker && (
        <PickerModal
          title="Select Certificate Type"
          options={CERTIFICATE_TYPES}
          selected={certificateType}
          onSelect={(v) => { setCertificateType(v); setShowCertPicker(false); }}
          onClose={() => setShowCertPicker(false)}
        />
      )}
    </View>
  );
}

function PickerModal({ title, options, selected, onSelect, onClose }) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScroll} nestedScrollEnabled>
          {options.map((o) => (
            <TouchableOpacity
              key={o}
              style={[styles.modalItem, selected === o && styles.modalItemActive]}
              onPress={() => onSelect(o)}
            >
              <Text style={[styles.modalItemText, selected === o && styles.modalItemTextActive]}>{o}</Text>
              {selected === o && <MaterialIcons name="check" size={20} color={BLUE} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BLUE, paddingTop: 56, paddingBottom: 40, paddingHorizontal: 18,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  logoImage: { width: 46, height: 46, borderRadius: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: 'white' },
  gearBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EAF1FC', borderRadius: 20, padding: 16, marginBottom: 14,
  },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: NAVY_TEXT, lineHeight: 28 },
  heroSub: { fontSize: 13, color: '#64748B', lineHeight: 19, marginTop: 6 },
  heroAccent: { width: 56, height: 5, borderRadius: 3, backgroundColor: BLUE, marginTop: 10 },
  heroImage: { width: 130, height: 150, resizeMode: 'contain', flexShrink: 0 },
  card: {
    backgroundColor: 'white', borderRadius: 24, padding: 18,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 4,
  },
  fieldLabel: { fontSize: 16, fontWeight: '800', color: NAVY_TEXT, marginBottom: 8, marginTop: 16 },
  required: { color: '#EF4444' },
  optional: { fontWeight: '400', color: '#64748B', fontSize: 14 },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 6, marginBottom: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 14, minHeight: 54,
  },
  inputFocused: { borderColor: BLUE, backgroundColor: '#EFF4FF' },
  inputError: { borderColor: '#EF4444' },
  inboxIcon: { marginRight: 10, flexShrink: 0 },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: '#111827', paddingVertical: 14, paddingHorizontal: 0 },
  boxText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  boxGrow: { flex: 1, minWidth: 0 },
  textArea: { minHeight: 110, textAlignVertical: 'top', paddingRight: 36 },
  areaWrap: {
    position: 'relative', backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6,
  },
  areaIcon: { position: 'absolute', top: 14, right: 14 },
  radioRow: { flexDirection: 'row', gap: 16, paddingVertical: 8 },
  radioOpt: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  boxRow: { flexDirection: 'row', gap: 10 },
  boxOpt: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#F8FAFC',
  },
  boxOptActive: { borderColor: BLUE, backgroundColor: '#EFF4FF' },
  radioOuter: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  radioOuterActive: { borderColor: BLUE },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: BLUE },
  radioLabel: { flex: 1, minWidth: 0, fontSize: 13, color: '#0F172A' },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginTop: 12, marginBottom: 4 },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: BTN_BLUE, height: 60, borderRadius: 18, marginTop: 14,
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

export default BonafideForm;
