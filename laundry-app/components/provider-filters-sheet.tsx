import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strings } from "@/constants/strings";
import { UI } from "@/constants/theme";
import { CustomerHomeMap, type CustomerHomeMapViewData } from "@/components/customer-home-map";
import { AppCtaButton } from "@/components/ui/cta-button";
import type { PartnerPublicRow } from "@/lib/partner-discovery";
import { isPartnerOpenNow } from "@/utils/partner-hours";
import { isPartnerTopRated, partnerHasActiveOffer } from "@/utils/partner-offers";

const GREEN = UI.teal;
const GREEN_SOFT = UI.openBg;
const PURPLE = UI.purpleDeep;
const LINK = UI.purple;
const MUTED = UI.muted;
const TEXT = UI.text;
const BORDER = UI.chipBorder;
const CARD_BG = UI.iconWell;
const STAR = UI.star;
const DIST = UI.teal;
const PRICE = UI.purple;
const TRACK = UI.chipBorder;
const DIST_THUMB_RADIUS = 11;
const PRICE_THUMB_RADIUS = 11;

export const DISTANCE_STOPS = [0.5, 1, 2, 5, 10, 20];
export const DISTANCE_MIN_KM = 0.5;
export const DISTANCE_MAX_KM = 20;
export const PRICE_STOPS = [0, 500, 1000, 2500, 5000];
export const PRICE_MIN = 0;
export const PRICE_MAX = 5000;
export const PRICE_STEP = 50;

export type ServiceCategory = "washAndFold" | "dryCleaning" | "press" | "tailoring";
export type MinRating = 0 | 1 | 2 | 3 | 4 | 5;

export function isServiceCategory(value: string | undefined): value is ServiceCategory {
  return (
    value === "washAndFold" ||
    value === "dryCleaning" ||
    value === "press" ||
    value === "tailoring"
  );
}

export type ProviderFilters = {
  categories: ServiceCategory[];
  maxDistanceKm: number;
  priceMin: number;
  priceMax: number;
  minRating: MinRating;
  topRated: boolean;
  verified: boolean;
  openNow: boolean;
  offers: boolean;
};

export const DEFAULT_PROVIDER_FILTERS: ProviderFilters = {
  categories: ["washAndFold"],
  maxDistanceKm: 5,
  priceMin: 0,
  priceMax: 5000,
  minRating: 4,
  topRated: true,
  verified: true,
  openNow: true,
  offers: false,
};

export const OPEN_PROVIDER_FILTERS: ProviderFilters = {
  categories: [],
  maxDistanceKm: 20,
  priceMin: 0,
  priceMax: 5000,
  minRating: 0,
  topRated: false,
  verified: false,
  openNow: false,
  offers: false,
};

function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snapToStep(value: number, step: number, min: number, max: number) {
  const snapped = Math.round(value / step) * step;
  return clamp(Number(snapped.toFixed(2)), min, max);
}

function valueFromX(x: number, width: number, min: number, max: number, step: number) {
  if (width <= 0) return min;
  const raw = min + (x / width) * (max - min);
  return snapToStep(raw, step, min, max);
}

function xFromValue(value: number, width: number, min: number, max: number) {
  const span = Math.max(0.0001, max - min);
  return ((clamp(value, min, max) - min) / span) * width;
}

function formatRs(value: number, plus = false) {
  const formatted = Math.round(value).toLocaleString("en-PK");
  return plus ? `${formatted}+` : formatted;
}

function formatFilterDistance(km: number, stopLabels: string[]) {
  const stopIndex = DISTANCE_STOPS.findIndex((stop) => Math.abs(stop - km) < 0.051);
  if (stopIndex >= 0) return stopLabels[stopIndex] ?? `${km} km`;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
  return `${rounded} km`;
}

export function applyProviderFilters(
  partners: PartnerPublicRow[],
  filters: ProviderFilters,
  distanceKm: Record<string, number | null>,
): PartnerPublicRow[] {
  const knownDistance = Object.values(distanceKm).some(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  return partners.filter((partner) => {
    if (filters.openNow && !isPartnerOpenNow(partner.available_time)) return false;
    const km = distanceKm[partner.id];
    if (knownDistance) {
      if (typeof km !== "number" || !Number.isFinite(km) || km > filters.maxDistanceKm) {
        return false;
      }
    } else if (typeof km === "number" && Number.isFinite(km) && km > filters.maxDistanceKm) {
      return false;
    }
    if (typeof partner.minPrice === "number" && Number.isFinite(partner.minPrice)) {
      if (partner.minPrice < filters.priceMin) return false;
      if (filters.priceMax < PRICE_MAX && partner.minPrice > filters.priceMax) return false;
    }
    if (filters.verified && !partner.verified) return false;
    if (filters.minRating > 0) {
      const avg = Number(partner.ratingAvg);
      if (!Number.isFinite(avg) || avg < filters.minRating) return false;
    }
    if (filters.topRated && !isPartnerTopRated(partner.ratingAvg, partner.ratingCount)) {
      return false;
    }
    if (filters.offers && !partnerHasActiveOffer(partner.offerPercent)) return false;
    if (filters.categories.length > 0) {
      const types = partner.serviceTypes ?? [];
      if (!filters.categories.some((category) => types.includes(category))) return false;
    }
    return true;
  });
}

export type ProviderSheetPane = "filters" | "map";

type Props = {
  visible: boolean;
  pane: ProviderSheetPane;
  value: ProviderFilters;
  matchCount: (filters: ProviderFilters) => number;
  onClose: () => void;
  onApply: (next: ProviderFilters) => void;
  mapData?: CustomerHomeMapViewData;
  onPartnerPress?: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
  onFiltersChange?: (next: ProviderFilters) => void;
};

export function ProviderFiltersSheet({
  visible,
  pane,
  value,
  matchCount,
  onClose,
  onApply,
  mapData,
  onPartnerPress,
  onFiltersChange,
}: Props) {
  const s = strings.customer.pickLaunderer;
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ProviderFilters>(value);
  const [livePrice, setLivePrice] = useState<{ min: number; max: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMap = pane === "map";

  useEffect(() => {
    if (!visible) {
      setApplying(false);
      if (applyTimerRef.current) {
        clearTimeout(applyTimerRef.current);
        applyTimerRef.current = null;
      }
      return;
    }
    setDraft({
      ...value,
      maxDistanceKm: clamp(value.maxDistanceKm, DISTANCE_MIN_KM, DISTANCE_MAX_KM),
      priceMin: clamp(value.priceMin, PRICE_MIN, PRICE_MAX),
      priceMax: clamp(value.priceMax, PRICE_MIN, PRICE_MAX),
    });
  }, [value, visible]);

  useEffect(() => {
    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    };
  }, []);

  const count = matchCount(draft);
  const distanceLabels = [
    s.dist500m,
    s.dist1km,
    s.dist2km,
    s.dist5km,
    s.dist10km,
    s.dist20km,
  ];
  const distanceLabel = formatFilterDistance(draft.maxDistanceKm, distanceLabels);
  const priceLabels = [s.price0, s.price500, s.price1000, s.price2500, s.price5000];
  const shownPriceMin = livePrice?.min ?? draft.priceMin;
  const shownPriceMax = livePrice?.max ?? draft.priceMax;
  const priceMaxLabel =
    shownPriceMax >= PRICE_MAX ? formatRs(PRICE_MAX, true) : formatRs(shownPriceMax);

  const categories: {
    id: ServiceCategory;
    label: string;
    icon: "washing-machine" | "iron" | "scissors-cutting";
    accent: string;
    accentSoft: string;
  }[] = [
    {
      id: "washAndFold",
      label: s.categoryLaundry,
      icon: "washing-machine",
      accent: UI.teal,
      accentSoft: UI.openBg,
    },
    {
      id: "dryCleaning",
      label: s.categoryDryCleaning,
      icon: "hanger",
      accent: "#0EA5E9",
      accentSoft: "#ECFEFF",
    },
    {
      id: "press",
      label: s.categoryIroning,
      icon: "iron",
      accent: "#2563EB",
      accentSoft: "#EFF6FF",
    },
    {
      id: "tailoring",
      label: s.categoryTailoring,
      icon: "scissors-cutting",
      accent: "#7C3AED",
      accentSoft: "#F5F3FF",
    },
  ];

  const ratings: { id: MinRating; label: string }[] = [
    { id: 1, label: "1" },
    { id: 2, label: "2" },
    { id: 3, label: "3" },
    { id: 4, label: "4" },
    { id: 5, label: "5" },
    { id: 0, label: s.filterAll },
  ];

  const toggleCategory = (id: ServiceCategory) => {
    if (applying) return;
    setDraft((prev) => {
      const has = prev.categories.includes(id);
      const next = has ? prev.categories.filter((item) => item !== id) : [...prev.categories, id];
      return { ...prev, categories: next };
    });
  };

  const mapCategoryChips: {
    id: ServiceCategory | "all";
    label: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  }[] = [
    { id: "all", label: s.filterAll, icon: "apps" },
    { id: "washAndFold", label: s.categoryLaundry, icon: "washing-machine" },
    { id: "dryCleaning", label: s.categoryDryCleaning, icon: "hanger" },
    { id: "press", label: s.categoryIroning, icon: "iron" },
    { id: "tailoring", label: s.categoryTailoring, icon: "scissors-cutting" },
  ];

  const isMapCategoryOn = (id: ServiceCategory | "all") => {
    if (id === "all") return value.categories.length === 0;
    return value.categories.includes(id);
  };

  const setMapCategory = (id: ServiceCategory | "all") => {
    onFiltersChange?.({
      ...value,
      categories: id === "all" ? [] : [id],
    });
  };

  const handleApply = () => {
    if (applying) return;
    const next = {
      ...draft,
      maxDistanceKm: clamp(draft.maxDistanceKm, DISTANCE_MIN_KM, DISTANCE_MAX_KM),
      priceMin: clamp(draft.priceMin, PRICE_MIN, PRICE_MAX),
      priceMax: clamp(Math.max(draft.priceMin, draft.priceMax), PRICE_MIN, PRICE_MAX),
    };
    setApplying(true);
    applyTimerRef.current = setTimeout(() => {
      applyTimerRef.current = null;
      onApply(next);
    }, 450);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={applying ? undefined : onClose} />
        <View
          style={[
            styles.sheet,
            showMap && styles.sheetFill,
            !showMap && { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {showMap && mapData ? (
            <View style={styles.mapFill}>
              <CustomerHomeMap
                strings={strings.customer.home}
                mapData={mapData}
                onPartnerPress={onPartnerPress ?? (() => {})}
                recenterBottomOffset={Math.max(insets.bottom, 12) + 16}
                mapBottomInset={Math.max(insets.bottom, 12)}
                partnerSheetHost="map"
              />
              <View pointerEvents="box-none" style={styles.mapChrome}>
                <View style={styles.mapCard}>
                  <View style={styles.handle} />
                  <View style={styles.mapHeaderRow}>
                    <View style={styles.headerText}>
                      <Text style={styles.mapTitle}>{s.mapTitle}</Text>
                      <Text style={styles.mapSubtitle}>{s.mapSubtitle}</Text>
                    </View>
                    <Pressable
                      onPress={onClose}
                      style={styles.mapCloseBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                    >
                      <MaterialCommunityIcons name="close" size={18} color={TEXT} />
                    </Pressable>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.mapChipRow}
                  >
                    {mapCategoryChips.map((item) => {
                      const selected = isMapCategoryOn(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setMapCategory(item.id)}
                          style={[styles.mapChip, selected && styles.mapChipOn]}
                        >
                          <MaterialCommunityIcons
                            name={item.icon}
                            size={16}
                            color={selected ? "#FFFFFF" : TEXT}
                          />
                          <Text style={[styles.mapChipLabel, selected && styles.mapChipLabelOn]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>
          ) : (
            <>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{s.filters}</Text>
              <Text style={styles.subtitle}>{s.filtersSubtitle}</Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={applying}
              style={[styles.closeBtn, applying && styles.applyDisabled]}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="close" size={16} color={PURPLE} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <Section icon="view-grid-outline" title={s.serviceCategory} />
            <View style={styles.categoryRow}>
              {categories.map((item) => {
                const selected = draft.categories.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleCategory(item.id)}
                    style={[
                      styles.categoryCard,
                      selected && {
                        backgroundColor: item.accentSoft,
                        borderColor: item.accent,
                      },
                    ]}
                  >
                    {selected ? (
                      <View style={[styles.checkBadge, { backgroundColor: item.accent }]}>
                        <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
                      </View>
                    ) : null}
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={26}
                      color={selected ? item.accent : PURPLE}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        selected && { color: item.accent },
                      ]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Section
              icon="map-outline"
              title={s.distance}
              right={
                <Text style={styles.distValue}>{fill(s.withinDistance, { label: distanceLabel })}</Text>
              }
            />
            <ContinuousSlider
              min={DISTANCE_MIN_KM}
              max={DISTANCE_MAX_KM}
              step={0.1}
              value={draft.maxDistanceKm}
              tickValues={DISTANCE_STOPS}
              tickLabels={distanceLabels}
              onChange={(maxDistanceKm) => setDraft((prev) => ({ ...prev, maxDistanceKm }))}
            />

            <Section
              icon="tag-outline"
              title={s.priceRange}
              right={
                <Text style={styles.priceValue}>
                  {fill(s.priceRangeValue, { min: shownPriceMin, max: priceMaxLabel })}
                </Text>
              }
            />
            <RangeContinuousSlider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              low={draft.priceMin}
              high={draft.priceMax}
              tickValues={PRICE_STOPS}
              tickLabels={priceLabels}
              onLiveChange={(priceMin, priceMax) => setLivePrice({ min: priceMin, max: priceMax })}
              onChange={(priceMin, priceMax) => {
                setLivePrice(null);
                setDraft((prev) => ({ ...prev, priceMin, priceMax }));
              }}
            />

            <Section
              icon="star-outline"
              title={s.minimumRating}
              right={
                draft.minRating === 0 ? (
                  <Text style={styles.link}>{s.filterAll}</Text>
                ) : (
                  <View style={styles.ratingValue}>
                    <MaterialCommunityIcons name="star" size={16} color={STAR} />
                    <Text style={styles.ratingValueText}>{draft.minRating}</Text>
                  </View>
                )
              }
            />
            <View style={styles.ratingRow}>
              {ratings.map((item) => {
                const selected = draft.minRating === item.id;
                return (
                  <Pressable
                    key={String(item.id)}
                    onPress={() => setDraft((prev) => ({ ...prev, minRating: item.id }))}
                    style={[styles.ratingTile, selected && styles.ratingTileOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={item.label}
                  >
                    {item.id !== 0 ? (
                      <MaterialCommunityIcons
                        name="star"
                        size={16}
                        color={selected ? STAR : MUTED}
                      />
                    ) : null}
                    <Text
                      style={[styles.ratingTileLabel, selected && styles.ratingTileLabelOn]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Section icon="shield-check-outline" title={s.providerFeatures} />
            <View style={styles.featureGrid}>
              <FeatureTile
                icon="crown"
                label={s.featureTopRated}
                value={draft.topRated}
                accent="#F59E0B"
                accentSoft="#FFFBEB"
                onChange={(topRated) => setDraft((prev) => ({ ...prev, topRated }))}
              />
              <FeatureTile
                icon="check-decagram"
                label={s.featureVerified}
                value={draft.verified}
                accent="#2563EB"
                accentSoft="#EFF6FF"
                onChange={(verified) => setDraft((prev) => ({ ...prev, verified }))}
              />
              <FeatureTile
                icon="clock-check-outline"
                label={s.featureOpenNow}
                value={draft.openNow}
                accent={GREEN}
                accentSoft={GREEN_SOFT}
                onChange={(openNow) => setDraft((prev) => ({ ...prev, openNow }))}
              />
              <FeatureTile
                icon="tag"
                label={s.featureOffers}
                value={draft.offers}
                accent="#7C3AED"
                accentSoft="#F5F3FF"
                onChange={(offers) => setDraft((prev) => ({ ...prev, offers }))}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => setDraft(OPEN_PROVIDER_FILTERS)}
              disabled={applying}
              style={({ pressed }) => [styles.resetBtn, pressed && !applying && styles.pressed, applying && styles.applyDisabled]}
            >
              <MaterialCommunityIcons name="restore" size={18} color={PURPLE} />
              <Text style={styles.resetText}>{s.reset}</Text>
            </Pressable>
            <AppCtaButton
              label={applying ? s.applyingFilters : fill(s.applyFilters, { count })}
              onPress={handleApply}
              disabled={applying}
              loading={applying}
              width="half"
              leftIcon="tune-variant"
              accessibilityLabel={applying ? s.applyingFilters : fill(s.applyFilters, { count })}
            />
          </View>
            </>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Section({
  icon,
  title,
  right,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionTitleRow}>
        <MaterialCommunityIcons name={icon} size={18} color={PURPLE} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function FeatureTile({
  icon,
  label,
  value,
  accent,
  accentSoft,
  onChange,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: boolean;
  accent: string;
  accentSoft: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.featureTile,
        value && { backgroundColor: accentSoft, borderColor: accent, borderWidth: 1.5 },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: value }}
      accessibilityLabel={label}
    >
      <View style={[styles.featureIconWell, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={16} color="#FFFFFF" />
      </View>
      <Text
        style={[styles.featureTileLabel, value && { color: accent }]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {value ? (
        <View style={[styles.featureCheck, { backgroundColor: accent }]}>
          <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

function ContinuousSlider({
  min,
  max,
  step,
  value,
  tickValues,
  tickLabels,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  tickValues: number[];
  tickLabels: string[];
  onChange: (next: number) => void;
}) {
  const trackW = useSharedValue(0);
  const grabX = useSharedValue(0);
  const x = useSharedValue(0);
  const dragging = useSharedValue(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const commitFromTrack = (px: number, width: number) => {
    onChangeRef.current(valueFromX(px, width, min, max, step));
  };

  const placeAtValue = (next: number, width: number, animate: boolean) => {
    const nextX = xFromValue(next, width, min, max);
    x.value = animate ? withTiming(nextX, { duration: 140 }) : nextX;
  };

  useEffect(() => {
    if (dragging.value) return;
    const w = trackW.value;
    if (w <= 0) return;
    placeAtValue(value, w, true);
  }, [value, min, max]);

  const fillStyle = useAnimatedStyle(() => ({
    width: x.value,
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - DIST_THUMB_RADIUS }],
  }));

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = true;
      const w = trackW.value;
      if (w <= 0) return;
      grabX.value = Math.max(0, Math.min(w, e.x));
      x.value = grabX.value;
    })
    .onUpdate((e) => {
      const w = trackW.value;
      if (w <= 0) return;
      x.value = Math.max(0, Math.min(w, grabX.value + e.translationX));
    })
    .onEnd(() => {
      const w = trackW.value;
      if (w <= 0) return;
      runOnJS(commitFromTrack)(x.value, w);
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  return (
    <View style={styles.sliderBlock}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          collapsable={false}
          style={styles.trackHit}
          onLayout={(e: LayoutChangeEvent) => {
            const w = e.nativeEvent.layout.width;
            trackW.value = w;
            if (!dragging.value) placeAtValue(value, w, false);
          }}
        >
          <View style={styles.distTrack} pointerEvents="none" />
          <Animated.View style={[styles.distFill, fillStyle]} pointerEvents="none" />
          <Animated.View style={[styles.distThumb, thumbStyle]} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>
      <View style={styles.stopRow}>
        {tickLabels.map((label, i) => {
          const on = Math.abs((tickValues[i] ?? 0) - value) < step / 2;
          return (
            <Pressable
              key={`${tickValues[i]}-${label}`}
              onPress={() => onChange(tickValues[i] ?? min)}
              style={styles.stopBtn}
            >
              <Text
                style={[styles.stopLabel, on && styles.distStopOn]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RangeContinuousSlider({
  min,
  max,
  step,
  low,
  high,
  tickValues,
  tickLabels,
  onChange,
  onLiveChange,
}: {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  tickValues: number[];
  tickLabels: string[];
  onChange: (nextLow: number, nextHigh: number) => void;
  onLiveChange?: (nextLow: number, nextHigh: number) => void;
}) {
  const trackW = useSharedValue(0);
  const grabX = useSharedValue(0);
  const minX = useSharedValue(0);
  const maxX = useSharedValue(0);
  const dragging = useSharedValue(false);
  const active = useSharedValue(1);
  const lastLive = useSharedValue(-1);
  const onChangeRef = useRef(onChange);
  const onLiveChangeRef = useRef(onLiveChange);
  onChangeRef.current = onChange;
  onLiveChangeRef.current = onLiveChange;

  const commitFromTrack = (minPx: number, maxPx: number, width: number) => {
    const nextLow = valueFromX(minPx, width, min, max, step);
    const nextHigh = valueFromX(maxPx, width, min, max, step);
    onChangeRef.current(Math.min(nextLow, nextHigh), Math.max(nextLow, nextHigh));
  };

  const previewValues = (nextLow: number, nextHigh: number) => {
    onLiveChangeRef.current?.(Math.min(nextLow, nextHigh), Math.max(nextLow, nextHigh));
  };

  const placeAtValues = (nextLow: number, nextHigh: number, width: number, animate: boolean) => {
    const nextMinX = xFromValue(nextLow, width, min, max);
    const nextMaxX = xFromValue(nextHigh, width, min, max);
    minX.value = animate ? withTiming(nextMinX, { duration: 140 }) : nextMinX;
    maxX.value = animate ? withTiming(nextMaxX, { duration: 140 }) : nextMaxX;
  };

  useEffect(() => {
    if (dragging.value) return;
    const w = trackW.value;
    if (w <= 0) return;
    placeAtValues(low, high, w, true);
  }, [low, high, min, max]);

  useAnimatedReaction(
    () => {
      const w = trackW.value;
      if (w <= 0 || dragging.value === false) return lastLive.value;
      const span = Math.max(0.0001, max - min);
      const nextLow = Math.round((min + (minX.value / w) * span) / step) * step;
      const nextHigh = Math.round((min + (maxX.value / w) * span) / step) * step;
      return nextLow * 100000 + nextHigh;
    },
    (packed) => {
      if (packed < 0 || packed === lastLive.value) return;
      lastLive.value = packed;
      const nextHigh = packed % 100000;
      const nextLow = (packed - nextHigh) / 100000;
      runOnJS(previewValues)(nextLow, nextHigh);
    },
  );

  const fillStyle = useAnimatedStyle(() => ({
    left: minX.value,
    width: Math.max(0, maxX.value - minX.value),
  }));
  const minThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: minX.value - PRICE_THUMB_RADIUS }],
  }));
  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: maxX.value - PRICE_THUMB_RADIUS }],
  }));

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = true;
      const w = trackW.value;
      if (w <= 0) return;
      const pos = Math.max(0, Math.min(w, e.x));
      const overlapping = Math.abs(maxX.value - minX.value) <= PRICE_THUMB_RADIUS;
      if (overlapping) {
        active.value = pos >= maxX.value ? 1 : 0;
      } else {
        active.value = Math.abs(pos - minX.value) <= Math.abs(pos - maxX.value) ? 0 : 1;
      }
      grabX.value = pos;
      if (active.value === 0) {
        minX.value = Math.max(0, Math.min(maxX.value, pos));
      } else {
        maxX.value = Math.max(minX.value, Math.min(w, pos));
      }
    })
    .onUpdate((e) => {
      const w = trackW.value;
      if (w <= 0) return;
      const pos = Math.max(0, Math.min(w, grabX.value + e.translationX));
      if (active.value === 0) {
        minX.value = Math.max(0, Math.min(maxX.value, pos));
      } else {
        maxX.value = Math.max(minX.value, Math.min(w, pos));
      }
    })
    .onEnd(() => {
      const w = trackW.value;
      if (w <= 0) return;
      runOnJS(commitFromTrack)(minX.value, maxX.value, w);
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  return (
    <View style={styles.sliderBlock}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          collapsable={false}
          style={styles.trackHit}
          onLayout={(e: LayoutChangeEvent) => {
            const w = e.nativeEvent.layout.width;
            trackW.value = w;
            if (!dragging.value) placeAtValues(low, high, w, false);
          }}
        >
          <View style={styles.priceTrack} pointerEvents="none" />
          <Animated.View style={[styles.priceFill, fillStyle]} pointerEvents="none" />
          <Animated.View style={[styles.priceThumb, minThumbStyle]} pointerEvents="none" />
          <Animated.View style={[styles.priceThumb, maxThumbStyle]} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>
      <View style={styles.stopRow}>
        {tickLabels.map((label, i) => {
          const tick = tickValues[i] ?? min;
          const activeTick = Math.abs(tick - low) < step / 2 || Math.abs(tick - high) < step / 2;
          return (
            <Pressable
              key={`${tick}-${label}`}
              onPress={() => {
                if (Math.abs(high - low) < step / 2) {
                  if (tick >= high) onChange(low, tick);
                  else onChange(tick, high);
                  return;
                }
                const closer = Math.abs(tick - low) <= Math.abs(tick - high) ? "min" : "max";
                if (closer === "min") onChange(Math.min(tick, high), high);
                else onChange(low, Math.max(tick, low));
              }}
              style={styles.stopBtn}
            >
              <Text
                style={[styles.stopLabel, activeTick && styles.priceStopOn]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
  },
  sheetFill: {
    height: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: TEXT,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: MUTED,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  mapFill: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: CARD_BG,
  },
  mapChrome: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 400,
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 12,
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  mapTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: TEXT,
  },
  mapSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: MUTED,
  },
  mapCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mapChipRow: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  mapChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  mapChipOn: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  mapChipLabel: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: TEXT,
  },
  mapChipLabelOn: {
    color: "#FFFFFF",
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHead: {
    marginTop: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: PURPLE,
  },
  link: {
    color: LINK,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  ratingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingValueText: {
    color: STAR,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  distValue: {
    color: DIST,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  priceValue: {
    color: PRICE,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    flexBasis: "47%",
    flexGrow: 1,
    maxWidth: "49%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: TEXT,
    textAlign: "center",
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderBlock: {
    marginBottom: 8,
  },
  trackHit: {
    height: 44,
    justifyContent: "center",
  },
  distTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: TRACK,
  },
  distFill: {
    position: "absolute",
    top: 19,
    height: 6,
    borderRadius: 999,
    backgroundColor: DIST,
  },
  distThumb: {
    position: "absolute",
    top: 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DIST,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: DIST,
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  priceTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: TRACK,
  },
  priceFill: {
    position: "absolute",
    top: 19,
    height: 6,
    borderRadius: 999,
    backgroundColor: PRICE,
  },
  priceThumb: {
    position: "absolute",
    top: 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRICE,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: PRICE,
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  stopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  stopBtn: {
    flex: 1,
    alignItems: "center",
  },
  stopLabel: {
    fontSize: 12,
    color: MUTED,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
  },
  distStopOn: {
    color: DIST,
    fontFamily: "Poppins-Bold",
    fontSize: 13,
  },
  priceStopOn: {
    color: PRICE,
    fontFamily: "Poppins-Bold",
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "stretch",
  },
  ratingTile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8EAED",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  ratingTileOn: {
    backgroundColor: "#FFFBEB",
    borderColor: STAR,
  },
  ratingTileLabel: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: TEXT,
  },
  ratingTileLabelOn: {
    color: STAR,
    fontFamily: "Poppins-Bold",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureTile: {
    width: "47%",
    flexGrow: 1,
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8EAED",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  featureIconWell: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTileLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-SemiBold",
    color: TEXT,
  },
  featureCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CARD_BG,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 48,
  },
  resetText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: PURPLE,
  },
  applyDisabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.86,
  },
});
