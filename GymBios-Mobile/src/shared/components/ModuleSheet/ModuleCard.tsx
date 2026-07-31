import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { BrandColors } from '@/core/theme';

import type { ModuleItem } from './types';
import { styles } from './ModuleSheet.styles';

interface ModuleCardProps {
  item: ModuleItem;
  onPress: (item: ModuleItem) => void;
}

export function ModuleCard({ item, onPress }: ModuleCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(item)}
      android_ripple={{ color: '#F3F4F6' }}
    >
      <View style={styles.iconContainer}>
        <Feather
          name={item.icon}
          size={22}
          color={BrandColors.teal}
        />
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      {item.subtitle ? (
        <Text style={styles.cardSubtitle} numberOfLines={2}>
          {item.subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}