import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
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
import { CustomerHomeMap, type CustomerHomeMapViewData } from "@/components/customer-home-map";
import { FilterSearchRadiusMap } from "@/components/filter-search-radius-map";
import type { PartnerPublicRow } from "@/lib/partner-discovery";
import { type Coordinates } from "@/utils/geocoding";
import { isPartnerOpenNow } from "@/utils/partner-hours";
import { isPartnerTopRated, partnerHasActiveOffer } from "@/utils/partner-offers";

const GREEN = "#12B886";
const GREEN_SOFT = "#ECFDF5";
const PURPLE = "#2C1B6E";
const LINK = "#4F46E5";
const MUTED = "#6B7280";
const TEXT = "#111827";
const BORDER = "#E5E7EB";
const TRACK = "#E5E7EB";
const CARD_BG = "#F3F4F6";
const STAR = "#F59E0B";

export const DISTANCE_STOPS = [0.5, 1, 2, 5, 10, 20];
export const DISTANCE_MIN_KM = 0.5;
export const DISTANCE_MAX_KM = 20;
export const PRICE_STOPS = [0, 500, 1000, 2500, 5000];
export const PRICE_MIN = 0;
export const PRICE_MAX = 5000;
export const PRICE_STEP = 50;

export type ServiceCategory = "washAndFold" | "press" | "tailoring";
export type MinRating = 0 | 3 | 4 | 4.5;

export function isServiceCategory(value: string | undefined): value is ServiceCategory {
  return value === "washAndFold" || value === "press" || value === "tailoring";
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
  locationLabel: string;
  matchCount: (filters: ProviderFilters) => number;
  onClose: () => void;
  onApply: (next: ProviderFilters) => void;
  userCoordinates?: Coordinates | null;
  mapData?: CustomerHomeMapViewData;
  onPartnerPress?: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
};

export function ProviderFiltersSheet({
  visible,
  pane,
  value,
  locationLabel,
  matchCount,
  onClose,
  onApply,
  userCoordinates = null,
  mapData,
  onPartnerPress,
}: Props) {
  const s = strings.customer.pickLaunderer;
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ProviderFilters>(value);
  const [radiusPicker, setRadiusPicker] = useState(false);
  const [livePrice, setLivePrice] = useState<{ min: number; max: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMap = pane === "map";

  useEffect(() => {
    if (!visible) {
      setRadiusPicker(false);
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

  const categories: { id: ServiceCategory; label: string; icon: "washing-machine" | "iron" | "scissors-cutting" }[] =
    [
      { id: "washAndFold", label: s.categoryLaundry, icon: "washing-machine" },
      { id: "press", label: s.categoryIroning, icon: "iron" },
      { id: "tailoring", label: s.categoryTailoring, icon: "scissors-cutting" },
    ];

  const ratings: { id: MinRating; label: string }[] = [
    { id: 0, label: s.ratingAny },
    { id: 3, label: fill(s.ratingNPlus, { n: 3 }) },
    { id: 4, label: fill(s.ratingNPlus, { n: 4 }) },
    { id: 4.5, label: fill(s.ratingNPlus, { n: 4.5 }) },
  ];

  const toggleCategory = (id: ServiceCategory) => {
    if (applying) return;
    setDraft((prev) => {
      const has = prev.categories.includes(id);
      const next = has ? prev.categories.filter((item) => item !== id) : [...prev.categories, id];
      return { ...prev, categories: next };
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
            (showMap || radiusPicker) && styles.sheetFill,
            !showMap && !radiusPicker && { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {!radiusPicker ? (
            <>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{showMap ? s.map : s.filters}</Text>
              <Text style={styles.subtitle}>{showMap ? s.mapSubtitle : s.filtersSubtitle}</Text>
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
            </View>
          ) : (
            <>
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
                    style={[styles.categoryCard, selected && styles.categoryCardOn]}
                  >
                    {selected ? (
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
                      </View>
                    ) : null}
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={26}
                      color={selected ? GREEN : PURPLE}
                    />
                    <Text style={[styles.categoryLabel, selected && styles.categoryLabelOn]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Section
              icon="map-marker-outline"
              title={s.location}
              right={
                <Pressable onPress={() => setRadiusPicker(true)} hitSlop={8}>
                  <Text style={styles.link}>{s.changeLocation} →</Text>
                </Pressable>
              }
            />
            <View style={styles.locationCard}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color={PURPLE} />
              <View style={styles.locationCopy}>
                <Text style={styles.locationTitle}>{s.currentLocation}</Text>
                <Text style={styles.locationSub}>{locationLabel}</Text>
              </View>
            </View>

            <Section
              icon="map-outline"
              title={s.distance}
              right={
                <Text style={styles.greenValue}>{fill(s.withinDistance, { label: distanceLabel })}</Text>
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
                <Text style={styles.link}>
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
                <Text style={styles.link}>
                  {draft.minRating === 0
                    ? s.ratingAny
                    : fill(s.ratingValue, { n: draft.minRating })}
                </Text>
              }
            />
            <View style={styles.ratingRow}>
              {ratings.map((item) => {
                const selected = draft.minRating === item.id;
                return (
                  <Pressable
                    key={String(item.id)}
                    onPress={() => setDraft((prev) => ({ ...prev, minRating: item.id }))}
                    style={[styles.ratingChip, selected && styles.ratingChipOn]}
                  >
                    {selected ? (
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
                      </View>
                    ) : null}
                    {item.id !== 0 ? (
                      <MaterialCommunityIcons
                        name="star"
                        size={14}
                        color={selected ? GREEN : STAR}
                      />
                    ) : null}
                    <Text style={[styles.ratingLabel, selected && styles.ratingLabelOn]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Section icon="shield-check-outline" title={s.providerFeatures} />
            <View style={styles.featureGrid}>
              <FeatureToggle
                icon="crown-outline"
                label={s.featureTopRated}
                value={draft.topRated}
                onChange={(topRated) => setDraft((prev) => ({ ...prev, topRated }))}
              />
              <FeatureToggle
                icon="check-decagram-outline"
                label={s.featureVerified}
                value={draft.verified}
                onChange={(verified) => setDraft((prev) => ({ ...prev, verified }))}
              />
              <FeatureToggle
                icon="clock-outline"
                label={s.featureOpenNow}
                value={draft.openNow}
                onChange={(openNow) => setDraft((prev) => ({ ...prev, openNow }))}
              />
              <FeatureToggle
                icon="tag-outline"
                label={s.featureOffers}
                value={draft.offers}
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
            <Pressable
              onPress={handleApply}
              disabled={applying}
              style={({ pressed }) => [
                styles.applyWrap,
                pressed && !applying && styles.pressed,
                applying && styles.applyDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={applying ? s.applyingFilters : fill(s.applyFilters, { count })}
              accessibilityState={{ busy: applying, disabled: applying }}
            >
              <LinearGradient
                colors={["#4A3AFF", "#12B886"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.applyBtn}
              >
                {applying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <MaterialCommunityIcons name="tune-variant" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.applyText}>
                  {applying ? s.applyingFilters : fill(s.applyFilters, { count })}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
            </>
          )}
            </>
          ) : (
            <FilterSearchRadiusMap
              userCoordinates={userCoordinates}
              radiusKm={draft.maxDistanceKm}
              minKm={DISTANCE_MIN_KM}
              maxKm={DISTANCE_MAX_KM}
              title={s.searchRadiusTitle}
              subtitle={s.searchRadiusSubtitle}
              hint={s.searchRadiusHint}
              confirmLabel={s.searchRadiusUse}
              onConfirm={(km) => {
                setDraft((prev) => ({ ...prev, maxDistanceKm: km }));
                setRadiusPicker(false);
              }}
              onClose={() => setRadiusPicker(false)}
            />
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

function FeatureToggle({
  icon,
  label,
  value,
  onChange,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.featureItem}>
      <MaterialCommunityIcons name={icon} size={18} color={PURPLE} />
      <Text style={styles.featureLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D1D5DB", true: GREEN }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

const THUMB_RADIUS = 11;

function valueFromX(x: number, width: number, min: number, max: number, step: number) {
  if (width <= 0) return min;
  const raw = min + (x / width) * (max - min);
  return snapToStep(raw, step, min, max);
}

function xFromValue(value: number, width: number, min: number, max: number) {
  const span = Math.max(0.0001, max - min);
  return ((clamp(value, min, max) - min) / span) * width;
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
    transform: [{ translateX: x.value - THUMB_RADIUS }],
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
          <View style={styles.track} pointerEvents="none" />
          <Animated.View style={[styles.trackFill, fillStyle]} pointerEvents="none" />
          <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />
        </Animated.View>
      </GestureDetector>
      <View style={styles.stopRow}>
        {tickLabels.map((label, i) => (
          <Pressable key={`${tickValues[i]}-${label}`} onPress={() => onChange(tickValues[i] ?? min)} style={styles.stopBtn}>
            <Text
              style={[
                styles.stopLabel,
                Math.abs((tickValues[i] ?? 0) - value) < step / 2 && styles.stopLabelOn,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
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
    transform: [{ translateX: minX.value - THUMB_RADIUS }],
  }));
  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: maxX.value - THUMB_RADIUS }],
  }));

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = true;
      const w = trackW.value;
      if (w <= 0) return;
      const pos = Math.max(0, Math.min(w, e.x));
      active.value = Math.abs(pos - minX.value) <= Math.abs(pos - maxX.value) ? 0 : 1;
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
          <View style={styles.track} pointerEvents="none" />
          <Animated.View style={[styles.trackFill, fillStyle]} pointerEvents="none" />
          <Animated.View style={[styles.thumb, minThumbStyle]} pointerEvents="none" />
          <Animated.View style={[styles.thumb, maxThumbStyle]} pointerEvents="none" />
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
                const closer = Math.abs(tick - low) <= Math.abs(tick - high) ? "min" : "max";
                if (closer === "min") onChange(Math.min(tick, high), high);
                else onChange(low, Math.max(tick, low));
              }}
              style={styles.stopBtn}
            >
              <Text style={[styles.stopLabel, activeTick && styles.stopLabelOn]}>{label}</Text>
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
  body: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionHead: {
    marginTop: 18,
    marginBottom: 10,
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
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
  },
  greenValue: {
    color: GREEN,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  categoryCardOn: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: TEXT,
  },
  categoryLabelOn: {
    color: GREEN,
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
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  locationCopy: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: TEXT,
  },
  locationSub: {
    marginTop: 2,
    fontSize: 13,
    color: MUTED,
    fontFamily: "Poppins-Regular",
  },
  sliderBlock: {
    marginBottom: 4,
  },
  trackHit: {
    height: 44,
    justifyContent: "center",
  },
  thumb: {
    position: "absolute",
    top: 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GREEN,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: GREEN,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: TRACK,
  },
  trackFill: {
    position: "absolute",
    top: 19,
    height: 6,
    borderRadius: 999,
    backgroundColor: GREEN,
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
    fontSize: 10,
    color: MUTED,
    fontFamily: "Poppins-Regular",
  },
  stopLabelOn: {
    color: GREEN,
    fontFamily: "Poppins-Bold",
  },
  ratingRow: {
    flexDirection: "row",
    gap: 8,
  },
  ratingChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#FFFFFF",
  },
  ratingChipOn: {
    backgroundColor: GREEN_SOFT,
    borderColor: GREEN,
  },
  ratingLabel: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: TEXT,
  },
  ratingLabelOn: {
    color: GREEN,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureItem: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  featureLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Poppins-SemiBold",
    color: TEXT,
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
    height: 52,
  },
  resetText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: PURPLE,
  },
  applyWrap: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  applyDisabled: {
    opacity: 0.7,
  },
  applyBtn: {
    height: 52,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins-Bold",
  },
  pressed: {
    opacity: 0.86,
  },
});
