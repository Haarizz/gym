import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { Text, TextInput } from '@/shared/components/AppText';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { MessagingFlowHeader } from '../components/MessagingFlowHeader';
import { useMessagingTemplates } from '../../hooks/useMessagingHooks';
import { CreateTemplateBottomSheet } from '../components/bottomSheets/CreateTemplateBottomSheet';
import { MessagingColors } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

export function MessagingTemplatesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const roleGroup = segments[0] || '(admin)';
  
  const filters = useMemo(() => [
    { id: 'all', label: t('messaging.templates.filters.all') },
    { id: 'retention', label: t('messaging.templates.filters.retention') },
    { id: 'promotion', label: t('messaging.templates.filters.promotion') },
    { id: 'custom', label: t('messaging.templates.filters.custom') },
  ], [t]);

  const { data: templates = [], isLoading } = useMessagingTemplates();
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (tpl) =>
          tpl.name.toLowerCase().includes(lowerQuery) ||
          tpl.subject.toLowerCase().includes(lowerQuery)
      );
    }
    
    if (activeFilter !== 'all') {
      result = result.filter(tpl => tpl.category?.toLowerCase() === activeFilter);
    }
    
    return result;
  }, [templates, searchQuery, activeFilter]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <MessagingFlowHeader
        title={t('messaging.templates.title')}
        subtitle={t('messaging.templates.subtitle')}
        showStepper={false}
        onBack={() => router.back()}
      />
      
      <View style={styles.actionsContainer}>
        <View style={styles.search}>
          <Feather name="search" size={15} color={MessagingColors.faint} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('messaging.templates.searchPlaceholder')}
            placeholderTextColor={MessagingColors.faint}
          />
        </View>

        <Pressable onPress={() => setSheetVisible(true)} style={{ marginTop: 12 }}>
          <LinearGradient
            colors={[MessagingColors.accent, MessagingColors.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButton}
          >
            <Feather name="plus" size={16} color="#ffffff" />
            <Text style={styles.createButtonText}>{t('messaging.templates.createNew')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {filters.map(f => (
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

      <FlatList
        data={filteredTemplates}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.templateCard}
            onPress={() => {
              router.navigate({
                pathname: `/${roleGroup}/messaging/compose-message` as any,
                params: {
                  templateSubject: item.subject,
                  templateContent: item.content,
                  templateType: item.type,
                }
              });
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Feather 
                  name={item.type === 'sms' ? 'message-circle' : item.type === 'in-app' ? 'bell' : 'mail'} 
                  size={16} 
                  color={MessagingColors.muted} 
                />
              </View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.templateName}>{item.name}</Text>
                <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
              </View>
              <Pressable style={styles.moreBtn}>
                <Feather name="more-vertical" size={16} color={MessagingColors.faint} />
              </Pressable>
            </View>
            
            <Text style={styles.snippet} numberOfLines={2}>{item.content}</Text>
            
            <View style={styles.tagsRow}>
              <Text style={[styles.tag, styles.categoryTag]}>{item.category}</Text>
              <Text style={[styles.tag, styles.typeTag]}>{item.type}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>{t('messaging.templates.noTemplatesTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('messaging.templates.noTemplatesSubtitle')}</Text>
            </View>
          ) : null
        }
      />

      <CreateTemplateBottomSheet
        visible={isSheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MessagingColors.bg,
  },
  actionsContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  search: {
    backgroundColor: MessagingColors.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: MessagingColors.ink,
    padding: 0,
  },
  createButton: {
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  chipsWrap: {
    marginTop: 18,
    marginBottom: 8,
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
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 12,
  },
  templateCard: {
    backgroundColor: MessagingColors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
    shadowColor: '#141428',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '700',
    color: MessagingColors.ink,
    marginBottom: 2,
  },
  subject: {
    fontSize: 12,
    color: MessagingColors.muted,
    fontWeight: '600',
  },
  moreBtn: {
    padding: 4,
  },
  snippet: {
    fontSize: 12,
    lineHeight: 18,
    color: MessagingColors.muted,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    overflow: 'hidden',
  },
  categoryTag: {
    backgroundColor: '#EEEDF4',
    color: MessagingColors.muted,
  },
  typeTag: {
    backgroundColor: MessagingColors.tint,
    color: MessagingColors.dark,
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
});
