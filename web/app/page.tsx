import { Hero } from '@/components/sections/Hero';
import { HomeFeatures } from '@/components/sections/HomeFeatures';
import { FeaturedTool } from '@/components/sections/FeaturedTool';
import { Testimonials } from '@/components/sections/Testimonials';
import { HomeCTA } from '@/components/sections/HomeCTA';

export default function Home() {
  return (
    <>
      <Hero />
      <HomeFeatures />
      <FeaturedTool />
      <Testimonials />
      <HomeCTA />
    </>
  );
}
