import { SiteFooter } from "@/components/layout/SiteFooter";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Testimonials } from "@/components/sections/Testimonials";
import { ForCustomers } from "@/components/sections/ForCustomers";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Testimonials />
        <ForCustomers />
      </main>
      <SiteFooter />
    </>
  );
}
