import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

/**
 * Legacy route: bag count + details now live on `wash-fold-order`.
 */
export default function BagsScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(customer)/wash-fold-order");
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: "#0d4a5c" }} />;
}
