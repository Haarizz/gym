import { Pressable, StyleSheet } from 'react-native';
import { Glass } from '@/core/theme';
import { GlassSurface, Typography } from '@/shared/components';

interface AuthTabsProps {
  activeTab: 'signin' | 'signup';
  onTabChange: (tab: 'signin' | 'signup') => void;
}

export function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  return (
    <GlassSurface radius={16} style={styles.tabs}>
      <Pressable
        style={[styles.tab, activeTab === 'signin' && styles.tabActive]}
        onPress={() => onTabChange('signin')}>
        <Typography style={[styles.tabText, activeTab === 'signin' && styles.tabTextActive]}>
          Sign In
        </Typography>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
        onPress={() => onTabChange('signup')}>
        <Typography style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>
          Create Account
        </Typography>
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: 5,
    gap: 4,
    marginBottom: 22,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Glass.fillStrong,
    shadowColor: '#0a3f34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#6E7C77',
  },
  tabTextActive: {
    color: '#0A3F34',
  },
});
