import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { leaveService, bonafideService, gatepassService } from '../services/api';

const NAVY = '#1A429A';
const BLUE = '#1A429A';

const getStatusStyle = (status) => {
  switch (status) {
    case 'pending': return { bg: '#FEF3C7', text: '#92400E', label: 'Pending' };
    case 'staff_approved': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Approved' };
    case 'staff_rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' };
    case 'hod_approved': return { bg: '#D1FAE5', text: '#065F46', label: 'Approved' };
    case 'hod_rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' };
    default: return { bg: '#F3F4F6', text: '#6B7280', label: 'Pending' };
  }
};

const TYPE_STYLE = {
  leave: { bg: '#FEE2E2', text: '#DC2626', label: 'Leave' },
  bonafide: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Bonafide' },
  gatepass: { bg: '#D1FAE5', text: '#065F46', label: 'Gatepass' },
};

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initialsOf = (name) => {
  if (!name) return 'ST';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
};

export default function StaffDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const [leaves, setLeaves] = useState([]);
  const [bonafides, setBonafides] = useState([]);
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const isHOD = user?.role === 'hod';

  const loadAll = useCallback(async () => {
    try {
      const [l, b, g] = await Promise.all([
        isHOD ? leaveService.getStaffApprovedLeaves() : leaveService.getStaffPendingLeaves(),
        isHOD ? bonafideService.getStaffApprovedBonafides() : bonafideService.getStaffPendingBonafides(),
        isHOD ? gatepassService.getStaffApprovedGatepasses() : gatepassService.getStaffPendingGatepasses(),
      ]);
      setLeaves((l || []).map((x) => ({ ...x, requestType: 'leave' })));
      setBonafides((b || []).map((x) => ({ ...x, requestType: 'bonafide' })));
      setGatepasses((g || []).map((x) => ({ ...x, requestType: 'gatepass' })));
    } catch (err) {
      console.log('Failed to load requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isHOD]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const all = [...leaves, ...bonafides, ...gatepasses].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const pending = all.filter((r) => r.status === 'pending').length;
  const approved = all.filter((r) => ['staff_approved', 'hod_approved'].includes(r.status)).length;
  const rejected = all.filter((r) => ['staff_rejected', 'hod_rejected'].includes(r.status)).length;

  const filtered = (filter === 'all' ? all : all.filter((r) => r.requestType === filter));
  const visible = showAll ? filtered.slice(0, 20) : filtered.slice(0, 5);

  const openDetail = (item) => {
    router.push({
      pathname: '/request-detail',
      params: {
        id: item.id,
        type: item.requestType,
        requestData: encodeURIComponent(JSON.stringify(item)),
      },
    });
  };

  const pickFilter = (f) => {
    setFilter(f);
    setShowAll(false);
  };

  const stats = [
    { label: 'Total Requests', value: all.length, sub: 'in queue', icon: 'description', color: '#1A429A', bg: '#EFF6FF' },
    { label: 'Pending', value: pending, sub: 'need review', icon: 'schedule', color: '#D97706', bg: '#FFFBEB' },
    { label: 'Approved', value: approved, sub: 'done', icon: 'check-circle', color: '#10B981', bg: '#ECFDF5' },
    { label: 'Rejected', value: rejected, sub: 'done', icon: 'cancel', color: '#EF4444', bg: '#FEF2F2' },
  ];

  const tabs = [
    { key: 'all', label: 'All', icon: 'description' },
    { key: 'bonafide', label: 'Bonafide', icon: 'description' },
    { key: 'gatepass', label: 'Gatepass', icon: 'confirmation-number' },
    { key: 'leave', label: 'Leave', icon: 'event-note' },
  ];

  return (
    <View style={styles.container}>
      {/* Top header in LoginScreen style */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.brandLogo} />
          <View>
            <Text style={styles.brandTitle}>SEC Flow</Text>
            <Text style={styles.brandSub}>{isHOD ? 'HOD Portal' : 'Staff Portal'}</Text>
          </View>
          <View style={styles.topRight}>
            <TouchableOpacity onPress={() => router.push('/messages')} style={styles.bellBtn}>
              <MaterialIcons name="chat-bubble-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/verify-qr')} style={styles.scanBtn} activeOpacity={0.85}>
              <MaterialIcons name="qr-code" size={22} color="#1A429A" />
              <Text style={styles.scanBtnText}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn}>
              <MaterialIcons name="notifications" size={26} color="white" />
              {pending > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pending > 9 ? '9+' : pending}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerWelcome}>
          <Text style={styles.welcomeHi}>Welcome Back,</Text>
          <Text style={styles.welcomeName}>{user?.name || (isHOD ? 'HOD' : 'Staff')}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overlapping profile + stats card */}
        <View style={styles.welcomeCard}>
          <View style={styles.profileRow}>
            <Image
              source={
                user?.gender?.toLowerCase() === 'female'
                  ? require('../assets/images/woman.png')
                  : require('../assets/images/man.png')
              }
              style={styles.profileAvatar}
            />
            <View style={styles.profileText}>
              <Text style={styles.welcomeRole}>{isHOD ? 'Head of Department' : 'Assistant Professor'}</Text>
              <Text style={styles.welcomeDept}>Department of {user?.department || 'Computer Science and Engineering'}</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <MaterialIcons name={s.icon} size={22} color={s.color} />
                </View>
                <View style={styles.statText}>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{loading ? '–' : s.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Requests</Text>
          <TouchableOpacity onPress={() => setShowAll((v) => !v)}>
            <Text style={styles.viewAll}>{showAll ? 'Show Less' : 'View All  →'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.chip, filter === t.key && styles.chipActive]}
              onPress={() => pickFilter(t.key)}
            >
              <MaterialIcons
                name={t.icon}
                size={18}
                color={filter === t.key ? 'white' : NAVY}
              />
              <Text style={[styles.chipText, filter === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {visible.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="inbox" size={44} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {loading ? 'Loading requests...' : isHOD ? 'No requests approved by staff yet' : 'No pending requests'}
            </Text>
          </View>
        ) : (
          visible.map((item) => {
            const st = getStatusStyle(item.status);
            const tp = TYPE_STYLE[item.requestType] || TYPE_STYLE.leave;
            return (
              <TouchableOpacity key={`${item.requestType}-${item.id}`} style={styles.reqCard} onPress={() => openDetail(item)} activeOpacity={0.8}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initialsOf(item.student_name)}</Text>
                </View>
                <View style={styles.reqMain}>
                  <Text style={styles.reqRoll} numberOfLines={1}>{item.student_roll_no}</Text>
                  <Text style={styles.reqName} numberOfLines={1}>{item.student_name}</Text>
                  <Text style={styles.reqMeta} numberOfLines={1}>{item.department}</Text>
                </View>
                <View style={styles.reqSide}>
                  <View style={[styles.typePill, { backgroundColor: tp.bg }]}>
                    <Text style={[styles.typePillText, { color: tp.text }]}>{tp.label}</Text>
                  </View>
                  <Text style={styles.reqDate}>{fmtDate(item.start_date || item.visit_date || item.created_at)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={NAVY} />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <NavItem icon="person" label="Profile" active={false} onPress={() => router.push('/settings')} />
        <NavItem icon="description" label="Bonafide" active={filter === 'bonafide'} onPress={() => pickFilter('bonafide')} />
        <NavItem icon="confirmation-number" label="Gatepass" active={filter === 'gatepass'} onPress={() => pickFilter('gatepass')} />
        <NavItem icon="event-note" label="Leave" active={filter === 'leave'} onPress={() => pickFilter('leave')} />
      </View>
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <MaterialIcons name={icon} size={26} color={active ? NAVY : '#9CA3AF'} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
      {active && <View style={styles.navDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  topBar: {
    backgroundColor: NAVY, paddingTop: 56, paddingBottom: 32, paddingHorizontal: 20,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  brandLogo: { width: 42, height: 42, borderRadius: 10 },
  brandTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  brandSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 'auto' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'white', paddingHorizontal: 14, height: 42, borderRadius: 12,
  },
  scanBtnText: { fontSize: 14, fontWeight: '800', color: '#1A429A' },
  bellBtn: { padding: 4 },
  badge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  topAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  headerWelcome: { marginBottom: 4 },
  welcomeHi: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  welcomeName: { fontSize: 30, fontWeight: '800', color: 'white', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 0 },
  welcomeCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 20, marginTop: 16, marginBottom: 14,
    shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08,
    shadowRadius: 16, elevation: 5,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, flexShrink: 0 },
  profileText: { flex: 1, minWidth: 0 },
  welcomeRole: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  welcomeDept: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%', flexGrow: 1, minWidth: 0, backgroundColor: '#F8FAFC', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  statIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  statText: { flex: 1, minWidth: 0 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: { width: '48%', borderRadius: 18, padding: 16, minHeight: 150, overflow: 'hidden' },
  actionDark: { backgroundColor: NAVY },
  actionLight: { backgroundColor: 'white' },
  actionIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionIconDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  actionIconLight: { backgroundColor: '#E8EEF7' },
  actionTitle: { fontSize: 15, fontWeight: '800' },
  actionSub: { fontSize: 12, marginTop: 2 },
  textWhite: { color: 'white' },
  textWhiteDim: { color: 'rgba(255,255,255,0.7)' },
  textNavy: { color: NAVY },
  textGray: { color: '#64748B' },
  actionArrow: {
    position: 'absolute', right: 12, bottom: 12, width: 34, height: 34,
    borderRadius: 17, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  viewAll: { fontSize: 13, fontWeight: '700', color: BLUE },
  chipsRow: { marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 8,
  },
  chipActive: { backgroundColor: NAVY },
  chipText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  chipTextActive: { color: 'white' },
  emptyBox: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  reqCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#1D4ED8' },
  reqMain: { flex: 1, flexShrink: 1, minWidth: 0 },
  reqRoll: { fontSize: 11, color: '#64748B' },
  reqName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  reqMeta: { fontSize: 11, color: '#94A3B8' },
  reqSide: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typePillText: { fontSize: 11, fontWeight: '700' },
  reqDate: { fontSize: 11, color: '#64748B' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  banner: {
    backgroundColor: NAVY, borderRadius: 18, padding: 16, marginTop: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  bannerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: 'white' },
  bannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  scanBtnText: { fontSize: 13, fontWeight: '800', color: NAVY },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    backgroundColor: 'white', paddingTop: 10, paddingBottom: 22,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  navItem: { flex: 1, alignItems: 'center', gap: 2 },
  navLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  navLabelActive: { color: NAVY, fontWeight: '800' },
  navDot: { width: 20, height: 3, borderRadius: 2, backgroundColor: NAVY, marginTop: 2 },
});
