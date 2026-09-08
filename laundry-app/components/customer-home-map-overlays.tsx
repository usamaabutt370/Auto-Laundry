import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { assets } from "@/assets/assets";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { StarRating } from "@/components/star-rating";
import { strings } from "@/constants/strings";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import type { PartnerMapMarker } from "@/hooks/use-customer-home-map-data";
import { getPartnerOpenStatus } from "@/utils/partner-hours";
import { partnerHasActiveOffer } from "@/utils/partner-offers";

const UI = {
  text: "#111827",
  muted: "#6B7280",
  card: "#FFFFFF",
  bg: "#F7F8FA",
  purple: "#2C1B6E",
  teal: "#12B886",
  price: "#0F9F6E",
  backBg: "#EEF2F6",
  openBg: "#ECFDF5",
  openText: "#047857",
  chipBorder: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.12)",
};

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
  strings: overlayStrings,
  loadingPartners,
  recenterBottomOffset,
  mapBottomInset,
  onRecenter,
  selectedPartner,
  selectedPartnerPrimaryImage,
  selectedPartnerUpdatedLabel: _selectedPartnerUpdatedLabel,
  onClosePartner,
  onPartnerPress,
  showMapChrome = true,
  showPartnerSheet = true,
}: Props) {
  const sList = strings.customer.pickLaunderer;
  const partnerVerified = usePartnerVerified(selectedPartner?.id);
  const partnerSheetBottom =
    mapBottomInset > 0 ? mapBottomInset + 12 : Math.max(12, recenterBottomOffset - 58);

  const openStatus = selectedPartner
    ? getPartnerOpenStatus(selectedPartner.available_time)
    : "unknown";
  const openLabel =
    openStatus === "open"
      ? sList.openNow
      : openStatus === "closed"
        ? sList.closed
        : sList.hoursUnknown;
  const hasOffer = selectedPartner
    ? partnerHasActiveOffer(selectedPartner.offerPercent)
    : false;
  const phone = selectedPartner?.phone_number?.trim() ?? "";
  const detailRows = selectedPartner
    ? (
        [
          phone
            ? {
                icon: "phone-outline" as const,
                text: phone,
                onPress: () => {
                  void Linking.openURL(`tel:${phone}`);
                },
              }
            : null,
          selectedPartner.available_time?.trim()
            ? { icon: "clock-outline" as const, text: selectedPartner.available_time.trim() }
            : null,
          selectedPartner.address?.trim()
            ? {
                icon: "map-marker-outline" as const,
                text: selectedPartner.address.trim(),
                lines: 2,
              }
            : null,
        ] as (
          | {
              icon: "phone-outline" | "clock-outline" | "map-marker-outline";
              text: string;
              onPress?: () => void;
              lines?: number;
            }
          | null
        )[]
      ).filter((row): row is NonNullable<typeof row> => row != null)
    : [];

  return (
    <>
      {showMapChrome && loadingPartners ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={UI.teal} size="small" />
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
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={UI.text} />
        </Pressable>
      ) : null}

      {showPartnerSheet && selectedPartner ? (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable
            style={styles.sheetBackdrop}
            onPress={onClosePartner}
            accessibilityRole="button"
          />
          <View
            style={[styles.partnerSheetWrap, { bottom: partnerSheetBottom }]}
            pointerEvents="box-none"
          >
            <View style={styles.partnerSheet}>
              <Pressable
                onPress={onClosePartner}
                style={({ pressed }) => [styles.partnerSheetClose, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={overlayStrings.closePartnerDetails}
              >
                <MaterialCommunityIcons name="close" size={16} color={UI.text} />
              </Pressable>

              <View style={styles.partnerSheetTop}>
                <View style={styles.partnerSheetMediaCol}>
                  {selectedPartnerPrimaryImage ? (
                    <Image
                      source={{ uri: selectedPartnerPrimaryImage }}
                      style={styles.partnerSheetImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Image
                      source={assets.onboarding.slide2}
                      style={styles.partnerSheetImage}
                      contentFit="cover"
                    />
                  )}
                  <View
                    style={[
                      styles.openBadge,
                      openStatus === "closed" && styles.openBadgeClosed,
                      openStatus === "unknown" && styles.openBadgeMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.openBadgeText,
                        openStatus === "closed" && styles.openBadgeTextClosed,
                        openStatus === "unknown" && styles.openBadgeTextMuted,
                      ]}
                    >
                      {openLabel}
                    </Text>
                  </View>
                  {hasOffer ? (
                    <View style={styles.offerBadge}>
                      <Text style={styles.offerBadgeText}>
                        {sList.percentOff.replace(
                          "{pct}",
                          String(selectedPartner.offerPercent ?? 0),
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.partnerSheetContentCol}>
                  <PartnerNameWithBadge
                    name={selectedPartner.business_name.trim()}
                    verified={partnerVerified}
                    nameStyle={styles.partnerSheetTitle}
                    badgeSize={14}
                    badgeColor={UI.teal}
                    numberOfLines={2}
                  />
                  <StarRating
                    value={(selectedPartner.ratingCount ?? 0) > 0 ? selectedPartner.ratingAvg : 0}
                    size={14}
                  />
                  <View style={styles.modePill}>
                    <Text style={styles.modePillText}>
                      {selectedPartner.fulfillmentMode === "pickupDelivery"
                        ? overlayStrings.pickUpDelivery
                        : overlayStrings.dropOff}
                    </Text>
                  </View>
                  {typeof selectedPartner.minPrice === "number" ? (
                    <Text style={styles.fromPriceRow} numberOfLines={1}>
                      <Text style={styles.fromLabel}>{sList.fromLabel} </Text>
                      <Text style={styles.price}>Rs {Math.round(selectedPartner.minPrice)}</Text>
                    </Text>
                  ) : (
                    <Text style={styles.seePrices}>{sList.seePrices}</Text>
                  )}
                </View>
              </View>

              {detailRows.length > 0 ? (
                <View style={styles.detailsCard}>
                  {detailRows.map((row, index) => {
                    const content = (
                      <>
                        <View style={styles.iconWell}>
                          <MaterialCommunityIcons name={row.icon} size={16} color={UI.purple} />
                        </View>
                        <Text style={styles.detailText} numberOfLines={row.lines ?? 1}>
                          {row.text}
                        </Text>
                      </>
                    );
                    const rowStyle = [
                      styles.detailRow,
                      index === detailRows.length - 1 && styles.detailRowLast,
                    ];
                    if (row.onPress) {
                      return (
                        <Pressable
                          key={row.icon}
                          onPress={row.onPress}
                          style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}
                        >
                          {content}
                        </Pressable>
                      );
                    }
                    return (
                      <View key={row.icon} style={rowStyle}>
                        {content}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  onClosePartner();
                  onPartnerPress(selectedPartner.id, selectedPartner.fulfillmentMode);
                }}
                style={({ pressed }) => [styles.actionWrap, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={overlayStrings.viewPartnerDetails}
              >
                <LinearGradient
                  colors={["#6A26FF", "#0095FF", "#20D5AB"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.partnerSheetAction}
                >
                  <Text style={styles.partnerSheetActionText}>
                    {overlayStrings.viewPartnerDetails}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
                </LinearGradient>
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
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    elevation: 8,
  },
  pressed: {
    opacity: 0.85,
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
    paddingHorizontal: 16,
    zIndex: 310,
  },
  partnerSheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 14,
    paddingTop: 16,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  partnerSheetClose: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.backBg,
    zIndex: 2,
  },
  partnerSheetTop: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    paddingRight: 28,
  },
  partnerSheetMediaCol: {
    width: 108,
    minHeight: 128,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: UI.bg,
    flexShrink: 0,
    position: "relative",
  },
  partnerSheetImage: {
    ...StyleSheet.absoluteFillObject,
  },
  openBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: UI.openBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openBadgeMuted: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
  },
  openBadgeClosed: {
    backgroundColor: "#FEE2E2",
  },
  openBadgeText: {
    fontSize: 10,
    color: UI.openText,
    fontFamily: "Poppins-SemiBold",
  },
  openBadgeTextMuted: {
    color: "#FFFFFF",
  },
  openBadgeTextClosed: {
    color: "#B91C1C",
  },
  offerBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "#FCE7F3",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offerBadgeText: {
    fontSize: 10,
    color: "#BE185D",
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
  },
  partnerSheetContentCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    justifyContent: "center",
  },
  partnerSheetTitle: {
    color: UI.text,
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  modePill: {
    alignSelf: "flex-start",
    backgroundColor: UI.openBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modePillText: {
    fontSize: 11,
    color: UI.openText,
    fontFamily: "Poppins-SemiBold",
  },
  fromPriceRow: {
    marginTop: 2,
  },
  fromLabel: {
    fontSize: 12,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
  },
  price: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: UI.price,
  },
  seePrices: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: UI.teal,
  },
  detailsCard: {
    marginTop: 12,
    backgroundColor: UI.bg,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.chipBorder,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  iconWell: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: UI.card,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: UI.text,
    fontFamily: "Poppins-Regular",
  },
  actionWrap: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
  },
  partnerSheetAction: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  partnerSheetActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
});
