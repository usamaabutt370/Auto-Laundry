import { SiteFooter } from "@/components/layout/SiteFooter";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Testimonials } from "@/components/sections/Testimonials";
import { ForCustomers } from "@/components/sections/ForCustomers";
import { FAQ } from "@/components/sections/FAQ";
import { WaitingList } from "@/components/sections/WaitingList";
import { FinalCta } from "@/components/sections/FinalCta";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Testimonials />
        <ForCustomers />
        <FAQ />
        <WaitingList />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
