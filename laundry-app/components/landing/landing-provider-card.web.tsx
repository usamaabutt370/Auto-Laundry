import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Linking } from "react-native";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import {
  formatLandingDistance,
  serviceTypeLabel,
  type LandingProvider,
} from "@/hooks/use-landing-providers";

type Props = {
  partner: LandingProvider;
  onViewProfile: () => void;
  cardWidth?: number | `${number}%`;
};

function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("+") ? digits.slice(1) : digits;
  return `https://wa.me/${normalized}`;
}

/**
 * Web provider card — lift + image zoom + action reveal on hover.
 */
export function LandingProviderCard({
  partner,
  onViewProfile,
  cardWidth = "100%",
}: Props) {
  const [hovered, setHovered] = useState(false);
  const tags = partner.serviceTypes.slice(0, 2).map(serviceTypeLabel);
  const phone = partner.phone_number?.trim() ?? "";
  const wa = phone ? whatsappUrl(phone) : null;
  const area =
    partner.address
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(-2)
      .join(", ") ?? "Lahore";
  const ratingLabel =
    partner.ratingAvg != null
      ? `${partner.ratingAvg.toFixed(1)}${
          partner.ratingCount > 0 ? ` (${partner.ratingCount})` : ""
        }`
      : "—";

  const imageSource = partner.imageUrl
    ? { uri: partner.imageUrl }
    : assets.onboarding.slide2;

  return (
    <div
      className={`landing-provider-dyn${hovered ? " is-hovered" : ""}`}
      style={{ width: cardWidth }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="landing-provider-dyn-card"
        aria-label={`View ${partner.business_name.trim()} profile`}
        onClick={onViewProfile}
      >
        <span className="landing-provider-dyn-image-wrap">
          <span className="landing-provider-dyn-image-zoom">
            <Image source={imageSource} style={heroImageStyle} contentFit="cover" />
          </span>
          <span className="landing-provider-dyn-distance">
            {formatLandingDistance(partner.distanceKm)}
          </span>
          <span className="landing-provider-dyn-heart" aria-hidden>
            <span className="landing-provider-dyn-heart-icon">
              <MaterialCommunityIcons name="heart-outline" size={16} color={UI.card} />
            </span>
          </span>
        </span>

        <span className="landing-provider-dyn-body">
          <span className="landing-provider-dyn-name-row">
            <span className="landing-provider-dyn-name">{partner.business_name.trim()}</span>
            {partner.verified ? (
              <span className="landing-provider-dyn-verified">
                <MaterialCommunityIcons name="check-decagram" size={15} color={UI.verified} />
                Verified
              </span>
            ) : null}
          </span>

          <span className="landing-provider-dyn-meta">
            <MaterialCommunityIcons name="star" size={14} color={UI.star} />
            <span className="landing-provider-dyn-meta-strong">{ratingLabel}</span>
          </span>

          <span className="landing-provider-dyn-meta">
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={UI.muted} />
            <span className="landing-provider-dyn-meta-muted">{area}</span>
          </span>

          <span className="landing-provider-dyn-tags">
            {tags.length > 0
              ? tags.map((tag) => (
                  <span key={tag} className="landing-provider-dyn-tag">
                    {tag}
                  </span>
                ))
              : null}
          </span>

          <span className="landing-provider-dyn-actions">
            <span
              role="link"
              tabIndex={wa ? 0 : -1}
              className={`landing-provider-dyn-contact${!wa ? " is-disabled" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                if (wa) void Linking.openURL(wa);
              }}
              onKeyDown={(event) => {
                if (!wa) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  void Linking.openURL(wa);
                }
              }}
            >
              <MaterialCommunityIcons name="whatsapp" size={16} color={UI.green} />
              Contact
            </span>
            <span
              role="button"
              tabIndex={0}
              className="landing-provider-dyn-profile"
              onClick={(event) => {
                event.stopPropagation();
                onViewProfile();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onViewProfile();
                }
              }}
            >
              View Profile
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

const heroImageStyle = {
  width: "100%",
  height: "100%",
} as const;
