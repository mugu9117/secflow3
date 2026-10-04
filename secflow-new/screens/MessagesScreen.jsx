import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useAlert } from '../context/AlertContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../services/api';

const BLUE = '#1A429A';

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${suffix}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const initialsOf = (name) => {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
};

export default function MessagesScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { forward } = useLocalSearchParams();
  const forwarding = typeof forward === 'string' && forward.length > 0
    ? forward
    : (Array.isArray(forward) && forward.length > 0 ? forward[0] : '');
  const { user } = useAuth();
  const [tab, setTab] = useState('chats');
  const [chats, setChats] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isStudent = user?.role === 'student';

  const loadChats = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await messageService.getConversations();
      setChats(res.conversations || []);
    } catch (e) {
      console.log('Chats load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadDirectory = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await messageService.getDirectory();
      setDirectory(res || []);
    } catch (e) {
      console.log('Directory load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'chats') {
      loadChats(false);
      const t = setInterval(() => loadChats(true), 5000);
      return () => clearInterval(t);
    }
    loadDirectory(false);
  }, [tab, loadChats, loadDirectory]);

  const onRefresh = () => {
    setRefreshing(true);
    if (tab === 'chats') loadChats(true);
    else loadDirectory(true);
  };

  const openChat = async (person) => {
    if (forwarding) {
      try {
        await messageService.send(person.type, person.id, forwarding);
        showAlert('Success', `Message forwarded to ${person.name}.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (e) {
        showAlert('Error', e?.message || 'Failed to forward message');
      }
      return;
    }
    router.push({
      pathname: '/messages/chat',
      params: { type: person.type, id: person.id, name: person.name, meta: person.meta || '' },
    });
  };

  const q = query.trim().toLowerCase();
  const baseDir = q
    ? directory.filter((p) => (p.name || '').toLowerCase().includes(q))
    : directory;

  // HOD sees all years, grouped with a year selector (Year 1-4)
  const isHod = user?.role === 'hod';
  const YEAR_ORDER = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
  const dirYears = isHod
    ? [...YEAR_ORDER,
       ...(directory.some((p) => !p.year || !YEAR_ORDER.includes(p.year)) ? ['Unassigned'] : [])]
    : [];
  const dirData = (() => {
    if (!isHod) return baseDir.map((p) => ({ kind: 'person', ...p }));
    const groups = {};
    baseDir.forEach((p) => {
      const y = p.year || 'Unassigned';
      (groups[y] = groups[y] || []).push(p);
    });
    const years = selectedYear === 'all'
      ? [...YEAR_ORDER.filter((y) => groups[y]), ...Object.keys(groups).filter((y) => !YEAR_ORDER.includes(y)).sort()]
      : [selectedYear];
    const out = [];
    years.forEach((y) => {
      if (groups[y]?.length) {
        out.push({ kind: 'header', year: y, count: groups[y].length });
        groups[y].forEach((p) => out.push({ kind: 'person', ...p }));
      }
    });
    return out;
  })();

  const renderChat = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item.person)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(item.person.name)}</Text>
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{item.person.name}</Text>
          <Text style={styles.rowTime}>{fmtTime(item.last_message?.created_at)}</Text>
        </View>
        <View style={styles.rowTop}>
          <Text style={styles.rowPreview} numberOfLines={1}>{item.last_message?.body || ''}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread > 9 ? '9+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDirectoryItem = ({ item }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.year}</Text>
          <Text style={styles.sectionCount}>{item.count} student{item.count === 1 ? '' : 's'}</Text>
        </View>
      );
    }
    return renderPerson({ item });
  };

  const renderPerson = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(item.name)}</Text>
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.rowPreview} numberOfLines={1}>{item.meta || item.id}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={BLUE} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Image source={require('../assets/images/sec_logo.png')} style={styles.headerLogo} />
        </View>
      </View>

      {forwarding ? (
        <View style={styles.forwardBar}>
          <MaterialIcons name="forward" size={18} color={BLUE} />
          <Text style={styles.forwardText} numberOfLines={1}>Forward to...</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.tabs}>
        {['chats', 'directory'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chats' ? 'Chats' : isStudent ? 'Staff' : 'Students'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'directory' && isHod && (
        <View style={styles.segWrap}>
          <View style={styles.segRow}>
            {['all', ...dirYears].map((y) => (
              <TouchableOpacity
                key={y}
                style={[styles.segBtn, selectedYear === y && styles.segBtnActive]}
                onPress={() => setSelectedYear(y)}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.segText, selectedYear === y && styles.segTextActive]}
                >
                  {y === 'all' ? 'All Years' : y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {tab === 'directory' && (
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {tab === 'chats' ? (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item) => `${item.person.type}-${item.person.id}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <MaterialIcons name="chat-bubble-outline" size={56} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySub}>Open the directory tab to start chatting</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={dirData}
          renderItem={renderDirectoryItem}
          keyExtractor={(item) => item.kind === 'header' ? `h-${item.year}` : `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <MaterialIcons name="search-off" size={56} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>
                  {q
                    ? 'No match found'
                    : isHod && selectedYear !== 'all'
                      ? `No students registered in ${selectedYear}`
                      : 'Nobody to show yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {q
                    ? 'Try a different name'
                    : isHod && selectedYear !== 'all'
                      ? 'Try another year'
                      : isStudent ? 'No staff found' : 'No students found'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    backgroundColor: BLUE, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 18,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: 'white' },
  headerLogo: { width: 36, height: 36, borderRadius: 8 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, paddingVertical: 12,
  },
  newBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  forwardBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
    marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, gap: 8,
  },
  forwardText: { flex: 1, fontSize: 13, fontWeight: '700', color: BLUE },
  tab: {
    flex: 1, alignItems: 'center', backgroundColor: 'white',
    paddingVertical: 12, borderRadius: 12,
  },
  tabActive: { backgroundColor: BLUE },
  tabText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: 'white' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 14, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 12 },
  segWrap: { paddingHorizontal: 16, paddingTop: 12 },
  segRow: {
    flexDirection: 'row', backgroundColor: '#F1F3F5', borderRadius: 12,
    padding: 4, borderWidth: 1, borderColor: '#E5E7EB',
  },
  segBtn: { flex: 1, minWidth: 0, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segBtnActive: {
    backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
  },
  segText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  segTextActive: { color: '#1A429A', fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 4, paddingTop: 10, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: BLUE, letterSpacing: 1 },
  sectionCount: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 16, padding: 12, marginBottom: 10, gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#1D4ED8' },
  rowMain: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1 },
  rowTime: { fontSize: 11, color: '#94A3B8', flexShrink: 0 },
  rowPreview: { fontSize: 13, color: '#64748B', flex: 1, marginTop: 2 },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, flexShrink: 0,
  },
  unreadText: { fontSize: 11, fontWeight: '800', color: 'white' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#94A3B8' },
});
