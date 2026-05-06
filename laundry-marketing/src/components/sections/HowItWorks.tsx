function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v12m0 0l4-4m-4 4L8 11M5 19h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconOrders({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12v3m0 0l1.5-1.5M12 15l-1.5-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEarn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 11h2a1 1 0 011 1v2a1 1 0 01-1 1h-2M8 11h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const steps = [
  {
    icon: IconDownload,
    title: "Download App",
    description: "Install from Play Store. Create profile in 2 minutes.",
    barClass: "from-primary via-[#00acc1] to-[#00838f]",
    iconWrapClass:
      "bg-gradient-to-br from-primary/25 via-primary/10 to-white text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  },
  {
    icon: IconOrders,
    title: "Get Orders",
    description: "Neighbors in your society book laundry through app.",
    barClass: "from-accent via-[#ffa726] to-accent-hover",
    iconWrapClass:
      "bg-gradient-to-br from-accent/30 via-accent/10 to-white text-[#e65100] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  },
  {
    icon: IconEarn,
    title: "Earn & Keep",
    description: "Customer pays you directly. Platform takes zero cut.",
    barClass: "from-navy via-[#283593] to-navy",
    iconWrapClass:
      "bg-gradient-to-br from-navy/20 via-navy/5 to-white text-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-t border-border py-16 sm:py-20 lg:py-24">
      {/* Depth: soft wash + teal glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-section"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,188,212,0.14),transparent_65%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
          Start earning in{" "}
          <span className="bg-gradient-to-r from-primary to-[#00838f] bg-clip-text text-transparent">
            3 simple steps
          </span>
        </h2>

        <div className="mt-12 grid gap-8 sm:mt-14 sm:grid-cols-3 sm:gap-6 lg:mt-16 lg:gap-8">
          {steps.map(({ icon: Icon, title, description, barClass, iconWrapClass }, index) => (
            <article
              key={title}
              className="group relative flex flex-col rounded-3xl bg-white px-7 pb-8 pt-10 text-center shadow-[0_22px_60px_-18px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-18px_rgba(0,188,212,0.22)]"
            >
              <div
                className={`absolute left-6 right-6 top-0 h-1.5 rounded-b-full bg-gradient-to-r ${barClass} shadow-sm`}
                aria-hidden
              />
              <div
                className={`absolute -top-1 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br ${barClass} text-sm font-extrabold text-white shadow-lg ring-4 ring-white`}
              >
                {index + 1}
              </div>

              <div
                className={`mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-2xl ${iconWrapClass} ring-1 ring-black/[0.04]`}
              >
                <Icon className="h-8 w-8" />
              </div>

              <h3 className="mt-6 font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h3>
              <p className="mt-4 text-base font-medium leading-relaxed text-[#343a40] sm:text-[1.05rem]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
