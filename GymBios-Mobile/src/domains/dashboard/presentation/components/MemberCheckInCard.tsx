import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
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

  const isActionPending =
    checkInMutation.isPending || checkOutMutation.isPending;

  const handleAction = () => {
    if (isActionPending) return;

    if (!isCheckedIn) {
      // Perform Check-In
      checkInMutation.mutate(undefined, {
        onSuccess: (resp) => {
          setOverrideCheckedIn(true);
          const attId = resp?.attendanceId ?? resp?.attendance_id;
          if (attId) {
            setCompletedAttendanceId(attId);
          }
          toast.success('Welcome to the gym! Access unlocked.', {
            title: 'Check-In Successful'
          });
        },
        onError: (err: any) => {
          const status = err?.status || err?.response?.status;
          const msg =
            err?.response?.data?.message || err?.message || 'Check-in could not be completed.';

          // If member is already checked in (409 Conflict / Business rule violation)
          if (
            status === 409 ||
            (typeof msg === 'string' && msg.toLowerCase().includes('already checked in'))
          ) {
            setOverrideCheckedIn(true);
            queryClient.invalidateQueries({ queryKey: checkInKeys.all });
            queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
            toast.info(
              'You have an active workout session in progress. Tap Check Out when finished.',
              {
                title: 'Already Checked In'
              }
            );
          } else {
            toast.info(msg, {
              title: 'Check-In Notice'
            });
          }
        },
      });
    } else {
      // Perform Check-Out
      checkOutMutation.mutate(undefined, {
        onSuccess: (resp) => {
          setOverrideCheckedIn(false);
          const attId =
            resp?.attendanceId ??
            resp?.attendance_id ??
            activeAttendanceId ??
            completedAttendanceId;

          if (attId) {
            setCompletedAttendanceId(attId);
          }
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

          toast.info(msg, {
            title: 'Check-Out Notice'
          });
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
        toast.error(msg, {
          title: 'Feedback Error'
        });
      },
    });
  };

  return (
    <>
      <Pressable
        onPress={handleAction}
        disabled={isActionPending}
        style={({ pressed }) => [
          styles.container,
          isCheckedIn && styles.containerCheckedIn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isCheckedIn ? 'Check Out of Gym' : 'Check In Now'}
      >
        <View style={styles.content}>
          <View style={[styles.iconBox, isCheckedIn && styles.iconBoxCheckedIn]}>
            {isActionPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Feather
                name={isCheckedIn ? 'log-out' : 'maximize'}
                size={24}
                color="#FFFFFF"
              />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {isCheckedIn ? 'Tap to Check Out' : 'Check In Now'}
            </Text>
            <Text style={styles.subtitle}>
              {isCheckedIn ? 'Workout in progress · Tap when finished' : 'Gate access ready'}
            </Text>
          </View>
          <Feather
            name="chevron-right"
            size={20}
            color="rgba(255,255,255,0.8)"
          />
        </View>
      </Pressable>

      {/* Post-Workout Feedback Sheet */}
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
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: BrandColors.tealDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  containerCheckedIn: {
    backgroundColor: '#C9821E',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  iconBoxCheckedIn: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: TypographyScale.small,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
