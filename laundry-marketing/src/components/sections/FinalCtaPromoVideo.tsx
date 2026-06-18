"use client";

import { useState } from "react";
import type { TestimonialVideoRef } from "@/components/sections/TestimonialVideoEmbed";

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

type Props = {
  video: TestimonialVideoRef;
  /** Shown on the iframe and the play control for screen readers. */
  title: string;
};

/** Taller than 16:9 so the block reads more “hero” on the page; embed letterboxes slightly inside. */
const VIDEO_FRAME = "relative aspect-[3/2] w-full min-h-[200px] sm:min-h-[260px] lg:min-h-[300px]";

/**
 * Final CTA promo: click-to-play embed (no autoplay) inside the same frame
 * treatment as the former photo collage.
 */
export function FinalCtaPromoVideo({ video, title }: Props) {
  const [playing, setPlaying] = useState(false);
  const { provider, id } = video;

  const embedSrc =
    provider === "youtube"
      ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&autoplay=1`
      : `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&dnt=1`;

  const youtubeThumb =
    provider === "youtube"
      ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
      : null;

  if (playing) {
    return (
      <div
        className={`${VIDEO_FRAME} overflow-hidden rounded-3xl bg-black shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] ring-4 ring-white/35`}
      >
        <iframe
          title={title}
          src={embedSrc}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`group ${VIDEO_FRAME} overflow-hidden rounded-3xl bg-gradient-to-br from-navy/90 via-[#283593]/90 to-navy/90 text-left shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] ring-4 ring-white/35`}
      aria-label={`Play video: ${title}`}
    >
      {youtubeThumb ? (
        <>
          <img
            src={youtubeThumb}
            alt=""
            className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:opacity-100 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25"
            aria-hidden
          />
        </>
      ) : (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/35"
          aria-hidden
        >
          Vimeo
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/25">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-navy shadow-[0_12px_30px_-8px_rgba(0,188,212,0.7)] ring-4 ring-white/25 transition group-hover:scale-105 sm:h-16 sm:w-16">
          <IconPlay className="ml-1 h-7 w-7 sm:h-8 sm:w-8" />
        </span>
      </span>
    </button>
  );
}
