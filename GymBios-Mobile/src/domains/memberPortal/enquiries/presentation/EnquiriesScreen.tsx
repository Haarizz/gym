import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyEnquiries } from '../useMyEnquiries';
import { EnquiryListView } from './EnquiryListView';
import { NewEnquiryView } from './NewEnquiryView';
import { EnquiryDetailView } from './EnquiryDetailView';
import { EnquiryColors } from './enquiryUi';

type View = { name: 'list' } | { name: 'new' } | { name: 'detail'; id: number };

interface EnquiriesScreenProps {
  onBack: () => void;
  /** Opens straight onto one enquiry — the reply notification's target. */
  initialEnquiryId?: number | null;
}

/** Profile → Raise Enquiry: the member's enquiries, a new one, and the gym's reply. */
export function EnquiriesScreen({ onBack, initialEnquiryId }: EnquiriesScreenProps) {
  const { data, isLoading, isError, refetch, isRefetching } = useMyEnquiries();
  const [view, setView] = useState<View>(
    initialEnquiryId ? { name: 'detail', id: initialEnquiryId } : { name: 'list' },
  );

  // A second reply notification while this is open points at another enquiry.
  const [shownInitialId, setShownInitialId] = useState(initialEnquiryId);
  if (initialEnquiryId !== shownInitialId) {
    setShownInitialId(initialEnquiryId);
    if (initialEnquiryId) setView({ name: 'detail', id: initialEnquiryId });
  }

  // Detail reads from the live list, so a reply that lands while it's open shows on refresh.
  const current = view.name === 'detail' ? data?.find((e) => e.id === view.id) : undefined;
  const showList = () => setView({ name: 'list' });

  let content;
  if (view.name === 'new') {
    content = <NewEnquiryView onBack={showList} onCreated={(e) => setView({ name: 'detail', id: e.id })} />;
  } else if (view.name === 'detail' && current) {
    content = (
      <EnquiryDetailView
        enquiry={current}
        isRefetching={isRefetching}
        onRefresh={refetch}
        onBack={showList}
        onNew={() => setView({ name: 'new' })}
      />
    );
  } else {
    // Also covers a detail id that isn't (or is no longer) in the list.
    content = (
      <EnquiryListView
        enquiries={data}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRefresh={refetch}
        onBack={onBack}
        onNew={() => setView({ name: 'new' })}
        onOpen={(e) => setView({ name: 'detail', id: e.id })}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: EnquiryColors.background },
});
