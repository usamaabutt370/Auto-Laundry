import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTabBarBottomInset } from "@/components/bottom-tab-bar";
import {
  CustomerHomeFeed,
  HomeFiltersMapFab,
  HomeFiltersSheet,
  type FulfillmentFilter,
  type HomeServiceId,
} from "@/components/customer-home-feed";
import { CustomerHomeMap } from "@/components/customer-home-map";
import { CustomerHomeMapOverlays } from "@/components/customer-home-map-overlays";
import { strings } from "@/constants/strings";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  useCustomerHomeMapData,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";

export default function CustomerHomeScreen() {
  const router = useRouter();
  const s = strings.customer.home;
  const insets = useSafeAreaInsets();
  const { hideBottomTabBar, isWebDesktop } = useResponsiveLayout();
  const { setPickupDeliveryRequested, setSelectedServiceIds } = useCustomerOrderDraft();
  const tabBarInset = getTabBarBottomInset(Math.max(insets.bottom, 8), hideBottomTabBar);
  const showWebTopNav = isWebDesktop;
  const mapData = useCustomerHomeMapData();
  const partnerSheetOpen = mapData.selectedPartner != null;

  const [viewMode, setViewMode] = useState<"feed" | "map">("feed");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");

  const fabBottom = showWebTopNav ? Math.max(insets.bottom, 24) : tabBarInset + 16;
  const mapBottomInset = showWebTopNav ? 72 : tabBarInset + 72;
  const recenterBottomOffset = showWebTopNav ? Math.max(insets.bottom, 24) + 64 : tabBarInset + 80;

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

  const handleFilters = () => {
    setFiltersOpen(true);
  };

  return (
    <View style={styles.container}>
      {viewMode === "map" ? (
        <>
          <CustomerHomeMap
            strings={s}
            onPartnerPress={(partnerId, mode) =>
              router.push({
                pathname: "/(customer)/launderer-detail",
                params: { id: partnerId, mode },
              })
            }
            recenterBottomOffset={recenterBottomOffset}
            mapBottomInset={mapBottomInset}
            mapData={mapData}
            partnerSheetHost="screen"
          />
          <CustomerHomeMapOverlays
            strings={s}
            loadingPartners={mapData.loadingPartners}
            recenterBottomOffset={recenterBottomOffset}
            mapBottomInset={mapBottomInset}
            onRecenter={() => {}}
            selectedPartner={mapData.selectedPartner}
            selectedPartnerPrimaryImage={mapData.selectedPartnerPrimaryImage}
            selectedPartnerUpdatedLabel={mapData.selectedPartnerUpdatedLabel}
            onClosePartner={() => mapData.setSelectedPartnerId(null)}
            onPartnerPress={(partnerId, mode) =>
              router.push({
                pathname: "/(customer)/launderer-detail",
                params: { id: partnerId, mode },
              })
            }
            showMapChrome={false}
            showPartnerSheet
          />
        </>
      ) : (
        <CustomerHomeFeed
          mapData={mapData}
          fulfillmentFilter={fulfillmentFilter}
          bottomInset={tabBarInset}
          onPressCategory={handleCategory}
          onPressPartner={handlePartner}
          onSeeAll={handleSeeAll}
          onPressNotifications={() => router.push("/(customer)/(tabs)/chat")}
          onPressProfile={() => router.push("/(customer)/(tabs)/profile")}
        />
      )}

      <View pointerEvents={partnerSheetOpen ? "none" : "box-none"} style={StyleSheet.absoluteFill}>
        <HomeFiltersMapFab
          viewMode={viewMode}
          bottom={fabBottom}
          onFilters={handleFilters}
          onMap={() => setViewMode((mode) => (mode === "map" ? "feed" : "map"))}
        />
      </View>

      <HomeFiltersSheet
        visible={filtersOpen}
        value={fulfillmentFilter}
        onChange={setFulfillmentFilter}
        onClose={() => setFiltersOpen(false)}
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
