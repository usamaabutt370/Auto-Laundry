import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { PartnerMapMarker } from "@/hooks/use-customer-home-map-data";
import { theme } from "@/constants/theme";

const c = theme.colors;

type HomeStrings = {
  dropOff: string;
  pickUpDelivery: string;
};

type Props = {
  strings: HomeStrings;
  loadingPartners: boolean;
  recenterBottomOffset: number;
  onRecenter: () => void;
  selectedPartner: PartnerMapMarker | null;
  selectedPartnerPrimaryImage: string | null;
  selectedPartnerUpdatedLabel: string | null;
  onClosePartner: () => void;
  onPartnerPress: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
};

export function CustomerHomeMapOverlays({
  strings,
  loadingPartners,
  recenterBottomOffset,
  onRecenter,
  selectedPartner,
  selectedPartnerPrimaryImage,
  selectedPartnerUpdatedLabel,
  onClosePartner,
  onPartnerPress,
}: Props) {
  return (
    <>
      {loadingPartners ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={c.white} size="small" />
        </View>
      ) : null}

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

      {selectedPartner ? (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View
            style={[
              styles.partnerSheetWrap,
              { bottom: Math.max(12, recenterBottomOffset - 58) },
            ]}
          >
            <View style={styles.partnerSheet}>
              <View style={styles.partnerSheetTop}>
                {selectedPartnerPrimaryImage ? (
                  <Image
                    source={{ uri: selectedPartnerPrimaryImage }}
                    style={styles.partnerSheetImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.partnerSheetImage, styles.partnerSheetImagePlaceholder]}>
                    <MaterialCommunityIcons name="image-off-outline" size={22} color={c.gray50} />
                    <Text style={styles.partnerSheetImagePlaceholderText}>No Image</Text>
                  </View>
                )}
                <View style={styles.partnerInfoWrap}>
                  <Text style={styles.partnerSheetTitle}>{selectedPartner.business_name.trim()}</Text>
                  <Text style={styles.partnerSheetSubtitle}>
                    {selectedPartner.fulfillmentMode === "pickupDelivery"
                      ? strings.pickUpDelivery
                      : strings.dropOff}
                  </Text>
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
                          Updated {selectedPartnerUpdatedLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={onClosePartner}
                  style={({ pressed }) => [styles.partnerSheetClose, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Close partner details"
                >
                  <MaterialCommunityIcons name="close" size={20} color={c.background} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => {
                  onPartnerPress(selectedPartner.id, selectedPartner.fulfillmentMode);
                  onClosePartner();
                }}
                style={({ pressed }) => [styles.partnerSheetAction, pressed && styles.pressed]}
              >
                <Text style={styles.partnerSheetActionText}>View partner details</Text>
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
  partnerSheetWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 120,
    elevation: 12,
    marginBottom: -100,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  partnerSheet: {
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  partnerInfoWrap: {
    flex: 1,
  },
  partnerSheetImage: {
    width: "35%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  partnerSheetImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  partnerSheetImagePlaceholderText: {
    color: c.gray50,
    fontSize: 11,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  partnerSheetActionText: {
    color: c.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
