import { Pressable, StyleSheet, View } from 'react-native';
import { Typography } from '@/shared/components';

interface AuthTabsProps {
  activeTab: 'signin' | 'signup';
  onTabChange: (tab: 'signin' | 'signup') => void;
}

export function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  return (
    <View style={styles.tabs}>
      <Pressable
        style={[styles.tab, activeTab === 'signin' && styles.tabActive]}
        onPress={() => onTabChange('signin')}>
        <Typography style={[styles.tabText, activeTab === 'signin' && styles.tabTextActive]}>
          Sign In
        </Typography>
        {activeTab === 'signin' && <View style={styles.tabIndicator} />}
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
        onPress={() => onTabChange('signup')}>
        <Typography style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>
          Create Account
        </Typography>
        {activeTab === 'signup' && <View style={styles.tabIndicator} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 26,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E9E5',
    marginBottom: 22,
  },
  tab: {
    paddingBottom: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#9AA6A1',
  },
  tabTextActive: {
    color: '#0A3F34',
  },
  tabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: '#0E6653',
    borderRadius: 2,
  },
});
