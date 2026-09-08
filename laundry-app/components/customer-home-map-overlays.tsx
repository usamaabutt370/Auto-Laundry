import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { assets } from "@/assets/assets";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { strings } from "@/constants/strings";
import {
  getPartnerPrimaryImage,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import type { Coordinates } from "@/utils/geocoding";
import { getPartnerOpenStatus } from "@/utils/partner-hours";
import { isPartnerTopRated } from "@/utils/partner-offers";

const UI = {
  text: "#111827",
  muted: "#6B7280",
  card: "#FFFFFF",
  bg: "#F7F8FA",
  purple: "#5B4DFF",
  teal: "#12B886",
  openBg: "#ECFDF5",
  openText: "#047857",
  star: "#F5B301",
  chipBorder: "#E5E7EB",
  shadow: "rgba(17, 24, 39, 0.14)",
  handle: "#D1D5DB",
  verified: "#2563EB",
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
  userCoordinates: Coordinates | null;
  onRecenter: () => void;
  selectedPartner: PartnerMapMarker | null;
  partners: PartnerMapMarker[];
  mapMarkers: { id: string }[];
  onSelectPartner: (id: string) => void;
  onClosePartner: () => void;
  onPartnerPress: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
  showMapChrome?: boolean;
  showPartnerSheet?: boolean;
};

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km: number) {
  if (km < 1) return Math.max(0.1, km).toFixed(1);
  return km.toFixed(1);
}

function formatRatingAvg(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

function serviceLine(partner: PartnerMapMarker, home: typeof strings.customer.home) {
  const types = new Set(partner.serviceTypes ?? []);
  if (types.has("washAndFold") || types.has("dryCleaning")) {
    return { icon: "washing-machine" as const, label: `${home.tagLaundry} • ${home.tagWashFold}` };
  }
  if (types.has("press")) {
    return { icon: "iron" as const, label: home.categoryIroning };
  }
  if (types.has("tailoring")) {
    return { icon: "scissors-cutting" as const, label: home.categoryTailoring };
  }
  return { icon: "washing-machine" as const, label: `${home.tagLaundry} • ${home.tagWashFold}` };
}

function MapPartnerPreviewCard({
  partner,
  userCoordinates,
  favorited,
  onToggleFavorite,
  onClosePartner,
  onPartnerPress,
}: {
  partner: PartnerMapMarker;
  userCoordinates: Coordinates | null;
  favorited: boolean;
  onToggleFavorite: () => void;
  onClosePartner: () => void;
  onPartnerPress: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
}) {
  const sHome = strings.customer.home;
  const sList = strings.customer.pickLaunderer;
  const partnerVerified = usePartnerVerified(partner.id);
  const imageUrl = getPartnerPrimaryImage(partner);
  const openStatus = getPartnerOpenStatus(partner.available_time);
  const openLabel =
    openStatus === "open"
      ? sList.featureOpenNow
      : openStatus === "closed"
        ? sList.closed
        : sList.hoursUnknown;
  const topRated = isPartnerTopRated(partner.ratingAvg, partner.ratingCount);
  const service = serviceLine(partner, sHome);
  const ratingLabel = fill(sHome.ratingWithCount, {
    avg: formatRatingAvg(partner.ratingAvg ?? 1),
    count: partner.ratingCount ?? 1,
  });
  const partnerCoords =
    Number.isFinite(partner.latitude) && Number.isFinite(partner.longitude)
      ? {
          latitude: Number(partner.latitude),
          longitude: Number(partner.longitude),
        }
      : null;
  const km =
    userCoordinates && partnerCoords ? distanceKm(userCoordinates, partnerCoords) : null;
  const distanceLabel =
    km != null && Number.isFinite(km) ? fill(sHome.kmAway, { km: formatKm(km) }) : "—";

  return (
    <View style={styles.partnerSheet}>
      <View style={styles.handle} />
      <View style={styles.cardRow}>
        <View style={styles.media}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.mediaImage} contentFit="cover" />
          ) : (
            <Image source={assets.onboarding.slide2} style={styles.mediaImage} contentFit="cover" />
          )}
          {topRated ? (
            <View style={styles.topRatedBadge}>
              <Text style={styles.topRatedText}>{sHome.badgeTopRated}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <PartnerNameWithBadge
              name={partner.business_name.trim()}
              verified={partnerVerified}
              nameStyle={styles.title}
              containerStyle={styles.titleName}
              badgeSize={14}
              badgeColor={UI.verified}
              numberOfLines={1}
            />
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={favorited ? sHome.unfavorite : sHome.favorite}
            >
              <MaterialCommunityIcons
                name={favorited ? "heart" : "heart-outline"}
                size={20}
                color={favorited ? "#E11D48" : UI.purple}
              />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="star" size={14} color={UI.star} />
            <Text style={styles.metaText}>{ratingLabel}</Text>
            <Text style={styles.dot}>•</Text>
            <MaterialCommunityIcons name="map-marker" size={13} color={UI.purple} />
            <Text style={styles.metaText} numberOfLines={1}>
              {distanceLabel}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name={service.icon} size={14} color={UI.verified} />
            <Text style={styles.serviceText} numberOfLines={1}>
              {service.label}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View
              style={[
                styles.openPill,
                openStatus === "closed" && styles.openPillClosed,
                openStatus === "unknown" && styles.openPillMuted,
              ]}
            >
              <Text
                style={[
                  styles.openPillText,
                  openStatus === "closed" && styles.openPillTextClosed,
                  openStatus === "unknown" && styles.openPillTextMuted,
                ]}
              >
                {openLabel}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                onClosePartner();
                onPartnerPress(partner.id, partner.fulfillmentMode);
              }}
              style={({ pressed }) => [styles.viewBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={sHome.mapCardView}
            >
              <Text style={styles.viewBtnText}>{sHome.mapCardView}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export function CustomerHomeMapOverlays({
  strings: overlayStrings,
  loadingPartners,
  recenterBottomOffset,
  mapBottomInset,
  userCoordinates,
  onRecenter,
  selectedPartner,
  partners = [],
  mapMarkers = [],
  onSelectPartner,
  onClosePartner,
  onPartnerPress,
  showMapChrome = true,
  showPartnerSheet = true,
}: Props) {
  const listRef = useRef<FlatList<PartnerMapMarker>>(null);
  const pagingFromSwipeRef = useRef(false);
  const pagerReadyRef = useRef(false);
  const { width: pageWidth } = useWindowDimensions();
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const cardVisible = Boolean(showPartnerSheet && selectedPartner);
  const cardBottom = Math.max(mapBottomInset, 10);
  const fabBottom = cardVisible ? cardBottom + 168 : recenterBottomOffset;

  const browsePartners = useMemo(() => {
    const markerIds = new Set(mapMarkers.map((marker) => marker.id));
    const listed = partners.filter((partner) => markerIds.has(partner.id));
    if (selectedPartner && !listed.some((partner) => partner.id === selectedPartner.id)) {
      return [selectedPartner, ...listed];
    }
    return listed.length > 0 ? listed : selectedPartner ? [selectedPartner] : [];
  }, [mapMarkers, partners, selectedPartner]);

  const selectedIndex = Math.max(
    0,
    browsePartners.findIndex((partner) => partner.id === selectedPartner?.id),
  );

  useEffect(() => {
    if (!cardVisible || browsePartners.length === 0) {
      pagerReadyRef.current = false;
      return;
    }
    const index = browsePartners.findIndex((partner) => partner.id === selectedPartner?.id);
    if (index < 0) return;
    if (pagingFromSwipeRef.current) {
      pagingFromSwipeRef.current = false;
      return;
    }
    const animated = pagerReadyRef.current;
    pagerReadyRef.current = true;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated });
    });
    return () => cancelAnimationFrame(frame);
  }, [browsePartners, cardVisible, selectedPartner?.id]);

  function handlePageChange(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const next = browsePartners[index];
    if (!next || next.id === selectedPartner?.id) return;
    pagingFromSwipeRef.current = true;
    onSelectPartner(next.id);
  }

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
            { bottom: fabBottom },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Recenter map"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={UI.text} />
        </Pressable>
      ) : null}

      {cardVisible && selectedPartner ? (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable
            style={styles.sheetBackdrop}
            onPress={onClosePartner}
            accessibilityRole="button"
            accessibilityLabel={overlayStrings.closePartnerDetails}
          />
          <View style={[styles.partnerSheetWrap, { bottom: cardBottom }]}>
            <FlatList
              ref={listRef}
              data={browsePartners}
              keyExtractor={(item) => item.id}
              style={{ width: pageWidth }}
              horizontal
              windowSize={5}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={browsePartners.length > 1}
              scrollEnabled={browsePartners.length > 1}
              decelerationRate="fast"
              initialScrollIndex={selectedIndex}
              getItemLayout={(_, index) => ({
                length: pageWidth,
                offset: pageWidth * index,
                index,
              })}
              onMomentumScrollEnd={handlePageChange}
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => {
                  listRef.current?.scrollToIndex({ index, animated: false });
                }, 50);
              }}
              extraData={selectedPartner.id}
              renderItem={({ item }) => (
                <View style={[styles.partnerSheetPage, { width: pageWidth }]}>
                  <MapPartnerPreviewCard
                    partner={item}
                    userCoordinates={userCoordinates}
                    favorited={Boolean(favorites[item.id])}
                    onToggleFavorite={() =>
                      setFavorites((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    onClosePartner={onClosePartner}
                    onPartnerPress={onPartnerPress}
                  />
                </View>
              )}
            />
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
    zIndex: 310,
  },
  partnerSheetPage: {
    paddingHorizontal: 12,
  },
  partnerSheet: {
    backgroundColor: UI.card,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: UI.handle,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  media: {
    width: 92,
    height: 108,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: UI.bg,
    flexShrink: 0,
  },
  mediaImage: {
    ...StyleSheet.absoluteFillObject,
  },
  topRatedBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: UI.openBg,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  topRatedText: {
    fontSize: 10,
    color: UI.openText,
    fontFamily: "Poppins-SemiBold",
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleName: {
    flex: 1,
  },
  title: {
    color: UI.text,
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  metaText: {
    fontSize: 12,
    color: UI.muted,
    fontFamily: "Poppins-Regular",
    flexShrink: 1,
  },
  dot: {
    fontSize: 12,
    color: UI.muted,
    marginHorizontal: 2,
  },
  serviceText: {
    fontSize: 12,
    color: "#6366F1",
    fontFamily: "Poppins-Medium",
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  openPill: {
    backgroundColor: UI.openBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openPillClosed: {
    backgroundColor: "#FEE2E2",
  },
  openPillMuted: {
    backgroundColor: "#F3F4F6",
  },
  openPillText: {
    fontSize: 11,
    color: UI.openText,
    fontFamily: "Poppins-SemiBold",
  },
  openPillTextClosed: {
    color: "#B91C1C",
  },
  openPillTextMuted: {
    color: UI.muted,
  },
  viewBtn: {
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  viewBtnText: {
    fontSize: 14,
    color: UI.openText,
    fontFamily: "Poppins-Bold",
  },
});
