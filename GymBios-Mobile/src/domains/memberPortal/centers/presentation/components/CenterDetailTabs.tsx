import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '@/shared/components/AppText';
import { BrandColors } from '@/core/theme';

export type CenterDetailTab = 'overview' | 'plans' | 'trainers' | 'info';

interface CenterDetailTabsProps {
  activeTab: CenterDetailTab;
  onSelect: (tab: CenterDetailTab) => void;
}

export const CENTER_DETAIL_TABS: CenterDetailTab[] = ['overview', 'plans', 'trainers', 'info'];

const CONTAINER_PADDING = 4;
const TAB_GAP = 2;
// Same feel as the bottom tab bar's bubble: a quick spring with a hint of overshoot.
const PILL_SPRING = { damping: 18, stiffness: 190, mass: 0.9 };

export function CenterDetailTabs({ activeTab, onSelect }: CenterDetailTabsProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // Tabs size to their labels, so the pill follows each tab's measured slot.
  const [layouts, setLayouts] = useState<Partial<Record<CenterDetailTab, { x: number; width: number }>>>({});
  const target = layouts[activeTab];

  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const placedRef = useRef(false);

  useEffect(() => {
    if (!target) return;
    // First placement snaps; later tab changes spring across.
    if (!placedRef.current || reduceMotion) {
      pillX.set(target.x);
      pillWidth.set(target.width);
      placedRef.current = true;
      return;
    }
    pillX.set(withSpring(target.x, PILL_SPRING));
    pillWidth.set(withSpring(target.width, PILL_SPRING));
  }, [target, reduceMotion, pillX, pillWidth]);

  // Layout x is measured from the physical left edge, so this holds in RTL too.
  const pillStyle = useAnimatedStyle(() => ({
    width: pillWidth.value,
    transform: [{ translateX: pillX.value }],
  }));

  const handleTabLayout = (tab: CenterDetailTab, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) =>
      prev[tab]?.x === x && prev[tab]?.width === width ? prev : { ...prev, [tab]: { x, width } }
    );
  };

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {target && (
        <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]}>
          <LinearGradient
            colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillFill}
          />
        </Animated.View>
      )}
      {CENTER_DETAIL_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(tab)}
            onLayout={(e) => handleTabLayout(tab, e)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[styles.label, isActive && styles.activeLabel]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t(`centers.detail.tabs.${tab}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Floating segmented control — the active tab is a gold gradient pill that slides between tabs.
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: TAB_GAP,
    padding: CONTAINER_PADDING,
    backgroundColor: BrandColors.surface,
    borderRadius: 18,
    shadowColor: '#3C486E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pill: {
    position: 'absolute',
    top: CONTAINER_PADDING,
    bottom: CONTAINER_PADDING,
    left: 0,
    borderRadius: 14,
    shadowColor: BrandColors.trainerAmber,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pillFill: {
    flex: 1,
    borderRadius: 14,
  },
  // Grow from the label's natural width, so long labels get the room they need.
  tab: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6B7A',
  },
  activeLabel: {
    color: '#4A3410',
  },
});
