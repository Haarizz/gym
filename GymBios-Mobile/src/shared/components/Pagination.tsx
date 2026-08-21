import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Spacing, Radius } from '@/core/theme';
import { Typography } from './Typography';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const theme = useTheme();

  if (totalPages <= 1) {
    return null;
  }

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title="Previous"
        variant="outline"
        size="md"
        disabled={currentPage <= 1}
        onPress={handlePrev}
        style={styles.button}
      />
      <View style={styles.pageInfo}>
        <Typography variant="bodySmall" style={{ color: theme.textSecondary }}>
          Page {currentPage} of {totalPages}
        </Typography>
      </View>
      <Button
        title="Next"
        variant="outline"
        size="md"
        disabled={currentPage >= totalPages}
        onPress={handleNext}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
  },
  button: {
    minWidth: 100,
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
