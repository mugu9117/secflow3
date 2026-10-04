import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Dimensions } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { leaveService, bonafideService, gatepassService } from '../services/api';

const { width } = Dimensions.get('window');

export default function RequestDetailScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { id, type, requestData } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [remark, setRemark] = useState('');

  const isHOD = user?.role === 'hod';

  useEffect(() => {
    loadRequestData();
  }, []);

  const loadRequestData = async () => {
    if (requestData) {
      try {
        setRequest(JSON.parse(decodeURIComponent(requestData)));
      } catch (e) {
        console.error('Failed to parse request data:', e);
      }
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E', label: 'PENDING' };
      case 'staff_approved': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'APPROVED' };
      case 'staff_rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'REJECTED' };
      case 'hod_approved': return { bg: '#D1FAE5', text: '#065F46', label: 'APPROVED' };
      case 'hod_rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'REJECTED' };
      default: return { bg: '#F3F4F6', text: '#6B7280', label: 'PENDING' };
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'leave': return 'Leave Request';
      case 'bonafide': return 'Bonafide Certificate';
      case 'gatepass': return 'Gate Pass';
      default: return 'Request';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'leave': return 'event-busy';
      case 'bonafide': return 'description';
      case 'gatepass': return 'door-front';
      default: return 'description';
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setRemark('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (modalType === 'reject' && !remark.trim()) {
      showAlert('Error', 'Remark is required for rejection');
      return;
    }

    try {
      const service = type === 'leave' ? leaveService : type === 'bonafide' ? bonafideService : gatepassService;
      const action = modalType === 'approve'
        ? (isHOD ? 'hodApprove' : 'staffApprove')
        : (isHOD ? 'hodReject' : 'staffReject');

      const methodName = `${action}${type.charAt(0).toUpperCase() + type.slice(1)}`;
      await service[methodName](request.id, remark);

      showAlert('Success', `Request ${modalType === 'approve' ? 'approved' : 'rejected'} successfully`);
      setModalVisible(false);
      router.back();
    } catch (err) {
      showAlert('Error', 'Failed to process request');
    }
  };

  const canApprove = () => {
    if (isHOD) return request?.status === 'staff_approved';
    return request?.status === 'pending';
  };

  const getProfileImage = (gender) => {
    if (gender?.toLowerCase() === 'female') {
      return require('../assets/images/woman.png');
    }
    return require('../assets/images/man.png');
  };

  const statusColors = request ? getStatusColor(request.status) : { bg: '#F3F4F6', text: '#6B7280', label: 'LOADING' };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Request not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnLarge}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconBtn} />
          <Text style={styles.headerTitle}>Request Review</Text>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: '#1A429A' }]}>
          <View style={styles.statusBannerContent}>
            <View>
              <Text style={styles.statusBannerTitle}>{getTypeLabel(type)}</Text>
              <Text style={styles.statusBannerSubtitle}>ID: #{request.id}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                {statusColors.label}
              </Text>
            </View>
          </View>
          <MaterialIcons name="assignment-late" size={80} color="#FFFFFF" style={styles.statusIcon} />
        </View>

        {/* Student Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person" size={20} color="#1A429A" />
            <Text style={styles.cardTitle}>STUDENT INFORMATION</Text>
          </View>
          <View style={styles.studentInfo}>
            <Image source={getProfileImage(request.student_gender)} style={styles.studentAvatar} />
            <View style={styles.studentDetails}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{request.student_name}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Student ID</Text>
                  <Text style={[styles.infoValue, styles.infoValuePrimary]}>{request.student_roll_no}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Department</Text>
                  <Text style={styles.infoValue}>{request.department}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Year</Text>
                  <Text style={styles.infoValue}>{request.student_year || request.year || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Request Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={20} color="#1A429A" />
            <Text style={styles.cardTitle}>REQUEST DETAILS</Text>
          </View>

          <View style={styles.requestTypeBox}>
            <View style={styles.requestTypeIcon}>
              <MaterialIcons name={getTypeIcon(type)} size={24} color="#1A429A" />
            </View>
            <View style={styles.requestTypeInfo}>
              <Text style={styles.requestTypeLabel}>Request Type</Text>
              <Text style={styles.requestTypeValue}>{getTypeLabel(type)}</Text>
              {(request.start_date || request.visit_date) && (
                <View style={styles.dateInfo}>
                  <MaterialIcons name="calendar-month" size={14} color="#6B7280" />
                  <Text style={styles.dateText}>
                    {request.start_date && `${request.start_date} - ${request.end_date || ''}`}
                    {request.visit_date && request.visit_date}
                  </Text>
                  {request.days && (
                    <View style={styles.daysBadge}>
                      <Text style={styles.daysBadgeText}>{request.days} DAYS</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason for {type === 'leave' ? 'Absence' : 'Request'}</Text>
            <View style={styles.reasonContent}>
              <Text style={styles.reasonText}>"{request.description || request.reason || request.purpose || 'No reason provided'}"</Text>
            </View>
          </View>

          <View style={styles.extraInfo}>
            {type === 'leave' && request.leave_type && (
              <View style={styles.extraItem}>
                <MaterialIcons name="event-note" size={18} color="#6B7280" />
                <View>
                  <Text style={styles.extraLabel}>Leave Type</Text>
                  <Text style={styles.extraValue}>{request.leave_type}</Text>
                </View>
              </View>
            )}
            {request.purpose && (
              <View style={styles.extraItem}>
                <MaterialIcons name="flag" size={18} color="#6B7280" />
                <View>
                  <Text style={styles.extraLabel}>Purpose</Text>
                  <Text style={styles.extraValue}>{request.purpose}</Text>
                </View>
              </View>
            )}
            {request.visit_place && (
              <View style={styles.extraItem}>
                <MaterialIcons name="place" size={18} color="#6B7280" />
                <View>
                  <Text style={styles.extraLabel}>Destination</Text>
                  <Text style={styles.extraValue}>{request.visit_place}</Text>
                </View>
              </View>
            )}
            {request.out_time && (
              <View style={styles.extraItem}>
                <MaterialIcons name="schedule" size={18} color="#6B7280" />
                <View>
                  <Text style={styles.extraLabel}>Out Time</Text>
                  <Text style={styles.extraValue}>{request.out_time}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Approval Trail */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="verified" size={20} color="#1A429A" />
            <Text style={styles.cardTitle}>APPROVAL TRAIL</Text>
          </View>
          <View style={styles.trailRow}>
            <View style={styles.trailInfo}>
              <Text style={styles.trailLabel}>Student ID</Text>
              <Text style={[styles.trailValue, styles.infoValuePrimary]}>{request.student_roll_no || '—'}</Text>
            </View>
            <View style={styles.trailInfo}>
              <Text style={styles.trailLabel}>Student Name</Text>
              <Text style={styles.trailValue}>{request.student_name || '—'}</Text>
            </View>
          </View>
          <View style={styles.trailRow}>
            <View style={styles.trailInfo}>
              <Text style={styles.trailLabel}>Staff Reviewer ID</Text>
              <Text style={styles.trailValue}>{request.staff_id || 'Pending review'}</Text>
            </View>
            <View style={styles.trailInfo}>
              <Text style={styles.trailLabel}>Staff Remark</Text>
              <Text style={styles.trailValue}>{request.staff_remark || '—'}</Text>
            </View>
          </View>
          <View style={styles.trailRow}>
            <View style={styles.trailInfo}>
              <Text style={styles.trailLabel}>HOD Reviewer ID</Text>
              <Text style={styles.trailValue}>{request.hod_id || 'Pending review'}</Text>
            </View>
            <View style={styles.trailInfo}>
              <Text style={styles.trailLabel}>HOD Remark</Text>
              <Text style={styles.trailValue}>{request.hod_remark || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Previous Leaves Info (for leave requests) */}
        {type === 'leave' && request.previous_leaves !== undefined && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="history" size={20} color="#1A429A" />
              <Text style={styles.cardTitle}>LEAVE HISTORY</Text>
            </View>
            <View style={styles.historyBox}>
              <Text style={styles.historyLabel}>Previous Leaves This Semester</Text>
              <Text style={styles.historyValue}>{request.previous_leaves || 0} Days</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      {canApprove() && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.rejectButton} onPress={() => openModal('reject')}>
            <MaterialIcons name="close" size={20} color="#EF4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveButton} onPress={() => openModal('approve')}>
            <MaterialIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>
              {isHOD ? 'Final Approve' : 'Approve Request'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Remark Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Text>
            {modalType === 'reject' ? (
              <>
                <Text style={styles.modalSubtitle}>Please provide a reason for rejection</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter remark (required)"
                  value={remark}
                  onChangeText={setRemark}
                  multiline
                  numberOfLines={4}
                />
              </>
            ) : (
              <Text style={styles.modalSubtitle}>Are you sure you want to approve this request?</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, modalType === 'approve' ? styles.modalBtnApprove : styles.modalBtnReject]}
                onPress={handleSubmit}
              >
                <Text style={styles.modalBtnText}>
                  {modalType === 'approve' ? 'Approve' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  backBtnLarge: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#1A429A', borderRadius: 8 },
  backBtnText: { color: '#FFFFFF', fontWeight: '600' },
  header: { backgroundColor: '#1A429A', paddingTop: 48, paddingBottom: 20, paddingHorizontal: 16 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  headerLogo: { width: 36, height: 36, borderRadius: 10 },
  content: { flex: 1, paddingHorizontal: 16 },
  statusBanner: { borderRadius: 16, padding: 20, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', overflow: 'hidden' },
  statusBannerContent: { flex: 1, zIndex: 1 },
  statusBannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  statusBannerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  statusIcon: { position: 'absolute', right: -10, bottom: -20, opacity: 0.15 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1 },
  studentInfo: { flexDirection: 'row', gap: 16 },
  studentAvatar: { width: 72, height: 72, borderRadius: 16 },
  studentDetails: { flex: 1, gap: 12 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  infoValuePrimary: { color: '#1A429A' },
  requestTypeBox: { flexDirection: 'row', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },
  requestTypeIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E0EDFF', justifyContent: 'center', alignItems: 'center' },
  requestTypeInfo: { flex: 1 },
  requestTypeLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 },
  requestTypeValue: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  dateText: { fontSize: 12, color: '#6B7280' },
  daysBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  daysBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#1D4ED8' },
  reasonBox: { marginTop: 16 },
  reasonLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase', marginBottom: 8, fontWeight: '700' },
  reasonContent: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 },
  reasonText: { fontSize: 14, color: '#4B5563', fontStyle: 'italic', lineHeight: 22 },
  trailRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  trailInfo: { flex: 1, minWidth: 0 },
  trailLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4, fontWeight: '700' },
  trailValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  extraInfo: { marginTop: 16, gap: 12 },
  extraItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  extraLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase' },
  extraValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 2 },
  historyBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },
  historyLabel: { fontSize: 12, color: '#6B7280' },
  historyValue: { fontSize: 16, fontWeight: 'bold', color: '#1A429A' },
  bottomActions: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  rejectButtonText: { fontSize: 14, fontWeight: 'bold', color: '#EF4444' },
  approveButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  approveButtonText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16, fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#E5E7EB' },
  modalBtnApprove: { backgroundColor: '#10B981' },
  modalBtnReject: { backgroundColor: '#EF4444' },
  modalBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});