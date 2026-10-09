import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { NotificationGlass as G } from './notificationGlass';

interface NotificationFooterProps {
  totalCount: number;
  hasUnread: boolean;
  isMarkingAllRead?: boolean;
  onMarkAllRead: () => void;
}

const glassAvailable = isLiquidGlassAvailable();

/** Floating glass pill pinned to the bottom of the panel; the list scrolls underneath it. */
export function NotificationFooter({
  totalCount,
  hasUnread,
  isMarkingAllRead = false,
  onMarkAllRead,
}: NotificationFooterProps) {
  const disabled = !hasUnread || isMarkingAllRead;
  const Container = glassAvailable ? GlassView : View;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Container
        {...(glassAvailable ? { glassEffectStyle: 'regular' as const, colorScheme: 'light' as const } : {})}
        style={[styles.pill, !glassAvailable && styles.pillFallback]}
      >
        <Text style={styles.totalText}>{totalCount} total</Text>

        <Pressable
          style={({ pressed }) => [
            styles.markButton,
            !hasUnread && styles.markButtonDisabled,
            pressed && !disabled && styles.markButtonPressed,
          ]}
          onPress={onMarkAllRead}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
        >
          {isMarkingAllRead ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="check-circle" size={15} color={hasUnread ? '#FFFFFF' : G.ink3} />
              <Text style={[styles.markText, !hasUnread && styles.markTextDisabled]}>Mark all as read</Text>
            </>
          )}
        </Pressable>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 999,
    shadowColor: G.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pillFallback: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3B37',
  },
  markButton: {
    height: 44,
    minWidth: 150,
    paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: G.teal,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  markButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  markButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: 'transparent',
  },
  markText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  markTextDisabled: {
    color: G.ink3,
  },
});
