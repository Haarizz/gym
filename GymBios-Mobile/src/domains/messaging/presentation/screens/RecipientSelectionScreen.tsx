import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { MessagingFlowHeader } from '../components/MessagingFlowHeader';
import { useMessagingRecipients } from '../../hooks/useMessagingHooks';
import { RecipientListItem } from '../components/RecipientListItem';
import { getRecipientKey } from '../../domain/utils';
import { MessagingColors } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'expiring', label: 'Expiring soon' },
  { id: 'downtown', label: 'Downtown' },
  { id: 'uptown', label: 'Uptown' },
];

export function RecipientSelectionScreen() {
  const router = useRouter();
  const segments = useSegments();
  const roleGroup = segments[0] || '(admin)';
  
  const { data: recipients = [], isLoading } = useMessagingRecipients();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredRecipients = useMemo(() => {
    let result = recipients;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(lowerQuery) ||
          r.email.toLowerCase().includes(lowerQuery) ||
          r.phone.includes(searchQuery)
      );
    }
    
    if (activeFilter !== 'all') {
      result = result.filter(r => {
        if (activeFilter === 'active') return r.membershipStatus?.toLowerCase() !== 'expiring' && r.membershipStatus?.toLowerCase() !== 'expiring soon';
        if (activeFilter === 'expiring') return r.membershipStatus?.toLowerCase() === 'expiring' || r.membershipStatus?.toLowerCase() === 'expiring soon';
        if (activeFilter === 'downtown') return r.location?.toLowerCase() === 'downtown';
        if (activeFilter === 'uptown') return r.location?.toLowerCase() === 'uptown';
        return true;
      });
    }
    
    return result;
  }, [recipients, searchQuery, activeFilter]);

  const allFilteredSelected = filteredRecipients.length > 0 && filteredRecipients.every(r => selectedIds.has(getRecipientKey(r)));

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    const newSelected = new Set(selectedIds);
    if (allFilteredSelected) {
      filteredRecipients.forEach(r => newSelected.delete(getRecipientKey(r)));
    } else {
      filteredRecipients.forEach(r => newSelected.add(getRecipientKey(r)));
    }
    setSelectedIds(newSelected);
  };
  
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSendPress = () => {
    // In a real app we'd pass selectedIds via store or router params.
    router.push(`/${roleGroup}/messaging/compose-message` as any);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <MessagingFlowHeader 
        title="Select Recipients"
        subtitle="Choose members to message"
        step={1}
        onBack={() => router.back()}
      />
      
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={15} color={MessagingColors.faint} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search recipients..."
            placeholderTextColor={MessagingColors.faint}
          />
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {FILTERS.map(f => (
            <Pressable 
              key={f.id} 
              style={[styles.chip, activeFilter === f.id && styles.chipActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[styles.chipText, activeFilter === f.id && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.selectAllRow}>
        <Pressable style={styles.selectAllLeft} onPress={toggleAll}>
          <View style={[styles.checkbox, allFilteredSelected && styles.checkboxSelected]}>
            {allFilteredSelected && <Feather name="check" size={12} color="#fff" strokeWidth={3} />}
          </View>
          <Text style={styles.selectAllText}>Select all ({filteredRecipients.length})</Text>
        </Pressable>
        <Pressable onPress={clearSelection}>
          <Text style={styles.clearBtn}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredRecipients}
        keyExtractor={(item) => getRecipientKey(item)}
        renderItem={({ item, index }) => (
          <RecipientListItem
            recipient={item}
            index={index}
            isSelected={selectedIds.has(getRecipientKey(item))}
            onToggle={toggleSelection}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No members match</Text>
              <Text style={styles.emptySubtitle}>Try a different search term or clear the filter.</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.footer}>
        <Text style={styles.footCount}>
          <Text style={styles.footCountBold}>{selectedIds.size}</Text> selected
        </Text>
        <Pressable 
          disabled={selectedIds.size === 0} 
          onPress={handleSendPress}
        >
          {({ pressed }) => (
            <LinearGradient
              colors={selectedIds.size === 0 ? ['#D6D5DE', '#D6D5DE'] : [MessagingColors.accent, MessagingColors.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryBtn, selectedIds.size > 0 && styles.primaryBtnShadow, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MessagingColors.bg,
  },
  searchWrap: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  search: {
    backgroundColor: MessagingColors.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#141428',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: MessagingColors.ink,
    padding: 0,
  },
  chipsWrap: {
    marginTop: 13,
    marginBottom: 4,
  },
  chipsContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
    backgroundColor: MessagingColors.card,
  },
  chipActive: {
    backgroundColor: MessagingColors.dark,
    borderColor: MessagingColors.dark,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: MessagingColors.muted,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  selectAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#D3D2DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: MessagingColors.accent,
    borderColor: MessagingColors.accent,
  },
  selectAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: MessagingColors.muted,
  },
  clearBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: MessagingColors.dark,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 130, // space for footer
    paddingTop: 2,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: MessagingColors.muted,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: MessagingColors.faint,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: MessagingColors.card,
    borderTopWidth: 1,
    borderTopColor: MessagingColors.line,
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 34, // Safe area bottom usually
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#141428',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 10,
  },
  footCount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: MessagingColors.muted,
  },
  footCountBold: {
    color: MessagingColors.ink,
    fontSize: 15,
  },
  primaryBtn: {
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
