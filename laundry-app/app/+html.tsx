import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const META_PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID;

/** Root HTML document for web export (full viewport). */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                background-color: #FFFFFF;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              }
              /* RN Web renders TextInput as <input>; remove default browser box/outline */
              input,
              textarea {
                outline: none;
                box-shadow: none;
              }
              input:focus,
              textarea:focus {
                outline: none;
                box-shadow: none;
              }
              /* Organic photo blobs for landing promo banner */
              .landing-blob {
                overflow: hidden !important;
                border: 5px solid #ffffff !important;
                box-shadow: 0 14px 28px rgba(30, 27, 75, 0.18) !important;
                background: #ffffff;
              }
              .landing-blob-tailor {
                border-radius: 68% 40% 62% 44% / 46% 64% 38% 56% !important;
              }
              .landing-blob-towels {
                border-radius: 58% 42% 48% 66% / 40% 60% 46% 58% !important;
              }
              .landing-blob-iron {
                border-radius: 48% 60% 40% 64% / 64% 36% 60% 42% !important;
              }
              .landing-blob img,
              .landing-blob div {
                width: 100% !important;
                height: 100% !important;
              }
              /* Soft left arc for partner CTA portrait (matches mock) */
              .landing-partner-curve {
                overflow: hidden !important;
                border-radius: 55% 0 0 60% / 48% 0 0 52% !important;
              }
              /* Hero row: CSS media query — does not depend on JS window width */
              @media (min-width: 900px) {
                .landing-hero-row {
                  display: flex !important;
                  flex-direction: row !important;
                  align-items: center !important;
                  gap: 36px !important;
                }
                .landing-hero-image-col {
                  display: flex !important;
                  flex: 0 0 460px !important;
                  width: 460px !important;
                  min-width: 460px !important;
                  max-width: 460px !important;
                  min-height: 440px !important;
                  margin-top: 0 !important;
                  align-items: flex-end !important;
                  justify-content: center !important;
                }
              }
              /* Keep hero photo + pills locked in one CSS-grid frame */
              .landing-hero-visual {
                display: grid !important;
                grid-template-columns: 1fr !important;
                grid-template-rows: 440px !important;
                width: 460px !important;
                max-width: 100% !important;
                height: 440px !important;
                min-height: 440px !important;
                flex-shrink: 0 !important;
                border-radius: 28px !important;
                overflow: hidden !important;
                background-color: #E8EEF6 !important;
                background-size: cover !important;
                background-position: center !important;
                background-repeat: no-repeat !important;
              }
              .landing-hero-visual > img {
                grid-area: 1 / 1 !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                border-radius: 28px !important;
                display: block !important;
              }
              /* Hero text: staggered entrance (web only) */
              @keyframes landing-hero-rise {
                from {
                  opacity: 0;
                  transform: translate3d(0, 22px, 0);
                }
                to {
                  opacity: 1;
                  transform: translate3d(0, 0, 0);
                }
              }
              .landing-hero-reveal {
                opacity: 0;
                animation: landing-hero-rise 780ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
                will-change: opacity, transform;
              }
              .landing-hero-reveal-1 { animation-delay: 40ms; }
              .landing-hero-reveal-2 { animation-delay: 140ms; }
              .landing-hero-reveal-3 { animation-delay: 240ms; }
              .landing-hero-reveal-4 { animation-delay: 360ms; }
              .landing-hero-reveal-5 { animation-delay: 480ms; }
              @media (prefers-reduced-motion: reduce) {
                .landing-hero-reveal {
                  opacity: 1 !important;
                  animation: none !important;
                  transform: none !important;
                }
              }
              /* Recent search cards — original layout + hover parallax + running border */
              .landing-recent-card {
                position: relative !important;
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 12px !important;
                width: 300px !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: 12px !important;
                border: 1px solid #ECEEF2 !important;
                border-radius: 16px !important;
                background: #FFFFFF !important;
                box-shadow: 0 4px 10px rgba(17, 24, 39, 0.08) !important;
                cursor: pointer !important;
                text-align: left !important;
                font: inherit !important;
                color: inherit !important;
                isolation: isolate !important;
                transform-style: preserve-3d !important;
                transition:
                  transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 220ms ease,
                  border-color 220ms ease !important;
                will-change: transform;
              }
              .landing-recent-card.is-hovered {
                border-color: transparent !important;
                box-shadow: 0 14px 28px rgba(17, 24, 39, 0.14) !important;
                z-index: 2;
              }
              .landing-recent-card-border {
                /* Keep inside the card so parent ScrollView doesn't clip the top/sides. */
                position: absolute !important;
                inset: 0 !important;
                border-radius: 16px !important;
                padding: 2px !important;
                overflow: hidden !important;
                pointer-events: none !important;
                z-index: 0 !important;
                opacity: 0 !important;
                -webkit-mask:
                  linear-gradient(#fff 0 0) content-box,
                  linear-gradient(#fff 0 0) !important;
                mask:
                  linear-gradient(#fff 0 0) content-box,
                  linear-gradient(#fff 0 0) !important;
                -webkit-mask-composite: xor !important;
                mask-composite: exclude !important;
                transition: opacity 220ms ease !important;
              }
              .landing-recent-card-border-spin {
                position: absolute !important;
                inset: -40% !important;
                background: conic-gradient(
                  from 0deg,
                  #2F6BFF 0%,
                  #22D3EE 22%,
                  #6D5CFF 48%,
                  #E94B8C 74%,
                  #2F6BFF 100%
                ) !important;
              }
              .landing-recent-card.is-hovered .landing-recent-card-border {
                opacity: 1 !important;
              }
              .landing-recent-card.is-hovered .landing-recent-card-border-spin {
                animation: landing-recent-border-spin 2.2s linear infinite !important;
              }
              @keyframes landing-recent-border-spin {
                to {
                  transform: rotate(360deg);
                }
              }
              .landing-recent-card-thumb-wrap {
                position: relative !important;
                z-index: 1 !important;
                display: block !important;
                width: 56px !important;
                height: 56px !important;
                flex: 0 0 56px !important;
                border-radius: 12px !important;
                overflow: hidden !important;
                background: #F3F4F6 !important;
                transform: translateZ(18px);
              }
              .landing-recent-card-thumb-layer {
                display: block !important;
                width: 56px !important;
                height: 56px !important;
                transform-origin: center center;
                transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
                will-change: transform;
              }
              .landing-recent-card-thumb-layer img,
              .landing-recent-card-thumb-layer div {
                width: 56px !important;
                height: 56px !important;
                border-radius: 12px !important;
                object-fit: cover !important;
              }
              .landing-recent-card-copy {
                position: relative !important;
                z-index: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                flex: 1 1 auto !important;
                min-width: 0 !important;
                transform: translateZ(8px);
              }
              .landing-recent-card-title {
                display: block !important;
                font-size: 14px !important;
                font-weight: 700 !important;
                color: #111827 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
              }
              .landing-recent-card-meta {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 4px !important;
                margin-top: 4px !important;
              }
              .landing-recent-card-meta-text {
                font-size: 12px !important;
                color: #6B7280 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
              }
              .landing-recent-card-arrow {
                position: relative !important;
                z-index: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 32px !important;
                height: 32px !important;
                flex: 0 0 32px !important;
                border-radius: 16px !important;
                background: #2F6BFF !important;
                transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-recent-card,
                .landing-recent-card-thumb-layer,
                .landing-recent-card-arrow,
                .landing-recent-card-border {
                  transition: none !important;
                  animation: none !important;
                }
                .landing-recent-card.is-hovered .landing-recent-card-border {
                  opacity: 1 !important;
                }
                .landing-recent-card.is-hovered .landing-recent-card-border-spin {
                  animation: none !important;
                  background: #2F6BFF !important;
                }
              }
              /* Footer — underline links, social pop, store lift, scroll stagger, top glow */
              .landing-footer {
                position: relative !important;
                background: #2C1B6E !important;
                padding: 56px 24px 28px !important;
                overflow: hidden !important;
              }
              .landing-footer-glow {
                position: absolute !important;
                left: 0 !important;
                right: 0 !important;
                top: 0 !important;
                height: 2px !important;
                background: linear-gradient(
                  90deg,
                  transparent 0%,
                  #22D3EE 20%,
                  #6D5CFF 50%,
                  #E94B8C 80%,
                  transparent 100%
                ) !important;
                opacity: 0.55 !important;
                pointer-events: none !important;
              }
              .landing-footer.is-visible .landing-footer-glow {
                animation: landing-footer-glow-pulse 2.4s ease-in-out 1 !important;
              }
              @keyframes landing-footer-glow-pulse {
                0%, 100% { opacity: 0.35; filter: brightness(1); }
                50% { opacity: 1; filter: brightness(1.25); }
              }
              .landing-footer-inner {
                width: 100% !important;
                max-width: 1200px !important;
                margin: 0 auto !important;
              }
              .landing-footer-top {
                display: flex !important;
                flex-direction: column !important;
                gap: 36px !important;
              }
              @media (min-width: 900px) {
                .landing-footer-top {
                  flex-direction: row !important;
                  justify-content: space-between !important;
                  gap: 28px !important;
                }
              }
              .landing-footer.is-pending .landing-footer-reveal {
                opacity: 0;
                transform: translateY(18px);
              }
              .landing-footer.is-visible .landing-footer-reveal {
                animation: landing-footer-reveal-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
                animation-delay: var(--reveal-delay, 0ms);
              }
              .landing-footer.is-settled .landing-footer-reveal {
                opacity: 1;
                transform: none;
                animation: none;
              }
              @keyframes landing-footer-reveal-in {
                from {
                  opacity: 0;
                  transform: translateY(18px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .landing-footer-brand {
                max-width: 280px !important;
              }
              .landing-footer-tagline {
                margin: 14px 0 18px !important;
                color: rgba(255, 255, 255, 0.75) !important;
                font-size: 14px !important;
                line-height: 21px !important;
              }
              .landing-footer-socials {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
              }
              .landing-footer-social {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 36px !important;
                height: 36px !important;
                border-radius: 18px !important;
                background: rgba(255, 255, 255, 0.12) !important;
                text-decoration: none !important;
                transition:
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  background-color 0.28s ease,
                  box-shadow 0.28s ease !important;
              }
              .landing-footer-social:hover {
                transform: translateY(-4px) scale(1.08) !important;
                background: var(--social-tint, #6D5CFF) !important;
                box-shadow: 0 10px 18px color-mix(in srgb, var(--social-tint, #6D5CFF) 45%, transparent) !important;
              }
              .landing-footer-links {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 28px !important;
                flex: 1 1 auto !important;
                justify-content: center !important;
              }
              .landing-footer-col {
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 8px !important;
                min-width: 130px !important;
              }
              .landing-footer-col-title {
                margin: 0 0 6px !important;
                color: #FFFFFF !important;
                font-size: 14px !important;
                font-weight: 700 !important;
              }
              .landing-footer-link {
                position: relative !important;
                display: inline-block !important;
                margin: 0 !important;
                padding: 2px 0 !important;
                border: 0 !important;
                background: transparent !important;
                color: rgba(255, 255, 255, 0.7) !important;
                font: inherit !important;
                font-size: 13px !important;
                text-align: left !important;
                cursor: pointer !important;
                transition: color 0.25s ease !important;
              }
              .landing-footer-link::after {
                content: "" !important;
                position: absolute !important;
                left: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 1.5px !important;
                background: #22D3EE !important;
                transform: scaleX(0) !important;
                transform-origin: left center !important;
                transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
              }
              .landing-footer-link:hover {
                color: #FFFFFF !important;
              }
              .landing-footer-link:hover::after {
                transform: scaleX(1) !important;
              }
              .landing-footer-download {
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                min-width: 170px !important;
              }
              .landing-footer-store {
                display: inline-flex !important;
                align-items: center !important;
                gap: 10px !important;
                align-self: flex-start !important;
                padding: 10px 14px !important;
                border-radius: 12px !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                background: rgba(0, 0, 0, 0.35) !important;
                text-decoration: none !important;
                color: #FFFFFF !important;
                transition:
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.28s ease,
                  border-color 0.28s ease,
                  background-color 0.28s ease !important;
              }
              .landing-footer-store:hover {
                transform: translateY(-4px) scale(1.03) !important;
                border-color: rgba(255, 255, 255, 0.35) !important;
                background: rgba(0, 0, 0, 0.5) !important;
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35) !important;
              }
              .landing-footer-store > span {
                display: flex !important;
                flex-direction: column !important;
              }
              .landing-footer-store-small {
                color: rgba(255, 255, 255, 0.7) !important;
                font-size: 10px !important;
                line-height: 1.2 !important;
              }
              .landing-footer-store-big {
                color: #FFFFFF !important;
                font-size: 14px !important;
                font-weight: 700 !important;
                line-height: 1.2 !important;
              }
              .landing-footer-bottom {
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: space-between !important;
                gap: 8px !important;
                margin-top: 40px !important;
                padding-top: 18px !important;
                border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
                color: rgba(255, 255, 255, 0.55) !important;
                font-size: 12px !important;
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-footer.is-pending .landing-footer-reveal,
                .landing-footer-reveal {
                  opacity: 1 !important;
                  transform: none !important;
                  animation: none !important;
                }
                .landing-footer-social,
                .landing-footer-link,
                .landing-footer-link::after,
                .landing-footer-store,
                .landing-footer-glow {
                  transition: none !important;
                  animation: none !important;
                }
                .landing-footer-social:hover,
                .landing-footer-store:hover {
                  transform: none !important;
                }
              }
              /* Testimonials — Info Cards Concept (Yancy Min / freefrontend) */
              .landing-info-card {
                position: relative !important;
                display: block !important;
                box-sizing: border-box !important;
                min-width: 0 !important;
                min-height: 220px !important;
                margin: 0 0 6px !important;
                padding: 22px 22px 22px 56px !important;
                border-radius: 4px !important;
                background: #FFFFFF !important;
                box-shadow:
                  0 12px 28px rgba(17, 24, 39, 0.14),
                  0 4px 10px rgba(17, 24, 39, 0.06) !important;
                overflow: hidden !important;
                flex-shrink: 0 !important;
                transition: box-shadow 0.3s ease, transform 0.3s ease !important;
              }
              @media (max-width: 700px) {
                .landing-info-card {
                  padding: 18px 16px 18px 48px !important;
                  min-height: 200px !important;
                }
                .landing-info-card::before,
                .landing-info-card::after {
                  left: 22px !important;
                }
                .landing-info-card-seam {
                  left: 29px !important;
                }
                .landing-info-card-quote {
                  min-height: 56px !important;
                  font-size: 14px !important;
                  line-height: 22px !important;
                }
              }
              .landing-info-card.is-hovered {
                box-shadow:
                  0 18px 36px rgba(17, 24, 39, 0.18),
                  0 6px 14px rgba(17, 24, 39, 0.08) !important;
                transform: translateY(-3px) !important;
              }
              .landing-info-card::before,
              .landing-info-card::after {
                content: "" !important;
                position: absolute !important;
                left: 28px !important;
                z-index: 5 !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 16px !important;
                background: #F7F8FA !important;
              }
              .landing-info-card::before {
                top: -8px !important;
              }
              .landing-info-card::after {
                bottom: -8px !important;
              }
              .landing-info-card-seam {
                position: absolute !important;
                left: 35px !important;
                top: 12px !important;
                bottom: 12px !important;
                z-index: 5 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                margin: 0 !important;
                padding: 0 !important;
                list-style: none !important;
                pointer-events: none !important;
              }
              .landing-info-card-seam li {
                width: 2px !important;
                height: 2px !important;
                border-radius: 2px !important;
                background: #F7F8FA !important;
              }
              .landing-info-card-body {
                position: relative !important;
                z-index: 3 !important;
              }
              .landing-info-card-stars {
                display: flex !important;
                flex-direction: row !important;
                gap: 2px !important;
                margin-bottom: 12px !important;
              }
              .landing-info-card-quote {
                margin: 0 0 18px !important;
                min-height: 72px !important;
                font-size: 15px !important;
                line-height: 24px !important;
                font-style: italic !important;
                color: #111827 !important;
                transition: color 0.25s ease !important;
              }
              .landing-info-card-attribution {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 10px !important;
              }
              .landing-info-card-pic {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 48px !important;
                height: 48px !important;
                border-radius: 24px !important;
                overflow: hidden !important;
                background: #2F6BFF !important;
                flex-shrink: 0 !important;
              }
              .landing-info-card-pic img,
              .landing-info-card-pic div {
                width: 48px !important;
                height: 48px !important;
                border-radius: 24px !important;
                object-fit: cover !important;
                filter: grayscale(100%) !important;
                transition: filter 0.3s ease !important;
              }
              .landing-info-card-initial {
                font-size: 13px !important;
                font-weight: 700 !important;
                color: #FFFFFF !important;
              }
              .landing-info-card-copy {
                display: flex !important;
                flex-direction: column !important;
                min-width: 0 !important;
                flex: 1 1 auto !important;
              }
              .landing-info-card-name {
                font-size: 14px !important;
                font-weight: 700 !important;
                color: #111827 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                transition: color 0.25s ease !important;
              }
              .landing-info-card-detail {
                margin-top: 2px !important;
                font-size: 12px !important;
                color: #6B7280 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                transition: color 0.25s ease !important;
              }
              .landing-info-card-blob {
                position: absolute !important;
                right: 14px !important;
                bottom: 14px !important;
                z-index: 1 !important;
                width: 28px !important;
                height: 28px !important;
                border-radius: 28px !important;
                pointer-events: none !important;
                transition: transform 0.35s ease !important;
                /* Soft wash so dark text stays readable on hover. */
                opacity: 0.28 !important;
                mix-blend-mode: multiply !important;
              }
              .landing-info-card-orange .landing-info-card-blob {
                background: #DA4D1D !important;
              }
              .landing-info-card-blue .landing-info-card-blob {
                background: #2b26c3 !important;
              }
              .landing-info-card.is-hovered .landing-info-card-blob {
                transform: scale(18) !important;
              }
              /* Keep copy dark and readable over the expanding color wash. */
              .landing-info-card.is-hovered .landing-info-card-quote,
              .landing-info-card.is-hovered .landing-info-card-name {
                color: #111827 !important;
              }
              .landing-info-card.is-hovered .landing-info-card-detail {
                color: #374151 !important;
              }
              .landing-info-card.is-hovered .landing-info-card-pic img,
              .landing-info-card.is-hovered .landing-info-card-pic div {
                filter: grayscale(0) !important;
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-info-card-blob,
                .landing-info-card-quote,
                .landing-info-card-name,
                .landing-info-card-detail,
                .landing-info-card-pic img,
                .landing-info-card-pic div {
                  transition: none !important;
                }
                .landing-info-card.is-hovered .landing-info-card-blob {
                  transform: none !important;
                }
              }
              /* Provider cards — Dynamic Image Drop Shadow (freefrontend / Kriss Steindals) */
              .landing-provider-dyn {
                position: relative !important;
                display: block !important;
                margin-bottom: 8px !important;
                transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1) !important;
                will-change: transform;
              }
              .landing-provider-dyn.is-hovered {
                transform: translateY(-4px) scale(1.02) !important;
                z-index: 3 !important;
              }
              .landing-provider-dyn-card {
                position: relative !important;
                z-index: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 1px solid #ECEEF2 !important;
                border-radius: 18px !important;
                background: #FFFFFF !important;
                /* Identical raised shadow on every card — not tied to image colors. */
                box-shadow: 0 12px 28px rgba(17, 24, 39, 0.14) !important;
                overflow: hidden !important;
                cursor: pointer !important;
                text-align: left !important;
                font: inherit !important;
                color: inherit !important;
                transition: box-shadow 0.35s ease !important;
              }
              .landing-provider-dyn.is-hovered .landing-provider-dyn-card {
                box-shadow: 0 18px 36px rgba(17, 24, 39, 0.18) !important;
              }
              .landing-provider-dyn-image-wrap {
                position: relative !important;
                display: block !important;
                height: 148px !important;
                background: #F3F4F6 !important;
                overflow: hidden !important;
              }
              .landing-provider-dyn-image-zoom {
                display: block !important;
                width: 100% !important;
                height: 100% !important;
                transform: scale(1) !important;
                transform-origin: center center !important;
                transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) !important;
                will-change: transform;
              }
              .landing-provider-dyn.is-hovered .landing-provider-dyn-image-zoom {
                transform: scale(1.1) !important;
              }
              .landing-provider-dyn-image-wrap img,
              .landing-provider-dyn-image-wrap div,
              .landing-provider-dyn-image-zoom img,
              .landing-provider-dyn-image-zoom div {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
              }
              .landing-provider-dyn-distance {
                position: absolute !important;
                left: 10px !important;
                top: 10px !important;
                padding: 4px 9px !important;
                border-radius: 999px !important;
                background: rgba(17, 24, 39, 0.62) !important;
                color: #FFFFFF !important;
                font-size: 11px !important;
                font-weight: 700 !important;
              }
              .landing-provider-dyn-heart {
                position: absolute !important;
                right: 10px !important;
                top: 10px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 30px !important;
                height: 30px !important;
                border-radius: 15px !important;
                background: rgba(17, 24, 39, 0.62) !important;
                overflow: hidden !important;
              }
              .landing-provider-dyn-heart-icon {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 16px !important;
                height: 16px !important;
                line-height: 0 !important;
              }
              .landing-provider-dyn-heart-icon > *,
              .landing-provider-dyn-heart-icon svg {
                display: block !important;
                width: 16px !important;
                height: 16px !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 16px !important;
                text-align: center !important;
              }
              .landing-provider-dyn-body {
                display: flex !important;
                flex-direction: column !important;
                flex: 1 1 auto !important;
                gap: 8px !important;
                padding: 14px !important;
              }
              .landing-provider-dyn-name-row {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 6px !important;
                min-height: 22px !important;
              }
              .landing-provider-dyn-name {
                flex-shrink: 1 !important;
                font-size: 15px !important;
                font-weight: 700 !important;
                color: #111827 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
              }
              .landing-provider-dyn-verified {
                display: inline-flex !important;
                align-items: center !important;
                gap: 2px !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                color: #2563EB !important;
                white-space: nowrap !important;
              }
              .landing-provider-dyn-meta {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 4px !important;
                min-height: 18px !important;
              }
              .landing-provider-dyn-meta-strong {
                font-size: 12px !important;
                font-weight: 700 !important;
                color: #111827 !important;
              }
              .landing-provider-dyn-meta-muted {
                flex: 1 1 auto !important;
                font-size: 12px !important;
                color: #6B7280 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
              }
              .landing-provider-dyn-tags {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 6px !important;
                min-height: 26px !important;
              }
              .landing-provider-dyn-tag {
                padding: 4px 9px !important;
                border-radius: 999px !important;
                border: 1px solid #E5E7EB !important;
                background: #F7F8FA !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #6B7280 !important;
              }
              .landing-provider-dyn-actions {
                display: flex !important;
                flex-direction: row !important;
                gap: 8px !important;
                margin-top: auto !important;
                opacity: 0.72 !important;
                transform: translateY(8px) !important;
                transition:
                  opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                  transform 0.35s cubic-bezier(0.22, 1, 0.36, 1) !important;
              }
              .landing-provider-dyn.is-hovered .landing-provider-dyn-actions {
                opacity: 1 !important;
                transform: translateY(0) !important;
              }
              .landing-provider-dyn-contact,
              .landing-provider-dyn-profile {
                flex: 1 1 0 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                padding: 10px 0 !important;
                border-radius: 10px !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                transition:
                  transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
                  background-color 0.25s ease,
                  box-shadow 0.25s ease !important;
              }
              .landing-provider-dyn.is-hovered .landing-provider-dyn-contact,
              .landing-provider-dyn.is-hovered .landing-provider-dyn-profile {
                transform: translateY(-1px) !important;
              }
              .landing-provider-dyn-contact {
                background: #ECFDF5 !important;
                border: 1px solid #12B886 !important;
                color: #00A86B !important;
              }
              .landing-provider-dyn.is-hovered .landing-provider-dyn-contact:not(.is-disabled) {
                background: #D1FAE5 !important;
                box-shadow: 0 6px 14px rgba(0, 168, 107, 0.22) !important;
              }
              .landing-provider-dyn-contact.is-disabled {
                opacity: 0.45 !important;
                cursor: default !important;
              }
              .landing-provider-dyn-profile {
                background: #FFFFFF !important;
                border: 1.5px solid #2F6BFF !important;
                color: #2F6BFF !important;
              }
              .landing-provider-dyn.is-hovered .landing-provider-dyn-profile {
                background: #2F6BFF !important;
                color: #FFFFFF !important;
                box-shadow: 0 6px 14px rgba(47, 107, 255, 0.28) !important;
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-provider-dyn,
                .landing-provider-dyn-card,
                .landing-provider-dyn-image-zoom,
                .landing-provider-dyn-actions,
                .landing-provider-dyn-contact,
                .landing-provider-dyn-profile {
                  transition: none !important;
                }
                .landing-provider-dyn.is-hovered {
                  transform: none !important;
                }
                .landing-provider-dyn.is-hovered .landing-provider-dyn-image-zoom {
                  transform: none !important;
                }
                .landing-provider-dyn-actions {
                  opacity: 1 !important;
                  transform: none !important;
                }
              }
              /* Header nav — Liquid morph (Prismic / CodePen WbeNvrr) */
              .landing-nav-liquid {
                position: relative !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 0 2px !important;
                padding: 10px 18px !important;
                border: 0 !important;
                border-radius: 999px !important;
                background: transparent !important;
                overflow: hidden !important;
                cursor: pointer !important;
                font: inherit !important;
                color: #111827 !important;
                transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
              }
              .landing-nav-liquid-label {
                position: relative !important;
                z-index: 2 !important;
                font-size: 15px !important;
                font-weight: 600 !important;
                color: #111827 !important;
                white-space: nowrap !important;
                transition: color 0.35s ease !important;
              }
              .landing-nav-liquid::before {
                content: "" !important;
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: conic-gradient(
                  #0ff 0deg,
                  #0a2342 120deg,
                  #0ff 240deg
                ) !important;
                opacity: 0 !important;
                transform: scale(0) !important;
                transition: all 0.6s ease !important;
                pointer-events: none !important;
              }
              .landing-nav-liquid:hover {
                background: #0a2342 !important;
                /* Keep the original pill shape — liquid fill only, no shape morph. */
                border-radius: 999px !important;
                transform: none !important;
              }
              .landing-nav-liquid:hover .landing-nav-liquid-label {
                color: #ffffff !important;
              }
              .landing-nav-liquid:hover::before {
                opacity: 0.5 !important;
                transform: scale(2) !important;
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-nav-liquid,
                .landing-nav-liquid::before {
                  transition: none !important;
                }
                .landing-nav-liquid:hover {
                  transform: none !important;
                }
              }
              /* Popular services — glowing gradient glassmorphism (CodePen oNBreRJ) */
              .landing-glass-box {
                position: relative !important;
                min-width: 220px !important;
                min-height: 240px !important;
                display: flex !important;
                justify-content: center !important;
                align-items: stretch !important;
                transition: transform 0.45s ease !important;
              }
              .landing-glass-box::before,
              .landing-glass-box::after {
                content: "" !important;
                position: absolute !important;
                top: 8px !important;
                left: 18px !important;
                width: 55% !important;
                height: calc(100% - 16px) !important;
                border-radius: 22px !important;
                transform: skewX(12deg) !important;
                transition: 0.45s ease !important;
                z-index: 0 !important;
                pointer-events: none !important;
              }
              .landing-glass-box::after {
                filter: blur(28px) !important;
                opacity: 0.85 !important;
              }
              .landing-glass-box.is-hovered::before,
              .landing-glass-box.is-hovered::after {
                transform: skewX(0deg) !important;
                left: 8px !important;
                width: calc(100% - 16px) !important;
              }
              .landing-glass-box-1::before,
              .landing-glass-box-1::after {
                background: linear-gradient(315deg, #ffbc00, #ff0058) !important;
              }
              .landing-glass-box-2::before,
              .landing-glass-box-2::after {
                background: linear-gradient(315deg, #03a9f4, #ff0058) !important;
              }
              .landing-glass-box-3::before,
              .landing-glass-box-3::after {
                background: linear-gradient(315deg, #f59e0b, #fbbf24) !important;
              }
              .landing-glass-box-4::before,
              .landing-glass-box-4::after {
                background: linear-gradient(315deg, #12b886, #22d3ee) !important;
              }
              .landing-glass-hit {
                position: relative !important;
                z-index: 1 !important;
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
                cursor: pointer !important;
                text-align: left !important;
                font: inherit !important;
                color: inherit !important;
              }
              .landing-glass-glow {
                display: block !important;
                position: absolute !important;
                inset: 0 !important;
                z-index: 2 !important;
                pointer-events: none !important;
              }
              .landing-glass-glow::before,
              .landing-glass-glow::after {
                content: "" !important;
                position: absolute !important;
                border-radius: 18px !important;
                background: rgba(255, 255, 255, 0.35) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                box-shadow: 0 5px 15px rgba(17, 24, 39, 0.08) !important;
                opacity: 0 !important;
                transition: 0.35s ease !important;
                animation: landing-glass-float 2s ease-in-out infinite !important;
              }
              .landing-glass-glow::before {
                top: 12px !important;
                left: 12px !important;
                width: 0 !important;
                height: 0 !important;
              }
              .landing-glass-glow::after {
                bottom: 12px !important;
                right: 12px !important;
                width: 0 !important;
                height: 0 !important;
                animation-delay: -1s !important;
              }
              .landing-glass-box.is-hovered .landing-glass-glow::before {
                top: -28px !important;
                left: 28px !important;
                width: 72px !important;
                height: 72px !important;
                opacity: 1 !important;
              }
              .landing-glass-box.is-hovered .landing-glass-glow::after {
                bottom: -28px !important;
                right: 28px !important;
                width: 72px !important;
                height: 72px !important;
                opacity: 1 !important;
              }
              @keyframes landing-glass-float {
                0%, 100% { transform: translateY(8px); }
                50% { transform: translate(-8px, -4px); }
              }
              .landing-glass-content {
                position: relative !important;
                z-index: 3 !important;
                display: block !important;
                overflow: hidden !important;
                min-height: 220px !important;
                padding: 20px !important;
                border-radius: 22px !important;
                border: 1px solid rgba(255, 255, 255, 0.55) !important;
                background: rgba(255, 255, 255, 0.72) !important;
                backdrop-filter: blur(14px) saturate(140%) !important;
                -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
                box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08) !important;
                transition: transform 0.45s ease, padding 0.45s ease, box-shadow 0.45s ease !important;
              }
              .landing-glass-box.is-hovered .landing-glass-content {
                transform: translateX(-6px) !important;
                padding: 24px 20px 28px !important;
                box-shadow: 0 16px 36px rgba(17, 24, 39, 0.14) !important;
              }
              .landing-glass-icon {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 40px !important;
                height: 40px !important;
                border-radius: 12px !important;
                margin-bottom: 12px !important;
              }
              .landing-glass-title {
                display: block !important;
                font-size: 22px !important;
                font-weight: 800 !important;
                color: #111827 !important;
                margin-bottom: 8px !important;
              }
              .landing-glass-desc {
                display: block !important;
                font-size: 14px !important;
                line-height: 20px !important;
                color: #6B7280 !important;
                max-width: 68% !important;
                margin-bottom: 16px !important;
              }
              .landing-glass-explore {
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
                font-size: 14px !important;
                font-weight: 700 !important;
              }
              .landing-glass-image {
                position: absolute !important;
                right: -6px !important;
                bottom: -6px !important;
                width: 118px !important;
                height: 118px !important;
                border-radius: 18px !important;
                overflow: hidden !important;
                pointer-events: none !important;
              }
              .landing-glass-image img,
              .landing-glass-image div {
                width: 118px !important;
                height: 118px !important;
                border-radius: 18px !important;
                object-fit: cover !important;
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-glass-box::before,
                .landing-glass-box::after,
                .landing-glass-content,
                .landing-glass-glow::before,
                .landing-glass-glow::after {
                  transition: none !important;
                  animation: none !important;
                }
              }
              /* Partner CTA — stagger reveal, CTA shimmer, benefit pop, image float */
              .landing-partner {
                position: relative !important;
                background: #FFFFFF !important;
                padding: 28px 24px !important;
                overflow: hidden !important;
              }
              .landing-partner-inner {
                width: 100% !important;
                max-width: 1200px !important;
                margin: 0 auto !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 28px !important;
              }
              @media (min-width: 900px) {
                .landing-partner-inner {
                  flex-direction: row !important;
                  align-items: center !important;
                  gap: 56px !important;
                }
              }
              .landing-partner-copy {
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-start !important;
              }
              @media (min-width: 900px) {
                .landing-partner-copy {
                  flex: 1.15 1 0 !important;
                  max-width: 340px !important;
                  margin-right: 24px !important;
                }
              }
              .landing-partner-heading {
                margin: 0 0 8px !important;
                font-size: 32px !important;
                line-height: 38px !important;
                font-weight: 800 !important;
                color: #111827 !important;
              }
              .landing-partner-subtitle {
                margin: 0 0 16px !important;
                max-width: 320px !important;
                font-size: 14px !important;
                line-height: 21px !important;
                color: #6B7280 !important;
              }
              .landing-partner.is-pending .landing-partner-reveal {
                opacity: 0;
                transform: translateY(22px);
              }
              .landing-partner.is-visible .landing-partner-reveal {
                animation: landing-partner-rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
                animation-delay: var(--reveal-delay, 0ms);
              }
              .landing-partner.is-settled .landing-partner-reveal {
                opacity: 1;
                transform: none;
                animation: none;
              }
              @keyframes landing-partner-rise {
                from {
                  opacity: 0;
                  transform: translateY(22px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .landing-partner-cta {
                position: relative !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 8px !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 11px 18px !important;
                border-radius: 999px !important;
                background: #2F6BFF !important;
                color: #FFFFFF !important;
                font-size: 14px !important;
                font-weight: 700 !important;
                text-decoration: none !important;
                box-shadow: 0 8px 20px rgba(47, 107, 255, 0.28) !important;
                transition:
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.28s ease,
                  background-color 0.28s ease !important;
              }
              .landing-partner-cta svg,
              .landing-partner-cta > :last-child {
                transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
              }
              .landing-partner-cta-shine {
                position: absolute !important;
                top: 0 !important;
                left: -40% !important;
                width: 36% !important;
                height: 100% !important;
                background: linear-gradient(
                  100deg,
                  transparent 0%,
                  rgba(255, 255, 255, 0.35) 50%,
                  transparent 100%
                ) !important;
                transform: skewX(-18deg) translateX(0) !important;
                pointer-events: none !important;
              }
              .landing-partner.is-visible .landing-partner-cta-shine,
              .landing-partner.is-settled .landing-partner-cta-shine {
                animation: landing-partner-shine 1.6s ease-in-out 0.7s 1 !important;
              }
              .landing-partner-cta:hover {
                transform: translateY(-3px) scale(1.02) !important;
                background: #255AE6 !important;
                box-shadow: 0 14px 28px rgba(47, 107, 255, 0.38) !important;
              }
              .landing-partner-cta:hover svg,
              .landing-partner-cta:hover > :last-child {
                transform: translateX(4px) !important;
              }
              @keyframes landing-partner-shine {
                0% { transform: skewX(-18deg) translateX(0); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: skewX(-18deg) translateX(380%); opacity: 0; }
              }
              .landing-partner-benefits {
                list-style: none !important;
                margin: 0 !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 4px !important;
              }
              @media (min-width: 900px) {
                .landing-partner-benefits {
                  flex: 0.85 1 0 !important;
                  gap: 6px !important;
                }
              }
              .landing-partner-benefit {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 10px !important;
                padding: 4px 10px !important;
                margin: 0 -10px !important;
                border-radius: 12px !important;
                cursor: default !important;
                transition:
                  background-color 0.25s ease,
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
              }
              .landing-partner-benefit:hover {
                background: color-mix(in srgb, var(--benefit-tint, #2F6BFF) 10%, transparent) !important;
                transform: translateX(6px) !important;
              }
              .landing-partner-benefit-icon {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 34px !important;
                height: 34px !important;
                border-radius: 10px !important;
                background: color-mix(in srgb, var(--benefit-tint, #2F6BFF) 14%, transparent) !important;
                transition:
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  background-color 0.28s ease,
                  box-shadow 0.28s ease !important;
              }
              .landing-partner-benefit:hover .landing-partner-benefit-icon {
                transform: scale(1.12) rotate(-6deg) !important;
                background: color-mix(in srgb, var(--benefit-tint, #2F6BFF) 22%, transparent) !important;
                box-shadow: 0 8px 16px color-mix(in srgb, var(--benefit-tint, #2F6BFF) 28%, transparent) !important;
              }
              .landing-partner-benefit-label {
                font-size: 14px !important;
                font-weight: 500 !important;
                color: #6B7280 !important;
                transition: color 0.25s ease !important;
              }
              .landing-partner-benefit:hover .landing-partner-benefit-label {
                color: #111827 !important;
              }
              .landing-partner-visual {
                position: relative !important;
                display: flex !important;
                justify-content: center !important;
                width: 100% !important;
              }
              @media (min-width: 900px) {
                .landing-partner-visual {
                  flex: 1 1 0 !important;
                  justify-content: flex-end !important;
                }
              }
              .landing-partner-glow {
                position: absolute !important;
                width: 70% !important;
                height: 70% !important;
                right: 8% !important;
                bottom: 8% !important;
                border-radius: 50% !important;
                background: radial-gradient(
                  circle,
                  rgba(47, 107, 255, 0.28) 0%,
                  rgba(233, 75, 140, 0.12) 45%,
                  transparent 70%
                ) !important;
                filter: blur(18px) !important;
                opacity: 0.7 !important;
                pointer-events: none !important;
                z-index: 0 !important;
              }
              .landing-partner.is-visible .landing-partner-glow,
              .landing-partner.is-settled .landing-partner-glow {
                animation: landing-partner-glow-breathe 3.2s ease-in-out infinite !important;
              }
              @keyframes landing-partner-glow-breathe {
                0%, 100% { opacity: 0.45; transform: scale(0.96); }
                50% { opacity: 0.85; transform: scale(1.06); }
              }
              .landing-partner-frame {
                position: relative !important;
                z-index: 1 !important;
                width: 100% !important;
                max-width: 280px !important;
                height: 220px !important;
                overflow: hidden !important;
                background: #FFFFFF !important;
                border-top-left-radius: 110px !important;
                border-bottom-left-radius: 130px !important;
                border-top-right-radius: 20px !important;
                border-bottom-right-radius: 20px !important;
                box-shadow: 0 18px 40px rgba(17, 24, 39, 0.12) !important;
                transition:
                  transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.45s ease !important;
              }
              @media (min-width: 900px) {
                .landing-partner-frame {
                  max-width: 300px !important;
                  height: 240px !important;
                }
              }
              .landing-partner-frame img,
              .landing-partner-frame div {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                object-position: top center !important;
                transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) !important;
              }
              .landing-partner-visual:hover .landing-partner-frame {
                transform: translateY(-6px) !important;
                box-shadow: 0 26px 48px rgba(17, 24, 39, 0.16) !important;
              }
              .landing-partner-visual:hover .landing-partner-frame img,
              .landing-partner-visual:hover .landing-partner-frame div {
                transform: scale(1.06) !important;
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-partner.is-pending .landing-partner-reveal,
                .landing-partner-reveal {
                  opacity: 1 !important;
                  transform: none !important;
                  animation: none !important;
                }
                .landing-partner-cta,
                .landing-partner-cta svg,
                .landing-partner-benefit,
                .landing-partner-benefit-icon,
                .landing-partner-benefit-label,
                .landing-partner-frame,
                .landing-partner-frame img,
                .landing-partner-frame div,
                .landing-partner-glow,
                .landing-partner-cta-shine {
                  transition: none !important;
                  animation: none !important;
                }
                .landing-partner-cta:hover,
                .landing-partner-benefit:hover,
                .landing-partner-visual:hover .landing-partner-frame {
                  transform: none !important;
                }
              }
              /* Promo banner — stagger copy, drift washes, float blobs, CTA shine */
              .landing-promo-section {
                padding: 16px 24px !important;
                background: #FFFFFF !important;
              }
              .landing-promo {
                position: relative !important;
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 12px !important;
                width: 100% !important;
                max-width: 1200px !important;
                min-height: 220px !important;
                margin: 0 auto !important;
                padding: 24px 36px !important;
                border-radius: 28px !important;
                overflow: hidden !important;
                background: linear-gradient(
                  100deg,
                  #D8E8FE 0%,
                  #E2EBFF 40%,
                  #E9E4FF 75%,
                  #F1E7FF 100%
                ) !important;
              }
              .landing-promo-wash {
                position: absolute !important;
                border-radius: 999px !important;
                pointer-events: none !important;
                z-index: 0 !important;
              }
              .landing-promo-wash-left {
                width: 280px !important;
                height: 280px !important;
                left: -100px !important;
                top: -50px !important;
                background: rgba(186, 214, 255, 0.55) !important;
              }
              .landing-promo-wash-mid {
                width: 200px !important;
                height: 200px !important;
                left: 42% !important;
                bottom: -70px !important;
                background: rgba(214, 222, 255, 0.45) !important;
              }
              .landing-promo-wash-right {
                width: 340px !important;
                height: 340px !important;
                right: -110px !important;
                top: -120px !important;
                background: rgba(230, 210, 255, 0.5) !important;
              }
              .landing-promo.is-visible .landing-promo-wash-left,
              .landing-promo.is-settled .landing-promo-wash-left {
                animation: landing-promo-drift-a 10s ease-in-out infinite !important;
              }
              .landing-promo.is-visible .landing-promo-wash-mid,
              .landing-promo.is-settled .landing-promo-wash-mid {
                animation: landing-promo-drift-b 12s ease-in-out infinite !important;
              }
              .landing-promo.is-visible .landing-promo-wash-right,
              .landing-promo.is-settled .landing-promo-wash-right {
                animation: landing-promo-drift-c 14s ease-in-out infinite !important;
              }
              @keyframes landing-promo-drift-a {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(18px, 12px) scale(1.06); }
              }
              @keyframes landing-promo-drift-b {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(-14px, -10px) scale(1.05); }
              }
              @keyframes landing-promo-drift-c {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(-20px, 16px) scale(1.04); }
              }
              .landing-promo.is-pending .landing-promo-reveal {
                opacity: 0;
                transform: translateY(18px);
              }
              .landing-promo.is-visible .landing-promo-reveal {
                animation: landing-promo-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
                animation-delay: var(--reveal-delay, 0ms);
              }
              .landing-promo.is-settled .landing-promo-reveal {
                opacity: 1;
                transform: none;
                animation: none;
              }
              @keyframes landing-promo-rise {
                from {
                  opacity: 0;
                  transform: translateY(18px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .landing-promo-copy {
                position: relative !important;
                z-index: 2 !important;
                flex: 1 1 auto !important;
                max-width: 400px !important;
                padding-right: 8px !important;
              }
              .landing-promo-copy.is-full {
                max-width: 100% !important;
              }
              .landing-promo-title {
                margin: 0 0 8px !important;
                font-size: 32px !important;
                line-height: 38px !important;
                font-weight: 800 !important;
                letter-spacing: -0.3px !important;
                color: #2C1B6E !important;
              }
              .landing-promo-subtitle {
                margin: 0 0 14px !important;
                max-width: 340px !important;
                font-size: 14px !important;
                line-height: 20px !important;
                color: #6B7280 !important;
              }
              .landing-promo-cta {
                position: relative !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 10px 18px !important;
                border: 0 !important;
                border-radius: 999px !important;
                background: #2F6BFF !important;
                color: #FFFFFF !important;
                font: inherit !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                box-shadow: 0 8px 18px rgba(47, 107, 255, 0.28) !important;
                transition:
                  transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 0.28s ease,
                  background-color 0.28s ease !important;
              }
              .landing-promo-cta-shine {
                position: absolute !important;
                top: 0 !important;
                left: -40% !important;
                width: 36% !important;
                height: 100% !important;
                background: linear-gradient(
                  100deg,
                  transparent 0%,
                  rgba(255, 255, 255, 0.38) 50%,
                  transparent 100%
                ) !important;
                transform: skewX(-18deg) !important;
                pointer-events: none !important;
              }
              .landing-promo.is-visible .landing-promo-cta-shine,
              .landing-promo.is-settled .landing-promo-cta-shine {
                animation: landing-promo-shine 1.7s ease-in-out 0.55s 1 !important;
              }
              @keyframes landing-promo-shine {
                0% { transform: skewX(-18deg) translateX(0); opacity: 0; }
                25% { opacity: 1; }
                100% { transform: skewX(-18deg) translateX(380%); opacity: 0; }
              }
              .landing-promo-cta > :last-child {
                transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
              }
              .landing-promo-cta:hover {
                transform: translateY(-3px) scale(1.02) !important;
                background: #255AE6 !important;
                box-shadow: 0 14px 26px rgba(47, 107, 255, 0.36) !important;
              }
              .landing-promo-cta:hover > :last-child {
                transform: translateX(4px) !important;
              }
              .landing-promo-dots {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-top: 12px !important;
              }
              .landing-promo-dot {
                width: 8px !important;
                height: 8px !important;
                border-radius: 4px !important;
                background: rgba(47, 107, 255, 0.28) !important;
              }
              .landing-promo-dot.is-active {
                width: 9px !important;
                height: 9px !important;
                border-radius: 5px !important;
                background: #2F6BFF !important;
                box-shadow: 0 0 0 0 rgba(47, 107, 255, 0.45) !important;
              }
              .landing-promo.is-visible .landing-promo-dot.is-active,
              .landing-promo.is-settled .landing-promo-dot.is-active {
                animation: landing-promo-dot-pulse 2.4s ease-in-out infinite !important;
              }
              @keyframes landing-promo-dot-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(47, 107, 255, 0.4); }
                50% { box-shadow: 0 0 0 6px rgba(47, 107, 255, 0); }
              }
              .landing-promo-art {
                position: relative !important;
                z-index: 1 !important;
                width: 340px !important;
                height: 168px !important;
                flex-shrink: 0 !important;
                margin-left: auto !important;
                pointer-events: none !important;
              }
              .landing-promo-art-glow {
                position: absolute !important;
                width: 220px !important;
                height: 220px !important;
                border-radius: 110px !important;
                right: 8px !important;
                top: -28px !important;
                background: rgba(255, 255, 255, 0.4) !important;
              }
              .landing-promo.is-visible .landing-promo-art-glow,
              .landing-promo.is-settled .landing-promo-art-glow {
                animation: landing-promo-glow 3.6s ease-in-out infinite !important;
              }
              @keyframes landing-promo-glow {
                0%, 100% { opacity: 0.55; transform: scale(0.96); }
                50% { opacity: 0.95; transform: scale(1.05); }
              }
              .landing-promo.is-visible .landing-promo-blob-1,
              .landing-promo.is-settled .landing-promo-blob-1 {
                animation: landing-promo-float-a 4.8s ease-in-out infinite !important;
              }
              .landing-promo.is-visible .landing-promo-blob-2,
              .landing-promo.is-settled .landing-promo-blob-2 {
                animation: landing-promo-float-b 5.4s ease-in-out 0.35s infinite !important;
              }
              .landing-promo.is-visible .landing-promo-blob-3,
              .landing-promo.is-settled .landing-promo-blob-3 {
                animation: landing-promo-float-c 5s ease-in-out 0.7s infinite !important;
              }
              @keyframes landing-promo-float-a {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
              @keyframes landing-promo-float-b {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(7px); }
              }
              @keyframes landing-promo-float-c {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-6px) rotate(1.2deg); }
              }
              @media (max-width: 719px) {
                .landing-promo {
                  padding: 22px 22px !important;
                }
                .landing-promo-title {
                  font-size: 26px !important;
                  line-height: 32px !important;
                }
              }
              @media (prefers-reduced-motion: reduce) {
                .landing-promo.is-pending .landing-promo-reveal,
                .landing-promo-reveal {
                  opacity: 1 !important;
                  transform: none !important;
                  animation: none !important;
                }
                .landing-promo-wash-left,
                .landing-promo-wash-mid,
                .landing-promo-wash-right,
                .landing-promo-art-glow,
                .landing-promo-blob-1,
                .landing-promo-blob-2,
                .landing-promo-blob-3,
                .landing-promo-cta,
                .landing-promo-cta-shine,
                .landing-promo-dot.is-active {
                  animation: none !important;
                  transition: none !important;
                }
                .landing-promo-cta:hover {
                  transform: none !important;
                }
              }
            `,
          }}
        />
        {META_PIXEL_ID ? (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${META_PIXEL_ID}');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                alt=""
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
