import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const AlertContext = createContext({ showAlert: () => {} });

const TYPE_CONFIG = {
  success: { icon: 'check-circle', color: '#10B981', bg: '#ECFDF5' },
  error: { icon: 'error', color: '#EF4444', bg: '#FEF2F2' },
  warning: { icon: 'warning', color: '#F59E0B', bg: '#FFFBEB' },
  info: { icon: 'info', color: '#1A429A', bg: '#EFF6FF' },
};

function detectType(title, buttons) {
  const t = (title || '').toLowerCase();
  if (t.includes('success') || t.includes('verified') || t.includes('sent') || t.includes('approved')) {
    return 'success';
  }
  if (t.includes('error') || t.includes('fail') || t.includes('denied') || t.includes('expired')) {
    return 'error';
  }
  if (t.includes('warning') || t.includes('logout') || t.includes('clear') || t.includes('sure')) {
    return 'warning';
  }
  return buttons && buttons.length > 1 ? 'info' : 'info';
}

export function AlertProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  const showAlert = useCallback((title, message, buttons) => {
    const normalized =
      Array.isArray(buttons) && buttons.length > 0
        ? buttons
        : [{ text: 'OK', onPress: undefined, style: 'default' }];
    setCurrent({ title, message, buttons: normalized });
  }, []);

  const dismiss = useCallback(() => setCurrent(null), []);

  useEffect(() => {
    if (current) {
      fade.setValue(0);
      scale.setValue(0.92);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [current, fade, scale]);

  const handlePress = (btn) => {
    dismiss();
    // Let the modal close first so navigation/alerts chained from
    // onPress don't fight the closing animation.
    setTimeout(() => {
      try {
        btn.onPress && btn.onPress();
      } catch (e) {
        console.log('Alert button error:', e);
      }
    }, 60);
  };

  const type = current ? detectType(current.title, current.buttons) : 'info';
  const config = TYPE_CONFIG[type];
  const multi = current && current.buttons.length > 1;
  const stacked = current && current.buttons.length > 2;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={!!current} transparent animationType="none" onRequestClose={dismiss}>
        <Animated.View style={[styles.overlay, { opacity: fade }]}>
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
              <MaterialIcons name={config.icon} size={44} color={config.color} />
            </View>
            {!!current?.title && <Text style={styles.title}>{current.title}</Text>}
            {!!current?.message && <Text style={styles.message}>{current.message}</Text>}
            <View style={multi ? (stacked ? styles.stackCol : styles.multiRow) : styles.singleCol}>
              {current?.buttons.map((btn, i) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                const solidColor = isDestructive ? '#EF4444' : config.color;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.85}
                    style={[
                      styles.btn,
                      multi && !stacked && styles.btnFlex,
                      isCancel ? styles.btnGhost : { backgroundColor: solidColor },
                    ]}
                    onPress={() => handlePress(btn)}
                  >
                    <Text style={[styles.btnText, isCancel && styles.btnGhostText]}>
                      {btn.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}

export default AlertContext;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  singleCol: {
    width: '100%',
  },
  multiRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  stackCol: {
    width: '100%',
    gap: 10,
  },
  btn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  btnFlex: {
    flex: 1,
  },
  btnGhost: {
    backgroundColor: '#F3F4F6',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  btnGhostText: {
    color: '#4B5563',
  },
});
