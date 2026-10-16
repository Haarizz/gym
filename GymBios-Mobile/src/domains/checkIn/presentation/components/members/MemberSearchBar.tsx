import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SearchBar } from '@/shared/components/SearchBar';

interface MemberSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  isLoading?: boolean;
}

export function MemberSearchBar({ value, onChangeText, isLoading }: MemberSearchBarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={t('checkIn.members.searchPlaceholder')}
        // Assume SearchBar supports these or they are ignored
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
