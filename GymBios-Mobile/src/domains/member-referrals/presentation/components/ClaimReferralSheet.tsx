import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { Text, TextInput } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { toast } from '@/shared/components/Toasts/toastStore';
import { useClaimReferral, useMyReferralClaim } from '../hooks/useMemberReferrals';

const CODE_LENGTH = 8;
const AMBER = ['#F8D977', '#F4B54A'] as const;
const TEAL = [BrandColors.teal, BrandColors.tealDark] as const;
const LINE = '#E7E8EF';
const MUTED = '#8A90A6';
const DANGER_SOFT = '#FDECEC';
const TEAL_SOFT = '#E3EFEB';

interface ClaimReferralSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Dismissing after a code was applied — e.g. take the member on to gym discovery. Defaults to onClose. */
  onApplied?: () => void;
}

/**
 * Bottom sheet that asks a newly onboarded member for the referral code of whoever
 * invited them. Shown over member home right after profile completion.
 */
export function ClaimReferralSheet({ visible, onClose, onApplied }: ClaimReferralSheetProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'enter' | 'done'>('enter');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);

  const { mutate: claimReferral, isPending } = useClaimReferral();
  // Invalidated by a successful claim, so it refetches with the referrer's name.
  // Only fetched while the sheet is up: it's tenant-scoped, so on a suspended or
  // payment-locked gym it 403s — a hidden sheet must not toast that at the user.
  const { data: myClaim } = useMyReferralClaim(visible);

  const [translateY] = useState(() => new Animated.Value(700));
  const [shakeX] = useState(() => new Animated.Value(0));
  // Keeps the Modal mounted until the close animation finishes.
  const [isMounted, setIsMounted] = useState(visible);
  // Lifts the sheet above the keyboard. KeyboardAvoidingView can't do this on
  // Android: the app is edge-to-edge and a Modal window never resizes for the IME.
  const [keyboardInset] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animateTo = (toValue: number, duration?: number) =>
      Animated.timing(keyboardInset, {
        toValue,
        duration: duration || 220,
        useNativeDriver: false,
      }).start();
    const subscriptions = [
      Keyboard.addListener(showEvent, (e) => animateTo(e.endCoordinates.height, e.duration)),
      Keyboard.addListener(hideEvent, (e) => animateTo(0, e.duration)),
    ];
    return () => subscriptions.forEach((s) => s.remove());
  }, [keyboardInset]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }).start();
      const focus = setTimeout(() => inputRef.current?.focus(), 380);
      return () => clearTimeout(focus);
    }
    Animated.timing(translateY, { toValue: 700, duration: 220, useNativeDriver: true }).start(
      ({ finished }) => finished && setIsMounted(false),
    );
  }, [visible, translateY]);

  // Any dismissal once the code is applied counts as "continue".
  const dismiss = step === 'done' && onApplied ? onApplied : onClose;
  const onCloseRef = useRef(dismiss);
  useEffect(() => {
    onCloseRef.current = dismiss;
  }, [dismiss]);

  // Drag the handle area down to dismiss.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.2) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, { toValue: 0, damping: 18, useNativeDriver: true }).start();
        }
      },
    }),
  );

  const handleChange = (value: string) => {
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH));
    setError(null);
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      toast.info(t('claimReferral.clipboardEmpty'));
      return;
    }
    handleChange(text);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setCode('');
    setError(null);
    inputRef.current?.focus();
  };

  const showError = (message: string) => {
    setError(message);
    shakeX.setValue(0);
    Animated.sequence(
      [-6, 6, -6, 6, 0].map((toValue) =>
        Animated.timing(shakeX, { toValue, duration: 70, useNativeDriver: true }),
      ),
    ).start();
  };

  const handleClaim = () => {
    if (code.length !== CODE_LENGTH || isPending) return;
    claimReferral(code, {
      onSuccess: () => {
        // Deliberately NOT calling setActiveTenant(res.tenantSlug): claiming a code
        // doesn't make the user a member of the referrer's gym, and pinning
        // X-Tenant-ID there makes the backend 403 every request as "not a member
        // of this Gym". The tenant is set once a purchase actually creates the
        // membership (see PlanPurchaseModal's purchase onSuccess).
        inputRef.current?.blur();
        setStep('done');
      },
      onError: (err: any) => {
        // apiClient rejects with ApiError (body = the parsed response), not an axios error —
        // the claim endpoint reports its reason as { error: "..." }.
        showError(err?.body?.error || err?.body?.message || t('claimReferral.invalidCode'));
      },
    });
  };

  if (!isMounted) return null;

  const referrerName = myClaim?.referrerName;
  const activeIndex = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <Modal transparent visible={isMounted} animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { paddingBottom: keyboardInset }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* warm glow at the top of the sheet */}
          <LinearGradient
            colors={['rgba(248,217,119,0.35)', 'rgba(248,217,119,0)']}
            style={styles.glow}
            pointerEvents="none"
          />
          <SafeAreaView edges={['bottom']}>
            <View {...panResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.handle} />
            </View>
            <Pressable style={styles.closeButton} onPress={dismiss} hitSlop={8}>
              <Feather name="x" size={16} color={BrandColors.textSecondary} />
            </Pressable>

            {step === 'enter' ? (
              <View style={styles.body}>
                <LinearGradient colors={AMBER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <Feather name="gift" size={32} color={BrandColors.textPrimary} />
                  </View>
                </LinearGradient>
                <Text style={styles.title}>{t('claimReferral.title')}</Text>
                <Text style={styles.lead}>{t('claimReferral.lead')}</Text>

                <Animated.View style={[styles.codeRow, { transform: [{ translateX: shakeX }] }]}>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => {
                    const char = code[i];
                    const isCurrent = isFocused && i === activeIndex;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.box,
                          !!char && styles.boxFilled,
                          isCurrent && styles.boxCurrent,
                          !!error && styles.boxError,
                        ]}
                      >
                        {char ? (
                          <Text style={styles.boxText}>{char}</Text>
                        ) : (
                          isCurrent && <View style={styles.caret} />
                        )}
                      </View>
                    );
                  })}
                  {/* Invisible input over the boxes captures typing, paste and autofill. */}
                  <TextInput
                    ref={inputRef}
                    value={code}
                    onChangeText={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onSubmitEditing={handleClaim}
                    maxLength={CODE_LENGTH}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="oneTimeCode"
                    caretHidden
                    accessibilityLabel={t('claimReferral.codeLabel')}
                    style={styles.hiddenInput}
                  />
                </Animated.View>

                <View style={styles.helper}>
                  <Text style={[styles.helperText, !!error && styles.helperError]} numberOfLines={2}>
                    {error ?? t('claimReferral.helper')}
                  </Text>
                  <View style={styles.helperActions}>
                    {code.length > 0 && (
                      <Pressable onPress={handleClear} hitSlop={8}>
                        <Text style={styles.linkMuted}>{t('claimReferral.clear')}</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={handlePaste} hitSlop={8}>
                      <Text style={styles.link}>{t('claimReferral.paste')}</Text>
                    </Pressable>
                  </View>
                </View>

                <PrimaryButton
                  label={isPending ? t('claimReferral.checking') : t('claimReferral.claim')}
                  loading={isPending}
                  disabled={code.length !== CODE_LENGTH || isPending}
                  onPress={handleClaim}
                />
                <Pressable style={styles.ghostButton} onPress={onClose}>
                  <Text style={styles.ghostText}>{t('claimReferral.noCode')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.body}>
                <View style={styles.ok}>
                  <Feather name="check" size={40} color={BrandColors.teal} />
                </View>
                <Text style={styles.title}>{t('claimReferral.appliedTitle')}</Text>
                <Text style={styles.lead}>{t('claimReferral.appliedLead')}</Text>
                <View style={styles.referrer}>
                  <LinearGradient colors={AMBER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.referrerAvatar}>
                    <Text style={styles.referrerInitial}>
                      {(referrerName?.trim()[0] ?? '?').toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.referrerText}>
                    <Text style={styles.referrerName} numberOfLines={1}>
                      {referrerName ?? t('claimReferral.yourFriend')}
                    </Text>
                    <Text style={styles.referrerSub}>{t('claimReferral.referredYou', { code })}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{t('claimReferral.linked')}</Text>
                  </View>
                </View>
                <PrimaryButton label={t('common.continue')} onPress={dismiss} />
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryShadow,
        disabled && !loading && styles.primaryDisabled,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient colors={TEAL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
        {loading && <ActivityIndicator color={BrandColors.white} size="small" />}
        <Text style={styles.primaryText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,24,34,0.38)',
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#141822',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 16,
  },
  glow: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 150,
  },
  dragArea: {
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'center',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D3D6DF',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    end: 16,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: '#F0F1F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  body: {
    paddingHorizontal: 22,
    paddingBottom: Spacing.four,
    alignItems: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    marginTop: 6,
    marginBottom: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    shadowColor: '#F4B54A',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  badgeIcon: {
    transform: [{ rotate: '6deg' }],
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  lead: {
    fontSize: 14.5,
    lineHeight: 22,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 22,
  },
  codeRow: {
    alignSelf: 'stretch',
    // Codes are Latin characters — keep them left-to-right in Arabic too.
    // `direction` is native-only; react-native-web rejects it in StyleSheet.
    ...Platform.select({ default: { direction: 'ltr' as const }, web: {} }),
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
  },
  box: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F6F9',
    borderWidth: 1.5,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: BrandColors.white,
    borderColor: '#CFD3DD',
  },
  boxCurrent: {
    borderColor: AMBER[1],
    backgroundColor: '#FFFAF0',
  },
  boxError: {
    borderColor: BrandColors.danger,
    backgroundColor: DANGER_SOFT,
  },
  boxText: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  caret: {
    width: 2,
    height: 22,
    backgroundColor: AMBER[1],
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    color: 'transparent',
  },
  helper: {
    alignSelf: 'stretch',
    minHeight: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: 18,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: MUTED,
  },
  helperError: {
    color: BrandColors.danger,
  },
  helperActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  linkMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  primaryShadow: {
    alignSelf: 'stretch',
    borderRadius: 18,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  primaryDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  primary: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.white,
  },
  ghostButton: {
    alignSelf: 'stretch',
    height: 48,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  ok: {
    width: 84,
    height: 84,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
    marginBottom: 18,
    backgroundColor: TEAL_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referrer: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 14,
    borderRadius: 18,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: 20,
  },
  referrerAvatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referrerInitial: {
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  referrerText: {
    flex: 1,
  },
  referrerName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  referrerSub: {
    fontSize: 12.5,
    color: MUTED,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: TEAL_SOFT,
  },
  tagText: {
    fontSize: TypographyScale.small,
    fontWeight: '700',
    color: BrandColors.teal,
  },
});
