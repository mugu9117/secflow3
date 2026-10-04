import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { leaveService, bonafideService, gatepassService, userService } from '../services/api';

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [recentActivities, setRecentActivities] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const getProfileImage = () => {
    const gender = studentInfo?.gender || user?.gender || 'male';
    return gender === 'female' 
      ? require('../assets/images/woman.png') 
      : require('../assets/images/man.png');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load student info
      try {
        const info = await userService.getStudentInfo();
        setStudentInfo(info);
      } catch (err) {
        console.log('Using fallback student info');
      }

      // Load recent activities from all request types
      try {
        const [leaves, bonafides, gatepasses] = await Promise.all([
          leaveService.getMyLeaves(),
          bonafideService.getMyBonafides(),
          gatepassService.getMyGatepasses(),
        ]);

        // Combine and format activities
        const allActivities = [];
        
        leaves.slice(0, 2).forEach(l => {
          allActivities.push({
            type: 'leave',
            title: l.title || 'Leave Request',
            date: l.start_date || '',
            status: l.status,
          });
        });
        
        bonafides.slice(0, 1).forEach(b => {
          allActivities.push({
            type: 'bonafide',
            title: b.title || 'Bonafide Request',
            date: b.created_at ? new Date(b.created_at).toLocaleDateString() : '',
            status: b.status,
          });
        });

        gatepasses.slice(0, 1).forEach(g => {
          allActivities.push({
            type: 'gatepass',
            title: g.title || 'Gatepass Request',
            date: g.visit_date || '',
            status: g.status,
          });
        });

        // Sort by most recent
        allActivities.sort((a, b) => {
          if (a.date && b.date) {
            return new Date(b.date) - new Date(a.date);
          }
          return 0;
        });

        setRecentActivities(allActivities.slice(0, 4));
      } catch (err) {
        console.log('No recent activities:', err);
      }
    } catch (err) {
      console.log('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      title: 'Leave Mgmt', 
      subtitle: 'Apply for leave',
      icon: 'calendar-month',
      color: '#1A429A',
      bgColor: '#EFF6FF',
      route: '/student/leave'
    },
    { 
      title: 'Bonafide', 
      subtitle: 'Request certs',
      icon: 'verified',
      color: '#6366F1',
      bgColor: '#EEF2FF',
      route: '/student/bonafide'
    },
    {
      title: 'Gate Pass',
      subtitle: 'Weekend pass',
      icon: 'qr-code-2',
      color: '#10B981',
      bgColor: '#ECFDF5',
      route: '/student/gatepass'
    },
    {
      title: 'Messages',
      subtitle: 'Chat with staff',
      icon: 'chat-bubble-outline',
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
      route: '/messages'
    },
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { bg: '#FEF3C7', text: '#92400E', label: 'PENDING' },
      'staff_approved': { bg: '#DBEAFE', text: '#1D4ED8', label: 'STAFF APPROVED' },
      'staff_rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'STAFF REJECTED' },
      'hod_approved': { bg: '#DCFCE7', text: '#166534', label: 'APPROVED' },
      'hod_rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'REJECTED' },
      'approved': { bg: '#DCFCE7', text: '#166534', label: 'APPROVED' },
      'rejected': { bg: '#FEE2E2', text: '#991B1B', label: 'REJECTED' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return config;
  };

  const getActivityIcon = (type) => {
    const icons = {
      'leave': 'medical-services',
      'gatepass': 'directions-walk',
      'bonafide': 'badge',
      'default': 'description'
    };
    return icons[type] || icons.default;
  };

  const getUserName = () => {
    if (studentInfo?.name) return studentInfo.name;
    if (user?.name) return user.name;
    return 'Student';
  };

  const getDepartment = () => {
    if (studentInfo?.department) return studentInfo.department;
    if (user?.department) return user.department;
    return 'Computer Science';
  };

  const getCourse = () => {
    if (studentInfo?.course) return studentInfo.course;
    return 'B.Sc. ' + getDepartment();
  };

  const getSemester = () => {
    if (studentInfo?.semester) return studentInfo.semester;
    return 'Semester 4';
  };

  const getGPA = () => {
    if (studentInfo?.gpa) return studentInfo.gpa;
    return '3.8';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1A429A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.profileSection}>
              <Image source={getProfileImage()} style={styles.avatar} />
              <View>
                <Text style={styles.greeting}>Welcome,</Text>
                <Text style={styles.userName}>{getUserName()}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
              <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/notifications')}>
                <MaterialIcons name="notifications" size={24} color="white" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contextual Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue}>{getCourse()}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Semester</Text>
              <Text style={styles.infoValue}>{getSemester()}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>GPA</Text>
              <Text style={styles.infoValue}>{getGPA()}</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionCard}
                  onPress={() => router.push(action.route)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.bgColor }]}>
                    <MaterialIcons name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Activities */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activities</Text>
              <TouchableOpacity onPress={() => router.push('/student/status')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => {
                const statusConfig = getStatusBadge(activity.status);
                return (
                  <View key={index} style={[styles.activityCard, { borderLeftColor: statusConfig.text === '#166534' ? '#22C55E' : statusConfig.text === '#92400E' ? '#F59E0B' : '#EF4444' }]}>
                    <View style={styles.activityContent}>
                      <View style={styles.activityIcon}>
                        <MaterialIcons name={getActivityIcon(activity.type)} size={20} color="#6B7280" />
                      </View>
                      <View>
                        <Text style={styles.activityTitle}>{activity.title || activity.type || 'Request'}</Text>
                        <Text style={styles.activityDate}>{activity.date || 'Recent'}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.activityCard, { borderLeftColor: '#9CA3AF' }]}>
                <View style={styles.activityContent}>
                  <View style={styles.activityIcon}>
                    <MaterialIcons name="info-outline" size={20} color="#6B7280" />
                  </View>
                  <View>
                    <Text style={styles.activityTitle}>No recent requests</Text>
                    <Text style={styles.activityDate}>Submit your first request</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <MaterialIcons name="home" size={26} color="#1A429A" style={styles.navIconActive} />
          <Text style={styles.navTextActive}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/student/status')}>
          <MaterialIcons name="description" size={26} color="#6B7280" />
          <Text style={styles.navText}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/settings')}>
          <MaterialIcons name="person" size={26} color="#6B7280" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F8',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1A429A',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  greeting: {
    fontSize: 12,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  notificationBtn: {
    padding: 8,
    position: 'relative',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F87171',
    borderWidth: 1,
    borderColor: '#1A429A',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#BFDBFE',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  infoDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  mainContent: {
    paddingHorizontal: 16,
    marginTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A429A',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  activityDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navIconActive: {
    fontVariationSettings: "'FILL' 1",
  },
  navText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  navTextActive: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1A429A',
    marginTop: 4,
  },
});