import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { AppHeader } from '@/shared/components/AppHeader';
import { Button } from '@/shared/components/Button';
import { BrandColors, Spacing, TypographyScale, Radius } from '@/core/theme';
import { useMessagingTemplates } from '../../hooks/useMessagingHooks';
import { CreateTemplateBottomSheet } from '../components/bottomSheets/CreateTemplateBottomSheet';

export function MessagingTemplatesScreen() {
  const router = useRouter();
  const { data: templates = [], isLoading } = useMessagingTemplates();
  const [isSheetVisible, setSheetVisible] = useState(false);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="Templates"
        subtitle="Manage reusable message templates"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => router.back()}
      />
      
      <View style={styles.actionsContainer}>
        <Button
          title="Create New Template"
          onPress={() => setSheetVisible(true)}
          style={styles.createButton}
        />
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.templateCard}
            onPress={() => {
              router.navigate({
                pathname: '/(admin)/messaging/compose-message',
                params: {
                  templateSubject: item.subject,
                  templateContent: item.content,
                  templateType: item.type,
                }
              });
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.templateName}>{item.name}</Text>
              <Feather name="chevron-right" size={20} color={BrandColors.textSecondary} />
            </View>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={styles.category}>{item.category} • {item.type}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No templates found.</Text>
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
    backgroundColor: BrandColors.screenBackground,
  },
  actionsContainer: {
    padding: Spacing.four,
    backgroundColor: BrandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  createButton: {
    width: '100%',
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  templateCard: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  templateName: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  subject: {
    fontSize: TypographyScale.small,
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  category: {
    fontSize: TypographyScale.caption,
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
});
