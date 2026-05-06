import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-section">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div>
          <BrandLogo variant="onLight" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Connecting housewives who launder with customers in their community.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm sm:items-end">
          <Link
            href="/privacy"
            className="font-medium text-foreground underline-offset-4 transition hover:text-primary hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-medium text-foreground underline-offset-4 transition hover:text-primary hover:underline"
          >
            Terms of Service
          </Link>
        </div>
      </div>
      <div className="border-t border-border bg-section py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Laundri. All rights reserved.
      </div>
    </footer>
  );
}
