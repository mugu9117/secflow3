import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAlert } from '../context/AlertContext';
import { MaterialIcons } from '@expo/vector-icons';
import { passwordResetService } from '../services/api';

const BLUE = '#1A429A';
const BLUE_DARK = '#0F2E6E';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { roll_no, maskedEmail, devOtp } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const rollNo = Array.isArray(roll_no) ? roll_no[0] : roll_no || '';

  const handleVerifyOtp = async () => {
    if (otp.trim().length < 6) {
      showAlert('Error', 'Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await passwordResetService.verifyOtp(rollNo, otp.trim());
      router.push({ pathname: '/reset-password', params: { reset_token: res.reset_token } });
    } catch (err) {
      showAlert('Error', err?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!rollNo) {
      showAlert('Error', 'Missing student ID. Please start over.');
      return;
    }
    setLoading(true);
    try {
      await passwordResetService.requestOtp(rollNo);
      showAlert('Success', 'A new OTP has been sent to your email.');
    } catch (err) {
      showAlert('Error', err?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.backBtn} />
          <Text style={styles.brandTitle}>SEC FLOW</Text>
          <View style={styles.backBtn} />
        </View>
        <Image source={require('../assets/images/forgotpasswordlogo.png')} style={styles.logoBadge} />
      </View>

      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.stepTag}>STEP 2 OF 3</Text>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit OTP sent to {maskedEmail || 'your registered email'}.
            </Text>

            {devOtp ? (
              <View style={styles.devBox}>
                <Text style={styles.devText}>Test mode — your OTP is: {devOtp}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>ONE-TIME PASSWORD</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={22} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="••••••"
                placeholderTextColor="#9CA3AF"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="send"
                onSubmitEditing={handleVerifyOtp}
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.sendButtonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
              {!loading && <MaterialIcons name="verified" size={20} color="white" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendLink} onPress={handleResend} disabled={loading}>
              <Text style={styles.resendText}>Didn't get it? Resend OTP</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <TouchableOpacity style={styles.backToLogin} onPress={() => router.replace('/')}>
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerCopyright}>© 2024 Azure Scholar SEC Flow. All rights reserved.</Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
              <Text style={styles.footerLink}>Terms of Service</Text>
              <Text style={styles.footerLink}>Help Center</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: BLUE, paddingTop: 56, paddingBottom: 72, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, padding: 4 },
  brandTitle: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: 1 },
  logoBadge: { alignSelf: 'center', marginTop: 36, width: 104, height: 104, borderRadius: 24 },
  body: { flex: 1, marginTop: -48 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  card: {
    backgroundColor: 'white', borderRadius: 28, paddingHorizontal: 28,
    paddingTop: 32, paddingBottom: 32, shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  stepTag: {
    fontSize: 12, fontWeight: '700', color: BLUE, letterSpacing: 2,
    textAlign: 'center', marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  devBox: {
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  devText: { fontSize: 14, fontWeight: '700', color: '#92400E', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', letterSpacing: 1.5, marginBottom: 10 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#6B7280',
    borderRadius: 12, paddingHorizontal: 16, height: 58, backgroundColor: 'white', marginBottom: 4,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', padding: 0 },
  otpInput: { letterSpacing: 6, fontWeight: '700' },
  sendButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: BLUE, height: 58, borderRadius: 12, marginTop: 20,
    shadowColor: BLUE_DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  sendButtonDisabled: { opacity: 0.7 },
  sendButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  resendLink: { alignSelf: 'center', marginTop: 16 },
  resendText: { fontSize: 14, fontWeight: '600', color: BLUE },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 28 },
  backToLogin: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  backToLoginText: { fontSize: 16, fontWeight: '600', color: BLUE },
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerCopyright: { fontSize: 13, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', gap: 24 },
  footerLink: { fontSize: 13, color: '#6B7280', textDecorationLine: 'underline' },
});
