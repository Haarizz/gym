import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Pressable, View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/core/hooks';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';
import { Radius, Spacing, BrandColors } from '@/core/theme';
import { styles as fieldStyles } from './TimePicker.styles';

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = (ITEM_H * VISIBLE - ITEM_H) / 2;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 00,05,...,55
const PERIODS = ["AM", "PM"];

function Wheel({ values, selected, onChange, format }: any) {
  const ref = useRef<ScrollView>(null);
  const isProgrammatic = useRef(false);

  useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx === -1 || !ref.current) return;
    isProgrammatic.current = true;
    ref.current.scrollTo({ y: idx * ITEM_H, animated: true });
    const t = setTimeout(() => (isProgrammatic.current = false), 300);
    return () => clearTimeout(t);
  }, [selected, values]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammatic.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.min(Math.max(idx, 0), values.length - 1);
    const val = values[clamped];
    if (val !== selected) {
      onChange(val);
    }
  }, [values, selected, onChange]);

  return (
    <View style={{ width: 84, height: ITEM_H * VISIBLE }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {values.map((v: any) => {
          const isSel = v === selected;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={{
                height: ITEM_H,
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: isSel ? 22 : 18,
                  fontWeight: isSel ? '700' : '400',
                  color: isSel ? '#0F766E' : '#B9C0C6',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {format(v)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export interface TimePickerProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export function TimePicker({
  label,
  placeholder = 'Select time',
  value,
  onChange,
  required = false,
  disabled = false,
  error,
}: TimePickerProps) {
  const theme = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Parse initial value or use current time
  const parseValue = useCallback((val?: string) => {
    if (!val) {
      const d = new Date();
      let h = d.getHours();
      const m = Math.round(d.getMinutes() / 5) * 5;
      const finalM = m === 60 ? 0 : m;
      if (m === 60) h += 1;
      const p = h >= 12 ? 'PM' : 'AM';
      const finalH = h % 12 || 12;
      return { h: finalH, m: finalM, p };
    }
    const parts = val.split(':');
    const hh = parseInt(parts[0], 10) || 0;
    const mm = parseInt(parts[1], 10) || 0;
    const p = hh >= 12 ? 'PM' : 'AM';
    const h = hh % 12 || 12;
    return { h, m: mm, p };
  }, []);

  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');

  useEffect(() => {
    if (sheetVisible) {
      const parsed = parseValue(value);
      setHour(parsed.h);
      setMinute(parsed.m);
      setPeriod(parsed.p);
    }
  }, [sheetVisible, value, parseValue]);

  const displayString = useMemo(() => {
    if (!value) return '';
    const parsed = parseValue(value);
    return `${String(parsed.h).padStart(2, '0')}:${String(parsed.m).padStart(2, '0')} ${parsed.p}`;
  }, [value, parseValue]);

  const hasValue = !!value;

  const currentSelectionLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;

  const applyQuickPick = (h: number, m: number, p: string) => {
    setHour(h);
    setMinute(m);
    setPeriod(p);
  };

  const QUICK_PICKS = useMemo(() => {
    const d = new Date();
    let currentH = d.getHours();
    const m = Math.round(d.getMinutes() / 5) * 5;
    const finalM = m === 60 ? 0 : m;
    if (m === 60) currentH += 1;
    const currentP = currentH >= 12 ? 'PM' : 'AM';
    const displayH = currentH % 12 || 12;

    return [
      { label: "Now", h: displayH, m: finalM, p: currentP },
      { label: "9:00 AM", h: 9, m: 0, p: "AM" },
      { label: "1:00 PM", h: 1, m: 0, p: "PM" },
      { label: "5:00 PM", h: 5, m: 0, p: "PM" },
    ];
  }, []);

  const handleConfirm = () => {
    let finalHH = hour;
    if (period === 'PM' && hour !== 12) finalHH += 12;
    if (period === 'AM' && hour === 12) finalHH = 0;
    
    const formatted = `${String(finalHH).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onChange(formatted);
    setSheetVisible(false);
  };

  return (
    <View>
      {label ? (
        <Typography variant="bodySmallBold" style={fieldStyles.label}>
          {label}
          {required ? (
            <Typography variant="bodySmallBold" style={{ color: theme.error }}>
              {' *'}
            </Typography>
          ) : null}
        </Typography>
      ) : null}

      <Pressable
        onPress={() => {
          if (!disabled) setSheetVisible(true);
        }}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          fieldStyles.field,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error
              ? theme.error
              : pressed && !disabled
                ? theme.primary
                : theme.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Feather name="clock" size={18} color={theme.textSecondary} />
        
        <Typography
          variant="bodySmall"
          numberOfLines={1}
          style={[
            fieldStyles.valueText,
            { color: hasValue ? theme.text : theme.textSecondary },
          ]}
        >
          {hasValue ? displayString : placeholder}
        </Typography>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      {error ? (
        <Typography variant="caption" style={[fieldStyles.error, { color: theme.error }]}>
          {error}
        </Typography>
      ) : null}

      <AppBottomSheet
        visible={sheetVisible}
        title={label ?? "Select time"}
        onClose={() => setSheetVisible(false)}
      >
        <View style={styles.sheetContent}>
          {/* Quick Picks */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPicksContainer}
          >
            {QUICK_PICKS.map((qp) => {
              const isActive = qp.h === hour && qp.m === minute && qp.p === period;
              return (
                <Pressable
                  key={qp.label}
                  onPress={() => applyQuickPick(qp.h, qp.m, qp.p)}
                  style={[
                    styles.quickPickBtn,
                    {
                      borderColor: isActive ? '#0F766E' : theme.border,
                      backgroundColor: isActive ? '#F0FDFA' : theme.backgroundElement,
                    }
                  ]}
                >
                  <Text style={[
                    styles.quickPickText,
                    { color: isActive ? '#0F766E' : theme.textSecondary }
                  ]}>
                    {qp.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Wheels */}
          <View style={styles.wheelsContainer}>
            {/* Center highlight band */}
            <View style={styles.highlightBand} />
            
            <Wheel
              values={HOURS}
              selected={hour}
              onChange={setHour}
              format={(v: any) => String(v).padStart(2, "0")}
            />
            <Text style={styles.colon}>:</Text>
            <Wheel
              values={MINUTES}
              selected={minute}
              onChange={setMinute}
              format={(v: any) => String(v).padStart(2, "0")}
            />
            <View style={{ width: 12 }} />
            <Wheel
              values={PERIODS}
              selected={period}
              onChange={setPeriod}
              format={(v: any) => v}
            />

            {/* Gradient masks for fading effect */}
            <LinearGradient
              colors={['#FFFFFF', 'rgba(255,255,255,0)']}
              style={styles.gradientTop}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0)', '#FFFFFF']}
              style={styles.gradientBottom}
              pointerEvents="none"
            />
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setSheetVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Set time · {currentSelectionLabel}</Text>
            </Pressable>
          </View>
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingBottom: Spacing.four,
  },
  quickPicksContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  quickPickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  quickPickText: {
    fontSize: 13,
    fontWeight: '600',
  },
  wheelsContainer: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  highlightBand: {
    position: 'absolute',
    top: '50%',
    left: Spacing.six,
    right: Spacing.six,
    height: ITEM_H,
    marginTop: -ITEM_H / 2,
    backgroundColor: '#F0FDFA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: Radius.md,
  },
  colon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 4,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PAD,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PAD,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
