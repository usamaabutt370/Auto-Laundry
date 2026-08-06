import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import type { PartnerMapMarker } from "@/hooks/use-customer-home-map-data";
import { theme } from "@/constants/theme";

const c = theme.colors;

type HomeStrings = {
  dropOff: string;
  pickUpDelivery: string;
  viewPartnerDetails: string;
  closePartnerDetails: string;
  noImage: string;
  updatedPrefix: string;
};

type Props = {
  strings: HomeStrings;
  loadingPartners: boolean;
  recenterBottomOffset: number;
  mapBottomInset: number;
  onRecenter: () => void;
  selectedPartner: PartnerMapMarker | null;
  selectedPartnerPrimaryImage: string | null;
  selectedPartnerUpdatedLabel: string | null;
  onClosePartner: () => void;
  onPartnerPress: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
  showMapChrome?: boolean;
  showPartnerSheet?: boolean;
};

export function CustomerHomeMapOverlays({
  strings,
  loadingPartners,
  recenterBottomOffset,
  mapBottomInset,
  onRecenter,
  selectedPartner,
  selectedPartnerPrimaryImage,
  selectedPartnerUpdatedLabel,
  onClosePartner,
  onPartnerPress,
  showMapChrome = true,
  showPartnerSheet = true,
}: Props) {
  const partnerSheetBottom =
    mapBottomInset > 0 ? mapBottomInset + 12 : Math.max(12, recenterBottomOffset - 58);

  return (
    <>
      {showMapChrome && loadingPartners ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      ) : null}

      {showMapChrome ? (
        <Pressable
          onPress={onRecenter}
          style={({ pressed }) => [
            styles.recenterBtn,
            { bottom: recenterBottomOffset },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Recenter map"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={c.background} />
        </Pressable>
      ) : null}

      {showPartnerSheet && selectedPartner ? (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable style={styles.sheetBackdrop} onPress={onClosePartner} accessibilityRole="button" />
          <View
            style={[
              styles.partnerSheetWrap,
              { bottom: partnerSheetBottom },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.partnerSheet}>
              <View style={styles.partnerSheetTop}>
                <View style={styles.partnerSheetMediaCol}>
                  {selectedPartnerPrimaryImage ? (
                    <Image
                      source={{ uri: selectedPartnerPrimaryImage }}
                      style={styles.partnerSheetImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.partnerSheetImagePlaceholder}>
                      <MaterialCommunityIcons name="image-off-outline" size={22} color={c.gray50} />
                      <Text style={styles.partnerSheetImagePlaceholderText}>{strings.noImage}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.partnerSheetContentCol}>
                  <View style={styles.partnerSheetHeaderRow}>
                    <View style={styles.partnerInfoWrap}>
                      <PartnerNameWithBadge
                        name={selectedPartner.business_name.trim()}
                        verified
                        nameStyle={styles.partnerSheetTitle}
                      />
                      <Text style={styles.partnerSheetSubtitle}>
                        {selectedPartner.fulfillmentMode === "pickupDelivery"
                          ? strings.pickUpDelivery
                          : strings.dropOff}
                      </Text>
                    </View>
                    <Pressable
                      onPress={onClosePartner}
                      style={({ pressed }) => [styles.partnerSheetClose, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={strings.closePartnerDetails}
                    >
                      <MaterialCommunityIcons name="close" size={20} color={c.background} />
                    </Pressable>
                  </View>
                  <View style={styles.partnerDetailsGrid}>
                    {selectedPartner.phone_number?.trim() ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons name="phone-outline" size={14} color={c.gray50} />
                        <Text style={styles.partnerSheetMeta}>
                          {selectedPartner.phone_number.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {selectedPartner.available_time?.trim() ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={c.gray50} />
                        <Text style={styles.partnerSheetMeta} numberOfLines={1}>
                          {selectedPartner.available_time.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {selectedPartner.address?.trim() ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={14}
                          color={c.gray50}
                        />
                        <Text style={styles.partnerSheetMeta} numberOfLines={2}>
                          {selectedPartner.address.trim()}
                        </Text>
                      </View>
                    ) : null}
                    {selectedPartnerUpdatedLabel ? (
                      <View style={styles.partnerMetaRow}>
                        <MaterialCommunityIcons
                          name="calendar-refresh-outline"
                          size={14}
                          color={c.gray50}
                        />
                        <Text style={styles.partnerSheetMeta} numberOfLines={1}>
                          {strings.updatedPrefix} {selectedPartnerUpdatedLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  onClosePartner();
                  onPartnerPress(selectedPartner.id, selectedPartner.fulfillmentMode);
                }}
                style={({ pressed }) => [styles.partnerSheetAction, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={strings.viewPartnerDetails}
              >
                <Text style={styles.partnerSheetActionText}>{strings.viewPartnerDetails}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={c.white} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  mapLoading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(3, 15, 27, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    elevation: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  partnerSheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 310,
  },
  partnerSheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: c.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  partnerSheetTop: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  partnerSheetMediaCol: {
    width: 108,
    minHeight: 124,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    flexShrink: 0,
    position: "relative",
  },
  partnerSheetImage: {
    ...StyleSheet.absoluteFillObject,
  },
  partnerSheetImagePlaceholder: {
    flex: 1,
    minHeight: 124,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  partnerSheetImagePlaceholderText: {
    color: c.gray50,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  partnerSheetContentCol: {
    flex: 1,
    minWidth: 0,
  },
  partnerSheetHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  partnerInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  partnerSheetTitle: {
    color: c.background,
    fontSize: 16,
    fontWeight: "700",
  },
  partnerSheetSubtitle: {
    marginTop: 2,
    color: c.gray50,
    fontSize: 13,
    fontWeight: "600",
  },
  partnerSheetMeta: {
    color: c.gray50,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  partnerDetailsGrid: {
    marginTop: 8,
    gap: 6,
  },
  partnerMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  partnerSheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  partnerSheetAction: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: c.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  partnerSheetActionText: {
    color: c.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
