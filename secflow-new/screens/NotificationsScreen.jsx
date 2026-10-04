import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { messageService } from '../services/api';

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
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

const NotificationsScreen = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await messageService.getConversations();
      const convos = res.conversations || [];
      const mapped = convos.map((c) => ({
        id: `${c.person.type}-${c.person.id}`,
        title: c.unread > 0 ? `New message from ${c.person.name}` : c.person.name,
        message: c.last_message?.body || '',
        time: fmtTime(c.last_message?.created_at),
        unread: c.unread || 0,
        chat: c.person,
      }));
      // Unread first, then newest
      mapped.sort((a, b) => (b.unread > 0) - (a.unread > 0));
      setItems(mapped);
    } catch (e) {
      console.log('Notifications load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openChat = (item) => {
    router.push({
      pathname: '/messages/chat',
      params: {
        type: item.chat.type,
        id: item.chat.id,
        name: item.chat.name,
        meta: item.chat.meta || '',
      },
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.notifCard} onPress={() => openChat(item)} activeOpacity={0.8}>
      <View style={[styles.iconContainer, { backgroundColor: item.unread > 0 ? '#1A429A20' : '#F1F5F9' }]}>
        <MaterialIcons
          name={item.unread > 0 ? 'mark-chat-unread' : 'chat-bubble-outline'}
          size={20}
          color={item.unread > 0 ? '#1A429A' : '#94A3B8'}
        />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: '#000000' }]} numberOfLines={1}>{item.title}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread > 9 ? '9+' : item.unread}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.message, { color: '#666666' }]} numberOfLines={2}>{item.message}</Text>
        <Text style={[styles.time, { color: '#666666' }]}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-none" size={56} color="#CBD5E1" />
              <Text style={[styles.emptyText, { color: '#666666' }]}>No notifications</Text>
              <Text style={[styles.emptySubtext, { color: '#666666' }]}>You are all caught up!</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { padding: 8 },
  backText: { fontSize: 24, fontWeight: 'bold', color: '#1A429A' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000000' },
  placeholder: { width: 40 },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, marginHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifContent: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '600', flex: 1 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { fontSize: 11, fontWeight: '800', color: 'white' },
  message: { fontSize: 13, marginBottom: 4 },
  time: { fontSize: 11 },
  listContent: { paddingTop: 16, paddingBottom: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 4 },
});

export default NotificationsScreen;
