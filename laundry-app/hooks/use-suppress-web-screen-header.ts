import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { Platform } from "react-native";

/** Hides React Navigation's built-in header on web (sidebar already labels the screen). */
export function useSuppressWebScreenHeader() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    navigation.setOptions({
      headerShown: false,
      title: "",
      headerTitle: "",
      header: () => null,
    });
  }, [navigation]);
}
