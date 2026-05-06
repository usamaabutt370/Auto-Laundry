import Link from "next/link";
import {
  IllustrationDirectPay,
  IllustrationFastDelivery,
  IllustrationLocalBusiness,
  IllustrationWashAtHome,
} from "@/components/sections/ForCustomersCardIllustrations";
import { IllustrationPhoneDiscovery } from "@/components/sections/ForCustomersIllustrations";

const bullets = [
  {
    id: "wash-home" as const,
    text: "Your neighbor washes in her own home — no fancy setup",
    barClass: "from-primary via-[#00acc1] to-[#00838f]",
  },
  {
    id: "direct-pay" as const,
    text: "Pay directly — cash, Easypaisa, or JazzCash",
    barClass: "from-accent via-[#ffa726] to-accent-hover",
  },
  {
    id: "delivery" as const,
    text: "Same-day or next-day delivery",
    barClass: "from-navy via-[#283593] to-navy",
  },
  {
    id: "local-business" as const,
    text: "Support a local woman's small business",
    barClass: "from-primary via-[#00acc1] to-[#00838f]",
  },
] as const;

const cardIllustrations = {
  "wash-home": IllustrationWashAtHome,
  "direct-pay": IllustrationDirectPay,
  delivery: IllustrationFastDelivery,
  "local-business": IllustrationLocalBusiness,
} as const;

const ctaPills = [
  {
    label: "Society map",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M19 9.5c0 6-7 11-7 11S5 15.5 5 9.5a7 7 0 1114 0z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Chat & book",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 10h8M8 14h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M6 18l-2 3V6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Pay direct",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 8h16v10H4V8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M4 12h16" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
] as const;

export function ForCustomers() {
  return (
    <section className="relative overflow-hidden border-t border-border py-16 sm:py-20 lg:py-24">
      {/* Match How it works section shell */}
      <div className="pointer-events-none absolute inset-0 bg-section" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,188,212,0.14),transparent_65%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
          For customers
        </p>
        <h2 className="mt-3 font-heading text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:mt-4 lg:text-[2.5rem] lg:leading-tight">
          Need laundry done?{" "}
          <span className="bg-gradient-to-r from-primary to-[#00838f] bg-clip-text text-transparent">
            Find a launderer in your society.
          </span>
        </h2>

        <div className="mt-12 grid gap-8 sm:mt-14 lg:mt-16 lg:grid-cols-2 lg:items-stretch lg:gap-8">
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-6">
            {bullets.map(({ id, text, barClass }) => {
              const CardIllustration = cardIllustrations[id];
              return (
                <article
                  key={text}
                  className="group relative flex h-full flex-col rounded-3xl bg-white px-6 pb-8 pt-10 text-center shadow-[0_22px_60px_-18px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-18px_rgba(0,188,212,0.22)] sm:px-7"
                >
                  <div
                    className={`absolute left-6 right-6 top-0 h-1.5 rounded-b-full bg-gradient-to-r ${barClass} shadow-sm sm:left-7 sm:right-7`}
                    aria-hidden
                  />
                  <div
                    className="mx-auto mt-6 w-full max-w-[13.5rem] overflow-hidden rounded-2xl ring-1 ring-black/[0.06] transition duration-300 group-hover:ring-primary/20"
                    aria-hidden
                  >
                    <CardIllustration className="w-full" />
                  </div>
                  <p className="mt-5 text-base font-medium leading-relaxed text-[#343a40] sm:mt-6 sm:text-[1.05rem]">
                    {text}
                  </p>
                </article>
              );
            })}
          </div>

          <div
            className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#3f4fa8_0%,#283593_18%,#1a237e_45%,#0f1754_72%,#050816_100%)] px-7 pb-10 pt-10 shadow-[0_28px_64px_-18px_rgba(0,0,0,0.58)] sm:px-9 sm:pb-10 sm:pt-10"
          >
            <div className="relative z-10 w-full max-w-[15rem] sm:max-w-[16.25rem]">
              <div
                className="absolute -left-1 top-10 h-2.5 w-2.5 rounded-full bg-accent/80 blur-[0.5px]"
                aria-hidden
              />
              <div
                className="absolute -right-0.5 bottom-14 h-2.5 w-2.5 rounded-full bg-primary"
                aria-hidden
              />
              <IllustrationPhoneDiscovery className="w-full drop-shadow-[0_14px_32px_rgba(0,0,0,0.38)]" />
            </div>

            <h3 className="relative z-10 mt-6 text-center font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
              Your block, your launderer
            </h3>
            <p className="relative z-10 mt-4 max-w-md text-center text-base font-medium leading-relaxed text-white/80 sm:text-[1.05rem]">
              Browse who&apos;s nearby, pick a slot, pay them directly.
            </p>

            <ul className="relative z-10 mt-6 flex flex-wrap justify-center gap-2.5">
              {ctaPills.map(({ label, icon }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/95 backdrop-blur-sm sm:text-sm"
                >
                  <span className="text-primary">{icon}</span>
                  {label}
                </li>
              ))}
            </ul>

            <div
              className="relative z-10 mt-6 h-px w-28 bg-gradient-to-r from-transparent via-primary/75 to-transparent"
              aria-hidden
            />

            <Link
              href="#"
              className="relative z-10 mt-7 inline-flex h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-primary px-8 text-base font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,188,212,0.5)] transition hover:bg-primary-hover hover:shadow-[0_20px_44px_-12px_rgba(0,188,212,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Download App to Find Launderer
            </Link>

            <p className="relative z-10 mt-4 text-xs font-medium uppercase tracking-[0.14em] text-primary/90">
              Google Play · Android · Free
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
