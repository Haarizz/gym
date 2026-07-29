import React from 'react';
import {
  Pressable,
  Text,
} from 'react-native';

import { styles } from './ReportFooterAction.styles';
import { ReportFooterActionProps } from './ReportFooterAction.types';

export function ReportFooterAction({
  label,
  onPress,
}: ReportFooterActionProps) {
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.label}>
        {label} →
      </Text>
    </Pressable>
  );
}