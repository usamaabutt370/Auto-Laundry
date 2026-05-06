import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const SUPPORT_EMAIL = "support@yourdomain.com";
/** Digits only for wa.me (e.g. 923001234567). Replace — placeholder keeps link valid until you ship. */
const WHATSAPP_WA_ME = "919000000000";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_WA_ME}`;

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-3 font-heading text-[0.8125rem] font-semibold tracking-wide text-white">
      <span
        className="h-1 w-8 shrink-0 rounded-full bg-gradient-to-r from-primary via-cyan-300 to-accent shadow-[0_0_12px_rgba(0,188,212,0.45)]"
        aria-hidden
      />
      {children}
    </h3>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(168deg,#1e2a8a_0%,#151b55_35%,#0c1038_70%,#060814_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-primary/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-24 h-64 w-64 rounded-full bg-accent/15 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(0,188,212,0.14),transparent_50%)]"
        aria-hidden
      />

      <div className="relative h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <p
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 select-none font-heading text-[clamp(4rem,14vw,10rem)] font-extrabold leading-none tracking-tighter text-white/[0.04]"
          aria-hidden
        >
          LaundryEarn
        </p>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-2xl ring-1 ring-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-md transition hover:bg-white/[0.1] hover:ring-primary/30"
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-black/20 ring-1 ring-white/20 transition group-hover:ring-primary/40">
                <Image
                  src="/images/logos/laundri.png"
                  alt=""
                  width={88}
                  height={88}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="font-heading text-lg font-bold tracking-tight">LaundryEarn</span>
            </Link>
            <p className="mt-6 max-w-[280px] text-sm leading-relaxed text-white/60">
              Empowering housewives since 2025
            </p>
            <div className="mt-6 flex gap-2">
              <span className="h-1 w-12 rounded-full bg-primary/80" aria-hidden />
              <span className="h-1 w-6 rounded-full bg-accent/70" aria-hidden />
              <span className="h-1 w-4 rounded-full bg-white/25" aria-hidden />
            </div>
          </div>

          <div className="lg:col-span-2">
            <FooterHeading>Legal</FooterHeading>
            <ul className="mt-6 flex flex-col gap-1">
              {(
                [
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" },
                  { href: `mailto:${SUPPORT_EMAIL}`, label: "Contact Us" },
                ] as const
              ).map((item) => (
                <li key={item.label}>
                  {item.href.startsWith("mailto:") ? (
                    <a
                      href={item.href}
                      className="group flex items-center gap-2 py-1.5 text-sm text-white/70 transition hover:text-white"
                    >
                      <IconArrow className="h-4 w-4 shrink-0 text-primary opacity-0 transition -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
                      <span className="border-b border-transparent transition group-hover:border-primary/50">
                        {item.label}
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="group flex items-center gap-2 py-1.5 text-sm text-white/70 transition hover:text-white"
                    >
                      <IconArrow className="h-4 w-4 shrink-0 text-primary opacity-0 transition -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
                      <span className="border-b border-transparent transition group-hover:border-primary/50">
                        {item.label}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Contact</FooterHeading>
            <ul className="mt-6 flex flex-col gap-3">
              <li>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-xl ring-1 ring-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08] hover:ring-primary/25"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <IconWhatsApp className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-sm leading-snug">
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
                      WhatsApp
                    </span>
                    <span className="font-medium text-white">+91 XXXXXXXXXX</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-start gap-3 rounded-xl ring-1 ring-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08] hover:ring-primary/25"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <IconMail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-sm leading-snug">
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-white/45">
                      Email
                    </span>
                    <span className="break-all font-medium text-white">{SUPPORT_EMAIL}</span>
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Follow</FooterHeading>
            <p className="mt-6 text-sm leading-relaxed text-white/55">
              We&apos;re setting up our socials—check back soon or reach out on WhatsApp.
            </p>
            <div className="mt-5 inline-flex flex-wrap gap-2 rounded-2xl bg-white/[0.05] p-2 ring-1 ring-white/10 backdrop-blur-sm">
              {(
                [
                  { Icon: IconInstagram, label: "Instagram (placeholder)" },
                  { Icon: IconFacebook, label: "Facebook (placeholder)" },
                  { Icon: IconX, label: "X (placeholder)" },
                ] as const
              ).map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] text-white/85 ring-1 ring-white/10 transition hover:scale-105 hover:bg-primary/25 hover:text-white hover:ring-primary/35"
                  aria-label={label}
                >
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/35 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-4 py-5 sm:flex-row sm:gap-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium tracking-wide text-white/50">
            © {year} LaundryEarn. All rights reserved.
          </p>
          <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" aria-hidden />
          <p className="text-center text-[0.6875rem] text-white/35">Built for flexible earners across Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
