import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Laundri collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandLogo variant="onLight" />
          <Link href="/terms" className="text-sm text-primary hover:underline">
            Terms
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-8 max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground">
            This is a placeholder Privacy Policy for <strong>Laundri</strong>. Replace this page
            with your final legal text before launch. Consult a qualified lawyer for Pakistan-specific
            requirements (e.g. PECA, consumer protection, app store policies).
          </p>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">1. Who we are</h2>
            <p className="mt-2 text-muted-foreground">
              Laundri operates a platform that connects customers with individuals who provide
              laundry services. Laundri does not process payments between users; payments are
              arranged directly between customers and service providers (e.g. cash, mobile wallets, bank transfer).
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">2. Information we collect</h2>
            <p className="mt-2 text-muted-foreground">
              We may collect information you provide when you register or use the app, such as
              phone number, profile details, and messages needed to operate the service. We may
              also collect device and usage data as described in your production policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">3. How we use information</h2>
            <p className="mt-2 text-muted-foreground">
              To provide and improve the platform, safety, support, and legal compliance. Details
              belong in your final policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">4. Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Add your support email or address here.
            </p>
          </section>
        </div>
      </article>

      <SiteFooter />
    </>
  );
}
