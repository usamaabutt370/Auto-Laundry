import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using the Laundri platform.",
};

export default function TermsPage() {
  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandLogo variant="onLight" />
          <Link href="/privacy" className="text-sm text-primary hover:underline">
            Privacy
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-8 space-y-6 text-foreground">
          <p className="text-muted-foreground">
            This is a placeholder Terms of Service for <strong>Laundri</strong>. Replace with
            your final legal agreement before launch. A lawyer should review liability, payments
            (you describe direct pay between users), delivery, and local law.
          </p>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">1. The service</h2>
            <p className="mt-2 text-muted-foreground">
              Laundri provides a platform to connect customers with laundry service providers
              (&quot;Launderers&quot;). Laundri does not employ Launderers and does not handle
              payments between users. Payment is solely between Customer and Launderer (e.g. cash,
              Easypaisa, JazzCash, or bank transfer). Delivery may be arranged by the Launderer, including use of a rider; Laundri is
              not a delivery or payment company unless you state otherwise later.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">2. Eligibility & accounts</h2>
            <p className="mt-2 text-muted-foreground">
              Users must meet age and eligibility requirements you define. Accounts must be
              accurate and secure.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">3. Conduct</h2>
            <p className="mt-2 text-muted-foreground">
              No abuse, fraud, or illegal use. You may suspend or terminate accounts under
              conditions you specify.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">4. Limitation of liability</h2>
            <p className="mt-2 text-muted-foreground">
              To be drafted by counsel. Typically the platform is provided &quot;as is&quot; with
              caps and exclusions appropriate to your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">5. Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Add your legal entity name and contact details.
            </p>
          </section>
        </div>
      </article>

      <SiteFooter />
    </>
  );
}
