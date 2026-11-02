import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors } from '@/core/theme';
import type { ModuleItem } from './types';
import { styles } from './ModuleSheet.styles';

interface ModuleListViewProps {
  modules: ModuleItem[];
  onSelect: (item: ModuleItem) => void;
}

export function ModuleListView({ modules, onSelect }: ModuleListViewProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.listViewContainer}>
      {modules.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const title = t(`shared.modules.${item.id}`, { defaultValue: item.title });
        
        return (
          <Pressable
            key={item.id}
            style={styles.listItem}
            onPress={() => onSelect(item)}
            android_ripple={{ color: '#F3F4F6' }}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={hasChildren ? t('shared.modules.opensMoreOptions') : t('shared.modules.navigatesToModule')}
          >
            <View style={styles.listItemContent}>
              <View style={styles.listIconContainer}>
                <Feather name={item.icon} size={18} color={BrandColors.teal} />
              </View>
              <Text style={styles.listItemTitle}>{title}</Text>
            </View>
            
            {hasChildren && (
              <Feather name="chevron-right" size={20} color={BrandColors.textSecondary} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
