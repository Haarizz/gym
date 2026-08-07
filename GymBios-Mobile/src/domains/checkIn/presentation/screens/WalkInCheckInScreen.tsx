import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { WalkInForm } from '../components/walkIn/WalkInForm';
import { WalkInVisitorList } from '../components/walkIn/WalkInVisitorList';
import { CheckInSection } from '../components/shared/CheckInSection';
import { useRecentCheckIns } from '../hooks/useRecentCheckIns';
import { Spacing } from '@/core/theme';

export function WalkInCheckInScreen() {
  const { refetch, isRefetching } = useRecentCheckIns();

  return (
    <ScreenLayout title="Walk-In / Daily Visitor" subtitle="Register and grant temporary access" showBackButton>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.formContainer}>
          <WalkInForm />
        </View>

        <CheckInSection title="Today's Daily Visitors" subtitle="Walk-in passes issued">
          <WalkInVisitorList />
        </CheckInSection>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.six,
  },
});
