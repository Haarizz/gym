import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { BrandHeader, ComingSoonCard, RoleModeCard, Button } from '@/shared/components';

import { ROLE_MODE_CARDS } from '../config/roleConfig';
import { MEMBER_AUTH_HREF } from '../navigation/routes';
import type { AppRole } from '../../domain/valueObjects/AppRole';

interface RoleSelectionScreenProps {
  onRoleSelect: (role: AppRole) => void;
}

export function RoleSelectionScreen({ onRoleSelect }: RoleSelectionScreenProps) {
  const router = useRouter();
  return (
    <LinearGradient
      colors={[BrandColors.screenBackground, BrandColors.screenBackgroundAlt]}
      style={styles.container}>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ROLE_MODE_CARDS.map((card) => (
          <RoleModeCard
            key={card.role}
            title={card.title}
            description={card.description}
            accentColor={card.accentColor}
            borderColor={card.borderColor}
            iconName={card.iconName}
            onPress={() => onRoleSelect(card.role)}
          />
        ))}
        <ComingSoonCard />
        <Button 
          variant="outline" 
          label="Return to Member Login" 
          onPress={() => router.replace(MEMBER_AUTH_HREF)} 
          style={{ marginTop: Spacing.two }}
        />
        <View style={styles.accentBar}>
          <LinearGradient
            colors={[BrandColors.teal, BrandColors.memberGold, BrandColors.trainerAmber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentGradient}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  accentBar: {
    marginTop: Spacing.four,
  },
  accentGradient: {
    height: 4,
    borderRadius: Radius.full,
  },
});
