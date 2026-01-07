import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-model.jpg";

const HeroSection = () => {
  return (
    <section className="relative h-[600px] lg:h-[700px] overflow-hidden">
      {/* Hero Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Fashion model with shopping bags"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex items-center justify-center">
        <div className="text-center text-primary-foreground">
          <p className="text-lg lg:text-xl mb-2 font-light tracking-wide">Best Collection</p>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-wider mb-8">
            NEW ARRIVALS
          </h1>
          <Button 
            variant="outline"
            className="bg-background text-foreground border-background hover:bg-background/90 px-8 py-6 text-base font-medium rounded-sm"
          >
            SHOP NOW
          </Button>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors">
        <ChevronLeft className="h-8 w-8" />
      </button>
      <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors">
        <ChevronRight className="h-8 w-8" />
      </button>
    </section>
  );
};

export default HeroSection;
