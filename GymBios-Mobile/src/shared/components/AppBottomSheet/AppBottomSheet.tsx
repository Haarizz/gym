import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { styles } from './AppBottomSheet.styles';
import type { AppBottomSheetProps } from './AppBottomSheet.types';

export function AppBottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: AppBottomSheetProps) {
  const translateY = useRef(new Animated.Value(600)).current;
  // Controls whether <Modal> is mounted at all — lags behind `visible` on close.
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      // Let Modal mount at translateY=600 first, then animate in.
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsMounted(false); // only unmount Modal AFTER the animation completes
        }
      });
    }
  }, [visible, translateY]);

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>

              <Pressable style={styles.closeButton} onPress={onClose}>
                <Feather name="x" size={22} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}