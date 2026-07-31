import { Text, View } from 'react-native';

import { ModuleCard } from './ModuleCard';
import { styles } from './ModuleSheet.styles';
import type { ModuleItem, ModuleSection as ModuleSectionType } from './types';

interface ModuleSectionProps {
  section: ModuleSectionType;
  onPress: (item: ModuleItem) => void;
}

export function ModuleSection({
  section,
  onPress,
}: ModuleSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {section.title}
      </Text>

      <View style={styles.grid}>
        {section.items.map((item) => (
          <ModuleCard
            key={item.id}
            item={item}
            onPress={onPress}
          />
        ))}
      </View>
    </View>
  );
}