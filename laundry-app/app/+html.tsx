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
