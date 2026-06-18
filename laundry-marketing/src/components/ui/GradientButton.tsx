"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export const GRADIENT_PRIMARY_BUTTON_CLASS =
  "group relative inline-flex h-[60px] items-center justify-center overflow-hidden rounded-2xl px-8 text-base font-semibold text-white shadow-[0_18px_52px_-26px_rgba(0,188,212,0.55)] transition will-change-transform hover:-translate-y-[1px] hover:shadow-[0_22px_60px_-26px_rgba(0,188,212,0.7)] active:translate-y-0 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function GradientLayers() {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#00bcd4_0%,#283593_100%)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      >
        <span className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.26),transparent_60%)]" />
      </span>
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      >
        <span className="absolute -inset-x-10 -top-10 h-20 bg-[radial-gradient(ellipse_at_center,rgba(255,152,0,0.28),transparent_65%)]" />
      </span>
    </>
  );
}

export function GradientLinkButton({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${GRADIENT_PRIMARY_BUTTON_CLASS}${className ? ` ${className}` : ""}`}>
      <GradientLayers />
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

export function GradientButton({
  children,
  className,
  type = "button",
}: {
  children: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      className={`${GRADIENT_PRIMARY_BUTTON_CLASS}${className ? ` ${className}` : ""}`}
    >
      <GradientLayers />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

