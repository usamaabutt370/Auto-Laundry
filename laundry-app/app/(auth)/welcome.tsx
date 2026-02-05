import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { OnboardingColors } from '@/constants/onboarding-theme';
import { strings } from '@/constants/strings';

/**
 * Welcome screen (first in auth flow): Select your experience – User or Courier.
 * Shown after onboarding for new users, or first when returning users open auth.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const s = strings.auth.welcome;

  const handleSelectUser = () => {
    router.push('/(auth)/phone');
  };

  const handleSelectCourier = () => {
    router.push('/(auth)/phone');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.subtitle}>{s.subtitle}</Text>

        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [styles.card, styles.cardUser, pressed && styles.cardPressed]}
            onPress={handleSelectUser}
            accessibilityRole="button"
            accessibilityLabel={s.user.title}>
            <View style={styles.cardIconWrap}>
              <IconSymbol name="person.fill" size={48} color={OnboardingColors.iconOnCard} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{s.user.title}</Text>
              <Text style={styles.cardDescription}>{s.user.description}</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.card, styles.cardCourier, pressed && styles.cardPressed]}
            onPress={handleSelectCourier}
            accessibilityRole="button"
            accessibilityLabel={s.courier.title}>
            <View style={styles.cardIconWrap}>
              <IconSymbol name="scooter" size={48} color={OnboardingColors.iconOnCard} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{s.courier.title}</Text>
              <Text style={styles.cardDescription}>{s.courier.description}</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnboardingColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: OnboardingColors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: OnboardingColors.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  cards: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    minHeight: 100,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardUser: {
    backgroundColor: OnboardingColors.cardUser,
  },
  cardCourier: {
    backgroundColor: OnboardingColors.cardCourier,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: OnboardingColors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: OnboardingColors.textSecondary,
    lineHeight: 20,
  },
});
