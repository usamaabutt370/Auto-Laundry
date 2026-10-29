import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";

type Item = {
  id: string;
  title: string;
  location: string;
  image?: string | null;
  imageAsset?: number;
};

type Props = {
  item: Item;
  onSelect: (item: Item) => void;
  scrollX?: number;
  cardIndex?: number;
};

type Tilt = { rx: number; ry: number; tx: number; ty: number };

const IDLE: Tilt = { rx: 0, ry: 0, tx: 0, ty: 0 };

/**
 * Web card — original layout (thumb | copy | arrow) with hover parallax.
 * Image stays fully visible at rest; only subtle shift on hover.
 */
export function LandingRecentSearchCard({ item, onSelect }: Props) {
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const [tilt, setTilt] = useState<Tilt>(IDLE);
  const [hovered, setHovered] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const onMove = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (prefersReducedMotion) return;
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      // Keep thumb shift small so overflow:hidden never shows empty grey.
      setTilt({
        ry: nx * 6,
        rx: -ny * 5,
        tx: nx * 4,
        ty: ny * 3,
      });
    },
    [prefersReducedMotion],
  );

  const onLeave = useCallback(() => {
    setHovered(false);
    setTilt(IDLE);
  }, []);

  const imageSource = item.image
    ? { uri: item.image }
    : (item.imageAsset ?? assets.images.home_deal_laundry);

  return (
    <button
      ref={rootRef}
      type="button"
      className={`landing-recent-card${hovered ? " is-hovered" : ""}`}
      aria-label={item.title}
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform: hovered
          ? `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-4px)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)",
      }}
    >
      <span className="landing-recent-card-thumb-wrap" aria-hidden>
        <span
          className="landing-recent-card-thumb-layer"
          style={{
            transform: hovered
              ? `translate3d(${tilt.tx}px, ${tilt.ty}px, 0) scale(1.08)`
              : "translate3d(0, 0, 0) scale(1)",
          }}
        >
          <Image source={imageSource} style={thumbStyle} contentFit="cover" />
        </span>
      </span>

      <span className="landing-recent-card-copy">
        <span className="landing-recent-card-title">{item.title}</span>
        <span className="landing-recent-card-meta">
          <MaterialCommunityIcons name="map-marker-outline" size={12} color={UI.muted} />
          <span className="landing-recent-card-meta-text">{item.location}</span>
        </span>
      </span>

      <span
        className="landing-recent-card-arrow"
        style={{
          transform: hovered ? "translateZ(12px) scale(1.06)" : "translateZ(0) scale(1)",
        }}
      >
        <MaterialCommunityIcons name="arrow-right" size={16} color={UI.card} />
      </span>
    </button>
  );
}

/** Exact 56×56 — matches original card thumb, never clipped at rest. */
const thumbStyle = {
  width: 56,
  height: 56,
  borderRadius: 12,
} as const;
