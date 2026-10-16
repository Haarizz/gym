import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Trans } from 'react-i18next';
import { CurrencyValue } from '@/core/providers';
import { BrandColors } from '@/core/theme';

export const PRICE_SLIDER_MIN = 50;
export const PRICE_SLIDER_MAX = 50000;

const THUMB_SIZE = 26;
/** Thumbs can't cross; keep at least this much track between them. */
const MIN_GAP_PX = 8;

// Log scale: most plans cost a few hundred to a few thousand, which a linear
// 50–50,000 track would cram into its first tenth.
const LOG_RANGE = Math.log(PRICE_SLIDER_MAX / PRICE_SLIDER_MIN);

function roundToStep(value: number): number {
  const step = value < 500 ? 10 : value < 2000 ? 50 : value < 10000 ? 100 : 500;
  return Math.round(value / step) * step;
}

function valueToRatio(value: number): number {
  const clamped = Math.min(PRICE_SLIDER_MAX, Math.max(PRICE_SLIDER_MIN, value));
  return Math.log(clamped / PRICE_SLIDER_MIN) / LOG_RANGE;
}

function ratioToValue(ratio: number): number {
  if (ratio <= 0) return PRICE_SLIDER_MIN;
  if (ratio >= 1) return PRICE_SLIDER_MAX;
  const raw = PRICE_SLIDER_MIN * Math.exp(ratio * LOG_RANGE);
  return Math.min(PRICE_SLIDER_MAX, Math.max(PRICE_SLIDER_MIN, roundToStep(raw)));
}

/** True when the range is narrowed from the full track (i.e. the filter is on). */
export function isPriceRangeActive(min: number, max: number): boolean {
  return min > PRICE_SLIDER_MIN || max < PRICE_SLIDER_MAX;
}

/** A thumb at either end means "no bound" on that side. */
export function matchesPriceRange(price: number | null | undefined, min: number, max: number): boolean {
  if (!isPriceRangeActive(min, max)) return true;
  if (price == null) return false;
  return (min <= PRICE_SLIDER_MIN || price >= min) && (max >= PRICE_SLIDER_MAX || price <= max);
}

/** "Under X", "Above X" or "X–Y", matching what the thumbs mean. */
export function PriceRangeLabel({ min, max, compact }: { min: number; max: number; compact?: boolean }) {
  if (max >= PRICE_SLIDER_MAX) {
    return <Trans i18nKey="centers.priceAbove" components={{ amount: <CurrencyValue amount={min} compact={compact} /> }} />;
  }
  if (min <= PRICE_SLIDER_MIN) {
    return <Trans i18nKey="centers.priceUnder" components={{ amount: <CurrencyValue amount={max} compact={compact} /> }} />;
  }
  return <><CurrencyValue amount={min} compact={compact} />–<CurrencyValue amount={max} compact={compact} /></>;
}

interface PriceRangeSliderProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
  /** Lets the parent ScrollView stop scrolling while a thumb is dragged. */
  onDragStateChange?: (dragging: boolean) => void;
}

/** Two-thumb price range slider. Tap the track to move the nearest thumb there. */
export function PriceRangeSlider({ min, max, onChange, onDragStateChange }: PriceRangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  // The responder is created once, so it reads the latest values through refs.
  const latest = useRef({ min, max, trackWidth, onChange, onDragStateChange });
  latest.current = { min, max, trackWidth, onChange, onDragStateChange };
  const drag = useRef<{ thumb: 'min' | 'max'; startX: number }>({ thumb: 'min', startX: 0 });

  const moveTo = (x: number) => {
    const { min: lo, max: hi, trackWidth: w, onChange: emit } = latest.current;
    if (w <= 0) return;
    const loX = valueToRatio(lo) * w;
    const hiX = valueToRatio(hi) * w;
    if (drag.current.thumb === 'min') {
      const next = Math.max(0, Math.min(x, hiX - MIN_GAP_PX));
      emit(Math.min(ratioToValue(next / w), hi), hi);
    } else {
      const next = Math.min(w, Math.max(x, loX + MIN_GAP_PX));
      emit(lo, Math.max(ratioToValue(next / w), lo));
    }
  };

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { min: lo, max: hi, trackWidth: w } = latest.current;
        // Touches land on the track container (children ignore pointer events),
        // so locationX is relative to the track; shift by the thumb inset.
        const x = evt.nativeEvent.locationX - THUMB_SIZE / 2;
        const loX = valueToRatio(lo) * w;
        const hiX = valueToRatio(hi) * w;
        // Nearest thumb wins; when they overlap, pick by which side was touched.
        const thumb =
          Math.abs(x - loX) < Math.abs(x - hiX) || (loX === hiX && x < loX) ? 'min' : 'max';
        drag.current = { thumb, startX: x };
        latest.current.onDragStateChange?.(true);
        moveTo(x);
      },
      onPanResponderMove: (_, g) => moveTo(drag.current.startX + g.dx),
      onPanResponderRelease: () => latest.current.onDragStateChange?.(false),
      onPanResponderTerminate: () => latest.current.onDragStateChange?.(false),
    }),
  );

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(Math.max(0, e.nativeEvent.layout.width - THUMB_SIZE));
  };

  const loX = valueToRatio(min) * trackWidth;
  const hiX = valueToRatio(max) * trackWidth;

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={[styles.activeTrack, { left: loX + THUMB_SIZE / 2, width: hiX - loX }]} />
      <View pointerEvents="none" style={[styles.thumb, { left: loX }]} />
      <View pointerEvents="none" style={[styles.thumb, { left: hiX }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE + 12,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: THUMB_SIZE / 2,
    right: THUMB_SIZE / 2,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  activeTrack: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.memberGold,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: BrandColors.memberGold,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
