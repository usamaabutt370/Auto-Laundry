import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";
import { LandingPromoBlob } from "./landing-promo-blob";

type Props = {
  onExplore: () => void;
};

type RevealPhase = "pending" | "visible" | "settled";

/**
 * Web promo banner — staggered copy reveal, drifting wash orbs,
 * floating photo blobs, and CTA hover shine.
 */
export function LandingPromoBanner({ onExplore }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<RevealPhase>("pending");
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 720px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
      return rect.top < viewHeight * 0.9 && rect.bottom > 40;
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
      settleId = window.setTimeout(() => setPhase("settled"), 1600);
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
    <section className="landing-promo-section">
      <div ref={rootRef} className={`landing-promo${phaseClass}`}>
        <span className="landing-promo-wash landing-promo-wash-left" aria-hidden />
        <span className="landing-promo-wash landing-promo-wash-mid" aria-hidden />
        <span className="landing-promo-wash landing-promo-wash-right" aria-hidden />

        <div className={`landing-promo-copy${wide ? "" : " is-full"}`}>
          <h2
            className="landing-promo-title landing-promo-reveal"
            style={{ ["--reveal-delay" as string]: "40ms" }}
          >
            Quality services in your neighborhood
          </h2>
          <p
            className="landing-promo-subtitle landing-promo-reveal"
            style={{ ["--reveal-delay" as string]: "140ms" }}
          >
            From expert tailors to trusted laundry shops, get the services you need from local
            professionals.
          </p>
          <button
            type="button"
            className="landing-promo-cta landing-promo-reveal"
            style={{ ["--reveal-delay" as string]: "240ms" }}
            onClick={onExplore}
            aria-label="Explore services"
          >
            <span className="landing-promo-cta-shine" aria-hidden />
            <span>Explore Services</span>
            <MaterialCommunityIcons name="arrow-right" size={16} color={UI.card} />
          </button>
          <div
            className="landing-promo-dots landing-promo-reveal"
            style={{ ["--reveal-delay" as string]: "340ms" }}
            aria-hidden
          >
            <span className="landing-promo-dot is-active" />
            <span className="landing-promo-dot" />
          </div>
        </div>

        {wide ? (
          <div
            className="landing-promo-art landing-promo-reveal"
            style={{ ["--reveal-delay" as string]: "280ms" }}
            aria-hidden
          >
            <span className="landing-promo-art-glow" />
            <LandingPromoBlob
              kind="tailor"
              source={assets.images.home_category_tailoring}
              style={frameTailor}
              className="landing-promo-blob landing-promo-blob-1"
            />
            <LandingPromoBlob
              kind="towels"
              source={assets.images.home_deal_laundry}
              style={frameTowels}
              className="landing-promo-blob landing-promo-blob-2"
            />
            <LandingPromoBlob
              kind="iron"
              source={assets.images.home_category_ironing}
              style={frameIron}
              className="landing-promo-blob landing-promo-blob-3"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

const frameTailor = {
  width: 128,
  height: 156,
  left: 0,
  top: 4,
  zIndex: 2,
} as const;

const frameTowels = {
  width: 120,
  height: 94,
  left: 122,
  top: 6,
  zIndex: 3,
} as const;

const frameIron = {
  width: 88,
  height: 132,
  right: 0,
  top: 22,
  zIndex: 4,
} as const;
