import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { AppBottomSheet, Button, Loader } from '@/shared/components';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useTrainerAvailability, useUpdateTrainerAvailability } from '../../hooks/useTrainerSchedule';
import type { MobileScheduleSlotDTO } from '../../domain/TrainerScheduleData';

export interface TrainerAvailabilitySheetProps {
  visible: boolean;
  onClose: () => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SLOTS = [
  { key: "morning", label: "Morning", range: "6am – 12pm", icon: "sunrise" },
  { key: "afternoon", label: "Afternoon", range: "12pm – 5pm", icon: "sun" },
  { key: "evening", label: "Evening", range: "5pm – 10pm", icon: "moon" },
] as const;

const DEFAULT_SCHEDULE: Record<string, any> = {
  Monday: { morning: true, afternoon: true, evening: false },
  Tuesday: { morning: true, afternoon: false, evening: false },
  Wednesday: { morning: true, afternoon: false, evening: false },
  Thursday: { morning: true, afternoon: false, evening: false },
  Friday: { morning: true, afternoon: false, evening: false },
  Saturday: { morning: true, afternoon: false, evening: false },
  Sunday: { morning: false, afternoon: false, evening: false },
};

function summarize(daySchedule: any) {
  const on = SLOTS.filter((s) => daySchedule[s.key]);
  if (on.length === 0) return "Not working";
  if (on.length === 3) return "All day";
  return on.map((s) => s.label).join(", ");
}

export function TrainerAvailabilitySheet({ visible, onClose }: TrainerAvailabilitySheetProps) {
  const { data: availabilityData, isLoading } = useTrainerAvailability();
  const updateMutation = useUpdateTrainerAvailability();
  
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [expanded, setExpanded] = useState<string | null>("Monday");

  // Sync server data to local state
  useEffect(() => {
    if (availabilityData && availabilityData.slots) {
      const newSchedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
      
      // Clear all first (assuming backend data is absolute)
      Object.keys(newSchedule).forEach((d) => {
        Object.keys(newSchedule[d]).forEach((s) => {
          newSchedule[d][s] = false;
        });
      });
      
      // Apply active slots
      availabilityData.slots.forEach((slotInfo) => {
        if (newSchedule[slotInfo.day]) {
          newSchedule[slotInfo.day][slotInfo.slot] = true;
        }
      });
      
      setSchedule(newSchedule);
    }
  }, [availabilityData]);

  const toggleSlot = (day: string, key: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [key]: !prev[day][key] },
    }));
  };

  const applyMondayToWeekdays = () => {
    const mon = schedule.Monday;
    setSchedule((prev) => {
      const next = { ...prev };
      ["Tuesday", "Wednesday", "Thursday", "Friday"].forEach((d) => {
        next[d] = { ...mon };
      });
      return next;
    });
  };

  const handleSave = () => {
    const slots: MobileScheduleSlotDTO[] = [];
    
    DAYS.forEach(day => {
      SLOTS.forEach(slot => {
        if (schedule[day][slot.key]) {
          slots.push({ day, slot: slot.key });
        }
      });
    });
    
    updateMutation.mutate({ slots }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  if (isLoading) {
    return (
      <AppBottomSheet visible={visible} title="Working days & time slots" onClose={onClose}>
        <View style={{ height: 200, justifyContent: 'center' }}>
          <Loader message="Loading availability..." />
        </View>
      </AppBottomSheet>
    );
  }

  return (
    <AppBottomSheet
      visible={visible}
      title="Working days & time slots"
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Tap a day to choose when you're available</Text>

        <View style={styles.daysList}>
          {DAYS.map((day) => {
            const isOpen = expanded === day;
            const daySchedule = schedule[day];
            const isWorking = SLOTS.some((s) => daySchedule[s.key]);
            
            return (
              <View
                key={day}
                style={[
                  styles.dayContainer,
                  { borderColor: isOpen ? BrandColors.teal : '#E5E7EB' }
                ]}
              >
                <Pressable
                  style={styles.dayHeader}
                  onPress={() => setExpanded(isOpen ? null : day)}
                >
                  <View style={styles.dayHeaderLeft}>
                    <View style={[styles.dot, { backgroundColor: isWorking ? BrandColors.teal : '#D1D5DB' }]} />
                    <Text style={styles.dayText}>{day}</Text>
                  </View>
                  <View style={styles.dayHeaderRight}>
                    <Text style={[styles.summaryText, { color: isWorking ? BrandColors.teal : '#6B7280' }]}>
                      {summarize(daySchedule)}
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color="#6B7280"
                      style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
                    />
                  </View>
                </Pressable>

                {isOpen && (
                  <View style={styles.dayContent}>
                    {SLOTS.map((slot) => {
                      const active = daySchedule[slot.key];
                      return (
                        <Pressable
                          key={slot.key}
                          onPress={() => toggleSlot(day, slot.key)}
                          style={[
                            styles.slotItem,
                            { 
                              borderColor: active ? BrandColors.teal : '#E5E7EB',
                              backgroundColor: active ? '#F0FDFA' : '#FFFFFF' 
                            }
                          ]}
                        >
                          <View style={styles.slotLeft}>
                            <Feather name={slot.icon} size={20} color={active ? BrandColors.teal : '#6B7280'} />
                            <View style={styles.slotTextCol}>
                              <Text style={styles.slotLabel}>{slot.label}</Text>
                              <Text style={styles.slotRange}>{slot.range}</Text>
                            </View>
                          </View>
                          <View style={[
                            styles.checkbox,
                            { 
                              borderColor: active ? BrandColors.teal : '#D1D5DB',
                              backgroundColor: active ? BrandColors.teal : '#FFFFFF'
                            }
                          ]}>
                            {active && <Feather name="check" size={14} color="#FFFFFF" />}
                          </View>
                        </Pressable>
                      );
                    })}
                    {day === "Monday" && (
                      <Pressable style={styles.applyBtn} onPress={applyMondayToWeekdays}>
                        <Text style={styles.applyBtnText}>Apply to Tue–Fri →</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button 
            title={updateMutation.isPending ? "Saving..." : "Save Schedule"} 
            onPress={handleSave} 
            style={styles.saveBtn} 
            disabled={updateMutation.isPending}
          />
        </View>
      </ScrollView>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.six + 16,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: Spacing.four,
  },
  daysList: {
    gap: Spacing.two,
  },
  dayContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dayContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  slotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  slotTextCol: {
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  slotRange: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  actions: {
    marginTop: Spacing.six,
  },
  saveBtn: {
    width: '100%',
  },
});
