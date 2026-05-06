"use client";

import { useState } from "react";

export type TestimonialVideoProvider = "youtube" | "vimeo";

export type TestimonialVideoRef = {
  provider: TestimonialVideoProvider;
  /** YouTube: ID from `watch?v=` or `/embed/`. Vimeo: numeric ID from share link. */
  id: string;
};

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

export function TestimonialVideoEmbed({ video, title }: Props) {
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
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/15">
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
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-navy via-[#283593] to-navy text-left ring-1 ring-white/15"
      aria-label={`Play video: ${title}`}
    >
      {youtubeThumb ? (
        <>
          <img
            src={youtubeThumb}
            alt=""
            className="h-full w-full object-cover opacity-88 transition duration-300 group-hover:opacity-100 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent"
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
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-navy shadow-[0_12px_30px_-8px_rgba(0,188,212,0.7)] ring-4 ring-white/20 transition group-hover:scale-105 sm:h-14 sm:w-14">
          <IconPlay className="ml-0.5 h-6 w-6 sm:h-7 sm:w-7" />
        </span>
      </span>
    </button>
  );
}
