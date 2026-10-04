import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Share, ActivityIndicator, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { leaveService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { downloadAndSharePDF } from '../services/pdfService';

export default function LeaveCertificate() {
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
      const leaves = await leaveService.getMyLeaves();
      const leave = leaves.find(l => l.id === parseInt(id)) || leaves[0];
      
      if (leave) {
        // Calculate resume date (next day after end date)
        let resumeDate = '';
        if (leave.end_date) {
          const endDate = new Date(leave.end_date);
          endDate.setDate(endDate.getDate() + 1);
          resumeDate = endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        const issuedDate = leave.created_at ? new Date(leave.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        setRequest({
          studentName: user?.name || 'Student',
          regNo: user?.roll_no || 'N/A',
          department: user?.department || 'N/A',
          year: leave.student_year || 'III',
          startDate: formatDate(leave.start_date),
          endDate: formatDate(leave.end_date),
          reason: leave.description || leave.leave_type || 'Leave',
          resumeDate: resumeDate,
          issuedDate: issuedDate,
          status: leave.status === 'hod_approved' ? 'Approved' : 'Pending',
          hodName: leave.hod_name || '',
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
    if (!request) {
      showAlert('Error', 'No certificate data found');
      return;
    }
    setDownloading(true);
    console.log('=== LEAVE CERTIFICATE DOWNLOAD ===');
    console.log('Request data:', JSON.stringify(request));
    try {
      const result = await downloadAndSharePDF('leave', request);
      console.log('Download result:', result);
    } catch (error) {
      console.error('Download error:', error);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      const errorMsg = error?.message || String(error) || 'Unknown error occurred';
      showAlert('Error', `Failed: ${errorMsg}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!request) {
      showAlert('Error', 'No certificate data found');
      return;
    }
    setDownloading(true);
    console.log('=== LEAVE CERTIFICATE SHARE ===');
    console.log('Request data:', JSON.stringify(request));
    try {
      const result = await downloadAndSharePDF('leave', request);
      console.log('Share result:', result);
    } catch (error) {
      console.error('Share error:', error);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      const errorMsg = error?.message || String(error) || 'Unknown error occurred';
      showAlert('Error', `Failed: ${errorMsg}`);
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
          <Text style={styles.headerTitle}>Leave Certificate</Text>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <MaterialIcons name="check-circle" size={20} color="#10b77f" />
          <Text style={styles.statusText}>{request.status}</Text>
        </View>

        {/* Certificate Card */}
        <View style={styles.certificateCard}>
          {/* Certificate Header */}
          <View style={styles.certHeader}>
            <View style={[styles.logoCircle, { backgroundColor: '#1A429A' + '20' }]}>
              <Text style={{ color: '#1A429A', fontSize: 20, fontWeight: 'bold' }}>SEC</Text>
            </View>
            <Text style={styles.instituteName}>Sengunthar Engineering College</Text>
            <Text style={styles.instituteAddress}>Kumaramangalam(PO), Tiruchengode - 637 205, Namakkal(Dt), Tamil Nadu</Text>
            <Text style={styles.instituteContact}>Phone: 04288-255716 | Email: info@scteng.co.in</Text>
          </View>

          {/* Certificate Title */}
          <View style={styles.certTitleSection}>
            <Text style={styles.certTitle}>Leave Approval</Text>
            <Text style={styles.certSubtitle}>Official Document</Text>
          </View>

          {/* Certificate Body */}
          <View style={styles.certBody}>
            <Text style={styles.certText}>
              This is to certify that <Text style={styles.boldText}>{request.studentName}</Text> (Reg No: <Text style={styles.boldText}>{request.regNo}</Text>), a student of the <Text style={styles.boldText}>{request.department}</Text> Department, Year <Text style={styles.boldText}>{request.year}</Text>, has been granted official leave.
            </Text>

            <View style={[styles.dateBox, { backgroundColor: '#10b77f' + '10' }]}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>From</Text>
                <Text style={styles.dateValue}>{request.startDate}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#10b77f" />
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>To</Text>
                <Text style={styles.dateValue}>{request.endDate}</Text>
              </View>
            </View>

            <Text style={styles.certText}>
              Reason for absence: <Text style={styles.italicText}>"{request.reason}"</Text>. The student is expected to resume classes on <Text style={styles.boldText}>{request.resumeDate}</Text>.
            </Text>
            {!!request.hodName && (
              <Text style={[styles.certText, { textAlign: 'center', marginTop: 12 }]}>
                Approved by: <Text style={styles.boldText}>{request.hodName}</Text> (HOD)
              </Text>
            )}
          </View>

          {/* Certificate Footer */}
          <View style={styles.certFooter}>
            <View>
              <Text style={styles.footerDate}>{request.issuedDate}</Text>
              <Text style={styles.footerLabel}>Date Issued</Text>
            </View>
            <View style={styles.signatureSection}>
              <View style={styles.signature}>
                <Text style={styles.signatureText}>Authorized</Text>
              </View>
              <View style={styles.signatureLine} />
              <Text style={styles.footerLabel}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.downloadButton, { backgroundColor: '#10b77f' }]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="download" size={24} color="white" />
                <Text style={styles.downloadButtonText}>Download Certificate</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    minHeight: 450,
  },
  certHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed',
    paddingBottom: 16,
    marginBottom: 16,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  instituteName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
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
  certTitleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  certTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textDecorationLine: 'underline',
    textDecorationColor: '#10b77f',
    textDecorationThickness: 2,
  },
  certSubtitle: {
    fontSize: 10,
    color: '#999',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  certBody: {
    flex: 1,
  },
  certText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    textAlign: 'justify',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#111',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#333',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#10b77f' + '20',
  },
  dateItem: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 4,
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 20,
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
    fontSize: 16,
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
    shadowColor: '#10b77f',
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