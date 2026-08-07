import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { CheckInSummaryCard } from '../components/hub/CheckInSummaryCard';
import { CheckInHubMenu } from '../components/hub/CheckInHubMenu';
import { CheckInSection } from '../components/shared/CheckInSection';
import { useRecentCheckIns } from '../hooks/useRecentCheckIns';

export function CheckInHubScreen() {
  const { refetch, isRefetching } = useRecentCheckIns();

  return (
    <ScreenLayout title="Check In" subtitle="Manage access for registered members or daily visitors">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <CheckInSection>
          <CheckInSummaryCard />
        </CheckInSection>
        <CheckInSection>
          <CheckInHubMenu />
        </CheckInSection>
      </ScrollView>
    </ScreenLayout>
  );
}
