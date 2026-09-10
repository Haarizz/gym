import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass } from '@/core/theme';
import { TabIcon } from './tabConfigs';

// Picks a legible icon colour for the near-solid active-tab fill — light
// brand colours (e.g. member gold) need a dark icon, dark ones (teal, amber)
// read fine in white.
function contrastIconColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7 ? BrandColors.textPrimary : '#FFFFFF';
}

export const ICON_SIZE = 46;
export const TAB_BAR_VERTICAL_PADDING = 12;
export const TAB_BAR_HEIGHT = ICON_SIZE + TAB_BAR_VERTICAL_PADDING * 2; // 70

export const RoleTabBarStyles = StyleSheet.create({
  tabBar: {
    position: 'absolute',

    left: 20,
    right: 20,

    height: TAB_BAR_HEIGHT,
    paddingTop: TAB_BAR_VERTICAL_PADDING,
    paddingBottom: TAB_BAR_VERTICAL_PADDING,
    paddingHorizontal: 10,

    backgroundColor: 'rgba(238,240,243,0.92)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',

    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',

    zIndex: 40,
    elevation: 18,

    shadowColor: Glass.shadowColor,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  // Faint dark hairline over the glass fill so the pill still reads as a
  // distinct surface when it sits directly on top of a white card, since a
  // pure white/translucent border alone disappears against white content.
  tabBarHairline: {
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(30,42,58,0.06)',
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
  },

  tabItem: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconGlow: {
    position: 'absolute',
    width: ICON_SIZE + 16,
    height: ICON_SIZE + 16,
    borderRadius: (ICON_SIZE + 16) / 2,
    opacity: 0.18,
  },

  iconContainerInner: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function renderTabBarIcon(iconName: TabIcon, activeColor: string) {
  return function TabBarIcon({ focused }: { focused: boolean }) {
    const iconColor = focused ? contrastIconColor(activeColor) : 'rgba(30,42,58,0.45)';
    return (
      <View style={RoleTabBarStyles.iconWrapper}>
        {focused && (
          <View style={[RoleTabBarStyles.iconGlow, { backgroundColor: activeColor }]} />
        )}
        <View
          style={[
            RoleTabBarStyles.iconContainerInner,
            focused && {
              backgroundColor: `${activeColor}E6`, // 90% opacity for better contrast
            },
          ]}>
          <Feather name={iconName} color={iconColor} size={22} />
        </View>
      </View>
    );
  };
}

export function renderTabBarBackground() {
  return function TabBarBackground() {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, RoleTabBarStyles.tabBarHairline]} />;
  };
}
