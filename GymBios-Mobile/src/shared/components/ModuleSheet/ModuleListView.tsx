import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors } from '@/core/theme';
import type { ModuleItem } from './types';
import { styles } from './ModuleSheet.styles';

interface ModuleListViewProps {
  modules: ModuleItem[];
  onSelect: (item: ModuleItem) => void;
}

export function ModuleListView({ modules, onSelect }: ModuleListViewProps) {
  return (
    <View style={styles.listViewContainer}>
      {modules.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        
        return (
          <Pressable
            key={item.id}
            style={styles.listItem}
            onPress={() => onSelect(item)}
            android_ripple={{ color: '#F3F4F6' }}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityHint={hasChildren ? 'Opens more options' : 'Navigates to module'}
          >
            <View style={styles.listItemContent}>
              <View style={styles.listIconContainer}>
                <Feather name={item.icon} size={18} color={BrandColors.teal} />
              </View>
              <Text style={styles.listItemTitle}>{item.title}</Text>
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
