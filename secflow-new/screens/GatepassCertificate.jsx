import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Share, ActivityIndicator, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { gatepassService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { downloadAndSharePDF } from '../services/pdfService';
import QRCode from 'react-native-qrcode-svg';

export default function GatepassCertificate() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);

  useEffect(() => {
    loadRequestData();
  }, [id]);

  const loadRequestData = async () => {
    try {
      const gatepasses = await gatepassService.getMyGatepasses();
      const gatepass = gatepasses.find(g => g.id === parseInt(id)) || gatepasses[0];
      
      if (gatepass) {
        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        const issuedDate = gatepass.created_at 
          ? new Date(gatepass.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        setRequest({
          studentName: user?.name || gatepass.student_name || 'Student',
          regNo: user?.roll_no || gatepass.student_roll_no || 'N/A',
          department: user?.department || gatepass.department || 'N/A',
          year: gatepass.student_year || 'III',
          visitDate: gatepass.visit_date || '',
          outTime: gatepass.out_time || '',
          visitPlace: gatepass.visit_place || '',
          reason: gatepass.reason || 'Personal Work',
          passId: gatepass.pass_id || 'GP001',
          hodName: gatepass.hod_name || '',
          staffName: gatepass.staff_name || '',
          issuedDate: issuedDate,
          status: gatepass.status === 'hod_approved' ? 'Approved' : 'Pending',
          qrPayload: gatepass.qr_payload || '',
        });
      }
    } catch (error) {
      console.log('Error loading request:', error);
    } finally {
      setLoading(false);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!request) return;
    setDownloading(true);
    try {
      console.log('handleDownload called with request:', request);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timed out')), 30000)
      );
      
      const downloadPromise = downloadAndSharePDF('gatepass', request);
      
      await Promise.race([downloadPromise, timeoutPromise]);
    } catch (error) {
      console.error('Download error:', error);
      const errorMsg = error?.message || String(error) || 'Unknown error';
      showAlert('Error', `Failed to download: ${errorMsg}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!request) return;
    setDownloading(true);
    try {
      console.log('handleShare called with request:', request);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Share timed out')), 30000)
      );
      
      const sharePromise = downloadAndSharePDF('gatepass', request);
      
      await Promise.race([sharePromise, timeoutPromise]);
    } catch (error) {
      console.error('Share error:', error);
      const errorMsg = error?.message || String(error) || 'Unknown error';
      showAlert('Error', `Failed to share: ${errorMsg}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text>No request data found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.backButton} />
          <Text style={styles.headerTitle}>Gate Pass</Text>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <MaterialIcons name="check-circle" size={20} color="#10b77f" />
          <Text style={styles.statusText}>{request.status}</Text>
        </View>

        {/* Gate Pass Card */}
        <View style={[styles.certificateCard, { backgroundColor: '#FFFFFF' }]}>
          {/* College Header */}
          <View style={styles.certHeader}>
            <Text style={styles.instituteName}>Sengunthar Engineering College</Text>
            <Text style={styles.instituteAddress}>Kumaramangalam(PO), Tiruchengode - 637 205, Namakkal(Dt), Tamil Nadu</Text>
            <Text style={styles.instituteContact}>Phone: 04288-255716 | Email: info@scteng.co.in</Text>
          </View>
          {/* Pass ID Header */}
          <View style={styles.passIdHeader}>
            <Text style={styles.passIdLabel}>PASS ID</Text>
            <Text style={styles.passIdValue}>{request.passId}</Text>
          </View>

          {/* Student Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>STUDENT NAME</Text>
              <Text style={styles.detailValue}>{request.studentName}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>REG NO</Text>
              <Text style={styles.detailValue}>{request.regNo}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>DEPARTMENT</Text>
              <Text style={styles.detailValue}>{request.department}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>YEAR</Text>
              <Text style={styles.detailValue}>{request.year}</Text>
            </View>
            {!!request.hodName && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>APPROVED BY</Text>
                <Text style={styles.detailValue}>{request.hodName}</Text>
              </View>
            )}
            {!!request.staffName && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>STAFF APPROVED BY</Text>
                <Text style={styles.detailValue}>{request.staffName}</Text>
              </View>
            )}
          </View>

          {/* Permission Details Box */}
          <View style={[styles.permissionBox, { backgroundColor: '#1A429A' + '10' }]}>
            <View style={styles.permissionRow}>
              <View style={styles.permissionItem}>
                <MaterialIcons name="logout" size={20} color="#1A429A" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionLabel}>OUT TIME</Text>
                  <Text style={styles.permissionValue}>{request.outTime}</Text>
                </View>
              </View>
              <View style={styles.permissionItem}>
                <MaterialIcons name="login" size={20} color="#1A429A" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionLabel}>DATE</Text>
                  <Text style={styles.permissionValue}>{request.visitDate}</Text>
                </View>
              </View>
            </View>
            <View style={styles.permissionRow}>
              <View style={styles.permissionItem}>
                <MaterialIcons name="place" size={20} color="#1A429A" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionLabel}>DESTINATION</Text>
                  <Text style={styles.permissionValue}>{request.visitPlace || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.permissionItem}>
                <MaterialIcons name="description" size={20} color="#1A429A" />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionLabel}>REASON</Text>
                  <Text style={styles.permissionValue}>{request.reason}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* QR Code for gate verification */}
          {request.qrPayload ? (
            <View style={styles.qrSection}>
              <Text style={styles.qrLabel}>SCAN TO VERIFY</Text>
              <QRCode value={request.qrPayload} size={180} />
              <Text style={styles.qrHint}>Show this code at the gate</Text>
            </View>
          ) : null}

          {/* Footer with Signature */}
          <View style={styles.certFooter}>
            <View>
              <Text style={styles.footerDate}>{request.issuedDate}</Text>
              <Text style={styles.footerLabel}>Date Issued</Text>
            </View>
            <View style={styles.signatureSection}>
              <View style={styles.signature}>
                <Text style={styles.signatureText}>Warden</Text>
              </View>
              <View style={styles.signatureLine} />
              <Text style={styles.footerLabel}>Authorized Signature</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.downloadButton, { backgroundColor: '#1A429A' }]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="download" size={24} color="white" />
                <Text style={styles.downloadButtonText}>Download Gate Pass</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.shareButton, { borderColor: colors.border }]}
            onPress={handleShare}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <MaterialIcons name="share" size={20} color={colors.text} />
                <Text style={[styles.shareButtonText, { color: colors.text }]}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backButtonFull}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonFullText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1A429A',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  qrLabel: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 12,
  },
  qrHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  statusBadge: {
    position: 'absolute',
    right: 16,
    top: -12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b77f',
  },
  certificateCard: {
    borderRadius: 18,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    minHeight: 400,
  },
  certHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  instituteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A429A',
    textAlign: 'center',
    marginBottom: 4,
  },
  instituteAddress: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  instituteContact: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 3,
  },
  passIdHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  passIdLabel: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 2,
    fontWeight: '600',
  },
  passIdValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A429A',
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    width: '50%',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
  },
  permissionBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1A429A' + '20',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  permissionText: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 9,
    color: '#666',
    letterSpacing: 1,
    fontWeight: '600',
  },
  permissionValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111',
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111',
  },
  footerLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signatureSection: {
    alignItems: 'center',
  },
  signature: {
    height: 40,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureText: {
    fontSize: 14,
    fontFamily: 'cursive',
    color: '#333',
  },
  signatureLine: {
    width: 80,
    height: 1,
    backgroundColor: '#ccc',
    marginBottom: 4,
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 30,
    shadowColor: '#1A429A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 30,
    borderWidth: 2,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonFull: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonFullText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});