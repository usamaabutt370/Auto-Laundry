import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";

export interface GradientTextProps {
  children: string;
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: TextStyle;
  containerStyle?: ViewStyle;
  accessibilityLabel?: string;
}

/** Extra room so custom fonts (e.g. Poppins Bold) aren’t clipped by MaskedView. */
const MASK_PAD_Y = 3;
const MASK_PAD_X = 1;

export function GradientText({
  children,
  colors,
  locations,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
  containerStyle,
  accessibilityLabel,
}: GradientTextProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // Remeasure when copy/style changes (font load / locale / name).
  useEffect(() => {
    setSize(null);
  }, [children, style?.fontSize, style?.fontFamily, style?.lineHeight]);

  return (
    <View
      style={[{ overflow: "visible" }, containerStyle]}
      accessible
      accessibilityLabel={accessibilityLabel ?? children}
    >
      {/* Measure with an invisible native Text */}
      <Text
        style={[style, { position: "absolute", opacity: 0 }]}
        accessible={false}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width <= 0 || height <= 0) return;
          setSize((prev) =>
            prev && prev.width === width && prev.height === height
              ? prev
              : { width, height },
          );
        }}
      >
        {children}
      </Text>

      {size ? (
        <MaskedView
          accessible={false}
          style={{
            width: size.width + MASK_PAD_X * 2,
            height: size.height + MASK_PAD_Y * 2,
            overflow: "visible",
          }}
          maskElement={
            <View
              style={{
                flex: 1,
                backgroundColor: "transparent",
                justifyContent: "center",
                paddingHorizontal: MASK_PAD_X,
                paddingVertical: MASK_PAD_Y,
              }}
            >
              <Text style={[style, { backgroundColor: "transparent" }]} numberOfLines={1}>
                {children}
              </Text>
            </View>
          }
        >
          <LinearGradient
            colors={colors}
            locations={locations}
            start={start}
            end={end}
            style={{
              width: size.width + MASK_PAD_X * 2,
              height: size.height + MASK_PAD_Y * 2,
            }}
          />
        </MaskedView>
      ) : (
        <Text style={[style, { opacity: 0 }]} accessible={false}>
          {children}
        </Text>
      )}
    </View>
  );
}
