import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from './Typography';

interface FormSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned below the scrolling body (e.g. Cancel / Save buttons). */
  footer?: ReactNode;
}

/**
 * Bottom sheet for forms. The modal draws edge-to-edge (behind the system bars), and the
 * pinned footer pads itself past the Android navigation bar / iOS home indicator, so the
 * action buttons are never clipped. The sheet also lifts above the keyboard.
 */
export function FormSheet({
  visible,
  title,
  subtitle,
  icon,
  closeLabel,
  onClose,
  children,
  footer,
}: FormSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={closeLabel} />

          <View style={[styles.sheet, { backgroundColor: theme.background, marginTop: insets.top + Spacing.four }]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              {icon ? (
                <View style={[styles.headerIcon, { backgroundColor: `${BrandColors.teal}1f` }]}>
                  <Feather name={icon} size={18} color={BrandColors.teal} />
                </View>
              ) : null}
              <View style={styles.headerText}>
                <Typography variant="subtitle" style={{ color: theme.text }}>
                  {title}
                </Typography>
                {subtitle ? (
                  <Typography variant="caption" color="textSecondary">
                    {subtitle}
                  </Typography>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
              >
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={[
                styles.bodyContent,
                !footer && { paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.three },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor: theme.border,
                    paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two,
                  },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Small uppercase section heading with a teal dot, for grouping fields in a FormSheet. */
export function FormSheetSection({ label }: { label: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionDot, { backgroundColor: BrandColors.teal }]} />
      <Typography variant="caption" color="textSecondary" style={styles.sectionTitle}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
