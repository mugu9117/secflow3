import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { leaveService, bonafideService, gatepassService } from '../services/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return { bg: '#FEF3C7', text: '#92400E', icon: 'hourglass-empty' };
    case 'staff_approved': return { bg: '#DBEAFE', text: '#1D4ED8', icon: 'check-circle' };
    case 'staff_rejected': return { bg: '#FEE2E2', text: '#991B1B', icon: 'cancel' };
    case 'hod_approved': return { bg: '#D1FAE5', text: '#065F46', icon: 'verified' };
    case 'hod_rejected': return { bg: '#FEE2E2', text: '#991B1B', icon: 'cancel' };
    default: return { bg: '#F3F4F6', text: '#6B7280', icon: 'help' };
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'staff_approved': return 'Staff Approved';
    case 'staff_rejected': return 'Staff Rejected';
    case 'hod_approved': return 'Approved';
    case 'hod_rejected': return 'Rejected';
    default: return status;
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'leave': return 'calendar-today';
    case 'bonafide': return 'verified-user';
    case 'gatepass': return 'exit-to-app';
    default: return 'description';
  }
};

export default function StatusScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [requests, setRequests] = useState({ leave: [], bonafide: [], gatepass: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [leaves, bonafides, gatepasses] = await Promise.all([
        leaveService.getMyLeaves(),
        bonafideService.getMyBonafides(),
        gatepassService.getMyGatepasses(),
      ]);

      const typedLeaves = (leaves || []).map(l => ({ ...l, requestType: 'leave' }));
      const typedBonafides = (bonafides || []).map(b => ({ ...b, requestType: 'bonafide' }));
      const typedGatepasses = (gatepasses || []).map(g => ({ ...g, requestType: 'gatepass' }));

      setRequests({
        leave: typedLeaves,
        bonafide: typedBonafides,
        gatepass: typedGatepasses,
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getFilteredRequests = () => {
    if (activeTab === 'all') {
      return [...requests.leave, ...requests.bonafide, ...requests.gatepass]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return requests[activeTab] || [];
  };

  const handleCertificatePress = (item) => {
    if (item.status !== 'hod_approved') return;
    
    if (item.requestType === 'leave') {
      router.push(`/student/leave-certificate?id=${item.id}`);
    } else if (item.requestType === 'bonafide') {
      router.push(`/student/bonafide-certificate?id=${item.id}`);
    } else if (item.requestType === 'gatepass') {
      router.push(`/student/gatepass-certificate?id=${item.id}`);
    }
  };

  const renderRequest = ({ item }) => {
    const statusColors = getStatusColor(item.status);
    const isApproved = item.status === 'hod_approved';
    
    return (
      <TouchableOpacity 
        style={styles.requestCard}
        onPress={() => handleCertificatePress(item)}
        disabled={!isApproved}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <View style={styles.typeRow}>
              <MaterialIcons name={getTypeIcon(item.requestType)} size={16} color="#6B7280" />
              <Text style={styles.requestType}>{item.requestType?.toUpperCase()}</Text>
            </View>
            <Text style={styles.requestTitle}>{item.title}</Text>
            <Text style={styles.requestDate}>
              {item.start_date || item.visit_date || ''}
              {item.end_date ? ` - ${item.end_date}` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <MaterialIcons name={statusColors.icon} size={14} color={statusColors.text} />
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.requestDesc}>{item.description}</Text>
        )}

        {(item.staff_remark || item.hod_remark) && (
          <View style={styles.remarkSection}>
            {item.staff_remark && (
              <Text style={styles.remarkText}>Staff: {item.staff_remark}</Text>
            )}
            {item.hod_remark && (
              <Text style={styles.remarkText}>HOD: {item.hod_remark}</Text>
            )}
          </View>
        )}

        {isApproved && (
          <View style={styles.certButton}>
            <MaterialIcons name="verified" size={16} color="#10b77f" />
            <Text style={styles.certButtonText}>
              {item.requestType === 'leave' && 'View Leave Certificate'}
              {item.requestType === 'bonafide' && 'View Bonafide Certificate'}
              {item.requestType === 'gatepass' && 'View Gate Pass'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredRequests = getFilteredRequests();

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A429A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
      </View>

      <FlatList
        data={filteredRequests}
        renderItem={renderRequest}
        keyExtractor={(item, index) => `${item.requestType}-${item.id}-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No requests found</Text>
            <Text style={styles.emptySubtext}>Submit a new request to see it here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000000' },
  headerLogo: { width: 36, height: 36, borderRadius: 8 },
  placeholder: { width: 40 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: '#1A429A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  requestType: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  requestDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  remarkSection: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  remarkText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  certButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#10b77f15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b77f30',
  },
  certButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b77f',
  },
});