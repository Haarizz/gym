import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/shared/components/AppHeader';
import { Button } from '@/shared/components/Button';
import { SearchBar } from '@/shared/components/SearchBar';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import { useMessagingRecipients } from '../../hooks/useMessagingHooks';
import { RecipientListItem } from '../components/RecipientListItem';
import { getRecipientKey } from '../../domain/utils';

export function RecipientSelectionScreen() {
  const router = useRouter();
  const { data: recipients = [], isLoading } = useMessagingRecipients();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredRecipients = useMemo(() => {
    if (!searchQuery) return recipients;
    const lowerQuery = searchQuery.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.email.toLowerCase().includes(lowerQuery) ||
        r.phone.includes(searchQuery)
    );
  }, [recipients, searchQuery]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSendPress = () => {
    // In a real app we'd pass selectedIds via store or router params.
    router.push('/(admin)/messaging/compose-message');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="Select Recipients"
        subtitle="Choose members to message"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => router.back()}
      />
      
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search recipients..."
        />
      </View>

      <FlatList
        data={filteredRecipients}
        keyExtractor={(item) => getRecipientKey(item)}
        renderItem={({ item }) => (
          <RecipientListItem
            recipient={item}
            isSelected={selectedIds.has(getRecipientKey(item))}
            onToggle={toggleSelection}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recipients found.</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.footer}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedIds.size === 0
              ? 'No recipients selected'
              : `${selectedIds.size} recipient${selectedIds.size > 1 ? 's' : ''} selected`}
          </Text>
        </View>
        <Button
          title="Send Message"
          onPress={handleSendPress}
          disabled={selectedIds.size === 0}
          style={styles.sendButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  searchContainer: {
    padding: Spacing.four,
    backgroundColor: BrandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
  footer: {
    padding: Spacing.four,
    backgroundColor: BrandColors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  sendButton: {
    minWidth: 140,
  },
});
