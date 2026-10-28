import { Image } from "expo-image";
import type { CSSProperties, ReactNode } from "react";

type Kind = "tailor" | "towels" | "iron";

type Props = {
  kind: Kind;
  source: number;
  style: CSSProperties;
};

const radius: Record<Kind, string> = {
  tailor: "68% 40% 62% 44% / 46% 64% 38% 56%",
  towels: "58% 42% 48% 66% / 40% 60% 46% 58%",
  iron: "48% 60% 40% 64% / 64% 36% 60% 42%",
};

/** Web-only organic blob photo frame for the promo banner. */
export function LandingPromoBlob({ kind, source, style }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        border: "5px solid #ffffff",
        borderRadius: radius[kind],
        boxShadow: "0 14px 28px rgba(30, 27, 75, 0.18)",
        background: "#ffffff",
        ...style,
      }}
    >
      <Image source={source} style={{ width: "100%", height: "100%" }} contentFit="cover" />
    </div>
  );
}

export function LandingPromoArtGlow({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        right: 10,
        top: -40,
        background: "rgba(255,255,255,0.4)",
      }}
    >
      {children}
    </div>
  );
}
