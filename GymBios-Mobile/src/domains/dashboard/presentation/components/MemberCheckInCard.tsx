import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { formatDate } from '@/core/i18n/format';
import {
  checkInKeys,
  useEndWorkout,
  useMemberCheckIn,
  useMemberCheckInStatus,
  useMemberCheckOut,
  useStartWorkout,
  useSubmitWorkoutFeedback,
} from '@/domains/checkIn';
import { useMemberDashboard, dashboardKeys } from '@/domains/dashboard';
import { PostWorkoutFeedbackSheet } from '@/domains/checkIn/presentation/components/members/PostWorkoutFeedbackSheet';
import type { MemberCheckInStatus, MemberFeedbackPayload } from '@/domains/checkIn/domain/MemberFeedback';

import { toast } from '@/shared/components/Toasts/toastStore';

// Green glass recipe from reference `.checkin-glass` — deep teal gradient
const GREEN_START  = 'rgba(27,90,76,0.88)';
const GREEN_END    = 'rgba(18,63,53,0.72)';
// Checked-in = active session — warm amber/gold glass
const ACTIVE_START = 'rgba(199,130,30,0.88)';
const ACTIVE_END   = 'rgba(180,110,10,0.72)';

export function MemberCheckInCard() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: dashboardData } = useMemberDashboard();
  const { data: statusData, refetch: refetchStatus } = useMemberCheckInStatus();

  const checkInMutation = useMemberCheckIn();
  const checkOutMutation = useMemberCheckOut();
  const startWorkoutMutation = useStartWorkout();
  const endWorkoutMutation = useEndWorkout();
  const feedbackMutation = useSubmitWorkoutFeedback();

  const [overrideCheckedIn, setOverrideCheckedIn] = useState<boolean | null>(null);
  const [feedbackSheetVisible, setFeedbackSheetVisible] = useState(false);
  const [completedAttendanceId, setCompletedAttendanceId] = useState<number | null>(null);

  // Sync override when server query status updates
  useEffect(() => {
    if (statusData?.checkedIn !== undefined) {
      setOverrideCheckedIn(null);
    }
  }, [statusData?.checkedIn]);

  const isCheckedIn =
    overrideCheckedIn !== null
      ? overrideCheckedIn
      : Boolean(statusData?.checkedIn ?? dashboardData?.checkInStatus?.checkedIn);

  const activeAttendanceId =
    statusData?.attendanceId ??
    statusData?.attendance_id ??
    dashboardData?.checkInStatus?.activeAttendanceId ??
    completedAttendanceId ??
    null;

  const isActiveMembership = dashboardData?.memberInfo?.isActive ?? false;

  // Plan quota / daily cap / cooldown — only relevant while not checked in.
  const blockedReason = !isCheckedIn && statusData?.canCheckIn === false ? statusData.blockedReason : null;
  const isBlocked = !!blockedReason;
  const usageLabel = formatUsage(t, statusData);

  // A visit from an earlier day that was never checked out — checking in closes it.
  const unclosedCheckInTime = !isCheckedIn ? statusData?.unclosedCheckInTime ?? null : null;

  const checkInTime = isCheckedIn
    ? statusData?.checkInTime ?? dashboardData?.checkInStatus?.checkInTime ?? null
    : null;
  const workoutStartTime = isCheckedIn ? statusData?.workoutStartTime ?? null : null;
  const workoutEndTime = isCheckedIn ? statusData?.workoutEndTime ?? null : null;
  const isWorkoutRunning = !!workoutStartTime && !workoutEndTime;
  const isWorkoutDone = !!workoutStartTime && !!workoutEndTime;

  const visitSeconds = useElapsedSeconds(checkInTime, null);
  const workoutSeconds = useElapsedSeconds(workoutStartTime, workoutEndTime);

  // Re-check status when the cooldown ends so the card unlocks on its own.
  const nextAllowedAt = statusData?.nextCheckInAllowedAt;
  useEffect(() => {
    if (!nextAllowedAt) return;
    const ms = new Date(nextAllowedAt).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return;
    const timer = setTimeout(() => refetchStatus(), Math.min(ms + 1000, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [nextAllowedAt, refetchStatus]);

  const isActionPending =
    checkInMutation.isPending || checkOutMutation.isPending;
  const isWorkoutPending = startWorkoutMutation.isPending || endWorkoutMutation.isPending;

  const runCheckIn = () => {
    checkInMutation.mutate(undefined, {
      onSuccess: (resp) => {
        setOverrideCheckedIn(true);
        const attId = resp?.attendanceId ?? resp?.attendance_id;
        if (attId) setCompletedAttendanceId(attId);
        toast.success(t('memberHome.checkIn.successMessage'), { title: t('memberHome.checkIn.successTitle') });
      },
      onError: (err: any) => {
        const status = err?.status || err?.response?.status;
        const msg =
          err?.response?.data?.message || err?.message || t('memberHome.checkIn.checkInFailed');

        // 409 is also used for limit/cooldown refusals, so match on the message.
        if (typeof msg === 'string' && msg.toLowerCase().includes('already checked in')) {
          setOverrideCheckedIn(true);
          queryClient.invalidateQueries({ queryKey: checkInKeys.all });
          queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
          toast.info(t('memberHome.checkIn.alreadyMessage'), {
            title: t('memberHome.checkIn.alreadyTitle'),
          });
        } else {
          if (status === 409) queryClient.invalidateQueries({ queryKey: checkInKeys.all });
          toast.info(msg, { title: t('memberHome.checkIn.checkInNoticeTitle') });
        }
      },
    });
  };

  const handleCheckIn = () => {
    if (isActionPending) return;
    if (isBlocked) {
      toast.info(blockedReason!, { title: t('memberHome.checkIn.unavailableTitle') });
      return;
    }
    if (unclosedCheckInTime) {
      // Warn before the backend closes the forgotten visit.
      Alert.alert(
        t('memberHome.checkIn.unclosedTitle'),
        t('memberHome.checkIn.unclosedConfirm', {
          date: formatDate(unclosedCheckInTime, 'PP'),
          time: formatDate(unclosedCheckInTime, 'p'),
          closeTime: statusData?.unclosedAutoCloseTime ? formatDate(statusData.unclosedAutoCloseTime, 'p') : '',
        }),
        [
          { text: t('memberHome.checkIn.cancel'), style: 'cancel' },
          { text: t('memberHome.checkIn.checkInNow'), onPress: runCheckIn },
        ],
      );
      return;
    }
    runCheckIn();
  };

  const handleCheckOut = () => {
    if (isActionPending) return;
    checkOutMutation.mutate(undefined, {
      onSuccess: (resp) => {
        setOverrideCheckedIn(false);
        const attId =
          resp?.attendanceId ??
          resp?.attendance_id ??
          activeAttendanceId ??
          completedAttendanceId;
        if (attId) setCompletedAttendanceId(attId);
        setFeedbackSheetVisible(true);
      },
      onError: (err: any) => {
        const status = err?.status || err?.response?.status;
        const msg =
          err?.response?.data?.message || err?.message || t('memberHome.checkIn.checkOutFailed');

        if (
          status === 409 ||
          (typeof msg === 'string' && msg.toLowerCase().includes('no active check-in'))
        ) {
          setOverrideCheckedIn(false);
          queryClient.invalidateQueries({ queryKey: checkInKeys.all });
          queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
        }
        toast.info(msg, { title: t('memberHome.checkIn.checkOutNoticeTitle') });
      },
    });
  };

  const handleWorkout = () => {
    if (isWorkoutPending || isWorkoutDone) return;
    const mutation = isWorkoutRunning ? endWorkoutMutation : startWorkoutMutation;
    mutation.mutate(undefined, {
      onError: () => {
        // The global toast already shows the reason; resync in case the visit changed.
        queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      },
    });
  };

  const handleFeedbackSubmit = (payload: MemberFeedbackPayload) => {
    const finalPayload: MemberFeedbackPayload = {
      ...payload,
      attendanceId: payload.attendanceId || completedAttendanceId || activeAttendanceId || 0,
      attendance_id: payload.attendanceId || completedAttendanceId || activeAttendanceId || 0,
    };

    feedbackMutation.mutate(finalPayload, {
      onSuccess: () => {
        setFeedbackSheetVisible(false);
        setCompletedAttendanceId(null);
        setOverrideCheckedIn(false);
        queryClient.invalidateQueries({ queryKey: checkInKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          t('memberHome.checkIn.feedbackFailed');
        toast.error(msg, { title: t('memberHome.checkIn.feedbackErrorTitle') });
      },
    });
  };

  const feedbackSheet = feedbackSheetVisible && (
    <PostWorkoutFeedbackSheet
      visible={feedbackSheetVisible}
      attendanceId={completedAttendanceId || activeAttendanceId || 0}
      isSubmitting={feedbackMutation.isPending}
      onSubmit={handleFeedbackSubmit}
      onClose={() => setFeedbackSheetVisible(false)}
    />
  );

  // ── Checked in: visit timer + workout timer + check-out ────────────────────
  if (isCheckedIn) {
    const workoutLabel = isWorkoutRunning
      ? t('memberHome.checkIn.endWorkout')
      : isWorkoutDone
        ? t('memberHome.checkIn.workoutDone')
        : t('memberHome.checkIn.startWorkout');

    return (
      <>
        <View style={styles.container}>
          <LinearGradient
            colors={[ACTIVE_START, ACTIVE_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.innerHighlight} />
          <View style={styles.activeBody}>
            <View style={styles.activeHeader}>
              <View style={styles.iconBox}>
                <Feather name="clock" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{t('memberHome.checkIn.checkedInTitle')}</Text>
                <Text style={styles.subtitle}>
                  {checkInTime
                    ? t('memberHome.checkIn.checkedInSince', { time: formatDate(checkInTime, 'p') })
                    : t('memberHome.checkIn.inProgress')}
                </Text>
              </View>
              <Text
                style={styles.visitTimer}
                accessibilityLabel={t('memberHome.checkIn.visitTimerA11y', { duration: formatElapsed(visitSeconds) })}
              >
                {formatElapsed(visitSeconds)}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={handleWorkout}
                disabled={isWorkoutPending || isWorkoutDone}
                style={({ pressed }) => [
                  styles.actionBtn,
                  isWorkoutRunning ? styles.workoutBtnRunning : styles.workoutBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  workoutStartTime
                    ? `${workoutLabel}, ${t('memberHome.checkIn.workoutTimerA11y', { duration: formatElapsed(workoutSeconds) })}`
                    : workoutLabel
                }
              >
                {isWorkoutPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Feather
                    name={isWorkoutRunning ? 'square' : isWorkoutDone ? 'check' : 'play'}
                    size={14}
                    color="#FFFFFF"
                  />
                )}
                <Text style={styles.actionText} numberOfLines={1}>{workoutLabel}</Text>
                {workoutStartTime ? (
                  <Text style={styles.workoutTimer}>{formatElapsed(workoutSeconds)}</Text>
                ) : null}
              </Pressable>

              <Pressable
                onPress={handleCheckOut}
                disabled={isActionPending}
                style={({ pressed }) => [styles.actionBtn, styles.checkOutBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('memberHome.checkIn.checkOutA11y')}
              >
                {isActionPending ? (
                  <ActivityIndicator color={ACTIVE_END} size="small" />
                ) : (
                  <Feather name="log-out" size={14} color={ACTIVE_END} />
                )}
                <Text style={[styles.actionText, styles.checkOutText]} numberOfLines={1}>
                  {t('memberHome.checkIn.checkOut')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        {feedbackSheet}
      </>
    );
  }

  // ── Not checked in: single-tap check-in (or locked / blocked) ─────────────
  return (
    <>
      <Pressable
        onPress={handleCheckIn}
        disabled={isActionPending || !isActiveMembership}
        style={({ pressed }) => [
          styles.container,
          (!isActiveMembership || isBlocked) && styles.containerDisabled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          !isActiveMembership
            ? t('memberHome.checkIn.subscriptionRequired')
            : isBlocked
              ? t('memberHome.checkIn.unavailableA11y', { reason: blockedReason })
              : t('memberHome.checkIn.checkInNow')
        }
      >
        {!isActiveMembership ? (
          // Disabled state — plain surface
          <View style={styles.content}>
            <View style={[styles.iconBox, styles.iconBoxDisabled]}>
              <Feather name="lock" size={22} color={BrandColors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, styles.textDisabled]}>{t('memberHome.checkIn.lockedTitle')}</Text>
              <Text style={[styles.subtitle, styles.textDisabled]}>{t('memberHome.checkIn.lockedSubtitle')}</Text>
            </View>
            <Feather name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={BrandColors.textSecondary} />
          </View>
        ) : isBlocked ? (
          // Limit reached or cooling down between visits — plain surface
          <View style={styles.content}>
            <View style={[styles.iconBox, styles.iconBoxDisabled]}>
              <Feather
                name={statusData?.nextCheckInAllowedAt ? 'clock' : 'slash'}
                size={22}
                color={BrandColors.textSecondary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, styles.textDisabled]}>{t('memberHome.checkIn.unavailableTitle')}</Text>
              <Text style={[styles.subtitle, styles.textDisabled]}>{blockedReason}</Text>
            </View>
          </View>
        ) : (
          // Ready — green gradient glass
          <>
            <LinearGradient
              colors={[GREEN_START, GREEN_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Top-edge highlight */}
            <View pointerEvents="none" style={styles.innerHighlight} />
            <View style={styles.content}>
              <View style={styles.iconBox}>
                {isActionPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Feather name="maximize" size={22} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{t('memberHome.checkIn.checkInNow')}</Text>
                <Text style={styles.subtitle}>
                  {usageLabel
                    ? t('memberHome.checkIn.gateReadyWithUsage', { usage: usageLabel })
                    : t('memberHome.checkIn.gateReady')}
                </Text>
              </View>
              <Feather name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={20} color="rgba(255,255,255,0.8)" />
            </View>
            {unclosedCheckInTime ? (
              <View style={styles.unclosedStrip}>
                <Feather name="alert-triangle" size={13} color={BrandColors.memberGold} />
                <Text style={styles.unclosedText} numberOfLines={2}>
                  {t('memberHome.checkIn.unclosedNotice', {
                    date: formatDate(unclosedCheckInTime, 'PP'),
                    time: formatDate(unclosedCheckInTime, 'p'),
                  })}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </Pressable>
      {feedbackSheet}
    </>
  );
}

/**
 * Seconds since `start` (until `end` when given), ticking every second while
 * running and the screen is focused. Counts from server timestamps, so it is
 * right after an app restart or a check-in made on the web.
 */
function useElapsedSeconds(start: string | null, end: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  const running = !!start && !end;

  useFocusEffect(
    useCallback(() => {
      if (!running) return;
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, [running]),
  );

  if (!start) return 0;
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : now;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 1000));
}

/** 754 → "12:34", 5025 → "1:23:45". */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** e.g. "18 of 60 sessions left" — null for unlimited plans. */
function formatUsage(t: TFunction, status?: MemberCheckInStatus): string | null {
  if (!status?.limitValue || !status.limitUnit) return null;
  const left = Math.max(0, status.limitValue - (status.used ?? 0));
  const unitKey = status.limitUnit.toLowerCase();
  const unit =
    unitKey === 'sessions' || unitKey === 'days' || unitKey === 'hours'
      ? t(`memberHome.checkIn.units.${unitKey}`)
      : unitKey;
  const key =
    status.limitPeriod === 'Week' ? 'memberHome.checkIn.usageWeek'
      : status.limitPeriod === 'Month' ? 'memberHome.checkIn.usageMonth'
        : status.limitPeriod === 'Year' ? 'memberHome.checkIn.usageYear'
          : 'memberHome.checkIn.usage';
  return t(key, { left, total: status.limitValue, unit });
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: 'rgba(18,63,53,0.45)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    minHeight: 72,
    justifyContent: 'center',
  },
  containerDisabled: {
    backgroundColor: BrandColors.screenBackground,
    borderColor: BrandColors.neutral[200],
    shadowColor: 'transparent',
    opacity: 0.75,
    elevation: 0,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  activeBody: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: Spacing.three,
  },
  iconBoxDisabled: {
    backgroundColor: 'transparent',
    borderColor: BrandColors.neutral[200],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: TypographyScale.small,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  visitTimer: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginStart: Spacing.two,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
  },
  workoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  workoutBtnRunning: {
    backgroundColor: 'rgba(18,63,53,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  checkOutBtn: {
    backgroundColor: '#FFFFFF',
  },
  actionText: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  checkOutText: {
    color: ACTIVE_END,
  },
  workoutTimer: {
    fontSize: TypographyScale.body,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  unclosedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    marginTop: -Spacing.two,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  unclosedText: {
    flex: 1,
    fontSize: TypographyScale.small,
    color: '#FFFFFF',
  },
  textDisabled: {
    color: BrandColors.textSecondary,
  },
});
