import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Spacing, BrandColors, BottomTabInset } from '@/core/theme';

import { HubActionButton } from '../components/HubActionButton';
import { AutomationsOverviewScreen } from './AutomationsOverviewScreen';
import { AutomationWorkflowsScreen } from './AutomationWorkflowsScreen';
import { AutomationAnalyticsScreen } from '@/domains/analytics/automations/presentation/screens/AutomationAnalyticsScreen';

type AutomationsTab = 'overview' | 'workflows' | 'analytics';

export const AutomationsHubScreen = () => {
  const [activeTab, setActiveTab] = useState<AutomationsTab>('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AutomationsOverviewScreen />;
      case 'workflows':
        return <AutomationWorkflowsScreen />;
      case 'analytics':
        return <AutomationAnalyticsScreen />;
      default:
        return null;
    }
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {/* Segmented Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabsScroll}
          >
            <HubActionButton
              title="Overview"
              iconName="grid"
              onPress={() => setActiveTab('overview')}
              style={[styles.tabCard, activeTab === 'overview' && styles.tabCardActive]}
            />
            <HubActionButton
              title="Workflows"
              iconName="git-branch"
              onPress={() => setActiveTab('workflows')}
              style={[styles.tabCard, activeTab === 'workflows' && styles.tabCardActive]}
            />
            <HubActionButton
              title="Analytics"
              iconName="bar-chart-2"
              onPress={() => setActiveTab('analytics')}
              style={[styles.tabCard, activeTab === 'analytics' && styles.tabCardActive]}
            />
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {renderContent()}
        </View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.three,
  },
  tabsContainer: {
    marginBottom: Spacing.three,
  },
  tabsScroll: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  tabCard: {
    minWidth: 120,
    padding: Spacing.two,
  },
  tabCardActive: {
    borderColor: BrandColors.teal,
    borderWidth: 1,
  },
  contentArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
});

