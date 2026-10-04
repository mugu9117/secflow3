import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '../context/AlertContext';
import { messageService } from '../services/api';

const BLUE = '#1A429A';

const fmtClock = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
};

const initialsOf = (name) => {
  if (!name) return '?';
  return String(name).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
};

export default function ChatScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { type, id, name, meta } = useLocalSearchParams();
  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const otherType = Array.isArray(type) ? type[0] : type;
  const otherId = Array.isArray(id) ? id[0] : id;
  const otherName = Array.isArray(name) ? name[0] : name || '';
  const otherMeta = Array.isArray(meta) ? meta[0] : meta || '';

  const load = useCallback(async (silent) => {
    try {
      const res = await messageService.getThread(otherType, otherId);
      setMe(res.me);
      setMessages(res.messages || []);
    } catch (e) {
      if (!silent) showAlert('Error', e?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [otherType, otherId, showAlert]);

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(true), 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleClearChat = () => {
    showAlert('Clear Chat', `Delete this entire conversation with ${otherName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await messageService.clearChat(otherType, otherId);
            setMessages([]);
          } catch (e) {
            showAlert('Error', e?.message || 'Failed to clear chat');
          }
        },
      },
    ]);
  };

  const openMessageMenu = (m, mine) => {
    const buttons = [{ text: 'Cancel', style: 'cancel' }];
    if (mine) {
      buttons.unshift(
        {
          text: 'Delete for Everyone',
          style: 'destructive',
          onPress: async () => {
            try {
              await messageService.deleteMessage(m.id, 'everyone');
              await load(true);
            } catch (e) {
              showAlert('Error', e?.message || 'Failed to delete message');
            }
          },
        },
        {
          text: 'Delete for Me',
          onPress: async () => {
            try {
              await messageService.deleteMessage(m.id, 'me');
              await load(true);
            } catch (e) {
              showAlert('Error', e?.message || 'Failed to delete message');
            }
          },
        },
        {
          text: 'Edit',
          onPress: () => {
            setEditingId(m.id);
            setDraft(m.body);
          },
        },
      );
    } else {
      buttons.unshift({
        text: 'Delete for Me',
        onPress: async () => {
          try {
            await messageService.deleteMessage(m.id, 'me');
            await load(true);
          } catch (e) {
            showAlert('Error', e?.message || 'Failed to delete message');
          }
        },
      });
    }
    buttons.unshift({
      text: 'Forward',
      onPress: () => {
        router.push({ pathname: '/messages', params: { forward: m.body } });
      },
    });
    showAlert('Message', 'Choose an action', buttons);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (editingId) {
        await messageService.editMessage(editingId, text);
        setEditingId(null);
      } else {
        await messageService.send(otherType, otherId, text);
      }
      setDraft('');
      await load(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      showAlert('Error', e?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(otherName)}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.headName} numberOfLines={1}>{otherName}</Text>
          {!!otherMeta && <Text style={styles.headMeta} numberOfLines={1}>{otherMeta}</Text>}
        </View>
        <TouchableOpacity onPress={handleClearChat} style={styles.menuBtn} hitSlop={12}>
          <MaterialIcons name="more-vert" size={24} color={BLUE} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={BLUE} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <MaterialIcons name="chat-bubble-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
              </View>
            ) : (
              messages.map((m) => {
                const mine = me && m.sender_type === me.type && m.sender_id === me.id;
                return (
                  <View key={m.id} style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                    {!mine && (
                      <View style={styles.miniAvatar}>
                        <Text style={styles.miniAvatarText}>{initialsOf(otherName)}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                      onLongPress={() => openMessageMenu(m, mine)}
                      delayLongPress={400}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : null]}>{m.body}</Text>
                      <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : null]}>
                        {fmtClock(m.created_at)}{m.is_edited ? ' • edited' : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {editingId && (
          <View style={styles.editBar}>
            <MaterialIcons name="edit" size={16} color={BLUE} />
            <Text style={styles.editText}>Editing message</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingId(null);
                setDraft('');
              }}
            >
              <MaterialIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 4 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#1D4ED8' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
    borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: 'white',
  },
  menuBtn: { padding: 4 },
  headText: { flex: 1, minWidth: 0 },
  headName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headMeta: { fontSize: 12, color: '#64748B', marginTop: 1 },
  body: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 20, flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  row: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', gap: 6 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  miniAvatarText: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: BLUE, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  bubbleText: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  bubbleTextMine: { color: 'white' },
  bubbleTime: { fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'white',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8,
  },
  editBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
    borderTopWidth: 1, borderTopColor: '#DBEAFE',
  },
  editText: { flex: 1, fontSize: 12, fontWeight: '600', color: BLUE },
  input: {
    flex: 1, minWidth: 0, backgroundColor: '#F1F5FA', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, color: '#0F172A', maxHeight: 110,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  sendBtnDisabled: { opacity: 0.5 },
});
