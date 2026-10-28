import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState, type ComponentProps, type CSSProperties } from "react";
import { Image as RNImage } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";

type FloatCard = {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  tint: string;
  bg: string;
};

const FLOAT_CARDS: FloatCard[] = [
  { label: "Tailoring", icon: "content-cut", tint: UI.dealPink, bg: "#FCE7F3" },
  { label: "Laundry", icon: "tshirt-crew", tint: UI.blue, bg: "#DBEAFE" },
  { label: "Ironing", icon: "iron", tint: UI.amber, bg: UI.amberBg },
  { label: "More Services", icon: "view-grid", tint: UI.teal, bg: UI.mint },
];

function resolveHeroSrc(): string {
  const source = assets.hero.landingWomanPhone as unknown;
  if (typeof source === "string") return source;
  if (source && typeof source === "object" && "uri" in source) {
    const uri = (source as { uri?: string }).uri;
    if (uri) return uri;
  }
  try {
    const resolved = RNImage.resolveAssetSource(source as number);
    if (resolved?.uri) return resolved.uri;
  } catch {
    // fall through
  }
  // Metro web sometimes returns { default: url }
  if (source && typeof source === "object" && "default" in source) {
    const def = (source as { default?: unknown }).default;
    if (typeof def === "string") return def;
  }
  return "";
}

function FloatCardView({ card }: { card: FloatCard }) {
  const [hovered, setHovered] = useState(false);

  const cardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    background: "#FFFFFF",
    padding: "9px 10px 9px 8px",
    borderRadius: 12,
    boxShadow: hovered
      ? `0 14px 28px ${card.tint}40`
      : "0 4px 14px rgba(17, 24, 39, 0.12)",
    transform: hovered ? "translate(-8px, -2px) scale(1.04)" : "none",
    transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease",
    cursor: "default",
    pointerEvents: "auto",
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-hidden
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: card.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: hovered ? "scale(1.1) rotate(-6deg)" : "none",
          transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <MaterialCommunityIcons name={card.icon} size={15} color={card.tint} />
      </div>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 700,
          color: UI.text,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {card.label}
      </span>
      <MaterialCommunityIcons
        name="chevron-right"
        size={16}
        color={hovered ? card.tint : UI.muted}
      />
    </div>
  );
}

/**
 * Web hero visual using CSS grid overlay + native <img>.
 * Avoids RN Web absolute/flex quirks that detach pills from the photo on reload.
 */
export function LandingHeroVisual() {
  const src = useMemo(() => resolveHeroSrc(), []);

  return (
    <div
      className="landing-hero-visual"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "440px",
        width: 460,
        maxWidth: "100%",
        height: 440,
        minHeight: 440,
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "#E8EEF6",
        // Belt-and-suspenders: photo as CSS background so frame never goes blank
        // if the <img> paint is delayed on reload.
        ...(src
          ? {
              backgroundImage: `url("${src}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : null),
        flexShrink: 0,
        alignSelf: "flex-end",
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          decoding="async"
          fetchPriority="high"
          style={{
            gridArea: "1 / 1",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 28,
            display: "block",
          }}
        />
      ) : null}
      <div
        style={{
          gridArea: "1 / 1",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: 176,
          justifySelf: "end",
          alignSelf: "start",
          marginTop: 72,
          marginRight: 12,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        {FLOAT_CARDS.map((card) => (
          <FloatCardView key={card.label} card={card} />
        ))}
      </div>
    </div>
  );
}
