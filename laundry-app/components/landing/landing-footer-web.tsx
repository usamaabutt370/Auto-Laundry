import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";

import { assets } from "@/assets/assets";
import { UI } from "@/constants/theme";

const FACEBOOK_URL = "https://www.facebook.com/p/Tap2Laundry-61591951860013/";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.autolaundry.app&hl=en";
const APP_STORE_URL = "https://apps.apple.com/us/app/tap2laundry/id6789571411";

const INSTAGRAM_URL = "https://www.instagram.com/tap2laundry_/";

const SOCIAL = [
  { name: "facebook" as const, url: FACEBOOK_URL, label: "Facebook", tint: "#1877F2" },
  { name: "instagram" as const, url: INSTAGRAM_URL, label: "Instagram", tint: "#E4405F" },
  { name: "youtube" as const, url: FACEBOOK_URL, label: "YouTube", tint: "#FF0000" },
  { name: "linkedin" as const, url: FACEBOOK_URL, label: "LinkedIn", tint: "#0A66C2" },
  { name: "whatsapp" as const, url: FACEBOOK_URL, label: "WhatsApp", tint: "#25D366" },
];

type FooterLink = { label: string; anchor?: string; href?: string };

const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "Home", anchor: "home" },
      { label: "Services", anchor: "services" },
      { label: "Nearby Providers", anchor: "providers" },
      { label: "Recommended", anchor: "providers" },
    ],
  },
  {
    title: "For Customers",
    links: [
      { label: "Find a Provider", anchor: "providers" },
      { label: "Orders", href: "/(auth)/login" },
      { label: "Reviews", anchor: "help" },
      { label: "Help & Support", href: "/(auth)/login" },
    ],
  },
  {
    title: "For Providers",
    links: [
      { label: "Become a Partner", href: "/(auth)/welcome" },
      { label: "Partner Login", href: "/(auth)/login" },
      { label: "How it works", anchor: "become-captain" },
      { label: "Partner Help", href: "/(auth)/login" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", anchor: "home" },
      { label: "Contact", href: "/(auth)/login" },
      { label: "Privacy Policy", href: "/(auth)/login" },
      { label: "Terms & Conditions", href: "/(auth)/login" },
    ],
  },
];

type Props = {
  onNavigate?: (anchor: string) => void;
};

/**
 * Web footer — link underline slide, social pop, store badge lift,
 * staggered scroll-in, and soft top glow.
 */
type RevealPhase = "pending" | "visible" | "settled";

export function LandingFooter({ onNavigate }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<RevealPhase>("pending");
  const year = new Date().getFullYear();

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
      return rect.top < viewHeight * 0.92 && rect.bottom > 0;
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
      // Longest stagger (520ms) + duration (550ms) + buffer — then force settled.
      settleId = window.setTimeout(() => setPhase("settled"), 1200);
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

  const openLink = (link: FooterLink) => {
    if (link.anchor) {
      onNavigate?.(link.anchor);
      return;
    }
    if (link.href) router.push(link.href as never);
  };

  return (
    <footer
      ref={rootRef}
      className={`landing-footer${phaseClass}`}
    >
      <div className="landing-footer-glow" aria-hidden />
      <div className="landing-footer-inner">
        <div className="landing-footer-top">
          <div className="landing-footer-brand landing-footer-reveal" style={{ ["--reveal-delay" as string]: "40ms" }}>
            <Image
              source={assets.icons.landing_logo_white}
              style={logoStyle}
              contentFit="contain"
            />
            <p className="landing-footer-tagline">
              Trusted local providers for laundry, ironing, and tailoring — compare, contact, and
              get it done.
            </p>
            <div className="landing-footer-socials">
              {SOCIAL.map((item) => (
                <a
                  key={item.label}
                  className="landing-footer-social"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  style={{ ["--social-tint" as string]: item.tint }}
                >
                  <MaterialCommunityIcons name={item.name} size={18} color={UI.card} />
                </a>
              ))}
            </div>
          </div>

          <div className="landing-footer-links">
            {LINK_COLUMNS.map((column, columnIndex) => (
              <div
                key={column.title}
                className="landing-footer-col landing-footer-reveal"
                style={{ ["--reveal-delay" as string]: `${120 + columnIndex * 70}ms` }}
              >
                <h3 className="landing-footer-col-title">{column.title}</h3>
                {column.links.map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    className="landing-footer-link"
                    onClick={() => openLink(link)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div
            className="landing-footer-download landing-footer-reveal"
            style={{ ["--reveal-delay" as string]: "400ms" }}
          >
            <h3 className="landing-footer-col-title">Download App</h3>
            <a
              className="landing-footer-store"
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Download on the App Store"
            >
              <MaterialCommunityIcons name="apple" size={22} color={UI.card} />
              <span>
                <span className="landing-footer-store-small">Download on the</span>
                <span className="landing-footer-store-big">App Store</span>
              </span>
            </a>
            <a
              className="landing-footer-store"
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Get it on Google Play"
            >
              <MaterialCommunityIcons name="google-play" size={20} color={UI.card} />
              <span>
                <span className="landing-footer-store-small">Get it on</span>
                <span className="landing-footer-store-big">Google Play</span>
              </span>
            </a>
          </div>
        </div>

        <div
          className="landing-footer-bottom landing-footer-reveal"
          style={{ ["--reveal-delay" as string]: "520ms" }}
        >
          <span>© {year} Tap2Laundry. All rights reserved.</span>
          <span>Made with ♥ in Pakistan</span>
        </div>
      </div>
    </footer>
  );
}

const logoStyle = {
  height: 44,
  width: 132,
} as const;
