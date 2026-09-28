import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { WebViewMessageEvent } from "react-native-webview";

import {
  MapHtmlSurface,
  type MapHtmlSurfaceHandle,
} from "@/components/map-html-surface";
import { LAHORE_CITY } from "@/utils/device-location";
import type { Coordinates } from "@/utils/geocoding";

type Props = {
  coords: Coordinates | null;
  onPick: (coords: Coordinates) => void;
};

export function AddressLocationMap({ coords, onPick }: Props) {
  const mapRef = useRef<MapHtmlSurfaceHandle | null>(null);
  const pin = coords ?? LAHORE_CITY;

  const html = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    .pin {
      width: 10px; height: 10px; border-radius: 5px;
      background: #5B5CFF;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(37, 56, 201, 0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const start = [${pin.latitude}, ${pin.longitude}];
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(start, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    const circle = L.circle(start, { radius: 100, color: '#6D5CFF', weight: 0, fillColor: '#6D5CFF', fillOpacity: 0.16 }).addTo(map);
    const icon = L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    const marker = L.marker(start, { icon, draggable: true }).addTo(map);
    function post(lat, lng) {
      const payload = JSON.stringify({ type: 'pick', latitude: lat, longitude: lng });
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
      else parent.postMessage(payload, '*');
    }
    function moveTo(lat, lng, notify) {
      const ll = L.latLng(lat, lng);
      marker.setLatLng(ll);
      circle.setLatLng(ll);
      map.setView(ll, Math.max(map.getZoom(), 15));
      if (notify) post(lat, lng);
    }
    map.on('click', (e) => moveTo(e.latlng.lat, e.latlng.lng, true));
    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      circle.setLatLng(ll);
      post(ll.lat, ll.lng);
    });
    window.__panTo = (lat, lng) => moveTo(lat, lng, false);
    window.__fitAll = () => map.setView(marker.getLatLng(), 15);
    window.__setSearchRadius = () => {};
  </script>
</body>
</html>`;
    // Pin in HTML is initial only; later moves use panTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coords) return;
    mapRef.current?.panTo(coords.latitude, coords.longitude);
  }, [coords]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const raw = JSON.parse(String(event.nativeEvent.data)) as {
        type?: string;
        latitude?: number;
        longitude?: number;
      };
      if (raw.type !== "pick") return;
      const latitude = Number(raw.latitude);
      const longitude = Number(raw.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      onPick({ latitude, longitude });
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <MapHtmlSurface ref={mapRef} html={html} onMessage={onMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    overflow: "hidden",
    position: "relative",
  },
});
