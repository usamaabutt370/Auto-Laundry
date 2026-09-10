import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { StyleSheet, View } from "react-native";
import type { WebViewMessageEvent } from "react-native-webview";

export type MapHtmlSurfaceHandle = {
  fitAll: () => void;
  panTo: (latitude: number, longitude: number) => void;
  setSearchRadius: (meters: number, animate?: boolean) => void;
};

type Props = {
  html: string;
  onMessage: (event: WebViewMessageEvent) => void;
};

/** Web/default: Leaflet map in an iframe. Native uses `map-html-surface.native.tsx`. */
export const MapHtmlSurface = forwardRef<MapHtmlSurfaceHandle, Props>(function MapHtmlSurface(
  { html, onMessage },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useImperativeHandle(ref, () => ({
    fitAll: () => {
      const win = iframeRef.current?.contentWindow as
        | (Window & {
            __fitAll?: () => void;
            __panTo?: (lat: number, lng: number) => void;
            __setSearchRadius?: (meters: number, animate?: boolean) => void;
          })
        | null;
      win?.__fitAll?.();
    },
    panTo: (latitude, longitude) => {
      const win = iframeRef.current?.contentWindow as
        | (Window & { __panTo?: (lat: number, lng: number) => void })
        | null;
      win?.__panTo?.(latitude, longitude);
    },
    setSearchRadius: (meters, animate) => {
      const win = iframeRef.current?.contentWindow as
        | (Window & { __setSearchRadius?: (meters: number, animate?: boolean) => void })
        | null;
      win?.__setSearchRadius?.(meters, animate);
    },
  }));

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (typeof event.data !== "string") return;
      onMessage({
        nativeEvent: { data: event.data },
      } as WebViewMessageEvent);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onMessage]);

  return (
    <View style={styles.mapArea}>
      {createElement("iframe", {
        ref: iframeRef,
        title: "Tap2Laundry map",
        srcDoc: html,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: "none",
        },
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  mapArea: {
    ...StyleSheet.absoluteFillObject,
  },
});
