import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import {
  CustomerHomeFeed,
  type FulfillmentFilter,
  type HomeServiceId,
} from "@/components/customer-home-feed";
import { UI } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  useCustomerHomeMapData,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";
import { getStrings } from "@/locales";

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const sActions = getStrings(locale).customer.ordersTab.orderActions;
  const insets = useSafeAreaInsets();
  const { hideBottomTabBar } = useResponsiveLayout();
  const { draft, setPickupDeliveryRequested, setSelectedServiceIds, reorderSource, resetDraft } =
    useCustomerOrderDraft();
  const tabBarInset = getTabBarBottomInset(Math.max(insets.bottom, 8), hideBottomTabBar);
  const mapData = useCustomerHomeMapData();
  const [fulfillmentFilter] = useState<FulfillmentFilter>("all");

  useFocusEffect(
    useCallback(() => {
      return () => {
        mapData.setSelectedPartnerId(null);
      };
    }, [mapData.setSelectedPartnerId]),
  );

  const goToPickLaunderer = (
    mode: "dropoff" | "pickupDelivery",
    service?: HomeServiceId,
  ) => {
    router.push({
      pathname: "/(customer)/pick-launderer",
      params: service ? { mode, service } : { mode },
    });
  };

  const handleCategory = (service: HomeServiceId) => {
    // While reordering, keep the carried-over services instead of resetting to one category.
    if (reorderSource) {
      goToPickLaunderer(draft.pickupDeliveryRequested ? "pickupDelivery" : "dropoff", service);
      return;
    }
    const wantsPickup = fulfillmentFilter !== "dropoff";
    setPickupDeliveryRequested(wantsPickup);
    setSelectedServiceIds([service]);
    goToPickLaunderer(wantsPickup ? "pickupDelivery" : "dropoff", service);
  };

  const handlePartner = (partner: PartnerMapMarker) => {
    router.push({
      pathname: "/(customer)/launderer-detail",
      params: { id: partner.id, mode: partner.fulfillmentMode },
    });
  };

  const handleSeeAll = () => {
    goToPickLaunderer(fulfillmentFilter === "dropoff" ? "dropoff" : "pickupDelivery");
  };

  return (
    <View style={styles.container}>
      <CustomerHomeFeed
        mapData={mapData}
        fulfillmentFilter={fulfillmentFilter}
        bottomInset={tabBarInset}
        onPressCategory={handleCategory}
        onPressPartner={handlePartner}
        onSeeAll={handleSeeAll}
        onPressProfile={() => {
          if (!user?.id) {
            router.push("/(auth)/login");
            return;
          }
          router.push("/(customer)/(tabs)/profile");
        }}
      />
      {reorderSource ? (
        <View style={[styles.reorderBanner, { bottom: tabBarInset + 12 }]}>
          <View style={styles.reorderIcon}>
            <MaterialCommunityIcons name="refresh" size={18} color={UI.purple} />
          </View>
          <View style={styles.reorderCopy}>
            <Text style={styles.reorderTitle} numberOfLines={1}>
              {sActions.reorderBannerTitle.replace("{{ref}}", reorderSource.orderRef)}
            </Text>
            <Text style={styles.reorderHint} numberOfLines={2}>
              {sActions.reorderBannerHint}
            </Text>
          </View>
          <Pressable
            onPress={resetDraft}
            hitSlop={10}
            style={styles.reorderClose}
            accessibilityRole="button"
            accessibilityLabel={sActions.cancelReorder}
          >
            <MaterialCommunityIcons name="close" size={18} color={UI.muted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  reorderBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: "#E4DEFF",
    shadowColor: UI.shadowStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  reorderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  reorderCopy: { flex: 1, minWidth: 0 },
  reorderTitle: { fontSize: 13, fontFamily: "Poppins-SemiBold", color: UI.text },
  reorderHint: { fontSize: 11, lineHeight: 15, fontFamily: "Poppins-Regular", color: UI.muted },
  reorderClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.iconWell,
  },
});
