"use client";

import { GradientButton } from "@/components/ui/GradientButton";
import { useEffect, useMemo, useState } from "react";

type CountryOption = {
  id: string;
  label: string;
  dialCode: string; // e.g. +92
  shortLabel: string; // e.g. PK
};

const COUNTRIES: readonly CountryOption[] = [
  { id: "PK", label: "Pakistan", shortLabel: "PK", dialCode: "+92" },
  { id: "IN", label: "India", shortLabel: "IN", dialCode: "+91" },
  { id: "AE", label: "UAE", shortLabel: "AE", dialCode: "+971" },
  { id: "SA", label: "Saudi", shortLabel: "SA", dialCode: "+966" },
] as const;

function validateName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Please enter your name (min 2 characters).";
  return null;
}

function normalizeNationalNumber(value: string) {
  return value.replace(/\D/g, "");
}

function validateNationalNumber(value: string) {
  const digits = normalizeNationalNumber(value);
  // Keep a simple, safe constraint: 7–12 digits covers most local formats.
  if (digits.length < 7) return "Please enter your WhatsApp number.";
  if (digits.length > 12) return "Number looks too long.";
  return null;
}

function toE164(dialCode: string, nationalNumber: string) {
  const digits = normalizeNationalNumber(nationalNumber);
  const cc = dialCode.replace(/\D/g, "");
  return `+${cc}${digits}`;
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className ?? ""}
    >
      <path
        d="M20 21a8 8 0 10-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconWhatsapp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className ?? ""}
    >
      <path
        d="M20 11.9a7.9 7.9 0 01-11.9 6.9L4 20l1.2-3.9A7.9 7.9 0 1120 11.9z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9.4 9.2c.2-.4.3-.4.5-.4h.6c.2 0 .4 0 .5.3l.7 1.6c.1.2.1.4 0 .6l-.4.6c-.1.2-.1.4 0 .6.4.8 1.2 1.6 2 2 .2.1.4.1.6 0l.6-.4c.2-.1.4-.1.6 0l1.6.7c.2.1.3.3.3.5v.6c0 .2 0 .4-.4.5-.6.3-1.3.4-2 .2-1.1-.3-2.5-1.1-3.8-2.4-1.3-1.3-2.1-2.7-2.4-3.8-.2-.7-.1-1.4.2-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WaitingList() {
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState<(typeof COUNTRIES)[number]["id"]>("PK");
  const [phone, setPhone] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.id === countryId) ?? COUNTRIES[0],
    [countryId],
  );

  useEffect(() => {
    if (!cooldown) return;
    const t = window.setTimeout(() => setCooldown(false), 5000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const nErr = validateName(name);
    const pErr = validateNationalNumber(phone);
    setNameError(nErr);
    setPhoneError(pErr);
    if (nErr || pErr) return;
    if (submitting || cooldown) return;

    setSubmitting(true);
    setCooldown(true);

    try {
      const payload = {
        name: name.trim(),
        phone: toE164(selectedCountry.dialCode, phone),
      };

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Request failed");

      setSuccess(true);
      setName("");
      setPhone("");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative overflow-hidden border-t border-border py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-section" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,152,0,0.12),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_20%_90%,rgba(0,188,212,0.14),transparent_62%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_85%_25%,rgba(40,53,147,0.10),transparent_60%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.10) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
            <div className="inline-flex items-center justify-center rounded-full border border-border/60 bg-white/70 px-4 py-1.5 text-sm font-semibold text-foreground shadow-[0_14px_34px_-22px_rgba(15,23,42,0.35)] ring-1 ring-white/40 backdrop-blur">
              <span aria-hidden className="mr-2">
                🚀
              </span>
              Launching soon
              <span className="mx-2 h-1 w-1 rounded-full bg-foreground/25" aria-hidden />
              <span className="text-foreground/75">Join the waiting list</span>
            </div>

            <h2 className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              Be the first to know when we launch
            </h2>
            <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
              Join 50+ housewives already on the waiting list. We&apos;ll notify you on WhatsApp when
              the app is ready.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-2.5 lg:justify-start">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/75 px-3 py-1 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
                WhatsApp notification
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/75 px-3 py-1 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
                1 message only
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-white/75 px-3 py-1 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
                No spam
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-3xl lg:mx-0 lg:max-w-none">
            <form
              onSubmit={handleSubmit}
              className="relative overflow-hidden rounded-3xl border border-border/70 bg-white/85 p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.55)] ring-1 ring-black/[0.04] backdrop-blur sm:p-6 lg:p-7"
            >
            <div
              className="pointer-events-none absolute -inset-x-10 -top-12 h-24 bg-[radial-gradient(ellipse_at_center,rgba(0,188,212,0.22),transparent_65%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,152,0,0.22),transparent_60%)]"
              aria-hidden
            />

            {success ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-center">
                <p className="text-base font-semibold text-foreground">
                  ✓ Thanks! We&apos;ll notify you on WhatsApp when we launch.
                </p>
              </div>
            ) : (
              <>
            <div className="grid gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="waiting-list-name" className="sr-only">
                  Name
                </label>
                <div className="relative">
                  <IconUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    id="waiting-list-name"
                    name="name"
                    placeholder="Your name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError(null);
                      if (success) setSuccess(false);
                    }}
                    onBlur={() => setNameError(validateName(name))}
                    className="h-12 w-full rounded-2xl border border-border/80 bg-white pl-11 pr-4 text-base font-medium text-foreground shadow-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                {nameError ? <p className="text-sm font-semibold text-red-600">{nameError}</p> : null}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="waiting-list-phone" className="sr-only">
                  Phone number
                </label>
                <div className="flex h-12 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm outline-none transition focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/10">
                  <label htmlFor="waiting-list-country" className="sr-only">
                    Country
                  </label>
                  <select
                    id="waiting-list-country"
                    value={countryId}
                    onChange={(e) =>
                      setCountryId(e.target.value as (typeof COUNTRIES)[number]["id"])
                    }
                    className="h-full w-[5.75rem] shrink-0 border-r border-border/60 bg-white pl-3 pr-2 text-sm font-bold text-foreground outline-none"
                    title={selectedCountry.label}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shortLabel} {c.dialCode}
                      </option>
                    ))}
                  </select>

                  <div className="relative min-w-0 flex-1">
                    <IconWhatsapp className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                    <input
                      id="waiting-list-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="WhatsApp number"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError(null);
                        if (success) setSuccess(false);
                      }}
                      onBlur={() => setPhoneError(validateNationalNumber(phone))}
                      className="h-full w-full bg-white pl-10 pr-3 text-[15px] font-medium tabular-nums text-foreground outline-none"
                    />
                  </div>
                </div>
                {phoneError ? (
                  <p className="text-sm font-semibold text-red-600">{phoneError}</p>
                ) : null}
              </div>

            </div>

            <div className="mt-4 sm:mt-5">
              <GradientButton
                type="submit"
                className={`w-full px-6 font-bold ${submitting || cooldown ? "opacity-80" : ""}`}
              >
                {submitting ? "Sending..." : "Notify Me"}
              </GradientButton>
              {submitError ? (
                <p className="mt-3 text-center text-sm font-semibold text-red-600">{submitError}</p>
              ) : null}
              <div className="mt-3 space-y-1.5 text-center text-sm font-medium text-muted-foreground">
                <p>No spam. Only one message when we launch.</p>
              </div>
            </div>
              </>
            )}
          </form>
          </div>
        </div>
      </div>
    </section>
  );
}

