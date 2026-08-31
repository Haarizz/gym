import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { toastStore, ToastItem, ToastVariant } from './toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Colors are semantic (error/success/warning/info), independent of your
 * app's per-role or per-branch theme — swap these to match your palette.
 */
const VARIANT_STYLES: Record<ToastVariant, { bg: string; fg: string; icon: string }> = {
  success: { bg: '#1F6857', fg: '#E7F6EE', icon: '✓' },
  error: { bg: '#7A2036', fg: '#FCE7ED', icon: '✕' },
  warning: { bg: '#8A5A12', fg: '#FCF0D9', icon: '!' },
  info: { bg: '#28405E', fg: '#E4ECFC', icon: 'i' },
};

interface ToastProviderProps {
  children: React.ReactNode;
  /** Distance from the bottom of the screen — pass safe-area inset + tab bar height. */
  bottomOffset?: number;
  /** How many toasts can stack at once; older ones are dropped past this. */
  maxVisible?: number;
}

export function ToastProvider({ children, bottomOffset = 32, maxVisible = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => toastStore.subscribe(setToasts), []);

  const visible = toasts.slice(-maxVisible);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View pointerEvents="box-none" style={[styles.overlay, { bottom: bottomOffset }]}>
        {visible.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </View>
    </View>
  );
}

function ToastCard({ toast: t }: { toast: ToastItem }) {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 16,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => toastStore.hide(t.id));
  }, [t.id, opacity, translateY]);

  const startTimer = useCallback(() => {
    if (t.duration <= 0) return; // 0 = sticky, no auto-dismiss
    timerRef.current = setTimeout(dismiss, t.duration);
  }, [t.duration, dismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 180,
      }),
    ]).start();
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe down to dismiss early
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => clearTimer(),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 40) {
          Animated.timing(dragY, { toValue: 120, duration: 150, useNativeDriver: true }).start(() =>
            toastStore.hide(t.id)
          );
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
          startTimer();
        }
      },
    })
  ).current;

  const style = VARIANT_STYLES[t.variant];

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          backgroundColor: style.bg,
          opacity,
          transform: [{ translateY: Animated.add(translateY, dragY) }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Pressable
        style={styles.cardInner}
        onPress={dismiss}
        onPressIn={clearTimer}
        onPressOut={startTimer}
      >
        <View style={styles.iconWrap}>
          <Text style={[styles.iconText, { color: style.fg }]}>{style.icon}</Text>
        </View>
        <View style={styles.textWrap}>
          {!!t.title && (
            <Text style={[styles.title, { color: style.fg }]} numberOfLines={1}>
              {t.title}
            </Text>
          )}
          <Text style={[styles.message, { color: style.fg }]} numberOfLines={2}>
            {t.message}
          </Text>
        </View>
        {t.action && (
          <Pressable
            hitSlop={8}
            onPress={() => {
              t.action?.onPress();
              dismiss();
            }}
            style={styles.actionBtn}
          >
            <Text style={[styles.actionText, { color: style.fg }]}>{t.action.label}</Text>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 32, 420),
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: { fontSize: 13, fontWeight: '700' },
  textWrap: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  message: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 6 },
  actionText: { fontSize: 12.5, fontWeight: '700', textDecorationLine: 'underline' },
});