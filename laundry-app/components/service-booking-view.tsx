import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "@/components/app-alert";
import {
  CustomerItemizedOrderLayout,
  CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
} from "@/components/customer-itemized-order-layout";
import { PartnerNameWithBadge } from "@/components/partner-name-with-badge";
import { assets } from "@/assets/assets";
import {
  initialDryCleanQuantities,
  type DryCleanItemDef,
} from "@/constants/dry-clean-items";
import { initialTailoringQuantities } from "@/constants/tailoring-items";
import {
  initialPressQuantities,
  initialWashFoldQuantities,
  type WashFoldItemDef,
} from "@/constants/wash-fold-items";
import type { CustomerOrderDraft, CustomerServiceId } from "@/contexts/customer-order-draft-context";
import { useCustomerOrderDraft } from "@/contexts/customer-order-draft-context";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerOrderEstimate } from "@/hooks/use-partner-order-estimate";
import { usePartnerVerified } from "@/hooks/use-partner-verified";
import { avatarUrlWithCacheBuster } from "@/lib/avatar";
import {
  dryCleanUnitForItem,
  listPricedDryCleanDefs,
  listPricedPressDefs,
  listPricedTailoringDefs,
  listPricedWashFoldDefs,
  pressUnitForItem,
  tailoringUnitForItem,
  washFoldUnitForItem,
} from "@/lib/customer-order-estimate";
import { partnerOffersPickupDelivery } from "@/lib/partner-discovery";
import { isProviderSaved, toggleSavedProvider } from "@/lib/saved-providers";
import type { ServiceJob } from "@/lib/service-jobs";
import { getStrings } from "@/locales";
import { getDeviceCoordinates } from "@/utils/device-location";
import { formatMoney } from "@/utils/format-money";
import type { Coordinates } from "@/utils/geocoding";
import { getPartnerHoursRange, getPartnerOpenStatus } from "@/utils/partner-hours";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UI = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  teal: "#12B886",
  purple: "#5B4DFF",
  chipBorder: "#E5E7EB",
  iconWell: "#F3F4F6",
  openText: "#047857",
  closedText: "#B91C1C",
  star: "#F5B301",
  shadow: "rgba(17, 24, 39, 0.08)",
};

const MAX_PHOTOS = 5;

type CatalogFamily = "washAndFold" | "dryCleaning" | "press" | "tailoring";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type BookingTile = {
  key: string;
  family: CatalogFamily;
  id: string;
  name: string;
  amount: number | null;
  priceLabel: string;
  image: number;
};

type StylePref = "standard" | "slim" | "regular" | "traditional" | "custom";
type ChoiceSide = "self" | "provider";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function formatKm(km: number) {
  if (km < 1) return Math.max(0.1, km).toFixed(1);
  return km.toFixed(1);
}

function formatRatingAvg(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
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

function namesMatch(left: string, right: string) {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]+/g, " ").trim();
  return normalize(left) === normalize(right);
}

function imageForFamily(family: CatalogFamily) {
  if (family === "press") return assets.images.home_deal_ironing;
  if (family === "tailoring") return assets.images.home_deal_tailoring;
  if (family === "dryCleaning") return assets.images.home_deal_ironing;
  return assets.images.home_deal_laundry;
}

function hasQty(map: Record<string, number> | undefined) {
  return Object.values(map ?? {}).some((qty) => qty > 0);
}

type Props = {
  job: ServiceJob;
  itemLabel?: string;
  prefersPickupDelivery?: boolean;
};

export function ServiceBookingView({ job, itemLabel, prefersPickupDelivery = false }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const s = getStrings(locale).customer.bookService;
  const sLive = getStrings(locale).customer.liveEstimate;
  const sHome = getStrings(locale).customer.home;
  const sDetail = getStrings(locale).customer.laundererDetail;
  const onboarding = getStrings(locale).partner.onboarding as Record<string, string>;

  const {
    draft,
    setPickupDeliveryRequested,
    setSelectedServiceIds,
    setWashFoldItemizedQuantities,
    setWashFoldItemizedInstructions,
    setDryCleanItemizedQuantities,
    setDryCleanItemizedInstructions,
    setPressItemizedQuantities,
    setPressItemizedInstructions,
    setTailoringItemizedQuantities,
    setTailoringItemizedInstructions,
  } = useCustomerOrderDraft();

  const [washFoldQty, setWashFoldQty] = useState<Record<string, number>>(initialWashFoldQuantities);
  const [dryCleanQty, setDryCleanQty] = useState<Record<string, number>>(initialDryCleanQuantities);
  const [pressQty, setPressQty] = useState<Record<string, number>>(initialPressQuantities);
  const [tailoringQty, setTailoringQty] = useState<Record<string, number>>(initialTailoringQuantities);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [stylePref, setStylePref] = useState<StylePref>("standard");
  const [measureSide, setMeasureSide] = useState<ChoiceSide>("self");
  const [fabricSide, setFabricSide] = useState<ChoiceSide>("self");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [favorited, setFavorited] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const initRef = useRef(false);
  const fulfillmentTouchedRef = useRef(false);

  const estimateDraft: CustomerOrderDraft = useMemo(() => {
    const selectedServiceIds: CustomerServiceId[] = [];
    const washFold =
      job === "laundry" && hasQty(washFoldQty)
        ? { itemizedQuantities: washFoldQty, itemizedInstructions: notes }
        : null;
    const dryClean =
      job === "laundry" && hasQty(dryCleanQty)
        ? { itemizedQuantities: dryCleanQty, itemizedInstructions: notes }
        : null;
    const press =
      job === "ironing" && hasQty(pressQty)
        ? { itemizedQuantities: pressQty, itemizedInstructions: notes }
        : null;
    const tailoring =
      job === "tailoring" && hasQty(tailoringQty)
        ? { itemizedQuantities: tailoringQty, itemizedInstructions: notes }
        : null;
    if (washFold) selectedServiceIds.push("washAndFold");
    if (dryClean) selectedServiceIds.push("dryCleaning");
    if (press) selectedServiceIds.push("press");
    if (tailoring) selectedServiceIds.push("tailoring");
    return {
      ...draft,
      pickupDeliveryRequested: draft.pickupDeliveryRequested,
      selectedServiceIds,
      washFold,
      dryClean,
      press,
      tailoring,
    };
  }, [draft, dryCleanQty, job, notes, pressQty, tailoringQty, washFoldQty]);

  const { loading, profile, services, estimate } = usePartnerOrderEstimate(
    draft.partnerId,
    estimateDraft,
  );
  const partnerVerified = usePartnerVerified(draft.partnerId);
  const hasPickup = partnerOffersPickupDelivery(profile);
  const pickupEnabled = hasPickup && draft.pickupDeliveryRequested;

  useEffect(() => {
    if (!draft.partnerId) return;
    void isProviderSaved(draft.partnerId).then(setFavorited);
  }, [draft.partnerId]);

  useEffect(() => {
    let cancelled = false;
    void getDeviceCoordinates().then((coords) => {
      if (!cancelled) setUserCoords(coords);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fulfillmentTouchedRef.current) return;
    if (!hasPickup) {
      setPickupDeliveryRequested(false);
      return;
    }
    if (prefersPickupDelivery) setPickupDeliveryRequested(true);
  }, [hasPickup, prefersPickupDelivery, setPickupDeliveryRequested]);

  const displayName = (id: string, fallback: string) =>
    onboarding[id]?.trim() || fallback;

  const tiles = useMemo<BookingTile[]>(() => {
    if (job === "laundry") {
      const wash = listPricedWashFoldDefs(services).map((def: WashFoldItemDef) => {
        const unit = washFoldUnitForItem(services, def);
        return {
          key: `washAndFold:${def.id}`,
          family: "washAndFold" as const,
          id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
          priceLabel: unit.priceLabel,
          image: imageForFamily("washAndFold"),
        };
      });
      const dry = listPricedDryCleanDefs(services).map((def: DryCleanItemDef) => {
        const unit = dryCleanUnitForItem(services, def);
        return {
          key: `dryCleaning:${def.id}`,
          family: "dryCleaning" as const,
          id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
          priceLabel: unit.priceLabel,
          image: imageForFamily("dryCleaning"),
        };
      });
      return [...wash, ...dry];
    }
    if (job === "ironing") {
      return listPricedPressDefs(services).map((def) => {
        const unit = pressUnitForItem(services, def);
        return {
          key: `press:${def.id}`,
          family: "press" as const,
          id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
          priceLabel: unit.priceLabel,
          image: imageForFamily("press"),
        };
      });
    }
    return listPricedTailoringDefs(services).map((def) => {
      const unit = tailoringUnitForItem(services, def);
      return {
        key: `tailoring:${def.id}`,
        family: "tailoring" as const,
        id: def.id,
          name: displayName(def.id, def.name),
          amount: unit.amount,
        priceLabel: unit.priceLabel,
        image: imageForFamily("tailoring"),
      };
    });
  }, [job, onboarding, services]);

  const qtyFor = useCallback(
    (tile: BookingTile) => {
      if (tile.family === "washAndFold") return washFoldQty[tile.id] ?? 0;
      if (tile.family === "dryCleaning") return dryCleanQty[tile.id] ?? 0;
      if (tile.family === "press") return pressQty[tile.id] ?? 0;
      return tailoringQty[tile.id] ?? 0;
    },
    [dryCleanQty, pressQty, tailoringQty, washFoldQty],
  );

  const setQtyFor = useCallback((tile: BookingTile, next: number) => {
    const value = Math.max(0, next);
    const updater = (prev: Record<string, number>) => ({ ...prev, [tile.id]: value });
    if (tile.family === "washAndFold") {
      setWashFoldQty(updater);
      return;
    }
    if (tile.family === "dryCleaning") {
      setDryCleanQty(updater);
      return;
    }
    if (tile.family === "press") {
      setPressQty(updater);
      return;
    }
    setTailoringQty(updater);
  }, []);

  useEffect(() => {
    if (initRef.current || tiles.length === 0) return;
    initRef.current = true;
    if (!itemLabel) return;
    const labeled = tiles.find(
      (tile) => namesMatch(tile.name, itemLabel) || namesMatch(tile.id, itemLabel),
    );
    if (!labeled) return;
    setSelectedKey(labeled.key);
    if (qtyFor(labeled) <= 0) setQtyFor(labeled, 1);
  }, [itemLabel, qtyFor, setQtyFor, tiles]);

  const orderedTiles = useMemo(() => {
    if (!itemLabel) return tiles;
    const matchIndex = tiles.findIndex(
      (tile) => namesMatch(tile.name, itemLabel) || namesMatch(tile.id, itemLabel),
    );
    if (matchIndex <= 0) return tiles;
    const match = tiles[matchIndex];
    return [match, ...tiles.filter((tile) => tile.key !== match.key)];
  }, [itemLabel, tiles]);

  useEffect(() => {
    if (job !== "laundry") return;
    setWashFoldItemizedQuantities(washFoldQty);
    setDryCleanItemizedQuantities(dryCleanQty);
  }, [dryCleanQty, job, setDryCleanItemizedQuantities, setWashFoldItemizedQuantities, washFoldQty]);

  useEffect(() => {
    if (job !== "ironing") return;
    setPressItemizedQuantities(pressQty);
  }, [job, pressQty, setPressItemizedQuantities]);

  useEffect(() => {
    if (job !== "tailoring") return;
    setTailoringItemizedQuantities(tailoringQty);
  }, [job, setTailoringItemizedQuantities, tailoringQty]);

  useEffect(() => {
    const ids: CustomerServiceId[] = [];
    if (job === "laundry") {
      if (hasQty(washFoldQty)) ids.push("washAndFold");
      if (hasQty(dryCleanQty)) ids.push("dryCleaning");
    } else if (job === "ironing") {
      if (hasQty(pressQty)) ids.push("press");
    } else if (hasQty(tailoringQty)) {
      ids.push("tailoring");
    }
    setSelectedServiceIds(ids);
  }, [dryCleanQty, job, pressQty, setSelectedServiceIds, tailoringQty, washFoldQty]);

  const selected =
    tiles.find((tile) => tile.key === selectedKey && qtyFor(tile) > 0) ??
    tiles.find((tile) => qtyFor(tile) > 0) ??
    null;
  const hasSelectedItems =
    job === "laundry"
      ? hasQty(washFoldQty) || hasQty(dryCleanQty)
      : job === "ironing"
        ? hasQty(pressQty)
        : hasQty(tailoringQty);

  const jobLabel =
    job === "laundry" ? s.jobLaundry : job === "ironing" ? s.jobIroning : s.jobTailoring;
  const selectHeading =
    job === "laundry" ? s.selectService : job === "ironing" ? s.selectGarment : s.stitchingType;
  const bannerMeta =
    job === "laundry"
      ? { title: s.laundryBannerTitle, body: s.laundryBannerBody, highlights: [s.laundryHighlight1, s.laundryHighlight2, s.laundryHighlight3] }
      : job === "ironing"
        ? { title: s.ironingBannerTitle, body: s.ironingBannerBody, highlights: [s.ironingHighlight1, s.ironingHighlight2, s.ironingHighlight3] }
        : { title: s.tailoringBannerTitle, body: s.tailoringBannerBody, highlights: [s.tailoringHighlight1, s.tailoringHighlight2, s.tailoringHighlight3] };
  const instructionsPlaceholder =
    job === "laundry"
      ? s.instructionsLaundry
      : job === "ironing"
        ? s.instructionsIroning
        : s.instructionsTailoring;
  const addOnOptions =
    job === "ironing"
      ? [s.addOnStarch, s.addOnHanger]
      : job === "laundry"
        ? [s.addOnStain, s.addOnSoftener, s.addOnExpress, s.addOnHanger]
        : [];
  const helpCopy =
    job === "laundry" ? s.helpLaundry : job === "ironing" ? s.helpIroning : s.helpTailoring;

  const heroUri = useMemo(() => {
    const images = Array.isArray(profile?.business_images)
      ? profile.business_images.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];
    return images[0] ?? avatarUrlWithCacheBuster(profile?.image_url, profile?.updated_at);
  }, [profile?.business_images, profile?.image_url, profile?.updated_at]);

  const partnerCoords =
    profile && Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)
      ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
      : null;
  const km = userCoords && partnerCoords ? distanceKm(userCoords, partnerCoords) : null;
  const distanceLabel =
    km != null && Number.isFinite(km) ? fill(sHome.kmAway, { km: formatKm(km) }) : null;
  const hours = getPartnerHoursRange(profile?.available_time);
  const openStatus = getPartnerOpenStatus(profile?.available_time);
  const openLabel =
    openStatus === "open" ? sDetail.openNow : openStatus === "closed" ? sDetail.closed : sDetail.hoursUnknown;
  const hoursHint =
    openStatus === "open" && hours
      ? fill(sDetail.closesAt, { time: hours.endLabel })
      : hours?.rangeLabel ?? null;
  const ratingAvg = profile?.ratingAvg ?? null;
  const ratingCount = profile?.ratingCount ?? 0;
  const ratingLabel =
    ratingCount > 0 && ratingAvg != null ? formatRatingAvg(ratingAvg) : null;
  const reviewsLabel =
    ratingCount === 1
      ? sDetail.reviewsCountOne
      : ratingCount > 1
        ? fill(sDetail.reviewsCount, { count: ratingCount })
        : sDetail.noReviewsYet;

  const currencyPrefix = estimate.currencyPrefix || "Rs ";
  const totalDisplay =
    estimate.total != null
      ? formatMoney(currencyPrefix, estimate.total)
      : estimate.partialTotal > 0
        ? `${formatMoney(currencyPrefix, estimate.partialTotal)} *`
        : "—";

  const composeInstructions = () => {
    const parts: string[] = [];
    if (notes.trim()) parts.push(notes.trim());
    if (addOns.length > 0) parts.push(`Add-ons: ${addOns.join(", ")}`);
    if (job === "tailoring") {
      const styleLabel =
        stylePref === "slim"
          ? s.styleSlim
          : stylePref === "regular"
            ? s.styleRegular
            : stylePref === "traditional"
              ? s.styleTraditional
              : stylePref === "custom"
                ? s.styleCustom
                : s.styleStandard;
      parts.push(`${s.stylePrefs}: ${styleLabel}`);
      parts.push(
        `${s.measurements}: ${measureSide === "self" ? s.measureSelfTitle : s.measureProviderTitle}`,
      );
      parts.push(`${s.fabric}: ${fabricSide === "self" ? s.fabricSelfTitle : s.fabricProviderTitle}`);
    }
    return parts.join("\n");
  };

  const persistInstructions = (value: string) => {
    if (job === "laundry") {
      setWashFoldItemizedInstructions(value);
      setDryCleanItemizedInstructions(value);
      return;
    }
    if (job === "ironing") {
      setPressItemizedInstructions(value);
      return;
    }
    setTailoringItemizedInstructions(value);
  };

  const handleFavorite = async () => {
    if (!draft.partnerId) return;
    setFavorited(await toggleSavedProvider(draft.partnerId));
  };

  const handleAddPhotos = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAppAlert(s.addPhotos, s.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (result.canceled) return;
    const next = result.assets.map((asset) => asset.uri).filter(Boolean);
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  };

  const handleContinue = () => {
    if (!hasSelectedItems) {
      showAppAlert(s.needItemsTitle, s.needItemsMessage);
      return;
    }
    persistInstructions(composeInstructions());
    if (job === "laundry") {
      setPressItemizedQuantities({});
      setTailoringItemizedQuantities({});
    } else if (job === "ironing") {
      setWashFoldItemizedQuantities({});
      setDryCleanItemizedQuantities({});
      setTailoringItemizedQuantities({});
    } else {
      setWashFoldItemizedQuantities({});
      setDryCleanItemizedQuantities({});
      setPressItemizedQuantities({});
    }
    if (pickupEnabled) {
      router.push("/(customer)/schedule-pickup");
      return;
    }
    router.push("/(customer)/order-summary");
  };

  const toggleTile = (tile: BookingTile) => {
    const next = qtyFor(tile) > 0 ? 0 : 1;
    setQtyFor(tile, next);
    setSelectedKey(next > 0 ? tile.key : null);
  };

  const changeTileQty = (tile: BookingTile, next: number) => {
    const value = Math.max(0, next);
    setQtyFor(tile, value);
    setSelectedKey(value > 0 ? tile.key : null);
  };

  const toggleAddOn = (label: string) => {
    setAddOns((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    );
  };

  const bannerTitle = selected
    ? `${selected.name}${job === "ironing" ? ` – ${s.jobIroning}` : job === "tailoring" ? ` – ${s.jobTailoring}` : ""}`
    : bannerMeta.title;
  const unitLine = selected?.amount != null
    ? `${fill(s.fromPrice, { price: formatMoney(currencyPrefix, selected.amount) })}${s.perPiece}`
    : selected?.priceLabel && selected.priceLabel !== "—"
      ? fill(s.fromPrice, { price: selected.priceLabel })
      : null;

  const highlightIcons: IconName[] =
    job === "laundry"
      ? ["water-outline", "leaf", "shield-check-outline"]
      : job === "ironing"
        ? ["iron", "shield-check-outline", "leaf"]
        : ["star-outline", "tshirt-crew-outline", "ruler"];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <CustomerItemizedOrderLayout
        appearance="light"
        scrollContentStyle={styles.scrollContent}
        footer={
          <>
            {breakdownOpen && estimate.lines.length > 0 ? (
              <View style={styles.breakdown}>
                {estimate.lines.map((line) => (
                  <View key={line.key} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel} numberOfLines={1}>
                      {line.title}
                      {line.qtyLabel ? ` · ${line.qtyLabel}` : ""}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {line.amount != null ? formatMoney(currencyPrefix, line.amount) : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.footerRow}>
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setBreakdownOpen((value) => !value);
                }}
                style={styles.totalBtn}
              >
                <Text style={styles.totalLabel}>{sLive.estimatedLabel}</Text>
                <View style={styles.totalValueRow}>
                  <Text style={styles.totalValue}>{loading ? "…" : totalDisplay}</Text>
                  <MaterialCommunityIcons
                    name={breakdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={UI.muted}
                  />
                </View>
              </Pressable>
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [styles.continueWrap, pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={["#6D5CFF", "#22D3EE"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.continueBtn}
                >
                  <Text style={styles.continueLabel}>{s.continue}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          </>
        }
      >
        <View style={styles.hero}>
          {heroUri ? (
            <Image source={{ uri: heroUri }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <Image source={imageForFamily(job === "ironing" ? "press" : job === "tailoring" ? "tailoring" : "washAndFold")} style={styles.heroImage} contentFit="cover" />
          )}
          <LinearGradient
            colors={["rgba(15,23,42,0.05)", "rgba(15,23,42,0.78)"]}
            style={styles.heroShade}
          />
          <View style={[styles.heroChrome, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={styles.roundBtn} accessibilityRole="button">
              <MaterialCommunityIcons name="chevron-left" size={24} color={UI.text} />
            </Pressable>
            <Pressable onPress={() => void handleFavorite()} style={styles.roundBtn}>
              <MaterialCommunityIcons
                name={favorited ? "heart" : "heart-outline"}
                size={20}
                color={favorited ? "#E11D48" : UI.text}
              />
            </Pressable>
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.heroNameRow}>
              <PartnerNameWithBadge
                name={profile?.business_name?.trim() || draft.partnerName || ""}
                verified={partnerVerified}
                nameStyle={styles.heroName}
                badgeColor="#FFFFFF"
              />
              <View style={styles.jobChip}>
                <Text style={styles.jobChipText}>{jobLabel}</Text>
              </View>
            </View>
            <View style={styles.heroStats}>
              <MaterialCommunityIcons name="star" size={14} color={UI.star} />
              <Text style={styles.heroStat}>{ratingLabel ?? "—"}</Text>
              <Text style={styles.heroStatMuted}>({reviewsLabel})</Text>
              {distanceLabel ? (
                <>
                  <Text style={styles.heroDot}>•</Text>
                  <MaterialCommunityIcons name="map-marker-outline" size={13} color="#E5E7EB" />
                  <Text style={styles.heroStatMuted}>{distanceLabel}</Text>
                </>
              ) : null}
            </View>
            <View style={styles.heroStats}>
              <View style={[styles.openDot, openStatus === "closed" && styles.openDotClosed]} />
              <Text style={styles.heroStat}>{openLabel}</Text>
              {hoursHint ? <Text style={styles.heroStatMuted}> • {hoursHint}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          {loading && tiles.length === 0 ? (
            <ActivityIndicator color={UI.teal} style={{ marginTop: 24 }} />
          ) : !draft.partnerId ? (
            <Text style={styles.empty}>{s.noPartner}</Text>
          ) : tiles.length === 0 ? (
            <Text style={styles.empty}>{s.noRates}</Text>
          ) : (
            <>
              {selected ? (
                <View style={styles.banner}>
                  <Image source={selected.image} style={styles.bannerImage} contentFit="cover" />
                  <View style={styles.bannerCopy}>
                    <Text style={styles.bannerTitle}>{bannerTitle}</Text>
                    <Text style={styles.bannerBody}>{bannerMeta.body}</Text>
                    {unitLine ? <Text style={styles.bannerPrice}>{unitLine}</Text> : null}
                    <View style={styles.highlightRow}>
                      {bannerMeta.highlights.map((label, index) => (
                        <View key={label} style={styles.highlight}>
                          <MaterialCommunityIcons
                            name={highlightIcons[index] ?? "check"}
                            size={14}
                            color={UI.purple}
                          />
                          <Text style={styles.highlightText}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.sectionHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{selectHeading}</Text>
                  <Text style={styles.sectionHint}>{s.quantityHint}</Text>
                </View>
                <Pressable onPress={() => showAppAlert(s.helpMeChoose, helpCopy)}>
                  <View style={styles.helpBtn}>
                    <Text style={styles.helpText}>{s.helpMeChoose}</Text>
                    <MaterialCommunityIcons name="information-outline" size={14} color={UI.purple} />
                  </View>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tileRow}
              >
                {orderedTiles.map((tile) => {
                  const qty = qtyFor(tile);
                  const added = qty > 0;
                  return (
                    <View
                      key={tile.key}
                      style={[styles.tile, added && styles.tileActive]}
                    >
                      <Pressable onPress={() => toggleTile(tile)}>
                        <Image source={tile.image} style={styles.tileImage} contentFit="cover" />
                        <Text style={styles.tileName} numberOfLines={2}>
                          {tile.name}
                        </Text>
                        <Text style={styles.tilePrice} numberOfLines={1}>
                          {tile.amount != null
                            ? `${formatMoney(currencyPrefix, tile.amount)}${s.perPiece}`
                            : tile.priceLabel}
                        </Text>
                      </Pressable>
                      {added ? (
                        <View style={styles.tileStepper}>
                          <Pressable
                            onPress={() => changeTileQty(tile, qty - 1)}
                            hitSlop={8}
                            style={styles.tileStepperBtn}
                          >
                            <MaterialCommunityIcons name="minus" size={16} color={UI.text} />
                          </Pressable>
                          <Text style={styles.tileStepperValue}>{qty}</Text>
                          <Pressable
                            onPress={() => changeTileQty(tile, qty + 1)}
                            hitSlop={8}
                            style={styles.tileStepperBtn}
                          >
                            <MaterialCommunityIcons name="plus" size={16} color={UI.purple} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => toggleTile(tile)}
                          style={[styles.tileStepper, styles.tileStepperEmpty]}
                        >
                          <MaterialCommunityIcons name="plus" size={16} color={UI.purple} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {addOnOptions.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.sectionTitle}>{s.addOns}</Text>
                  <Text style={styles.sectionHint}>{s.addOnsHint}</Text>
                  <View style={styles.choiceGrid}>
                    {addOnOptions.map((label) => {
                      const active = addOns.includes(label);
                      return (
                        <Pressable
                          key={label}
                          onPress={() => toggleAddOn(label)}
                          style={[styles.choiceCard, active && styles.choiceCardActive]}
                        >
                          <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>
                            {label}
                          </Text>
                          {active ? (
                            <MaterialCommunityIcons name="check-circle" size={18} color={UI.purple} />
                          ) : (
                            <View style={styles.unchecked} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {job === "tailoring" ? (
                <>
                  <View style={styles.block}>
                    <Text style={styles.sectionTitle}>{s.stylePrefs}</Text>
                    <Text style={styles.sectionHint}>{s.styleHint}</Text>
                    <View style={styles.chipWrap}>
                      {(
                        [
                          ["standard", s.styleStandard],
                          ["slim", s.styleSlim],
                          ["regular", s.styleRegular],
                          ["traditional", s.styleTraditional],
                          ["custom", s.styleCustom],
                        ] as const
                      ).map(([id, label]) => {
                        const active = stylePref === id;
                        return (
                          <Pressable
                            key={id}
                            onPress={() => setStylePref(id)}
                            style={[styles.styleChip, active && styles.styleChipActive]}
                          >
                            {active ? (
                              <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                            ) : null}
                            <Text style={[styles.styleChipText, active && styles.styleChipTextActive]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <ChoicePair
                    title={s.measurements}
                    leftTitle={s.measureSelfTitle}
                    leftBody={s.measureSelfBody}
                    rightTitle={s.measureProviderTitle}
                    rightBody={s.measureProviderBody}
                    value={measureSide}
                    onChange={setMeasureSide}
                    leftIcon="account-outline"
                    rightIcon="account-edit-outline"
                  />
                  <ChoicePair
                    title={s.fabric}
                    leftTitle={s.fabricSelfTitle}
                    leftBody={s.fabricSelfBody}
                    rightTitle={s.fabricProviderTitle}
                    rightBody={s.fabricProviderBody}
                    value={fabricSide}
                    onChange={setFabricSide}
                    leftIcon="layers-outline"
                    rightIcon="cart-outline"
                  />
                </>
              ) : null}

              <ChoicePair
                title={s.pickupDelivery}
                leftTitle={s.pickupTitle}
                leftBody={s.pickupBody}
                rightTitle={s.dropoffTitle}
                rightBody={s.dropoffBody}
                value={pickupEnabled ? "self" : "provider"}
                onChange={(side) => {
                  if (side === "self" && !hasPickup) return;
                  fulfillmentTouchedRef.current = true;
                  setPickupDeliveryRequested(side === "self");
                }}
                leftIcon="truck-delivery-outline"
                rightIcon="storefront-outline"
                disableLeft={!hasPickup}
              />

              <View style={styles.block}>
                <Text style={styles.sectionTitle}>{s.instructions}</Text>
                <View style={styles.notesRow}>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={instructionsPlaceholder}
                    placeholderTextColor={UI.muted}
                    multiline
                    style={styles.notes}
                  />
                  <Pressable onPress={() => void handleAddPhotos()} style={styles.photoBtn}>
                    <MaterialCommunityIcons name="image-plus" size={20} color={UI.muted} />
                    <Text style={styles.photoBtnText}>{s.addPhotos}</Text>
                    <Text style={styles.photoCount}>
                      {fill(s.photosCount, { count: photos.length })}
                    </Text>
                  </Pressable>
                </View>
                {photos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                    {photos.map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </>
          )}
        </View>
      </CustomerItemizedOrderLayout>
    </View>
  );
}

function ChoicePair({
  title,
  leftTitle,
  leftBody,
  rightTitle,
  rightBody,
  value,
  onChange,
  leftIcon,
  rightIcon,
  disableLeft = false,
}: {
  title: string;
  leftTitle: string;
  leftBody: string;
  rightTitle: string;
  rightBody: string;
  value: ChoiceSide;
  onChange: (value: ChoiceSide) => void;
  leftIcon: IconName;
  rightIcon: IconName;
  disableLeft?: boolean;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.choiceGrid}>
        <Pressable
          onPress={() => onChange("self")}
          disabled={disableLeft}
          style={[
            styles.choiceCard,
            value === "self" && styles.choiceCardActive,
            disableLeft && styles.choiceDisabled,
          ]}
        >
          <MaterialCommunityIcons name={leftIcon} size={18} color={UI.purple} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.choiceTitle, value === "self" && styles.choiceTitleActive]}>
              {leftTitle}
            </Text>
            <Text style={styles.choiceBody}>{leftBody}</Text>
          </View>
          {value === "self" ? (
            <MaterialCommunityIcons name="check-circle" size={18} color={UI.purple} />
          ) : (
            <View style={styles.unchecked} />
          )}
        </Pressable>
        <Pressable
          onPress={() => onChange("provider")}
          style={[styles.choiceCard, value === "provider" && styles.choiceCardActive]}
        >
          <MaterialCommunityIcons name={rightIcon} size={18} color={UI.purple} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.choiceTitle, value === "provider" && styles.choiceTitleActive]}>
              {rightTitle}
            </Text>
            <Text style={styles.choiceBody}>{rightBody}</Text>
          </View>
          {value === "provider" ? (
            <MaterialCommunityIcons name="check-circle" size={18} color={UI.purple} />
          ) : (
            <View style={styles.unchecked} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  scrollContent: { paddingBottom: 24 },
  hero: { height: 230, backgroundColor: UI.iconWell },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroShade: { ...StyleSheet.absoluteFillObject },
  heroChrome: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: { position: "absolute", left: 16, right: 16, bottom: 28 },
  heroNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  heroName: { color: "#FFFFFF", fontSize: 20, fontFamily: "Poppins-Bold" },
  jobChip: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  jobChipText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Poppins-SemiBold" },
  heroStats: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  heroStat: { color: "#FFFFFF", fontSize: 12, fontFamily: "Poppins-SemiBold" },
  heroStatMuted: { color: "#E5E7EB", fontSize: 12, fontFamily: "Poppins-Regular" },
  heroDot: { color: "#E5E7EB" },
  openDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: UI.teal },
  openDotClosed: { backgroundColor: "#F87171" },
  sheet: {
    marginTop: -18,
    backgroundColor: UI.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 16,
  },
  banner: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  bannerImage: { width: 86, height: 86, borderRadius: 16, backgroundColor: UI.iconWell },
  bannerCopy: { flex: 1, minWidth: 0 },
  bannerTitle: { fontSize: 16, color: UI.text, fontFamily: "Poppins-Bold" },
  bannerBody: { marginTop: 4, fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  bannerPrice: { marginTop: 6, fontSize: 13, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  highlightRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  highlight: { flexDirection: "row", alignItems: "center", gap: 4 },
  highlightText: { fontSize: 10, color: UI.muted, fontFamily: "Poppins-Medium" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, color: UI.text, fontFamily: "Poppins-Bold" },
  sectionHint: { marginTop: 2, fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  helpBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  helpText: { fontSize: 12, color: UI.purple, fontFamily: "Poppins-SemiBold" },
  tileRow: { gap: 10, paddingRight: 8 },
  tile: {
    width: 128,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    backgroundColor: UI.card,
    padding: 8,
  },
  tileActive: { borderColor: UI.purple, backgroundColor: "#F5F3FF" },
  tileImage: { height: 64, borderRadius: 12, backgroundColor: UI.iconWell },
  tileName: { marginTop: 8, fontSize: 12, color: UI.text, fontFamily: "Poppins-SemiBold", minHeight: 32 },
  tilePrice: { marginTop: 2, fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular" },
  tileStepper: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 4,
    height: 32,
  },
  tileStepperBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  tileStepperValue: { minWidth: 16, textAlign: "center", fontFamily: "Poppins-Bold", color: UI.text },
  tileStepperEmpty: { justifyContent: "center" },
  block: { gap: 8 },
  choiceGrid: { gap: 8 },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    padding: 12,
    backgroundColor: UI.card,
  },
  choiceCardActive: { borderColor: UI.purple, backgroundColor: "#F5F3FF" },
  choiceDisabled: { opacity: 0.45 },
  choiceTitle: { fontSize: 13, color: UI.text, fontFamily: "Poppins-SemiBold" },
  choiceTitleActive: { color: UI.purple },
  choiceBody: { fontSize: 11, color: UI.muted, fontFamily: "Poppins-Regular", marginTop: 2 },
  unchecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: UI.chipBorder,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  styleChipActive: { backgroundColor: UI.purple, borderColor: UI.purple },
  styleChipText: { fontSize: 12, color: UI.text, fontFamily: "Poppins-Medium" },
  styleChipTextActive: { color: "#FFFFFF" },
  notesRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  notes: {
    flex: 1,
    minHeight: 84,
    maxHeight: CUSTOMER_ORDER_NOTES_MAX_HEIGHT,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: UI.text,
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    textAlignVertical: "top",
  },
  photoBtn: {
    width: 84,
    borderWidth: 1,
    borderColor: UI.chipBorder,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: UI.card,
  },
  photoBtnText: { fontSize: 10, color: UI.muted, fontFamily: "Poppins-Medium", textAlign: "center" },
  photoCount: { fontSize: 10, color: UI.muted, fontFamily: "Poppins-Regular" },
  photoRow: { gap: 8, paddingTop: 4 },
  photoThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: UI.iconWell },
  empty: { paddingVertical: 32, textAlign: "center", color: UI.muted, fontFamily: "Poppins-Regular" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8, paddingBottom: 4 },
  totalBtn: { flex: 1 },
  totalLabel: { fontSize: 11, color: UI.muted, fontFamily: "Poppins-Medium" },
  totalValueRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  totalValue: { fontSize: 20, color: UI.text, fontFamily: "Poppins-Bold" },
  continueWrap: { flex: 1.15 },
  continueBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  continueLabel: { color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins-Bold" },
  breakdown: { paddingTop: 8, gap: 6 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  breakdownLabel: { flex: 1, fontSize: 12, color: UI.muted, fontFamily: "Poppins-Regular" },
  breakdownValue: { fontSize: 12, color: UI.text, fontFamily: "Poppins-SemiBold" },
  pressed: { opacity: 0.88 },
});
