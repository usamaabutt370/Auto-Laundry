"use client";

import { useState } from "react";

const faqs = [
  {
    id: "washing-machine",
    question: "Do I need a washing machine?",
    answer:
      "Yes, a basic washing machine is required. Semi-automatic works fine.",
  },
  {
    id: "paid",
    question: "How do I get paid?",
    answer:
      "Customer pays you directly — cash, Easypaisa, JazzCash, or bank transfer, whatever you agree. The app never touches your money.",
  },
  {
    id: "delivery",
    question: "Who handles delivery?",
    answer:
      "You decide. Either deliver yourself or arrange your own rider (husband, son, neighbor, rickshaw). The app helps you share rider details with the customer.",
  },
  {
    id: "fee",
    question: "Is there any fee to join?",
    answer: "No joining fee. The app is completely free to download.",
  },
  {
    id: "no-pay",
    question: "What if a customer doesn't pay?",
    answer:
      "Always take payment at delivery (cash or digital wallet). The app has a photo proof feature to protect you.",
  },
  {
    id: "cities",
    question: "Which cities are supported?",
    answer: "Currently launching in [Your City]. More cities coming soon.",
  },
] as const;

function IconChevron({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      className={`${className ?? ""} shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <section className="relative overflow-hidden border-t border-border py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-section" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,188,212,0.1),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
          Frequently asked questions
        </h2>

        <div className="mx-auto mt-12 max-w-3xl space-y-3 sm:mt-14 lg:mt-16">
          {faqs.map(({ id, question, answer }) => {
            const open = openId === id;
            return (
              <div
                key={id}
                className={`rounded-2xl border bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 transition-colors ${
                  open
                    ? "border-primary/35 ring-primary/15"
                    : "border-border/80 ring-black/[0.04]"
                }`}
              >
                <button
                  type="button"
                  id={`faq-${id}-trigger`}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left sm:px-6 sm:py-5"
                  aria-expanded={open}
                  aria-controls={`faq-${id}-panel`}
                  onClick={() => setOpenId(open ? null : id)}
                >
                  <span className="font-heading text-base font-bold leading-snug text-foreground sm:text-lg">
                    {question}
                  </span>
                  <IconChevron
                    className={`ml-auto mt-0.5 h-5 w-5 ${open ? "text-primary" : "text-muted-foreground"}`}
                    open={open}
                  />
                </button>
                <div
                  id={`faq-${id}-panel`}
                  role="region"
                  aria-labelledby={`faq-${id}-trigger`}
                  hidden={!open}
                  className="border-t border-border/60 px-5 pb-5 sm:px-6 sm:pb-5"
                >
                  <p className="pt-4 text-base font-medium leading-relaxed text-[#343a40] sm:text-[1.05rem]">
                    {answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
