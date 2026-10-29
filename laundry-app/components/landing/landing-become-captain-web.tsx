import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";

const BENEFITS = [
  { label: "Reach nearby customers", icon: "map-marker" as const, color: UI.blue },
  { label: "Showcase your services", icon: "camera-outline" as const, color: UI.dealPink },
  { label: "Manage enquiries", icon: "message-outline" as const, color: UI.teal },
  { label: "Grow your business", icon: "chart-line" as const, color: UI.green },
];

type RevealPhase = "pending" | "visible" | "settled";

/**
 * Web partner CTA — staggered scroll-in, CTA shimmer/arrow, benefit icon pop,
 * and soft image float inside the curve frame.
 */
export function LandingBecomeCaptain() {
  const router = useRouter();
  const rootRef = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<RevealPhase>("pending");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) {
      setPhase("settled");
      return;
    }

    let done = false;
    let pollId = 0;
    let settleId = 0;
    const scrollRoots: Element[] = [];

    const inView = () => {
      const rect = el.getBoundingClientRect();
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < viewHeight * 0.88 && rect.bottom > 48;
    };

    const cleanupScroll = () => {
      window.clearInterval(pollId);
      scrollRoots.forEach((node) => node.removeEventListener("scroll", onScroll));
      window.removeEventListener("scroll", onScroll, true);
    };

    const reveal = () => {
      if (done) return;
      done = true;
      cleanupScroll();
      setPhase("visible");
      settleId = window.setTimeout(() => setPhase("settled"), 1400);
    };

    const onScroll = () => {
      if (inView()) reveal();
    };

    let node: Element | null = el.parentElement;
    while (node && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(style.overflowY) || /(auto|scroll|overlay)/.test(style.overflow)) {
        scrollRoots.push(node);
      }
      node = node.parentElement;
    }

    scrollRoots.forEach((root) => root.addEventListener("scroll", onScroll, { passive: true }));
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    pollId = window.setInterval(() => {
      if (inView()) reveal();
    }, 100);

    if (inView()) reveal();

    return () => {
      done = true;
      cleanupScroll();
      window.clearTimeout(settleId);
    };
  }, []);

  const phaseClass =
    phase === "pending" ? " is-pending" : phase === "visible" ? " is-visible" : " is-visible is-settled";

  return (
    <section ref={rootRef} className={`landing-partner${phaseClass}`}>
      <div className="landing-partner-inner">
        <div className="landing-partner-copy">
          <h2
            className="landing-partner-heading landing-partner-reveal"
            style={{ ["--reveal-delay" as string]: "40ms" }}
          >
            Turn your skills into income
          </h2>
          <p
            className="landing-partner-subtitle landing-partner-reveal"
            style={{ ["--reveal-delay" as string]: "120ms" }}
          >
            Offer your services to customers near you and grow your business with Tap2Laundry.
          </p>
          <a
            className="landing-partner-cta landing-partner-reveal"
            style={{ ["--reveal-delay" as string]: "220ms" }}
            href="/(auth)/welcome"
            onClick={(event) => {
              event.preventDefault();
              router.push("/(auth)/welcome");
            }}
          >
            <span className="landing-partner-cta-shine" aria-hidden />
            <span>Become a Tap2Laundry Partner</span>
            <MaterialCommunityIcons name="arrow-right" size={18} color={UI.card} />
          </a>
        </div>

        <ul className="landing-partner-benefits">
          {BENEFITS.map((item, index) => (
            <li
              key={item.label}
              className="landing-partner-benefit landing-partner-reveal"
              style={
                {
                  ["--reveal-delay" as string]: `${300 + index * 90}ms`,
                  ["--benefit-tint" as string]: item.color,
                } as CSSProperties
              }
            >
              <span className="landing-partner-benefit-icon">
                <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
              </span>
              <span className="landing-partner-benefit-label">{item.label}</span>
            </li>
          ))}
        </ul>

        <div
          className="landing-partner-visual landing-partner-reveal"
          style={{ ["--reveal-delay" as string]: "560ms" }}
        >
          <div className="landing-partner-glow" aria-hidden />
          <div className="landing-partner-frame">
            <Image
              source={assets.hero.becomeCaptain}
              style={imageStyle}
              contentFit="cover"
              contentPosition="top"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const imageStyle = {
  width: "100%",
  height: "100%",
} as const;
