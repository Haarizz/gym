import { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Colors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { useAvailableClasses, useCreateMemberBooking } from '../../hooks/useMemberBookings';
import { ConfirmationModal } from '@/shared/components/ConfirmationModal/ConfirmationModal';
import { RewardPassPicker, type RewardSelection } from '@/domains/member-referrals/presentation/components/RewardPassPicker';
import type { PassContext } from '@/domains/member-referrals/domain/types';
import type { SessionType } from '../../domain/MemberBookingData';

interface BookClassModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatTime(timeStr: string) {
  try {
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
}

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  class: 'Group Class',
  pt: 'Personal Training',
  facility: 'Facility',
};

// Mirrors the backend's PassContext.forSessionType — facility sessions take no Reward Pass.
function passContextFor(type: SessionType | undefined): PassContext | null {
  if (type === 'pt') return 'PT';
  if (type === 'class') return 'CLASS';
  return null;
}

export function BookClassModal({ visible, onClose }: BookClassModalProps) {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<SessionType | undefined>(undefined);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  // A Free PT / Class Reward Pass to pay for the booking (PT and group class sessions only).
  const [rewardSel, setRewardSel] = useState<RewardSelection>(null);

  const dates = useMemo(() => [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      offset,
      dayName: offset === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      isoString: d.toISOString().split('T')[0],
    };
  }), []);

  const selectedDate = dates.find((d) => d.offset === selectedDayOffset) ?? dates[0];

  const { data: availableClasses, isLoading, isError } = useAvailableClasses(selectedDate.isoString);
  const { mutate: createBooking, isPending: isCreating } = useCreateMemberBooking();

  const selectedPassContext = passContextFor(selectedType);

  const handleConfirm = () => {
    if (!selectedClassId) return;
    setIsConfirmVisible(true);
  };

  const handleFinalConfirm = () => {
    if (!selectedClassId) return;
    createBooking(
      {
        classId: selectedClassId,
        rewardPassId: selectedPassContext && rewardSel?.kind === 'pass' ? rewardSel.pass.id : undefined,
      },
      {
        onSuccess: () => {
          setIsConfirmVisible(false);
          setSelectedClassId(null);
          setSelectedType(undefined);
          setRewardSel(null);
          onClose();
        },
        onError: () => {
          setIsConfirmVisible(false);
        }
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Book a Session</Text>
              <Text style={styles.subtitle}>Select your preferred session and time</Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {/* Date Selector */}
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
              {dates.map((item) => {
                const isSelected = selectedDayOffset === item.offset;
                return (
                  <Pressable
                    key={item.offset}
                    style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                    onPress={() => setSelectedDayOffset(item.offset)}
                  >
                    <Text style={[styles.dayName, isSelected && styles.textSelected]}>{item.dayName}</Text>
                    <Text style={[styles.dateNum, isSelected && styles.textSelected]}>{item.dateNum}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Class Selector */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>Available Sessions</Text>
            <View style={styles.classList}>
              {isLoading && (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={BrandColors.memberGold} />
                </View>
              )}
              {isError && (
                <View style={styles.centerContainer}>
                  <Text style={styles.errorText}>Unable to load sessions</Text>
                </View>
              )}
              {!isLoading && !isError && (!availableClasses || availableClasses.length === 0) && (
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>No sessions available</Text>
                </View>
              )}
              {!isLoading && !isError && availableClasses?.map((cls) => {
                const classData: any = cls;
                const classId = classData.class_id ?? cls.classId;
                const className = classData.class_name ?? cls.className;
                const trainerName = classData.trainer_name ?? cls.trainerName;
                const durationMinutes = classData.duration_minutes ?? cls.durationMinutes;
                const location = classData.location ?? cls.location;
                const memberBookingState = classData.member_booking_state ?? cls.memberBookingState;
                const availableSpots = classData.available_spots ?? cls.availableSpots;
                const startTime = classData.start_time ?? cls.startTime;
                const type: SessionType | undefined = classData.type ?? cls.type;

                const isSelected = selectedClassId === classId;
                const isBooked = !!memberBookingState;
                const isFull = availableSpots === 0;
                const isDisabled = isBooked || isFull || isCreating;

                return (
                  <Pressable
                    key={classId}
                    style={[
                      styles.classCard,
                      isSelected && styles.classCardSelected,
                      isDisabled && !isSelected && styles.classCardDisabled
                    ]}
                    onPress={() => {
                      if (isDisabled) return;
                      if (passContextFor(type) !== selectedPassContext) setRewardSel(null);
                      setSelectedClassId(classId);
                      setSelectedType(type);
                    }}
                  >
                    <View style={styles.classInfo}>
                      {type && SESSION_TYPE_LABELS[type] && (
                        <Text style={styles.typeBadge}>{SESSION_TYPE_LABELS[type]}</Text>
                      )}
                      <Text style={[styles.className, isSelected && styles.classNameSelected]}>
                        {className}
                      </Text>
                      <Text style={styles.classDetails}>
                        {trainerName
                          ? `with ${trainerName} • ${durationMinutes} min`
                          : type === 'facility'
                            ? `${durationMinutes} min`
                            : `with Instructor • ${durationMinutes} min`}
                      </Text>
                      <View style={styles.locationTag}>
                        <Feather name="map-pin" size={11} color={BrandColors.textSecondary} />
                        <Text style={styles.locationText}>{location || 'Location not specified'}</Text>
                      </View>
                      
                      {isBooked && (
                         <Text style={styles.statusTextBooked}>Already Booked</Text>
                      )}
                      {isFull && !isBooked && (
                         <Text style={styles.statusTextFull}>Fully Booked</Text>
                      )}
                    </View>
                    <View style={styles.timeTag}>
                      <Text style={styles.timeTagText}>{formatTime(startTime)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {selectedClassId != null && selectedPassContext && (
              <RewardPassPicker passContext={selectedPassContext} value={rewardSel} onChange={setRewardSel} />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable 
              style={[
                styles.confirmButton, 
                (!selectedClassId || isCreating) && styles.confirmButtonDisabled
              ]} 
              onPress={handleConfirm}
              disabled={!selectedClassId || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
      <ConfirmationModal
        visible={isConfirmVisible}
        title="Confirm Booking"
        message={rewardSel?.kind === 'pass'
          ? 'Book this session using your Reward Pass? It will be free.'
          : 'Are you sure you want to book this session?'}
        confirmText="Confirm"
        cancelText="Cancel"
        variant="primary"
        icon="calendar"
        loading={isCreating}
        onConfirm={handleFinalConfirm}
        onClose={() => setIsConfirmVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
  },
  body: {
    padding: Spacing.four,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  datesRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateCard: {
    width: 64,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dateCardSelected: {
    backgroundColor: BrandColors.memberGold,
    borderColor: BrandColors.memberGold,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  dateNum: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  textSelected: {
    color: '#FFFFFF',
  },
  classList: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.four,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  classCardSelected: {
    borderColor: BrandColors.memberGold,
    backgroundColor: '#FEFCE8',
  },
  classCardDisabled: {
    opacity: 0.6,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: BrandColors.teal,
    marginBottom: 2,
  },
  classNameSelected: {
    color: BrandColors.memberGold,
  },
  classDetails: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  statusTextBooked: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.teal,
    marginTop: 4,
  },
  statusTextFull: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.error,
    marginTop: 4,
  },
  timeTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.sm,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.trainerAmber,
  },
  centerContainer: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 14,
  },
  emptyText: {
    color: BrandColors.textSecondary,
    fontSize: 14,
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  confirmButton: {
    backgroundColor: BrandColors.memberGold,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
