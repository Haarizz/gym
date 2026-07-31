import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { moduleSections } from './modules';
import { ModuleSection } from './ModuleSection';
import { styles } from './ModuleSheet.styles';
import type { ModuleItem } from './types';

interface ModuleSheetProps {
  onNavigate?: () => void;
}

export function ModuleSheet({ onNavigate }: ModuleSheetProps) {
  const router = useRouter();

  const handlePress = (item: ModuleItem) => {
    onNavigate?.();
    router.push(item.route as never);
  };

  return (
    <View style={styles.container}>
      {moduleSections.map((section) => (
        <ModuleSection
          key={section.id}
          section={section}
          onPress={handlePress}
        />
      ))}
    </View>
  );
}