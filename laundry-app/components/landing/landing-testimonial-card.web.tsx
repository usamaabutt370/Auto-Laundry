import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

import { UI } from "@/constants/theme";
import type { LandingPublicReview } from "@/lib/partner-discovery";

type Props = {
  item: LandingPublicReview;
  width: number;
  /** Alternating accent for the expanding hover blob. */
  accent?: "orange" | "blue";
};

const SEAM_DOTS = Array.from({ length: 18 }, (_, i) => i);

/**
 * Web testimonial — Info Cards Concept hover (Yancy Min / freefrontend):
 * ticket notches + dotted seam, grayscale avatar → color, expanding color blob.
 */
export function LandingTestimonialCard({ item, width, accent = "orange" }: Props) {
  const [hovered, setHovered] = useState(false);
  const stars = Math.max(0, Math.min(5, Math.round(item.rating)));

  return (
    <article
      className={`landing-info-card landing-info-card-${accent}${hovered ? " is-hovered" : ""}`}
      style={{ width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ul className="landing-info-card-seam" aria-hidden>
        {SEAM_DOTS.map((dot) => (
          <li key={dot} />
        ))}
      </ul>

      <div className="landing-info-card-body">
        <div className="landing-info-card-stars">
          {Array.from({ length: 5 }).map((_, starIndex) => (
            <MaterialCommunityIcons
              key={starIndex}
              name={starIndex < stars ? "star" : "star-outline"}
              size={16}
              color={starIndex < stars ? UI.star : UI.chipBorder}
            />
          ))}
        </div>
        <p className="landing-info-card-quote">&ldquo;{item.message}&rdquo;</p>
        <div className="landing-info-card-attribution">
          <div className="landing-info-card-pic">
            {item.reviewerImageUrl ? (
              <Image
                source={{ uri: item.reviewerImageUrl }}
                style={avatarStyle}
                contentFit="cover"
              />
            ) : (
              <span className="landing-info-card-initial">{item.reviewerInitial}</span>
            )}
          </div>
          <div className="landing-info-card-copy">
            <span className="landing-info-card-name">{item.reviewerName}</span>
            <span className="landing-info-card-detail">
              {item.locationLabel} • {item.businessName}
            </span>
          </div>
        </div>
      </div>

      <span className="landing-info-card-blob" aria-hidden />
    </article>
  );
}

const avatarStyle = {
  width: 48,
  height: 48,
  borderRadius: 24,
} as const;
