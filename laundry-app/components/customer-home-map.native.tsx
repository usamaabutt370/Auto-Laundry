import { useCallback, useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { CustomerHomeMapOverlays } from "@/components/customer-home-map-overlays";
import { theme } from "@/constants/theme";
import {
  LAHORE_REGION,
  useCustomerHomeMapData,
  type CustomerMapMarker,
} from "@/hooks/use-customer-home-map-data";
const c = theme.colors;

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

function isLocalCluster(coords: { latitude: number; longitude: number }[]): boolean {
  if (coords.length < 2) return true;
  const lats = coords.map((item) => item.latitude);
  const lngs = coords.map((item) => item.longitude);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  return latSpan <= 1.5 && lngSpan <= 1.5;
}

function PartnerMarkerPin({ marker }: { marker: CustomerMapMarker }) {
  const borderColor = marker.mode === "pickupDelivery" ? "#64B5D9" : "#A0D0E9";

  return (
    <View style={[styles.markerWrap, { borderColor }]}>
      {marker.imageUrl ? (
        <Image source={{ uri: marker.imageUrl }} style={styles.markerImage} />
      ) : (
        <View style={[styles.markerFallback, marker.mode === "pickupDelivery" && styles.markerFallbackPickup]}>
          <Text style={styles.markerInitial}>{marker.initial}</Text>
        </View>
      )}
      <View style={[styles.markerPointer, { borderTopColor: borderColor }]} />
    </View>
  );
}

export function CustomerHomeMap({
  strings,
  onPartnerPress,
  recenterBottomOffset,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const {
    userCoordinates,
    loadingPartners,
    mapMarkers,
    selectedPartnerId,
    setSelectedPartnerId,
    selectedPartner,
    selectedPartnerUpdatedLabel,
    selectedPartnerPrimaryImage,
  } = useCustomerHomeMapData();

  const fitMap = useCallback(() => {
    const partnerCoords = mapMarkers.map((marker) => ({
      latitude: marker.latitude,
      longitude: marker.longitude,
    }));

    const edgePadding = {
      top: 96,
      right: 64,
      bottom: recenterBottomOffset + 72,
      left: 64,
    };

    if (partnerCoords.length > 1 && isLocalCluster(partnerCoords)) {
      mapRef.current?.fitToCoordinates(partnerCoords, { edgePadding, animated: true });
      return;
    }

    if (partnerCoords.length === 1) {
      mapRef.current?.animateToRegion(
        {
          latitude: partnerCoords[0].latitude,
          longitude: partnerCoords[0].longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        },
        300,
      );
      return;
    }

    if (userCoordinates) {
      mapRef.current?.animateToRegion(
        {
          latitude: userCoordinates.latitude,
          longitude: userCoordinates.longitude,
          latitudeDelta: 0.14,
          longitudeDelta: 0.14,
        },
        300,
      );
      return;
    }

    mapRef.current?.animateToRegion(LAHORE_REGION, 300);
  }, [mapMarkers, recenterBottomOffset, userCoordinates]);

  useEffect(() => {
    if (loadingPartners) return;
    const timers = [0, 250, 600].map((delay) => setTimeout(() => fitMap(), delay));
    return () => timers.forEach(clearTimeout);
  }, [fitMap, loadingPartners, mapMarkers]);

  return (
    <View style={styles.mapRoot}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={LAHORE_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        rotateEnabled={false}
        onMapReady={fitMap}
      >
        {mapMarkers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            onPress={() => setSelectedPartnerId(marker.id)}
            tracksViewChanges={false}
          >
            <PartnerMarkerPin marker={marker} />
          </Marker>
        ))}
      </MapView>

      <CustomerHomeMapOverlays
        strings={strings}
        loadingPartners={loadingPartners}
        recenterBottomOffset={recenterBottomOffset}
        onRecenter={fitMap}
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
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerWrap: {
    width: 48,
    height: 54,
    alignItems: "center",
  },
  markerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: c.blue900,
  },
  markerFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: c.blue900,
    alignItems: "center",
    justifyContent: "center",
  },
  markerFallbackPickup: {
    backgroundColor: "#128197",
  },
  markerInitial: {
    color: c.white,
    fontSize: 18,
    fontWeight: "700",
  },
  markerPointer: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
