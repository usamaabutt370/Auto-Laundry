import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

const c = theme.colors;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: object;
};

export function AvatarImage({ uri, name, size = 80, style }: Props) {
  const borderRadius = size / 2;
  const initials = getInitials(name ?? "");

  return (
    <View
      style={[
        { width: size, height: size, borderRadius, overflow: "hidden" },
        style,
      ]}
    >
      <View
        style={[
          styles.initialsWrap,
          { width: size, height: size, borderRadius },
        ]}
      >
        <Text style={[styles.initialsText, { fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      </View>
      {uri ? (
        <Image
          key={uri}
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  initialsWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.backgroundDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: c.blue600,
  },
  initialsText: {
    color: c.white,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
