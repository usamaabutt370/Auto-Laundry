import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import {
  CustomerHomeFeed,
  type FulfillmentFilter,
  type HomeServiceId,
} from "@/components/customer-home-feed";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  useCustomerHomeMapData,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";

export default function CustomerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hideBottomTabBar } = useResponsiveLayout();
  const { setPickupDeliveryRequested, setSelectedServiceIds } = useCustomerOrderDraft();
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
        onPressProfile={() => router.push("/(customer)/(tabs)/profile")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
});
