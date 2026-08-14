import React, { useState, useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

import { topLevelModules } from './modules';
import { ModuleListView } from './ModuleListView';
import { ModuleSubmoduleView } from './ModuleSubmoduleView';
import { styles } from './ModuleSheet.styles';
import type { ModuleItem, ModuleChild } from './types';

interface ModuleSheetProps {
  onNavigate?: () => void; // This acts as the close trigger
}

export function ModuleSheet({ onNavigate }: ModuleSheetProps) {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);

  // Reset to Level 1 when the sheet is closed (if it gets unmounted and remounted, state resets naturally. 
  // If we want to ensure it resets on external closes, we might need a useEffect depending on how the parent handles it.
  // We'll rely on the parent unmounting or we can expose a reset ref if necessary. 
  // For now, we assume standard behavior where opening/closing resets if unmounted, or we just handle it on manual close.

  // Handle hardware back button on Android
  useEffect(() => {
    if (!selectedModule) return;

    const onBackPress = () => {
      setSelectedModule(null);
      return true; // Prevent default behavior (closing the whole app/sheet)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedModule]);

  const handleLevel1Select = (item: ModuleItem) => {
    const hasChildren = item.children && item.children.length > 0;
    
    if (hasChildren) {
      setSelectedModule(item);
    } else if (item.route) {
      // Direct navigation
      onNavigate?.(); // Close sheet
      setSelectedModule(null); // Reset state for next open
      router.push(item.route as never);
    }
  };

  const handleSubmoduleSelect = (child: ModuleChild) => {
    onNavigate?.(); // Close sheet
    setSelectedModule(null); // Reset state for next open
    router.push(child.route as never);
  };

  const handleBack = () => {
    setSelectedModule(null);
  };

  const handleClose = () => {
    onNavigate?.();
    setSelectedModule(null);
  };

  return (
    <View style={styles.container}>
      {selectedModule === null ? (
        <ModuleListView 
          modules={topLevelModules} 
          onSelect={handleLevel1Select} 
        />
      ) : (
        <ModuleSubmoduleView
          module={selectedModule}
          onBack={handleBack}
          onClose={handleClose}
          onSelectSubmodule={handleSubmoduleSelect}
        />
      )}
    </View>
  );
}