import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

import type { LandingServiceCardData } from "./landing-service-card";
import type { LaundererServiceType } from "@/constants/launderers";

type Props = {
  service: LandingServiceCardData;
  width: string | number;
  onExplore: (service: LaundererServiceType | null) => void;
};

/**
 * Web Popular Services card — Glowing gradient glassmorphism hover
 * adapted from https://codepen.io/kodplay/pen/oNBreRJ (Prismic CSS hover examples).
 * Keeps the existing content layout; glow layers are CSS (::before / ::after / span).
 */
export function LandingServiceCard({ service, width, onExplore }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`landing-glass-box landing-glass-box-${service.variant}${hovered ? " is-hovered" : ""}`}
      style={{ width }}
    >
      <button
        type="button"
        className="landing-glass-hit"
        aria-label={`Explore ${service.title}`}
        onClick={() => onExplore(service.service)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="landing-glass-glow" aria-hidden />
        <span className="landing-glass-content">
          <span
            className="landing-glass-icon"
            style={{ backgroundColor: service.iconBg, color: service.iconColor }}
          >
            <MaterialCommunityIcons name={service.icon} size={20} color={service.iconColor} />
          </span>
          <span className="landing-glass-title">{service.title}</span>
          <span className="landing-glass-desc">{service.description}</span>
          <span className="landing-glass-explore" style={{ color: service.iconColor }}>
            Explore
            <MaterialCommunityIcons name="arrow-right" size={16} color={service.iconColor} />
          </span>
          <span className="landing-glass-image" aria-hidden>
            <Image source={service.image} style={imageStyle} contentFit="cover" />
          </span>
        </span>
      </button>
    </div>
  );
}

const imageStyle = {
  width: 118,
  height: 118,
  borderRadius: 18,
} as const;
