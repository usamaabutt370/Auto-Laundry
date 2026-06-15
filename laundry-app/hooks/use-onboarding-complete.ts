import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = '@laundry_app_onboarding_complete';

const onboardingEnabled = Platform.OS === 'ios';

export function useOnboardingComplete(): {
  hasCompleted: boolean | null;
  setCompleted: () => Promise<void>;
} {
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(
    onboardingEnabled ? null : true,
  );

  useEffect(() => {
    if (!onboardingEnabled) return;

    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((value) => {
      setHasCompleted(value === 'true');
    });
  }, []);

  const setCompleted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasCompleted(true);
  }, []);

  return { hasCompleted, setCompleted };
}
