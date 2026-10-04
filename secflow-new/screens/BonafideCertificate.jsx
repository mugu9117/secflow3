import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Share, ActivityIndicator, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { bonafideService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { downloadAndSharePDF } from '../services/pdfService';

export default function BonafideCertificate() {
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
      const bonafides = await bonafideService.getMyBonafides();
      const bonafide = bonafides.find(b => b.id === parseInt(id)) || bonafides[0];
      
      if (bonafide) {
        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        const issuedDate = bonafide.created_at 
          ? new Date(bonafide.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        setRequest({
          studentName: user?.name || bonafide.student_name || 'Student',
          regNo: user?.roll_no || bonafide.student_roll_no || 'N/A',
          department: user?.department || bonafide.department || 'N/A',
          year: bonafide.student_year || 'III',
          purpose: bonafide.purpose || 'General',
          certificateType: bonafide.certificate_type || 'Bonafide',
          studyLevel: bonafide.study_level || '',
          studentCategory: bonafide.student_category || '',
          collegeType: bonafide.college_type || '',
          address: bonafide.address || '',
          hodName: bonafide.hod_name || '',
          issuedDate: issuedDate,
          status: bonafide.status === 'hod_approved' ? 'Approved' : 'Pending',
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
      
      const downloadPromise = downloadAndSharePDF('bonafide', request);
      
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
      
      const sharePromise = downloadAndSharePDF('bonafide', request);
      
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
          <Text style={styles.headerTitle}>Bonafide Certificate</Text>
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
            <Text style={styles.certTitle}>Bonafide Certificate</Text>
            <Text style={styles.certSubtitle}>Official Document</Text>
          </View>

          {/* Certificate Body */}
          <View style={styles.certBody}>
            <Text style={styles.certText}>
              This is to certify that <Text style={styles.boldText}>{request.studentName}</Text> (Reg No: <Text style={styles.boldText}>{request.regNo}</Text>), is a bonafide student of this institution, studying in <Text style={styles.boldText}>III Year</Text>, <Text style={styles.boldText}>{request.department}</Text> Department.
            </Text>

            <View style={[styles.dateBox, { backgroundColor: '#10b77f' + '10' }]}>
              <View style={styles.purposeItem}>
                <Text style={styles.purposeLabel}>Purpose</Text>
                <Text style={styles.purposeValue}>{request.purpose}</Text>
              </View>
            </View>

            {(request.studyLevel || request.studentCategory || request.collegeType) ? (
              <View style={styles.detailsGrid}>
                {!!request.studyLevel && (
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>STUDY LEVEL</Text>
                    <Text style={styles.detailValue}>{request.studyLevel}</Text>
                  </View>
                )}
                {!!request.studentCategory && (
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>CATEGORY</Text>
                    <Text style={styles.detailValue}>{request.studentCategory}</Text>
                  </View>
                )}
                {!!request.collegeType && (
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>COLLEGE TYPE</Text>
                    <Text style={styles.detailValue}>{request.collegeType}</Text>
                  </View>
                )}
                {!!request.address && (
                  <View style={styles.detailCellFull}>
                    <Text style={styles.detailLabel}>ADDRESS</Text>
                    <Text style={styles.detailValue}>{request.address}</Text>
                  </View>
                )}
                {!!request.hodName && (
                  <View style={styles.detailCellFull}>
                    <Text style={styles.detailLabel}>APPROVED BY</Text>
                    <Text style={styles.detailValue}>{request.hodName} (HOD)</Text>
                  </View>
                )}
              </View>
            ) : null}

            <Text style={styles.certText}>
              This certificate is issued for <Text style={styles.boldText}>{request.purpose}</Text> purposes.
            </Text>
          </View>

          {/* Certificate Footer */}
          <View style={styles.certFooter}>
            <View>
              <Text style={styles.footerDate}>{request.issuedDate}</Text>
              <Text style={styles.footerLabel}>Date Issued</Text>
            </View>
            <View style={styles.signatureSection}>
              <View style={styles.signature}>
                <Text style={styles.signatureText}>Principal</Text>
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
  dateBox: {
    flexDirection: 'column',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#10b77f' + '20',
  },
  purposeItem: {
    alignItems: 'center',
  },
  purposeLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  purposeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  detailCell: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  detailCellFull: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  detailLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
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