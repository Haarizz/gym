import { useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { MemberSearchBar } from '../components/members/MemberSearchBar';
import { MemberList } from '../components/members/MemberList';
import { RecentCheckInList } from '../components/members/RecentCheckInList';
import { CheckInConfirmationModal } from '../components/members/CheckInConfirmationModal';
import { CheckInSection } from '../components/shared/CheckInSection';
import { useMemberSearch } from '../hooks/useMemberSearch';
import { useRecentCheckIns } from '../hooks/useRecentCheckIns';
import { useCheckIn } from '../hooks/useCheckInActions';

export function MembersStaffCheckInScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  const { members, loading: isSearching } = useMemberSearch(searchQuery);
  const { refetch, isRefetching } = useRecentCheckIns();
  const { mutateAsync: performCheckIn, isPending: isCheckingIn } = useCheckIn();

  const handleCheckIn = (member: any) => {
    setSelectedMember(member);
  };

  const confirmCheckIn = async () => {
    if (!selectedMember) return;
    
    try {
      await performCheckIn({
        memberId: selectedMember.id,
      });
      setSelectedMember(null);
      // Wait for invalidation to kick in via mutation hook
    } catch (e) {
      // Handled by global error boundary or toast
    }
  };

  return (
    <ScreenLayout title="Members & Staff" subtitle="Search and check-in" showBackButton>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <MemberSearchBar value={searchQuery} onChangeText={setSearchQuery} isLoading={isSearching} />
        
        {searchQuery.length > 0 && (
          <CheckInSection title="Search Results" subtitle={`${members.length} total`}>
            <MemberList members={members} isLoading={isSearching} onCheckIn={handleCheckIn} />
          </CheckInSection>
        )}
        
        <CheckInSection title="Recent Check-Ins" subtitle="Latest member activity today">
          <RecentCheckInList />
        </CheckInSection>
      </ScrollView>

      <CheckInConfirmationModal
        visible={!!selectedMember}
        member={selectedMember}
        onConfirm={confirmCheckIn}
        onCancel={() => setSelectedMember(null)}
        isLoading={isCheckingIn}
      />
    </ScreenLayout>
  );
}
