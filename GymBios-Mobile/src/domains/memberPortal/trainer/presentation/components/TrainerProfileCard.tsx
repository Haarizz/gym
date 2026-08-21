import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export interface TrainerProfileData {
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  reviews: number;
  bio: string;
  phone?: string;
}

interface TrainerProfileCardProps {
  trainer: TrainerProfileData;
}

export function TrainerProfileCard({ trainer }: TrainerProfileCardProps) {
  const initials = trainer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleMessage = () => {
    Alert.alert('Message Coach', `Starting chat with ${trainer.name}...`);
  };

  const handleCall = () => {
    if (trainer.phone) {
      Linking.openURL(`tel:${trainer.phone}`).catch(() => {
        Alert.alert('Call Coach', `Calling ${trainer.name} at ${trainer.phone}`);
      });
    } else {
      Alert.alert('Call Coach', `Calling ${trainer.name}...`);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{trainer.name}</Text>
          <Text style={styles.specialization}>{trainer.specialization}</Text>

          <View style={styles.metaRow}>
            <View style={styles.starRow}>
              <Feather name="star" size={13} color="#FDE047" />
              <Text style={styles.metaText}>{trainer.rating}</Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{trainer.experience} exp</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{trainer.reviews} reviews</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}
          onPress={handleMessage}
          accessibilityRole="button"
          accessibilityLabel="Message Trainer"
        >
          <Feather name="message-square" size={16} color={BrandColors.trainerAmber} />
          <Text style={styles.messageButtonText}>Message</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          onPress={handleCall}
          accessibilityRole="button"
          accessibilityLabel="Call Trainer"
        >
          <Feather name="phone" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.trainerAmber,
    borderRadius: Radius.xl,
    padding: Spacing.four + 2,
    shadowColor: '#EA580C',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  specialization: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  messageButtonText: {
    fontSize: TypographyScale.body,
    fontWeight: '800',
    color: BrandColors.trainerAmber,
  },
  callButton: {
    width: 48,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
