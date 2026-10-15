import React from 'react';
import { BundleItem } from '../types';
import { ThemeButton } from './ThemeButton';
import { SectionBadge } from './SectionBadge';

interface ShopByNeedProps {
  onSelectBundle: (categoryFilter?: BundleItem['categoryFilter']) => void;
}

export const ShopByNeed: React.FC<ShopByNeedProps> = ({ onSelectBundle }) => {
  return (
    <section
      id="bundles"
      className="w-full py-1.5 sm:py-2 md:py-2.5 bg-white font-sans md:h-[calc(100vh-74px)] md:max-h-[calc(100vh-74px)] flex flex-col justify-center overflow-hidden scroll-mt-18 sm:scroll-mt-20"
    >
      <div className="w-full max-w-[1580px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8 h-full flex flex-col justify-between">
        
        {/* Bento Grid 5-Card Layout - Dynamically sized to fill 100% of single screen without clipping */}
        <div className="h-full flex flex-col justify-between gap-2.5 sm:gap-3 lg:gap-3.5">
          {/* =========================================================================
              TOP ROW: 2 Large Cards (Fills ~54% of available screen height on md/lg)
              Card 1: Grooming Essentials (Dog with Grooming Glove)
              Card 2: Walking & Travel (Outdoor Walking Dog with Leash & Water Bottle)
             ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-3.5 items-stretch flex-[1.16] min-h-0">
            {/* Card 1 — Grooming Essentials */}
            <div
              onClick={() => onSelectBundle('grooming')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBundle('grooming');
                }
              }}
              className="group relative overflow-hidden rounded-[20px] bg-white border border-[#E7E5E4] h-full min-h-[220px] md:min-h-0 flex items-center justify-between transition-all duration-300 cursor-pointer"
            >
              {/* Full Background Image */}
              <img
                src="/bento/bento-grid-2.webp"
                alt="Golden retriever dog enjoying gentle coat grooming with silicone glove"
                className="absolute inset-0 w-full h-full object-cover object-[75%_center] transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none select-none"
                loading="lazy"
              />

              {/* Increased Gradient on left side for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-48% to-transparent w-[78%] sm:w-[66%] lg:w-[58%] pointer-events-none z-[1]" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/88 to-transparent sm:hidden pointer-events-none z-[1]" />

              {/* Left Content Column */}
              <div className="relative z-10 w-full sm:w-[62%] lg:w-[56%] p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
                {/* Badge + Heading + Description grouped with tight gap */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div>
                    <SectionBadge label="Grooming Essentials" className="scale-85 sm:scale-90 origin-left" />
                  </div>

                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-[25px] xl:text-[27px] font-black text-[#1E2228] leading-[1.12] tracking-tight">
                    Effortless Grooming,
                    <br />
                    <span className="text-[#7a46e5]">Happier Pets</span>
                  </h3>

                  <p className="text-xs sm:text-[13px] text-neutral-600 font-medium leading-relaxed max-w-[250px] pt-0.5 line-clamp-2">
                    Make grooming a gentle bonding moment with everyday pet-care essentials.
                  </p>
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <ThemeButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBundle('grooming');
                    }}
                    size="md"
                  >
                    Shop Now
                  </ThemeButton>
                </div>
              </div>
            </div>

            {/* Card 2 — Walking & Travel */}
            <div
              onClick={() => onSelectBundle('travel')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBundle('travel');
                }
              }}
              className="group relative overflow-hidden rounded-[20px] bg-white border border-[#E7E5E4] h-full min-h-[220px] md:min-h-0 flex items-center justify-between transition-all duration-300 cursor-pointer"
            >
              {/* Full Background Image */}
              <img
                src="/bento/bento-grid-3.webp"
                alt="Golden retriever dog drinking from portable travel water bottle outdoors"
                className="absolute inset-0 w-full h-full object-cover object-[80%_center] transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none select-none"
                loading="lazy"
              />

              {/* Increased Gradient on left side for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-48% to-transparent w-[78%] sm:w-[66%] lg:w-[58%] pointer-events-none z-[1]" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/88 to-transparent sm:hidden pointer-events-none z-[1]" />

              {/* Left Content Column */}
              <div className="relative z-10 w-full sm:w-[62%] lg:w-[56%] p-4 sm:p-5 lg:p-6 flex flex-col justify-between h-full">
                {/* Badge + Heading + Description grouped with tight gap */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div>
                    <SectionBadge label="Walking & Travel" className="scale-85 sm:scale-90 origin-left" />
                  </div>

                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-[25px] xl:text-[27px] font-black text-[#1E2228] leading-[1.12] tracking-tight">
                    Every Walk Becomes
                    <br />
                    an <span className="text-[#7a46e5]">Adventure</span>
                  </h3>

                  <p className="text-xs sm:text-[13px] text-neutral-600 font-medium leading-relaxed max-w-[280px] pt-0.5 line-clamp-2">
                    Enjoy more happy outdoor moments with practical walking and travel essentials.
                  </p>
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <ThemeButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBundle('travel');
                    }}
                    size="md"
                  >
                    Shop Now
                  </ThemeButton>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              BOTTOM ROW: 3 Smaller Cards (Fills ~46% of available screen height on md/lg)
              Card 3: Cat Care (Cat with Slicker Brush)
              Card 4: Feeding Solutions (Dog with Automatic Smart Feeder)
              Card 5: Dirty Paws Solutions (Dog with Muddy Paw Washer Cup)
             ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-3.5 items-stretch flex-1 min-h-0">
            {/* Card 3 — Cat Care */}
            <div
              onClick={() => onSelectBundle('grooming')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBundle('grooming');
                }
              }}
              className="group relative overflow-hidden rounded-[18px] bg-white border border-[#E7E5E4] h-full min-h-[180px] md:min-h-0 flex items-center justify-between transition-all duration-300 cursor-pointer"
            >
              {/* Full Background Image - Shifted slightly right, clipped by card's rounded overflow-hidden */}
              <img
                src="/bento/bento-grid-1.webp"
                alt="Fluffy cat enjoying gentle grooming with self-cleaning slicker brush"
                className="absolute inset-0 w-full h-full object-cover object-[78%_center] translate-x-4 sm:translate-x-6 lg:translate-x-8 transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none select-none"
                loading="lazy"
              />

              {/* Increased Gradient on left side for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-50% to-transparent w-[80%] sm:w-[70%] lg:w-[64%] pointer-events-none z-[1]" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/88 to-transparent sm:hidden pointer-events-none z-[1]" />

              {/* Left Content Column */}
              <div className="relative z-10 w-full sm:w-[66%] lg:w-[62%] p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between h-full">
                {/* Badge + Heading + Description grouped with tight gap */}
                <div className="space-y-0.5 sm:space-y-1">
                  <div>
                    <SectionBadge label="Cat Care" className="scale-80 sm:scale-85 origin-left" />
                  </div>

                  <h3 className="text-sm sm:text-base md:text-lg lg:text-[19px] xl:text-[20px] font-black text-[#1E2228] leading-[1.15] tracking-tight">
                    Gentle Care For
                    <br />
                    Their <span className="text-[#7a46e5]">Softest Days</span>
                  </h3>

                  <p className="text-[11px] sm:text-xs text-neutral-600 font-medium leading-tight max-w-[210px] pt-0.5 line-clamp-1 sm:line-clamp-2">
                    Keep your cat comfortable with everyday grooming essentials.
                  </p>
                </div>

                {/* CTA Button */}
                <div className="pt-1.5">
                  <ThemeButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBundle('grooming');
                    }}
                    size="md"
                  >
                    Shop Now
                  </ThemeButton>
                </div>
              </div>
            </div>

            {/* Card 4 — Feeding Solutions */}
            <div
              onClick={() => onSelectBundle('feeding')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBundle('feeding');
                }
              }}
              className="group relative overflow-hidden rounded-[18px] bg-white border border-[#E7E5E4] h-full min-h-[180px] md:min-h-0 flex items-center justify-between transition-all duration-300 cursor-pointer"
            >
              {/* Full Background Image - Shifted slightly right, clipped by card's rounded overflow-hidden */}
              <img
                src="/bento/bento-grid-5.webp"
                alt="Dog eating fresh kibble from automatic smart pet food feeder"
                className="absolute inset-0 w-full h-full object-cover object-[70%_center] translate-x-4 sm:translate-x-6 lg:translate-x-8 transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none select-none"
                loading="lazy"
              />

              {/* Increased Gradient on left side for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-50% to-transparent w-[80%] sm:w-[70%] lg:w-[64%] pointer-events-none z-[1]" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/88 to-transparent sm:hidden pointer-events-none z-[1]" />

              {/* Left Content Column */}
              <div className="relative z-10 w-full sm:w-[66%] lg:w-[62%] p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between h-full">
                {/* Badge + Heading + Description grouped with tight gap */}
                <div className="space-y-0.5 sm:space-y-1">
                  <div>
                    <SectionBadge label="Feeding Solutions" className="scale-80 sm:scale-85 origin-left" />
                  </div>

                  <h3 className="text-sm sm:text-base md:text-lg lg:text-[19px] xl:text-[20px] font-black text-[#1E2228] leading-[1.15] tracking-tight">
                    Happier Mealtimes,
                    <br />
                    <span className="text-[#7a46e5]">Happier Pets</span>
                  </h3>

                  <p className="text-[11px] sm:text-xs text-neutral-600 font-medium leading-tight max-w-[210px] pt-0.5 line-clamp-1 sm:line-clamp-2">
                    Make daily feeding easier with practical feeding products.
                  </p>
                </div>

                {/* CTA Button */}
                <div className="pt-1.5">
                  <ThemeButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBundle('feeding');
                    }}
                    size="md"
                  >
                    Shop Now
                  </ThemeButton>
                </div>
              </div>
            </div>

            {/* Card 5 — Dirty Paws Solutions */}
            <div
              onClick={() => onSelectBundle('hygiene')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBundle('hygiene');
                }
              }}
              className="group relative overflow-hidden rounded-[18px] bg-white border border-[#E7E5E4] h-full min-h-[180px] md:min-h-0 flex items-center justify-between transition-all duration-300 cursor-pointer"
            >
              {/* Full Background Image - Shifted slightly right, clipped by card's rounded overflow-hidden */}
              <img
                src="/bento/bento-grid-4.webp"
                alt="Dog having muddy paws cleaned in silicone paw washer cup"
                className="absolute inset-0 w-full h-full object-cover object-[78%_center] translate-x-4 sm:translate-x-6 lg:translate-x-8 transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none select-none"
                loading="lazy"
              />

              {/* Increased Gradient on left side for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-50% to-transparent w-[80%] sm:w-[70%] lg:w-[64%] pointer-events-none z-[1]" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/88 to-transparent sm:hidden pointer-events-none z-[1]" />

              {/* Left Content Column */}
              <div className="relative z-10 w-full sm:w-[66%] lg:w-[62%] p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between h-full">
                {/* Badge + Heading + Description grouped with tight gap */}
                <div className="space-y-0.5 sm:space-y-1">
                  <div>
                    <SectionBadge label="Dirty Paws Solutions" className="scale-80 sm:scale-85 origin-left" />
                  </div>

                  <h3 className="text-sm sm:text-base md:text-lg lg:text-[19px] xl:text-[20px] font-black text-[#1E2228] leading-[1.15] tracking-tight">
                    Clean Paws, More
                    <br />
                    <span className="text-[#7a46e5]">Happy Adventures</span>
                  </h3>

                  <p className="text-[11px] sm:text-xs text-neutral-600 font-medium leading-tight max-w-[210px] pt-0.5 line-clamp-1 sm:line-clamp-2">
                    Make post-walk clean-ups easier with convenient paw-care essentials.
                  </p>
                </div>

                {/* CTA Button */}
                <div className="pt-1.5">
                  <ThemeButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBundle('hygiene');
                    }}
                    size="md"
                  >
                    Shop Now
                  </ThemeButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
