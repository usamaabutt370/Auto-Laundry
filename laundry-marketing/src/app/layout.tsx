import type { Metadata } from "next";
import { fontVariables } from "@/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Laundri — Earn from home doing laundry",
    template: "%s | Laundri",
  },
  description:
    "Platform connecting housewives who launder with local customers. Earn from home, flexible hours, keep 100%. Customers pay you directly.",
  openGraph: {
    title: "Laundri",
    description:
      "Join Pakistan's community of housewives earning from home with laundry services.",
    siteName: "Laundri",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full scroll-smooth antialiased`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background font-sans text-foreground"
      >
        {children}
      </body>
    </html>
  );
}
