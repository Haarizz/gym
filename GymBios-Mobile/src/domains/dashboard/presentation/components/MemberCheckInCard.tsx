import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { BrandColors, Glass, Radius, Spacing, TypographyScale } from '@/core/theme';
import {
  checkInKeys,
  useMemberCheckIn,
  useMemberCheckInStatus,
  useMemberCheckOut,
  useSubmitWorkoutFeedback,
} from '@/domains/checkIn';
import { useMemberDashboard, dashboardKeys } from '@/domains/dashboard';
import { PostWorkoutFeedbackSheet } from '@/domains/checkIn/presentation/components/members/PostWorkoutFeedbackSheet';
import type { MemberFeedbackPayload } from '@/domains/checkIn/domain/MemberFeedback';

import { toast } from '@/shared/components/Toasts/toastStore';

// Green glass recipe from reference `.checkin-glass` — deep teal gradient
const GREEN_START  = 'rgba(27,90,76,0.88)';
const GREEN_END    = 'rgba(18,63,53,0.72)';
// Checked-in = active session — warm amber/gold glass
const ACTIVE_START = 'rgba(199,130,30,0.88)';
const ACTIVE_END   = 'rgba(180,110,10,0.72)';
// Disabled fallback
const DISABLED_BG  = BrandColors.screenBackground;

export function MemberCheckInCard() {
  const queryClient = useQueryClient();
  const { data: dashboardData } = useMemberDashboard();
  const { data: statusData } = useMemberCheckInStatus();

  const checkInMutation = useMemberCheckIn();
  const checkOutMutation = useMemberCheckOut();
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

  const isActionPending =
    checkInMutation.isPending || checkOutMutation.isPending;

  const handleAction = () => {
    if (isActionPending) return;

    if (!isCheckedIn) {
      checkInMutation.mutate(undefined, {
        onSuccess: (resp) => {
          setOverrideCheckedIn(true);
          const attId = resp?.attendanceId ?? resp?.attendance_id;
          if (attId) setCompletedAttendanceId(attId);
          toast.success('Welcome to the gym! Access unlocked.', { title: 'Check-In Successful' });
        },
        onError: (err: any) => {
          const status = err?.status || err?.response?.status;
          const msg =
            err?.response?.data?.message || err?.message || 'Check-in could not be completed.';

          if (
            status === 409 ||
            (typeof msg === 'string' && msg.toLowerCase().includes('already checked in'))
          ) {
            setOverrideCheckedIn(true);
            queryClient.invalidateQueries({ queryKey: checkInKeys.all });
            queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
            toast.info('You have an active workout session in progress. Tap Check Out when finished.', {
              title: 'Already Checked In',
            });
          } else {
            toast.info(msg, { title: 'Check-In Notice' });
          }
        },
      });
    } else {
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
            err?.response?.data?.message || err?.message || 'Check-out could not be completed.';

          if (
            status === 409 ||
            (typeof msg === 'string' && msg.toLowerCase().includes('no active check-in'))
          ) {
            setOverrideCheckedIn(false);
            queryClient.invalidateQueries({ queryKey: checkInKeys.all });
            queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
          }
          toast.info(msg, { title: 'Check-Out Notice' });
        },
      });
    }
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
          'Feedback could not be submitted.';
        toast.error(msg, { title: 'Feedback Error' });
      },
    });
  };

  const gradientColors: [string, string] = isCheckedIn
    ? [ACTIVE_START, ACTIVE_END]
    : [GREEN_START, GREEN_END];

  return (
    <>
      <Pressable
        onPress={handleAction}
        disabled={isActionPending || !isActiveMembership}
        style={({ pressed }) => [
          styles.container,
          !isActiveMembership && styles.containerDisabled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          !isActiveMembership ? 'Membership Required' : isCheckedIn ? 'Check Out of Gym' : 'Check In Now'
        }
      >
        {!isActiveMembership ? (
          // Disabled state — plain surface
          <View style={styles.content}>
            <View style={[styles.iconBox, styles.iconBoxDisabled]}>
              <Feather name="lock" size={22} color={BrandColors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, styles.textDisabled]}>Check In Locked</Text>
              <Text style={[styles.subtitle, styles.textDisabled]}>Requires an active gym membership</Text>
            </View>
            <Feather name="chevron-right" size={20} color={BrandColors.textSecondary} />
          </View>
        ) : (
          // Active state — green/amber gradient glass
          <>
            <LinearGradient
              colors={gradientColors}
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
                  <Feather
                    name={isCheckedIn ? 'log-out' : 'maximize'}
                    size={22}
                    color="#FFFFFF"
                  />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>
                  {isCheckedIn ? 'Tap to Check Out' : 'Check In Now'}
                </Text>
                <Text style={styles.subtitle}>
                  {isCheckedIn
                    ? 'Workout in progress · Tap when finished'
                    : 'Gate access ready'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </>
        )}
      </Pressable>

      {feedbackSheetVisible && (
        <PostWorkoutFeedbackSheet
          visible={feedbackSheetVisible}
          attendanceId={completedAttendanceId || activeAttendanceId || 0}
          isSubmitting={feedbackMutation.isPending}
          onSubmit={handleFeedbackSubmit}
          onClose={() => setFeedbackSheetVisible(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
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
  textDisabled: {
    color: BrandColors.textSecondary,
  },
});
