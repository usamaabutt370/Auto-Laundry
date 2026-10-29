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
              /* Recent search cards — original layout + hover parallax */
              .landing-recent-card {
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
                transform-style: preserve-3d !important;
                transition:
                  transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 220ms ease !important;
                will-change: transform;
              }
              .landing-recent-card.is-hovered {
                box-shadow: 0 14px 28px rgba(17, 24, 39, 0.14) !important;
                z-index: 2;
              }
              .landing-recent-card-thumb-wrap {
                position: relative !important;
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
                .landing-recent-card-arrow {
                  transition: none !important;
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
