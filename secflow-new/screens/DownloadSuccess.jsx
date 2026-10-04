import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { sharePdfAsync } from '../services/pdfService';
import { bonafideService } from '../services/api';
import { gatepassService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DownloadSuccess() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { type, id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [certificateData, setCertificateData] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadCertificateData();
  }, [type, id]);

  const loadCertificateData = async () => {
    try {
      let data = null;
      
      if (type === 'bonafide') {
        const bonafides = await bonafideService.getMyBonafides();
        const bonafide = bonafides.find(b => b.id === parseInt(id)) || bonafides[0];
        
        if (bonafide) {
          const issuedDate = bonafide.created_at 
            ? new Date(bonafide.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          data = {
            studentName: user?.name || bonafide.student_name || 'Student',
            regNo: user?.roll_no || bonafide.student_roll_no || 'N/A',
            department: user?.department || bonafide.department || 'N/A',
            year: 'III',
            purpose: bonafide.purpose || 'General',
            certificateType: bonafide.certificate_type || 'Bonafide',
            issuedDate: issuedDate,
            status: bonafide.status === 'hod_approved' ? 'Approved' : 'Pending',
          };
        }
      } else if (type === 'gatepass') {
        const gatepasses = await gatepassService.getMyGatepasses();
        const gatepass = gatepasses.find(g => g.id === parseInt(id)) || gatepasses[0];
        
        if (gatepass) {
          const issuedDate = gatepass.created_at 
            ? new Date(gatepass.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          data = {
            studentName: user?.name || gatepass.student_name || 'Student',
            regNo: user?.roll_no || gatepass.student_roll_no || 'N/A',
            department: user?.department || gatepass.department || 'N/A',
            year: 'III',
            visitDate: gatepass.visit_date || '',
            outTime: gatepass.out_time || '',
            visitPlace: gatepass.visit_place || '',
            reason: gatepass.reason || 'Personal Work',
            passId: gatepass.pass_id || 'GP001',
            issuedDate: issuedDate,
            status: gatepass.status === 'hod_approved' ? 'Approved' : 'Pending',
          };
        }
      }
      
      setCertificateData(data);
    } catch (error) {
      console.log('Error loading certificate:', error);
      console.log('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } finally {
      setLoading(false);
    }
  };

  const generateHTML = () => {
    if (type === 'bonafide') {
      return generateBonafideHTML(certificateData);
    } else if (type === 'gatepass') {
      return generateGatepassHTML(certificateData);
    }
    return '';
  };

  const generateBonafideHTML = (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bonafide Certificate</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; padding: 40px; color: #333; }
        .container { max-width: 700px; margin: 0 auto; border: 2px solid #1A429A; padding: 30px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px dashed #ccc; }
        .logo { width: 80px; height: 80px; background: #1A429A; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 40px; margin-bottom: 15px; }
        .institute-name { font-size: 24px; font-weight: bold; color: #1A429A; }
        .institute-address { font-size: 12px; color: #666; margin-top: 5px; }
        .cert-title { text-align: center; margin: 25px 0; text-decoration: underline; text-decoration-color: #10b77f; text-decoration-thickness: 2px; }
        .cert-title h2 { font-size: 20px; text-transform: uppercase; letter-spacing: 2px; color: #333; }
        .cert-subtitle { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
        .cert-body { font-size: 14px; line-height: 26px; text-align: justify; }
        .cert-body p { margin-bottom: 15px; }
        .bold { font-weight: bold; }
        .purpose-box { background: #10b77f15; border: 1px solid #10b77f30; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
        .purpose-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .purpose-value { font-size: 16px; font-weight: bold; color: #111; margin-top: 5px; }
        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }
        .footer-date { text-align: left; }
        .footer-date p:first-child { font-size: 14px; font-weight: bold; }
        .footer-date p:last-child { font-size: 10px; color: #999; text-transform: uppercase; }
        .signature { text-align: right; }
        .signature-line { width: 120px; height: 1px; background: #ccc; margin-bottom: 5px; margin-left: auto; }
        .signature-text { font-size: 14px; font-style: italic; }
        .signature-label { font-size: 10px; color: #999; text-transform: uppercase; }
        .status { text-align: center; margin-top: 20px; color: #10b77f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo" style="background: #1A429A; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 30px; font-weight: bold;">SEC</span>
          </div>
          <div class="institute-name">Sengunthar Engineering College</div>
          <div class="institute-address">Thiruvallur - Chennai Road, Tiruvallur - 602001</div>
        </div>
        <div class="cert-title">
          <h2>Bonafide Certificate</h2>
          <p class="cert-subtitle">Official Document</p>
        </div>
        <div class="cert-body">
          <p>This is to certify that <span class="bold">${data.studentName}</span> (Reg No: <span class="bold">${data.regNo}</span>), is a bonafide student of this institution, studying in <span class="bold">${data.year} Year</span>, <span class="bold">${data.department}</span> Department during the academic year 2025-2026.</p>
          <div class="purpose-box">
            <p class="purpose-label">Purpose</p>
            <p class="purpose-value">${data.purpose}</p>
          </div>
          <p>This certificate is issued for <span class="bold">${data.purpose}</span> purposes.</p>
        </div>
        <div class="footer">
          <div class="footer-date">
            <p>${data.issuedDate}</p>
            <p>Date Issued</p>
          </div>
          <div class="signature">
            <p class="signature-text">Principal</p>
            <div class="signature-line"></div>
            <p class="signature-label">Authorized Signatory</p>
          </div>
        </div>
        <div class="status">Status: ${data.status}</div>
      </div>
    </body>
    </html>
  `;

  const generateGatepassHTML = (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Gate Pass</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; padding: 40px; color: #333; }
        .container { max-width: 700px; margin: 0 auto; border: 2px solid #1A429A; padding: 30px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px dashed #ccc; }
        .logo { width: 80px; height: 80px; background: #1A429A; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 40px; margin-bottom: 15px; }
        .institute-name { font-size: 24px; font-weight: bold; color: #1A429A; }
        .institute-address { font-size: 12px; color: #666; margin-top: 5px; }
        .pass-id { text-align: center; margin: 20px 0; }
        .pass-id-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
        .pass-id-value { font-size: 28px; font-weight: bold; color: #1A429A; margin-top: 5px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .detail-item { }
        .detail-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
        .detail-value { font-size: 14px; font-weight: bold; color: #111; }
        .permission-box { background: #1A429A10; border: 1px solid #1A429A30; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .permission-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .permission-item { display: flex; align-items: center; gap: 10px; flex: 1; }
        .permission-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .permission-value { font-size: 13px; font-weight: bold; color: #111; }
        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; }
        .footer-date { text-align: left; }
        .footer-date p:first-child { font-size: 14px; font-weight: bold; }
        .footer-date p:last-child { font-size: 10px; color: #999; text-transform: uppercase; }
        .signature { text-align: right; }
        .signature-line { width: 120px; height: 1px; background: #ccc; margin-bottom: 5px; margin-left: auto; }
        .signature-text { font-size: 14px; font-style: italic; }
        .signature-label { font-size: 10px; color: #999; text-transform: uppercase; }
        .status { text-align: center; margin-top: 20px; color: #10b77f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo" style="background: #1A429A; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 30px; font-weight: bold;">SEC</span>
          </div>
          <div class="institute-name">Sengunthar Engineering College</div>
          <div class="institute-address">Thiruvallur - Chennai Road, Tiruvallur - 602001</div>
        </div>
        <div class="pass-id">
          <p class="pass-id-label">Pass ID</p>
          <p class="pass-id-value">${data.passId}</p>
        </div>
        <div class="details-grid">
          <div class="detail-item">
            <p class="detail-label">Student Name</p>
            <p class="detail-value">${data.studentName}</p>
          </div>
          <div class="detail-item">
            <p class="detail-label">Reg No</p>
            <p class="detail-value">${data.regNo}</p>
          </div>
          <div class="detail-item">
            <p class="detail-label">Department</p>
            <p class="detail-value">${data.department}</p>
          </div>
          <div class="detail-item">
            <p class="detail-label">Year</p>
            <p class="detail-value">${data.year}</p>
          </div>
        </div>
        <div class="permission-box">
          <div class="permission-row">
            <div class="permission-item">
              <span>&#128682;</span>
              <div>
                <p class="permission-label">Out Time</p>
                <p class="permission-value">${data.outTime}</p>
              </div>
            </div>
            <div class="permission-item">
              <span>&#128197;</span>
              <div>
                <p class="permission-label">Date</p>
                <p class="permission-value">${data.visitDate}</p>
              </div>
            </div>
          </div>
          <div class="permission-row">
            <div class="permission-item">
              <span>&#128205;</span>
              <div>
                <p class="permission-label">Destination</p>
                <p class="permission-value">${data.visitPlace || 'N/A'}</p>
              </div>
            </div>
            <div class="permission-item">
              <span>&#128221;</span>
              <div>
                <p class="permission-label">Reason</p>
                <p class="permission-value">${data.reason}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="footer">
          <div class="footer-date">
            <p>${data.issuedDate}</p>
            <p>Date Issued</p>
          </div>
          <div class="signature">
            <p class="signature-text">Warden</p>
            <div class="signature-line"></div>
            <p class="signature-label">Authorized Signature</p>
          </div>
        </div>
        <div class="status">Status: ${data.status}</div>
      </div>
    </body>
    </html>
  `;

  const handleDownload = async () => {
    if (!certificateData) return;
    setGenerating(true);
    try {
      console.log('Starting PDF generation...');
      const html = generateHTML();
      console.log('HTML generated, calling printToFileAsync...');
      
      const result = await Print.printToFileAsync({ html });
      console.log('PDF result:', result);
      
      if (!result?.uri) {
        throw new Error('Failed to generate PDF - no URI returned');
      }
      
      const isAvailable = await Sharing.isAvailableAsync();
      console.log('Sharing available:', isAvailable);
      
      if (isAvailable) {
        await sharePdfAsync(result.uri, 'Share Certificate');
      } else {
        showAlert('Success', 'Certificate saved successfully');
      }
    } catch (error) {
      console.error('Download error:', error);
      let errorMsg = 'Unknown error';
      if (error?.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (error?.toString) {
        errorMsg = error.toString();
      } else {
        try {
          errorMsg = JSON.stringify(error);
        } catch (e) {
          errorMsg = 'Unknown error';
        }
      }
      showAlert('Error', `Failed to download: ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!certificateData) return;
    setGenerating(true);
    try {
      const html = generateHTML();
      const result = await Print.printToFileAsync({ html });
      
      if (!result?.uri) {
        throw new Error('Failed to generate PDF - no URI returned');
      }
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await sharePdfAsync(result.uri, 'Share Certificate');
      }
    } catch (error) {
      console.error('Share error:', error);
      let errorMsg = 'Unknown error';
      if (error?.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (error?.toString) {
        errorMsg = error.toString();
      } else {
        try {
          errorMsg = JSON.stringify(error);
        } catch (e) {
          errorMsg = 'Unknown error';
        }
      }
      showAlert('Error', `Failed to share: ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToDashboard = () => {
    router.replace('/student/index');
  };

  const getTitle = () => {
    if (type === 'gatepass') return 'Gate Pass';
    return 'Bonafide Certificate';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1A429A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {certificateData && (
          <View style={styles.certificateCard}>
            <View style={styles.certHeader}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>SEC</Text>
              </View>
              <Text style={styles.instituteName}>Sengunthar Engineering College</Text>
              <Text style={styles.instituteAddress}>Kumaramangalam(PO), Tiruchengode - 637 205, Namakkal(Dt), Tamil Nadu</Text>
            </View>

            <View style={styles.certTitleSection}>
              <Text style={styles.certTitle}>{getTitle()}</Text>
              <Text style={styles.certSubtitle}>Official Document</Text>
            </View>

            <View style={styles.certBody}>
              {type === 'bonafide' ? (
                <>
                  <Text style={styles.certText}>
                    This is to certify that <Text style={styles.bold}>{certificateData.studentName}</Text> (Reg No: <Text style={styles.bold}>{certificateData.regNo}</Text>), is a bonafide student of this institution, studying in <Text style={styles.bold}>{certificateData.year} Year</Text>, <Text style={styles.bold}>{certificateData.department}</Text> Department.
                  </Text>
                  <View style={styles.purposeBox}>
                    <Text style={styles.purposeLabel}>Purpose</Text>
                    <Text style={styles.purposeValue}>{certificateData.purpose}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.passIdRow}>
                    <Text style={styles.passIdLabel}>PASS ID</Text>
                    <Text style={styles.passIdValue}>{certificateData.passId}</Text>
                  </View>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Student Name</Text>
                      <Text style={styles.detailValue}>{certificateData.studentName}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Reg No</Text>
                      <Text style={styles.detailValue}>{certificateData.regNo}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Department</Text>
                      <Text style={styles.detailValue}>{certificateData.department}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Year</Text>
                      <Text style={styles.detailValue}>{certificateData.year}</Text>
                    </View>
                  </View>
                  <View style={styles.permissionBox}>
                    <View style={styles.permRow}>
                      <View style={styles.permItem}>
                        <MaterialIcons name="logout" size={16} color="#1A429A" />
                        <Text style={styles.permLabel}>Out Time</Text>
                        <Text style={styles.permValue}>{certificateData.outTime}</Text>
                      </View>
                      <View style={styles.permItem}>
                        <MaterialIcons name="event" size={16} color="#1A429A" />
                        <Text style={styles.permLabel}>Date</Text>
                        <Text style={styles.permValue}>{certificateData.visitDate}</Text>
                      </View>
                    </View>
                    <View style={styles.permRow}>
                      <View style={styles.permItem}>
                        <MaterialIcons name="place" size={16} color="#1A429A" />
                        <Text style={styles.permLabel}>Destination</Text>
                        <Text style={styles.permValue}>{certificateData.visitPlace || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.certFooter}>
              <View>
                <Text style={styles.footerDate}>{certificateData.issuedDate}</Text>
                <Text style={styles.footerLabel}>Date Issued</Text>
              </View>
              <View style={styles.signatureSection}>
                <Text style={styles.signatureText}>
                  {type === 'gatepass' ? 'Warden' : 'Principal'}
                </Text>
                <View style={styles.signatureLine} />
                <Text style={styles.footerLabel}>Authorized Signatory</Text>
              </View>
            </View>

            <View style={styles.statusBadge}>
              <MaterialIcons name="verified" size={16} color="#10B981" />
              <Text style={styles.statusText}>{certificateData.status}</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.downloadBtn}
            onPress={handleDownload}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="download" size={22} color="white" />
                <Text style={styles.downloadBtnText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shareBtn}
            onPress={handleShare}
            disabled={generating}
          >
            <MaterialIcons name="share" size={20} color="#1A429A" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dashboardBtn}
            onPress={handleBackToDashboard}
          >
            <Text style={styles.dashboardBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A429A',
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
  },
  certificateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  certHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A429A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instituteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A429A',
    marginBottom: 4,
  },
  instituteAddress: {
    fontSize: 11,
    color: '#64748B',
  },
  certTitleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  certTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textDecorationLine: 'underline',
    textDecorationColor: '#10B981',
  },
  certSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  certBody: {
    marginBottom: 16,
  },
  certText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 22,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  purposeBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  purposeLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  purposeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 4,
  },
  passIdRow: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  passIdLabel: {
    fontSize: 10,
    color: '#64748B',
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
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  permissionBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1A429A20',
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  permItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permLabel: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  permValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  footerLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signatureSection: {
    alignItems: 'center',
  },
  signatureText: {
    fontSize: 14,
    fontFamily: 'cursive',
    color: '#475569',
  },
  signatureLine: {
    width: 80,
    height: 1,
    backgroundColor: '#CBD5E1',
    marginBottom: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  actions: {
    gap: 12,
  },
  downloadBtn: {
    backgroundColor: '#1A429A',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#1A429A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 2,
    borderColor: '#1A429A',
  },
  shareBtnText: {
    color: '#1A429A',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardBtn: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardBtnText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
});
