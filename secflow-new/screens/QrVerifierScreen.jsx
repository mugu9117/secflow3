import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Easing, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAlert } from '../context/AlertContext';
import { gatepassService } from '../services/api';

export default function QrVerifierScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null); // { valid, gatepass?, reason? }

  const popAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result?.valid) {
      popAnim.setValue(0);
      Animated.spring(popAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
    } else if (result && !result.valid) {
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, {
          toValue: 0, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true,
        }),
      ]).start();
    }
  }, [result, popAnim, shakeAnim]);

  const handleScan = async ({ data }) => {
    if (locked || verifying || !data) return;
    setLocked(true);
    setVerifying(true);
    try {
      const res = await gatepassService.verifyQr(data);
      setResult(res);
    } catch (err) {
      showAlert('Error', err?.message || 'Verification failed. Check your connection.');
      setLocked(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setLocked(false);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A429A" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.permIcon}>
          <MaterialIcons name="qr-code" size={48} color="#1A429A" />
        </View>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permText}>Allow camera access to scan gate pass QR codes.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gp = result?.gatepass;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Verify Gate Pass</Text>
        <View style={styles.headerBtn} />
      </View>

      {!result ? (
        <View style={styles.scannerWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          >
            <View style={styles.frameTop}>
              <Text style={styles.hintText}>Point the camera at a gate pass QR code</Text>
            </View>
            <View style={styles.frameCenter}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            {verifying && (
              <View style={styles.verifyingBadge}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.verifyingText}>Verifying...</Text>
              </View>
            )}
          </CameraView>
        </View>
      ) : result.valid && gp ? (
        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
          <Animated.View style={[styles.resultCard, { transform: [{ scale: popAnim }] }]}>
            <View style={[styles.statusCircle, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="verified" size={64} color="#10B981" />
            </View>
            <Text style={[styles.statusTitle, { color: '#065F46' }]}>VERIFIED</Text>
            <Text style={styles.statusSub}>This gate pass is genuine and approved.</Text>
            {!gp.first_scan && (
              <Text style={styles.rescanNote}>
                Previously verified{gp.verified_at ? ` on ${new Date(gp.verified_at).toLocaleString()}` : ''} • Scan #{gp.scan_count}
              </Text>
            )}

            <View style={styles.detailsBox}>
              <DetailRow label="STUDENT NAME" value={gp.student_name} />
              <DetailRow label="ROLL NO" value={gp.student_roll_no} />
              <DetailRow label="DEPARTMENT" value={gp.department} />
              <DetailRow label="PASS ID" value={gp.pass_id} highlight />
              <DetailRow label="DESTINATION" value={gp.visit_place || 'N/A'} />
              <DetailRow label="VISIT DATE" value={gp.visit_date} />
              <DetailRow label="OUT TIME" value={gp.out_time} />
              <DetailRow label="REASON" value={gp.reason} />
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#10B981' }]} onPress={handleScanAgain}>
              <MaterialIcons name="qr-code" size={20} color="white" />
              <Text style={styles.primaryBtnText}>Scan Next Pass</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      ) : (
        <View style={styles.resultScroll}>
          <Animated.View style={[styles.resultCard, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={[styles.statusCircle, { backgroundColor: '#FEF2F2' }]}>
              <MaterialIcons name="dangerous" size={64} color="#EF4444" />
            </View>
            <Text style={[styles.statusTitle, { color: '#991B1B' }]}>NOT VALID</Text>
            <Text style={styles.statusSub}>{result.reason || 'This QR code could not be verified.'}</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#EF4444' }]} onPress={handleScanAgain}>
              <MaterialIcons name="refresh" size={20} color="white" />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailHighlight]}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  centered: { flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: {
    backgroundColor: '#1A429A', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  permIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  permTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  permText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1A429A', height: 54, borderRadius: 14, paddingHorizontal: 32,
    marginTop: 8, width: '100%',
  },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  backLink: { marginTop: 16, padding: 8 },
  backLinkText: { fontSize: 14, fontWeight: '600', color: '#1A429A' },
  scannerWrap: { flex: 1 },
  camera: { flex: 1 },
  frameTop: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  hintText: {
    color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, overflow: 'hidden',
  },
  frameCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 56, height: 56, borderColor: '#10B981', borderRadius: 4 },
  cornerTL: { borderTopWidth: 5, borderLeftWidth: 5, marginLeft: -110, marginTop: -110 },
  cornerTR: { borderTopWidth: 5, borderRightWidth: 5, marginLeft: 54, marginTop: -110 },
  cornerBL: { borderBottomWidth: 5, borderLeftWidth: 5, marginLeft: -110, marginTop: 54 },
  cornerBR: { borderBottomWidth: 5, borderRightWidth: 5, marginLeft: 54, marginTop: 54 },
  verifyingBadge: {
    position: 'absolute', bottom: 60, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
  },
  verifyingText: { color: 'white', fontSize: 14, fontWeight: '600' },
  resultScroll: { flex: 1, backgroundColor: '#F3F4F6' },
  resultContent: { padding: 20, paddingBottom: 40 },
  resultCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6, marginTop: 12,
  },
  statusCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  statusSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
  rescanNote: { fontSize: 12, color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden', marginBottom: 8, textAlign: 'center' },
  detailsBox: {
    width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16,
    marginTop: 12, marginBottom: 16, gap: 10,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', flex: 1.4, textAlign: 'right' },
  detailHighlight: { color: '#1A429A', fontWeight: '800' },
});
