import Link from "next/link";
import { FinalCtaPromoVideo } from "@/components/sections/FinalCtaPromoVideo";
import type { TestimonialVideoRef } from "@/components/sections/TestimonialVideoEmbed";
import { IconAppStore, IconGooglePlay } from "@/components/sections/StoreDownloadIcons";

const PLAY_STORE_URL = "#";
const APP_STORE_URL = "#";

/**
 * Promo for this block only — swap for your YouTube (`watch?v=` ID) or Vimeo share ID.
 * Uses the same shape as testimonial embeds elsewhere on the page.
 */
const FINAL_CTA_PROMO: TestimonialVideoRef = {
  provider: "youtube",
  /** Replace with your real promo; this ID is YouTube’s embed docs sample (swap anytime). */
  id: "M7lc1UVf-VE",
};

/**
 * Final CTA: teal–navy base + orange accents; motion via globals.css
 * (gradient flow, drifting washes, teal pulse, shine sweep).
 */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/20 py-16 sm:py-20 lg:py-24">
      {/* Base diagonal — slow shifting “moving” gradient */}
      <div
        className="animate-final-cta-base pointer-events-none absolute inset-0 bg-[length:200%_200%] bg-[linear-gradient(132deg,#00bcd4_0%,#00a3b8_24%,#283593_52%,#1a237e_78%,#0d1442_100%)]"
        aria-hidden
      />

      {/* Orange sweep — drifts / scales (overflow clips) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-final-cta-orange absolute -inset-[18%] origin-[85%_0%] bg-[linear-gradient(210deg,rgba(255,152,0,0.72)_0%,rgba(245,124,0,0.42)_18%,rgba(255,152,0,0.15)_38%,transparent_58%)]" />
      </div>

      {/* Orange bloom — alternate drift phase */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-final-cta-orange-alt absolute -inset-[22%] bg-[radial-gradient(ellipse_120%_95%_at_108%_-5%,rgba(255,152,0,0.62),rgba(245,124,0,0.22)_42%,transparent_68%)]" />
      </div>

      {/* Deeper orange — slower drift, different phase */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-final-cta-orange-delayed absolute -inset-[15%] origin-bottom-right bg-[radial-gradient(ellipse_90%_75%_at_100%_115%,rgba(245,124,0,0.55),rgba(255,152,0,0.2)_45%,transparent_62%)]" />
      </div>

      {/* Teal — gentle opacity pulse */}
      <div
        className="animate-final-cta-teal pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_-8%_92%,rgba(0,188,212,0.38),transparent_60%)]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_42%_-28%,rgba(255,255,255,0.16),transparent_50%)]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent"
        aria-hidden
      />

      {/* Occasional light sweep across the band */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
        aria-hidden
      >
        <div className="animate-final-cta-shimmer absolute inset-y-0 left-0 w-[55%] max-w-xl bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
          Ready to start earning today?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-lg font-medium leading-relaxed text-white/90 sm:text-xl">
          Join 50+ housewives already using LaundryEarn
        </p>

        <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-2 lg:gap-14">
          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
            <FinalCtaPromoVideo
              video={FINAL_CTA_PROMO}
              title="How LaundryEarn helps you earn from home"
            />
          </div>

          <div className="flex flex-col items-center lg:items-stretch">
            <div className="max-w-md space-y-2 text-center lg:max-w-none lg:text-left">
              <p className="text-base font-semibold text-white lg:text-lg">
                Free on{" "}
                <span className="whitespace-nowrap text-white">Google Play</span> &{" "}
                <span className="whitespace-nowrap text-white">App Store</span>
                <span className="font-medium text-white/85"> · No joining fee</span>
              </p>
              <p className="text-sm font-medium leading-relaxed text-white/85 sm:text-base">
                Flexible hours on your phone; get paid with Easypaisa, JazzCash, or bank transfer.
              </p>
            </div>

            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:gap-3 lg:mt-10 lg:gap-4">
              <Link
                href={PLAY_STORE_URL}
                className="group inline-flex min-h-[3.75rem] flex-1 items-center gap-4 rounded-2xl border border-white/18 bg-[#0d0d0d] px-5 py-3.5 pl-4 shadow-[0_10px_36px_-10px_rgba(0,0,0,0.55)] transition duration-300 hover:scale-[1.02] hover:border-primary/40 hover:bg-[#141414] hover:shadow-[0_14px_44px_-12px_rgba(0,188,212,0.22)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <IconGooglePlay className="h-12 w-11 shrink-0 drop-shadow-sm transition group-hover:scale-105" />
                <span className="min-w-0 text-left">
                  <span className="block text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.14em] text-white/60">
                    Get it on
                  </span>
                  <span className="font-heading text-lg font-semibold leading-tight tracking-tight text-white">
                    Google Play
                  </span>
                </span>
              </Link>

              <Link
                href={APP_STORE_URL}
                className="group inline-flex min-h-[3.75rem] flex-1 items-center gap-4 rounded-2xl border border-white/18 bg-black px-5 py-3.5 pl-4 shadow-[0_10px_36px_-10px_rgba(0,0,0,0.55)] transition duration-300 hover:scale-[1.02] hover:border-white/30 hover:bg-neutral-950 hover:shadow-[0_14px_44px_-12px_rgba(255,255,255,0.08)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <IconAppStore className="h-11 w-11 shrink-0 text-white transition group-hover:scale-105" />
                <span className="min-w-0 text-left">
                  <span className="block text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.14em] text-white/60">
                    Download on
                  </span>
                  <span className="font-heading text-lg font-semibold leading-tight tracking-tight text-white">
                    App Store
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
