import Image from "next/image";
import Link from "next/link";

/** Woman folding / handling laundry at home — Unsplash (free to use). */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=2000&q=80";

export function Hero() {
  return (
    <section className="relative min-h-[min(100svh,900px)] w-full overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt="Woman folding fresh laundry at home"
        fill
        priority
        className="object-cover object-[center_30%]"
        sizes="100vw"
      />
      {/* Soft overlay for readability */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/25 sm:from-black/70 sm:via-black/40"
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid min-h-[min(100svh,900px)] max-w-6xl items-center gap-10 px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-2 lg:gap-14 lg:px-8">
        {/* Left: copy */}
        <div className="max-w-xl">
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Earn from home. Do laundry. Keep 100%.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/90 sm:text-xl">
            Join Pakistan&apos;s fastest-growing community of housewives earning Rs. 5,000–15,000/month
            from home. No investment. Flexible hours.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3">
            <Link
              href="#"
              className="inline-flex h-14 min-w-[240px] items-center justify-center rounded-2xl bg-primary px-8 text-base font-semibold text-white shadow-lg transition hover:bg-primary-hover hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Download on Google Play
            </Link>
            <p className="text-sm text-white/80">Free app. No hidden charges.</p>
          </div>
        </div>

        {/* Right: animated “app preview” to fill space */}
        <div className="relative hidden lg:block">
          {/* Bubbles (logo-inspired) */}
          <div aria-hidden className="pointer-events-none absolute -inset-10">
            <div className="animate-bubble absolute left-6 top-10 h-16 w-16 rounded-full bg-primary/25 blur-[1px]" />
            <div className="animate-bubble absolute left-36 top-2 h-10 w-10 rounded-full bg-accent/30 blur-[0.5px] [animation-delay:0.6s]" />
            <div className="animate-bubble absolute right-6 top-20 h-14 w-14 rounded-full bg-accent/25 blur-[0.5px] [animation-delay:1.1s]" />
            <div className="animate-bubble absolute right-24 bottom-10 h-20 w-20 rounded-full bg-primary/20 blur-[1px] [animation-delay:0.9s]" />
          </div>

          {/* Phone mockup */}
          <div className="animate-floaty relative mx-auto w-[420px] rounded-[2.75rem] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-md">
            <div className="rounded-[2.1rem] bg-white">
              <div className="px-5 pb-5 pt-5">
                {/* Weekly earnings — large bar chart */}
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Earnings this week</p>
                      <p className="mt-1 font-heading text-3xl font-bold text-foreground">
                        Rs. 3,450
                      </p>
                      <p className="mt-1 text-sm font-medium text-primary">+18% vs last week</p>
                    </div>
                  </div>
                  <div className="mt-4 flex h-52 items-end justify-between gap-2 border-t border-border pt-4">
                    {[
                      { d: "Mon", pct: 42 },
                      { d: "Tue", pct: 58 },
                      { d: "Wed", pct: 48 },
                      { d: "Thu", pct: 72 },
                      { d: "Fri", pct: 65 },
                      { d: "Sat", pct: 88 },
                      { d: "Sun", pct: 76 },
                    ].map(({ d, pct }) => (
                      <div key={d} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-44 w-full items-end justify-center rounded-t-lg bg-section">
                          <div
                            className="w-[85%] max-w-[40px] rounded-t-lg bg-primary shadow-sm"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order mix — donut + legend */}
                <div className="mt-4 grid grid-cols-[1fr,1.15fr] items-center gap-4 rounded-2xl bg-section p-4">
                  <div className="flex justify-center">
                    <div
                      className="relative h-40 w-40 rounded-full shadow-inner"
                      style={{
                        background:
                          "conic-gradient(var(--primary) 0% 42%, var(--accent) 42% 70%, #64748b 70% 88%, #cbd5e1 88% 100%)",
                      }}
                      aria-hidden
                    >
                      <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground">Orders</span>
                        <span className="font-heading text-2xl font-bold text-foreground">12</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <p className="font-heading text-base font-semibold text-foreground">
                      Work mix
                    </p>
                    <ul className="space-y-2.5">
                      <li className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                          Wash &amp; fold
                        </span>
                        <span className="font-semibold text-foreground">42%</span>
                      </li>
                      <li className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                          Iron / press
                        </span>
                        <span className="font-semibold text-foreground">28%</span>
                      </li>
                      <li className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                          Dry clean
                        </span>
                        <span className="font-semibold text-foreground">18%</span>
                      </li>
                      <li className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                          Other
                        </span>
                        <span className="font-semibold text-foreground">12%</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
