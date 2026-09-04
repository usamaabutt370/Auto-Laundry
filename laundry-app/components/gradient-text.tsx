import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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

  return (
    <View
      style={containerStyle}
      accessible
      accessibilityLabel={accessibilityLabel ?? children}
    >
      {/* Step 1: measure the text with an invisible native Text */}
      <Text
        style={[style, { position: "absolute", opacity: 0 }]}
        accessible={false}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        {children}
      </Text>

      {/* Step 2: once measured, render MaskedView at exact text size */}
      {size && (
        <MaskedView
          accessible={false}
          style={{ width: size.width, height: size.height }}
          maskElement={
            <Text style={[style, { backgroundColor: "transparent" }]}>
              {children}
            </Text>
          }
        >
          <LinearGradient
            colors={colors}
            locations={locations}
            start={start}
            end={end}
            style={{ width: size.width, height: size.height }}
          />
        </MaskedView>
      )}

      {/* Reserve space before measurement */}
      {!size && (
        <Text style={[style, { opacity: 0 }]} accessible={false}>
          {children}
        </Text>
      )}
    </View>
  );
}
