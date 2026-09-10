import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MapHtmlSurface,
  type MapHtmlSurfaceHandle,
} from "@/components/map-html-surface";
import { type Coordinates } from "@/utils/geocoding";

const GREEN = "#12B886";
const PURPLE = "#4A3AFF";
const TEXT = "#111827";
const MUTED = "#6B7280";
const CARD_BG = "#F3F4F6";
const TRACK = "#E5E7EB";
const THUMB_RADIUS = 11;
const LAHORE = { latitude: 31.5204, longitude: 74.3587 };

type Props = {
  userCoordinates: Coordinates | null;
  radiusKm: number;
  minKm: number;
  maxKm: number;
  title: string;
  subtitle: string;
  hint: string;
  confirmLabel: string;
  onConfirm: (km: number) => void;
  onClose: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundKm(value: number) {
  return Math.round(value * 10) / 10;
}

function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const rounded = km >= 10 ? Math.round(km) : roundKm(km);
  return `${rounded} km`;
}

function buildRadiusMapHtml(lat: number, lng: number, initialMeters: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #E8EEF4; }
    #map { position: absolute; inset: 0; }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const center = [${lat}, ${lng}];
    const targetMeters = ${initialMeters};
    let map = L.map('map', { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    const halo = L.circle(center, {
      radius: 80,
      color: '#4A3AFF',
      weight: 0,
      fillColor: '#4A3AFF',
      fillOpacity: 0.12
    }).addTo(map);

    const ring = L.circle(center, {
      radius: 400,
      color: '#4A3AFF',
      weight: 3,
      fillColor: '#12B886',
      fillOpacity: 0.18
    }).addTo(map);

    L.circleMarker(center, {
      radius: 9,
      color: '#FFFFFF',
      weight: 3,
      fillColor: '#12B886',
      fillOpacity: 1
    }).addTo(map);

    let pulse = 0;
    function pulseHalo() {
      pulse = (pulse + 1) % 120;
      const t = pulse / 120;
      halo.setRadius(70 + t * 90);
      halo.setStyle({ fillOpacity: 0.16 * (1 - t) });
      requestAnimationFrame(pulseHalo);
    }
    pulseHalo();

    let animFrame = 0;
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function fitToRadius(meters) {
      map.fitBounds(ring.getBounds(), { padding: [36, 36], maxZoom: 15, animate: false });
    }

    function setRadiusMeters(meters, animate) {
      const next = Math.max(250, meters);
      cancelAnimationFrame(animFrame);
      if (!animate) {
        ring.setRadius(next);
        fitToRadius(next);
        return;
      }
      const start = ring.getRadius();
      const t0 = performance.now();
      const dur = 900;
      cancelAnimationFrame(animFrame);
      function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        ring.setRadius(start + (next - start) * easeOut(p));
        fitToRadius(ring.getRadius());
        if (p < 1) animFrame = requestAnimationFrame(step);
      }
      animFrame = requestAnimationFrame(step);
    }

    window.__setSearchRadius = function(meters, animate) {
      setRadiusMeters(meters, !!animate);
    };
    window.__fitAll = function() { fitToRadius(ring.getRadius()); };
    window.__panTo = function(lat, lng) { map.panTo([lat, lng]); };

    map.setView(center, 14);
    setTimeout(function() { setRadiusMeters(targetMeters, true); }, 280);
  </script>
</body>
</html>`;
}

export function FilterSearchRadiusMap({
  userCoordinates,
  radiusKm,
  minKm,
  maxKm,
  title,
  subtitle,
  hint,
  confirmLabel,
  onConfirm,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapHtmlSurfaceHandle | null>(null);
  const center = userCoordinates ?? LAHORE;
  const [pendingKm, setPendingKm] = useState(() => clamp(radiusKm, minKm, maxKm));

  const html = useMemo(
    () => buildRadiusMapHtml(center.latitude, center.longitude, clamp(radiusKm, minKm, maxKm) * 1000),
    [center.latitude, center.longitude, maxKm, minKm, radiusKm],
  );

  const span = Math.max(0.001, maxKm - minKm);
  const trackW = useSharedValue(0);
  const grabX = useSharedValue(0);
  const x = useSharedValue(0);
  const dragging = useSharedValue(false);

  const commitKm = (next: number) => {
    const rounded = roundKm(clamp(next, minKm, maxKm));
    setPendingKm(rounded);
    mapRef.current?.setSearchRadius(rounded * 1000, false);
  };

  const placeAtKm = (km: number, width: number, animate: boolean) => {
    const nextX = ((clamp(km, minKm, maxKm) - minKm) / span) * width;
    x.value = animate ? withTiming(nextX, { duration: 140 }) : nextX;
  };

  useEffect(() => {
    if (dragging.value) return;
    const w = trackW.value;
    if (w <= 0) return;
    placeAtKm(pendingKm, w, true);
  }, [pendingKm, span]);

  const fillStyle = useAnimatedStyle(() => ({ width: x.value }));
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
      runOnJS(commitKm)(minKm + (x.value / w) * span);
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  return (
    <View style={styles.root}>
      <MapHtmlSurface ref={mapRef} html={html} onMessage={() => {}} />
      <View style={[styles.topBar, { paddingTop: 8 }]}>
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
          <MaterialCommunityIcons name="close" size={16} color={PURPLE} />
        </Pressable>
      </View>
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.hint}>{hint.replace("{label}", formatKm(pendingKm))}</Text>
        <GestureDetector gesture={gesture}>
          <Animated.View
            collapsable={false}
            style={styles.trackHit}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              trackW.value = w;
              if (!dragging.value) placeAtKm(pendingKm, w, false);
            }}
          >
            <View style={styles.track} pointerEvents="none" />
            <Animated.View style={[styles.trackFill, fillStyle]} pointerEvents="none" />
            <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />
          </Animated.View>
        </GestureDetector>
        <View style={styles.ends}>
          <Text style={styles.endLabel}>{formatKm(minKm)}</Text>
          <Text style={styles.endValue}>{formatKm(pendingKm)}</Text>
          <Text style={styles.endLabel}>{formatKm(maxKm)}</Text>
        </View>
        <Pressable
          onPress={() => onConfirm(pendingKm)}
          style={({ pressed }) => [styles.confirmWrap, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={["#4A3AFF", "#12B886"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CARD_BG,
  },
  topBar: {
    position: "absolute",
    top: 0,
    right: 12,
    zIndex: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: TEXT,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: MUTED,
  },
  hint: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: GREEN,
  },
  trackHit: {
    height: 44,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: TRACK,
  },
  trackFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 999,
    backgroundColor: GREEN,
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
  },
  ends: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  endLabel: {
    fontSize: 12,
    color: MUTED,
    fontFamily: "Poppins-Regular",
  },
  endValue: {
    fontSize: 13,
    color: TEXT,
    fontFamily: "Poppins-Bold",
  },
  confirmWrap: {
    borderRadius: 18,
    overflow: "hidden",
  },
  confirmBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  pressed: {
    opacity: 0.85,
  },
});
