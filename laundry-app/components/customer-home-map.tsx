import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerHomeMapOverlays } from "@/components/customer-home-map-overlays";
import {
  MapHtmlSurface,
  type MapHtmlSurfaceHandle,
} from "@/components/map-html-surface";
import type { WebViewMessageEvent } from "react-native-webview";
import { useCustomerHomeMapData } from "@/hooks/use-customer-home-map-data";

const DEFAULT_ZOOM = 8;

type HomeStrings = {
  dropOff: string;
  pickUpDelivery: string;
};

type Props = {
  strings: HomeStrings;
  onMenuPress: () => void;
  onPartnerPress: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
  recenterBottomOffset: number;
};

export function CustomerHomeMap({
  strings,
  onPartnerPress,
  recenterBottomOffset,
}: Props) {
  const mapRef = useRef<MapHtmlSurfaceHandle | null>(null);
  const {
    userCoordinates,
    loadingPartners,
    mapMarkers,
    setSelectedPartnerId,
    selectedPartner,
    selectedPartnerUpdatedLabel,
    selectedPartnerPrimaryImage,
  } = useCustomerHomeMapData();

  const mapHtml = useMemo(() => {
    const markersJson = JSON.stringify(mapMarkers);
    const userJson = JSON.stringify(userCoordinates);
    const dropOffLabel = JSON.stringify(strings.dropOff);
    const pickupLabel = JSON.stringify(strings.pickUpDelivery);
    const zoomControlBottomOffset = Math.max(16, recenterBottomOffset + 52);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #map { position: absolute; inset: 0; }
    .leaflet-div-icon.partner-marker-icon { background: transparent !important; border: none !important; box-shadow: none !important; }
    .partner-marker { display: flex; flex-direction: column; align-items: center; width: 48px; line-height: 0; }
    .partner-marker-frame { width: 48px; height: 48px; border-radius: 50%; border: 3px solid #A0D0E9; background: #3b7f95; overflow: hidden; box-sizing: border-box; box-shadow: 0 2px 8px rgba(18, 129, 151, 0.35); position: relative; flex-shrink: 0; }
    .partner-marker-frame.pickupDelivery { border-color: #64B5D9; background: #128197; }
    .partner-marker-media { position: absolute; inset: 0; width: 100%; height: 100%; }
    .partner-marker-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .partner-marker-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #3b7f95; color: #F9FAFB; font-size: 18px; font-weight: 700; }
    .partner-marker-frame.pickupDelivery .partner-marker-fallback { background: #128197; }
    .partner-marker-pointer { width: 0; height: 0; margin-top: -1px; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #A0D0E9; }
    .partner-marker-pointer.pickupDelivery { border-top-color: #64B5D9; }
    .leaflet-right { right: 8px; }
    .leaflet-bottom { bottom: ${zoomControlBottomOffset}px; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const markers = ${markersJson};
    const user = ${userJson};
    const defaultCenter = [31.365, 74.2143];
    let map = null;
    const partnerPoints = [];

    function labelForMode(mode) {
      return mode === 'pickupDelivery' ? ${pickupLabel} : ${dropOffLabel};
    }

    function escapeHtml(value) {
      return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function markerHtml(item) {
      const modeClass = item.mode === 'pickupDelivery' ? 'pickupDelivery' : 'dropoff';
      const imageHtml = item.imageUrl
        ? '<div class="partner-marker-media"><img src="' + escapeHtml(item.imageUrl) + '" alt="" /></div>'
        : '<span class="partner-marker-fallback">' + escapeHtml(item.initial || 'P') + '</span>';
      return '<div class="partner-marker"><div class="partner-marker-frame ' + modeClass + '">' + imageHtml + '</div><div class="partner-marker-pointer ' + modeClass + '"></div></div>';
    }

    function isLocalCluster(points) {
      if (points.length < 2) return true;
      var lats = points.map(function(p) { return p[0]; });
      var lngs = points.map(function(p) { return p[1]; });
      return (Math.max.apply(null, lats) - Math.min.apply(null, lats) <= 1.5)
        && (Math.max.apply(null, lngs) - Math.min.apply(null, lngs) <= 1.5);
    }

    function bootMap() {
      if (!map) {
        map = L.map('map', { zoomControl: false, attributionControl: false });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '' }).addTo(map);
      } else {
        map.invalidateSize({ animate: false, pan: false });
      }

      partnerPoints.length = 0;
      map.eachLayer(function(layer) {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          map.removeLayer(layer);
        }
      });

      if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
        L.circleMarker([user.latitude, user.longitude], { radius: 8, color: '#0B84FF', fillColor: '#0B84FF', fillOpacity: 0.95 }).addTo(map).bindPopup('Your location');
      }

      markers.forEach(function(item) {
        const icon = L.divIcon({ html: markerHtml(item), className: 'partner-marker-icon', iconSize: [48, 58], iconAnchor: [24, 54], popupAnchor: [0, -50] });
        const m = L.marker([item.latitude, item.longitude], { icon }).addTo(map);
        m.bindPopup(item.name + ' (' + labelForMode(item.mode) + ')');
        m.on('click', function() {
          const payload = JSON.stringify({ type: 'partner-press', partnerId: item.id, mode: item.mode });
          if (window.ReactNativeWebView?.postMessage) window.ReactNativeWebView.postMessage(payload);
          else if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
        });
        partnerPoints.push([item.latitude, item.longitude]);
      });
    }

    function fitAll() {
      if (!map) return;
      map.invalidateSize({ animate: false, pan: false });
      if (partnerPoints.length > 1 && isLocalCluster(partnerPoints)) {
        map.fitBounds(L.latLngBounds(partnerPoints), { padding: [72, 72], maxZoom: 13 });
        return;
      }
      if (partnerPoints.length === 1) {
        map.setView(partnerPoints[0], 12);
        return;
      }
      if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
        map.setView([user.latitude, user.longitude], 11);
        return;
      }
      map.setView(defaultCenter, ${DEFAULT_ZOOM});
    }

    window.__fitAll = function() { bootMap(); fitAll(); };
    window.__fitAll();
    requestAnimationFrame(function() { window.__fitAll(); });
    setTimeout(function() { window.__fitAll(); }, 250);
  </script>
</body>
</html>`;
  }, [mapMarkers, recenterBottomOffset, strings.dropOff, strings.pickUpDelivery, userCoordinates]);

  const focusMap = useCallback(() => {
    mapRef.current?.fitAll();
  }, []);

  useEffect(() => {
    if (loadingPartners) return;
    const timers = [0, 200, 500].map((delay) => setTimeout(() => focusMap(), delay));
    return () => timers.forEach(clearTimeout);
  }, [focusMap, loadingPartners, mapMarkers]);

  return (
    <View style={styles.mapRoot}>
      <MapHtmlSurface
        ref={mapRef}
        html={mapHtml}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              partnerId?: string;
              mode?: "dropoff" | "pickupDelivery";
            };
            if (
              payload.type === "partner-press" &&
              typeof payload.partnerId === "string" &&
              (payload.mode === "dropoff" || payload.mode === "pickupDelivery")
            ) {
              setSelectedPartnerId(payload.partnerId);
            }
          } catch {
            // Ignore malformed map messages.
          }
        }}
      />

      <CustomerHomeMapOverlays
        strings={strings}
        loadingPartners={loadingPartners}
        recenterBottomOffset={recenterBottomOffset}
        onRecenter={focusMap}
        selectedPartner={selectedPartner}
        selectedPartnerPrimaryImage={selectedPartnerPrimaryImage}
        selectedPartnerUpdatedLabel={selectedPartnerUpdatedLabel}
        onClosePartner={() => setSelectedPartnerId(null)}
        onPartnerPress={onPartnerPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapRoot: {
    ...StyleSheet.absoluteFillObject,
  },
});
