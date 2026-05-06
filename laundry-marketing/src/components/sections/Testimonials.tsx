"use client";

import { useRef } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import {
  TestimonialVideoEmbed,
  type TestimonialVideoRef,
} from "@/components/sections/TestimonialVideoEmbed";

/** Swap `video.id` for each row with your real YouTube (`watch?v=`) or Vimeo share IDs. */
const testimonials: readonly {
  id: string;
  quote: string;
  name: string;
  city: string;
  stripeClass: string;
  avatarClass: string;
  video: TestimonialVideoRef;
}[] = [
  {
    id: "ayesha",
    quote:
      "I earn Rs. 8,000 every month just by washing clothes for 5 neighbors. App is very easy to use.",
    name: "Ayesha Khan",
    city: "Karachi",
    stripeClass: "border-l-primary",
    avatarClass: "from-primary to-[#00838f] text-navy",
    video: { provider: "youtube", id: "jNQXAC9IVRw" },
  },
  {
    id: "sana",
    quote: "No investment. No tension. I work when my kids are in school.",
    name: "Sana Malik",
    city: "Lahore",
    stripeClass: "border-l-accent",
    avatarClass: "from-accent to-accent-hover text-navy",
    video: { provider: "vimeo", id: "76979871" },
  },
  {
    id: "fatima",
    quote: "Better than MLM schemes. Real work. Real money.",
    name: "Fatima Riaz",
    city: "Islamabad",
    stripeClass: "border-l-[#4dd0e1]",
    avatarClass: "from-[#4dd0e1] to-primary text-navy",
    video: { provider: "youtube", id: "8uY6S616mRs" },
  },
  {
    id: "hira",
    quote:
      "Customers pay with Easypaisa or JazzCash. Money lands in my account—no chasing, no middlemen.",
    name: "Hira Sheikh",
    city: "Rawalpindi",
    stripeClass: "border-l-primary",
    avatarClass: "from-primary to-[#00838f] text-navy",
    video: { provider: "vimeo", id: "148751763" },
  },
  {
    id: "mariam",
    quote: "I started with one block—now I'm booked most weekends. Word spreads fast in the society.",
    name: "Mariam Ali",
    city: "Faisalabad",
    stripeClass: "border-l-accent",
    avatarClass: "from-accent to-accent-hover text-navy",
    video: { provider: "youtube", id: "jNQXAC9IVRw" },
  },
  {
    id: "nusrat",
    quote: "Pickup reminders and order notes are clear. I rarely miss a bag or a special instruction.",
    name: "Nusrat Javed",
    city: "Multan",
    stripeClass: "border-l-[#4dd0e1]",
    avatarClass: "from-[#4dd0e1] to-primary text-navy",
    video: { provider: "vimeo", id: "76979871" },
  },
  {
    id: "rabia",
    quote:
      "Honest income from home. My sister helps with folding—we split orders when it gets busy.",
    name: "Rabia Tariq",
    city: "Peshawar",
    stripeClass: "border-l-primary",
    avatarClass: "from-primary to-[#00838f] text-navy",
    video: { provider: "youtube", id: "8uY6S616mRs" },
  },
  {
    id: "zoya",
    quote:
      "I set my own rates and slots. If I need a day off, I just pause new bookings. Simple.",
    name: "Zoya Ahmed",
    city: "Hyderabad",
    stripeClass: "border-l-accent",
    avatarClass: "from-accent to-accent-hover text-navy",
    video: { provider: "vimeo", id: "148751763" },
  },
];

function initialFromName(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Testimonials() {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="relative overflow-hidden border-t border-border py-16 sm:py-20 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#e5f6fa] via-white to-[#fff8f0]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-40 top-1/2 h-[320px] w-[320px] -translate-y-1/2 rounded-full bg-primary/[0.12] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-[280px] w-[280px] rounded-full bg-accent/[0.1] blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
          Real women.{" "}
          <span className="bg-gradient-to-r from-primary to-[#00838f] bg-clip-text text-transparent">
            Real earnings.
          </span>
        </h2>

        <div className="mt-12 sm:mt-14 lg:mt-16">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy/15 bg-white text-navy shadow-md transition hover:border-primary/40 hover:bg-primary/10 hover:text-[#00838f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-12 sm:w-12"
              aria-label="Previous testimonials"
              onClick={() => swiperRef.current?.slidePrev()}
            >
              <IconChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className="min-w-0 flex-1 py-1">
              <Swiper
                className="testimonial-swiper !pb-1"
                spaceBetween={16}
                slidesPerView={1}
                loop
                loopAdditionalSlides={2}
                speed={450}
                breakpoints={{
                  640: { slidesPerView: 2, spaceBetween: 18 },
                  1024: { slidesPerView: 3, spaceBetween: 20 },
                  1280: { slidesPerView: 4, spaceBetween: 18 },
                }}
                onSwiper={(instance) => {
                  swiperRef.current = instance;
                }}
              >
                {testimonials.map(
                  ({ id, quote, name, city, stripeClass, avatarClass, video }) => (
                    <SwiperSlide key={id} className="!h-auto">
                      <article
                        className={`flex h-full flex-col rounded-2xl border border-white/10 bg-navy py-5 pl-4 pr-4 shadow-[0_20px_50px_-15px_rgba(26,35,126,0.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-15px_rgba(0,188,212,0.35)] border-l-4 sm:py-6 sm:pl-5 sm:pr-5 ${stripeClass}`}
                      >
                        <TestimonialVideoEmbed
                          video={video}
                          title={`${name} — ${city} testimonial`}
                        />

                        <p className="mt-4 text-balance text-sm font-medium leading-relaxed text-white/85 sm:text-[0.95rem]">
                          <span className="text-primary/80">&ldquo;</span>
                          {quote}
                          <span className="text-primary/80">&rdquo;</span>
                        </p>

                        <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base font-extrabold shadow-inner ring-2 ring-white/15 sm:h-12 sm:w-12 sm:rounded-2xl sm:text-lg ${avatarClass}`}
                            aria-hidden
                          >
                            {initialFromName(name)}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="truncate font-heading text-sm font-bold text-white sm:text-base">
                              {name}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-primary sm:text-sm">
                              {city}
                            </p>
                          </div>
                        </div>
                      </article>
                    </SwiperSlide>
                  ),
                )}
              </Swiper>
            </div>

            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy/15 bg-white text-navy shadow-md transition hover:border-primary/40 hover:bg-primary/10 hover:text-[#00838f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-12 sm:w-12"
              aria-label="Next testimonials"
              onClick={() => swiperRef.current?.slideNext()}
            >
              <IconChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm font-medium leading-relaxed text-[#495057] sm:mt-12 sm:text-base">
          Results vary based on time invested and number of customers.
        </p>
      </div>
    </section>
  );
}
