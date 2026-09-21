import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerHomeMapOverlays } from "@/components/customer-home-map-overlays";
import {
  MapHtmlSurface,
  type MapHtmlSurfaceHandle,
} from "@/components/map-html-surface";
import type { WebViewMessageEvent } from "react-native-webview";
import {
  type CustomerMapMarker,
  type PartnerMapMarker,
} from "@/hooks/use-customer-home-map-data";
import { type Coordinates } from "@/utils/geocoding";

const SEARCH_RADIUS_M = 5000;

type HomeStrings = {
  dropOff: string;
  pickUpDelivery: string;
  viewPartnerDetails: string;
  closePartnerDetails: string;
  noImage: string;
  updatedPrefix: string;
};

export type CustomerHomeMapViewData = {
  userCoordinates: Coordinates | null;
  loadingPartners: boolean;
  partners: PartnerMapMarker[];
  mapMarkers: CustomerMapMarker[];
  setSelectedPartnerId: (id: string | null) => void;
  selectedPartner: PartnerMapMarker | null;
  selectedPartnerUpdatedLabel: string | null;
  selectedPartnerPrimaryImage: string | null;
};

type Props = {
  strings: HomeStrings;
  onPartnerPress: (partnerId: string, mode: "dropoff" | "pickupDelivery") => void;
  recenterBottomOffset: number;
  mapBottomInset?: number;
  mapData: CustomerHomeMapViewData;
  partnerSheetHost?: "map" | "screen";
};

export function CustomerHomeMap({
  strings,
  onPartnerPress,
  recenterBottomOffset,
  mapBottomInset = 0,
  mapData,
  partnerSheetHost = "screen",
}: Props) {
  const mapRef = useRef<MapHtmlSurfaceHandle | null>(null);
  const {
    userCoordinates,
    loadingPartners,
    partners,
    mapMarkers,
    setSelectedPartnerId,
    selectedPartner,
  } = mapData;

  const mapHtml = useMemo(() => {
    const markersJson = JSON.stringify(mapMarkers);
    const userJson = JSON.stringify(userCoordinates);
    const zoomControlBottomOffset = Math.max(16, recenterBottomOffset + 52);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #map { position: absolute; inset: 0; }
    .leaflet-div-icon.partner-marker-icon,
    .leaflet-div-icon.cluster-icon,
    .leaflet-div-icon.user-marker-icon { background: transparent !important; border: none !important; overflow: visible !important; }
    .partner-marker {
      width: 44px; height: 56px; position: relative;
    }
    .partner-marker-head {
      width: 44px; height: 44px; border-radius: 50%;
      overflow: hidden; position: relative; flex-shrink: 0;
      border: 2px solid #FFFFFF; box-sizing: border-box;
      background: #12B886;
      box-shadow: 0 5px 12px rgba(17, 24, 39, 0.28);
      transform: translateZ(0);
      -webkit-clip-path: circle(50%);
      clip-path: circle(50%);
      -webkit-mask-image: radial-gradient(closest-side, #000 99%, transparent);
      mask-image: radial-gradient(closest-side, #000 99%, transparent);
    }
    .partner-marker-head.pickupDelivery { background: #5B4DFF; }
    /* Marker photo — kept for later; price is shown instead.
    .leaflet-container .partner-marker img.partner-photo,
    .partner-marker img.partner-photo {
      display: block !important;
      width: 40px !important; height: 40px !important;
      max-width: 40px !important; max-height: 40px !important;
      object-fit: cover !important; object-position: center !important;
      border-radius: 50% !important;
      -webkit-clip-path: circle(50%);
      clip-path: circle(50%);
      position: relative !important;
    }
    */
    .partner-marker-fallback {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      color: #FFFFFF; font: 700 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .partner-marker-price {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #FFFFFF; text-align: center; pointer-events: none;
    }
    .partner-marker-price-prefix {
      font: 700 8px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      letter-spacing: 0.2px; opacity: 0.92;
    }
    .partner-marker-price-value {
      font: 700 12px/1.1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 40px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .partner-marker-pointer {
      width: 0; height: 0; margin: -1px auto 0; flex-shrink: 0;
      border-left: 7px solid transparent; border-right: 7px solid transparent;
      border-top: 10px solid #FFFFFF;
    }
    .partner-marker-label {
      position: absolute; top: 56px; left: 50%; transform: translateX(-50%);
      max-width: 92px; padding: 2px 7px; border-radius: 8px;
      background: #FFFFFF; color: #111827;
      font: 700 10px/1.25 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      box-shadow: 0 2px 8px rgba(17, 24, 39, 0.16);
      pointer-events: none;
    }
    .cluster-bubble {
      width: 40px; height: 40px; border-radius: 20px;
      background: #12B886; border: 3px solid #FFFFFF; color: #FFFFFF;
      font: 700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 16px rgba(18, 184, 134, 0.38);
    }
    .user-wrap { width: 28px; height: 28px; position: relative; }
    .user-pulse {
      position: absolute; inset: 0; border-radius: 50%; background: #0B84FF;
      animation: userPulse 1.8s ease-out infinite;
    }
    .user-core {
      position: absolute; left: 7px; top: 7px; width: 14px; height: 14px; border-radius: 50%;
      background: #0B84FF; border: 3px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(11, 132, 255, 0.45);
    }
    @keyframes userPulse {
      0% { transform: scale(0.65); opacity: 0.5; }
      100% { transform: scale(2.1); opacity: 0; }
    }
    .leaflet-right { right: 12px; }
    .leaflet-bottom { bottom: ${zoomControlBottomOffset}px; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-bar {
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    .leaflet-control-zoom {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-right: 4px !important;
      margin-bottom: 4px !important;
    }
    .leaflet-touch .leaflet-control-zoom {
      border: none !important;
    }
    .leaflet-control-zoom a,
    .leaflet-touch .leaflet-control-zoom a {
      width: 42px !important;
      height: 42px !important;
      line-height: 42px !important;
      border-radius: 21px !important;
      border: 1px solid #E5E7EB !important;
      background: #FFFFFF !important;
      color: #12B886 !important;
      font-size: 22px !important;
      font-weight: 600 !important;
      text-indent: 0 !important;
      box-shadow: 0 8px 18px rgba(17, 24, 39, 0.12);
    }
    .leaflet-control-zoom a.leaflet-control-zoom-in,
    .leaflet-control-zoom a.leaflet-control-zoom-out {
      border-bottom: 1px solid #E5E7EB !important;
    }
    .leaflet-control-zoom a:hover,
    .leaflet-control-zoom a:focus {
      background: #ECFDF5 !important;
      color: #0F9F7A !important;
    }
    .leaflet-control-zoom a.leaflet-disabled {
      color: #D1D5DB !important;
      background: #F9FAFB !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    const markers = ${markersJson};
    const user = ${userJson};
    const defaultCenter = [31.365, 74.2143];
    let map = null;
    const partnerPoints = [];

    function escapeHtml(value) {
      return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function shortName(name) {
      const trimmed = String(name || '').trim();
      if (!trimmed) return 'Laundry';
      if (trimmed.length <= 16) return trimmed;
      const first = trimmed.split(/\s+/)[0];
      if (first.length >= 4 && first.length <= 16) return first;
      return trimmed.slice(0, 15) + '…';
    }

    function markerHtml(item) {
      const modeClass = item.mode === 'pickupDelivery' ? 'pickupDelivery' : 'dropoff';
      const initial = escapeHtml(item.initial || 'P');
      const label = escapeHtml(shortName(item.name));
      const minPrice = Number(item.minPrice);
      const hasPrice = Number.isFinite(minPrice) && minPrice > 0;
      const headContent = hasPrice
        ? '<div class="partner-marker-price"><span class="partner-marker-price-prefix">Rs</span><span class="partner-marker-price-value">' + escapeHtml(String(Math.round(minPrice))) + '</span></div>'
        : '<div class="partner-marker-fallback">' + initial + '</div>';

      // Photo on the marker is kept for later. Lowest service price is shown instead.
      // const photoUrl = item.imageUrl ? String(item.imageUrl) : '';
      // const img = photoUrl
      //   ? '<img class="partner-photo" width="40" height="40" src="' + escapeHtml(photoUrl) + '" alt="" style="width:40px;height:40px;max-width:40px;max-height:40px;object-fit:cover;border-radius:50%;display:block;" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'" />'
      //   : '';
      // const hideFallback = photoUrl ? ' style="display:none"' : '';
      // const photoHead = img + '<div class="partner-marker-fallback"' + hideFallback + '>' + initial + '</div>';

      return '<div class="partner-marker"><div class="partner-marker-head ' + modeClass + '">' +
        headContent +
        '</div><div class="partner-marker-pointer"></div>' +
        '<div class="partner-marker-label">' + label + '</div></div>';
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
      if (window.__cluster) {
        window.__cluster.clearLayers();
        map.removeLayer(window.__cluster);
        window.__cluster = null;
      }
      map.eachLayer(function(layer) {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          map.removeLayer(layer);
        }
      });

      if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
        const userIcon = L.divIcon({
          html: '<div class="user-wrap"><div class="user-pulse"></div><div class="user-core"></div></div>',
          className: 'user-marker-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([user.latitude, user.longitude], { icon: userIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
      }

      const partnerLayers = markers.map(function(item) {
        const icon = L.divIcon({
          html: markerHtml(item),
          className: 'partner-marker-icon',
          iconSize: [44, 56],
          iconAnchor: [22, 56],
          popupAnchor: [0, -50],
        });
        const m = L.marker([item.latitude, item.longitude], { icon: icon });
        m.on('click', function() {
          const payload = JSON.stringify({ type: 'partner-press', partnerId: item.id, mode: item.mode });
          if (window.ReactNativeWebView?.postMessage) window.ReactNativeWebView.postMessage(payload);
          else if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
        });
        partnerPoints.push([item.latitude, item.longitude]);
        return m;
      });

      if (typeof L.markerClusterGroup === 'function') {
        window.__cluster = L.markerClusterGroup({
          maxClusterRadius: 64,
          disableClusteringAtZoom: 15,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          zoomToBoundsOnClick: true,
          iconCreateFunction: function(cluster) {
            const n = cluster.getChildCount();
            return L.divIcon({
              html: '<div class="cluster-bubble">' + n + '</div>',
              className: 'cluster-icon',
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            });
          },
        });
        partnerLayers.forEach(function(m) { window.__cluster.addLayer(m); });
        map.addLayer(window.__cluster);
      } else {
        partnerLayers.forEach(function(m) { m.addTo(map); });
      }
    }

    function fitRadius(lat, lng) {
      map.fitBounds(L.latLng(lat, lng).toBounds(${SEARCH_RADIUS_M * 2}), {
        padding: [28, 28],
        maxZoom: 15
      });
    }

    function fitAll() {
      if (!map) return;
      map.invalidateSize({ animate: false, pan: false });
      if (user && Number.isFinite(user.latitude) && Number.isFinite(user.longitude)) {
        fitRadius(user.latitude, user.longitude);
        return;
      }
      fitRadius(defaultCenter[0], defaultCenter[1]);
    }

    window.__fitAll = function() { bootMap(); fitAll(); };
    window.__panTo = function(lat, lng) {
      if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      map.panTo([lat, lng]);
    };
    window.__fitAll();
    requestAnimationFrame(function() { window.__fitAll(); });
    setTimeout(function() { window.__fitAll(); }, 250);
  </script>
</body>
</html>`;
  }, [mapMarkers, recenterBottomOffset, userCoordinates]);

  const focusMap = useCallback(() => {
    mapRef.current?.fitAll();
  }, []);

  useEffect(() => {
    if (loadingPartners) return;
    const timers = [0, 200, 500].map((delay) => setTimeout(() => focusMap(), delay));
    return () => timers.forEach(clearTimeout);
  }, [focusMap, loadingPartners, mapMarkers]);

  useEffect(() => {
    const partnerId = selectedPartner?.id;
    if (!partnerId) return;
    const marker = mapMarkers.find((item) => item.id === partnerId);
    if (!marker) return;
    mapRef.current?.panTo(marker.latitude, marker.longitude);
  }, [mapMarkers, selectedPartner?.id]);

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
        mapBottomInset={mapBottomInset}
        userCoordinates={userCoordinates}
        onRecenter={focusMap}
        selectedPartner={selectedPartner}
        partners={partners}
        mapMarkers={mapMarkers}
        onSelectPartner={setSelectedPartnerId}
        onClosePartner={() => setSelectedPartnerId(null)}
        onPartnerPress={onPartnerPress}
        showMapChrome
        showPartnerSheet={partnerSheetHost === "map"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapRoot: {
    flex: 1,
  },
});
