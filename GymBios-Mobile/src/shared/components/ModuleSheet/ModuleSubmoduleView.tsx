import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors } from '@/core/theme';
import type { ModuleItem, ModuleChild } from './types';
import { styles } from './ModuleSheet.styles';

interface ModuleSubmoduleViewProps {
  module: ModuleItem;
  onBack: () => void;
  onClose: () => void;
  onSelectSubmodule: (submodule: ModuleChild) => void;
}

export function ModuleSubmoduleView({
  module,
  onBack,
  onClose,
  onSelectSubmodule,
}: ModuleSubmoduleViewProps) {
  const { t } = useTranslation();
  const children = module.children || [];

  return (
    <View style={styles.submoduleViewContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('shared.goBack')}
          >
            <Feather name="arrow-left" size={24} color={BrandColors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t(`shared.modules.${module.id}`, { defaultValue: module.title })}</Text>
        </View>

        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close modules"
        >
          <Feather name="x" size={24} color={BrandColors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {children.map((child) => (
          <Pressable
            key={child.id}
            style={styles.gridItem}
            onPress={() => onSelectSubmodule(child)}
            android_ripple={{ color: '#F3F4F6', borderless: true, radius: 40 }}
            accessibilityRole="button"
            accessibilityLabel={t(`shared.modules.${child.id}`, { defaultValue: child.title })}
          >
            <View style={styles.gridIconContainer}>
              <Feather name={child.icon} size={24} color={BrandColors.teal} />
            </View>
            <Text style={styles.gridItemTitle} numberOfLines={2}>
              {t(`shared.modules.${child.id}`, { defaultValue: child.title })}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
