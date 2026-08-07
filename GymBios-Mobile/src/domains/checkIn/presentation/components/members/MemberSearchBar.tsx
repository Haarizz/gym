import { View, StyleSheet } from 'react-native';
import { SearchBar } from '@/shared/components/SearchBar';
import { Spacing } from '@/core/theme';

interface MemberSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  isLoading?: boolean;
}

export function MemberSearchBar({ value, onChangeText, isLoading }: MemberSearchBarProps) {
  return (
    <View style={styles.container}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder="Search by name or ID..."
        // Assume SearchBar supports these or they are ignored
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
});
