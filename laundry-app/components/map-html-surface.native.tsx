import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

export type MapHtmlSurfaceHandle = {
  fitAll: () => void;
};

type Props = {
  html: string;
  onMessage: (event: WebViewMessageEvent) => void;
};

function injectFitAll(webView: WebView | null) {
  webView?.injectJavaScript("window.__fitAll && window.__fitAll(); true;");
}

export const MapHtmlSurface = forwardRef<MapHtmlSurfaceHandle, Props>(function MapHtmlSurface(
  { html, onMessage },
  ref,
) {
  const mapRef = useRef<WebView | null>(null);

  useImperativeHandle(ref, () => ({
    fitAll: () => {
      injectFitAll(mapRef.current);
    },
  }));

  useEffect(() => {
    const timers = [50, 200, 500, 1000].map((delay) =>
      setTimeout(() => injectFitAll(mapRef.current), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [html]);

  return (
    <WebView
      ref={mapRef}
      style={styles.map}
      source={{ html }}
      onMessage={onMessage}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      setBuiltInZoomControls={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onLoadEnd={() => injectFitAll(mapRef.current)}
    />
  );
});

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
