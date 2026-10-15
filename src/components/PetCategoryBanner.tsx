import React from 'react';
import { SectionBadge } from './SectionBadge';
import { ThemeButton } from './ThemeButton';

// ==================== Dedicated Vector Icons matching Reference Mockup ====================

// 1. Dog: Bone Icon (Food & Treats)
const BoneIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.5 3.5a2.5 2.5 0 0 0-2.12 1.18l-6.7 6.7A2.5 2.5 0 0 0 4.5 13.5a2.5 2.5 0 1 0 3.74 3.32l6.7-6.7A2.5 2.5 0 0 0 19.5 8a2.5 2.5 0 1 0-2-4.5zM6 18a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm12-12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
  </svg>
);

// 2. Dog: Tennis Ball Icon (Toys & Play)
const TennisBallIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
    <path d="M4.93 19.07a10 10 0 0 0 14.14 0" />
  </svg>
);

// 3. Dog: Paw Print Icon (Grooming & Care)
const PawPrintIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 13.5c-1.8 0-3.5 1.1-3.5 3.2 0 1.9 1.5 3.3 3.5 3.3s3.5-1.4 3.5-3.3c0-2.1-1.7-3.2-3.5-3.2zm-5.2-1.3c1.2 0 2.2-1.2 2.2-2.7s-1-2.7-2.2-2.7-2.2 1.2-2.2 2.7 1 2.7 2.2 2.7zm10.4 0c1.2 0 2.2-1.2 2.2-2.7s-1-2.7-2.2-2.7-2.2 1.2-2.2 2.7 1 2.7 2.2 2.7zm-7.6-3.8c1.3 0 2.4-1.3 2.4-2.9S10.9 2.6 9.6 2.6s-2.4 1.3-2.4 2.9 1.1 2.9 2.4 2.9zm4.8 0c1.3 0 2.4-1.3 2.4-2.9S15.7 2.6 14.4 2.6s-2.4 1.3-2.4 2.9 1.1 2.9 2.4 2.9z" />
  </svg>
);

// 4. Cat: Candy/Treat Icon (Food & Treats)
const TreatIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="5" />
    <path d="M7.5 12 3 8v8l4.5-4zM16.5 12 21 8v8l-4.5-4z" />
  </svg>
);

// 5. Cat: Yarn/Ball of Wool Icon (Toys & Accessories)
const YarnBallIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 2.5a9.5 9.5 0 0 0 0 19" />
    <path d="M2.5 12a9.5 9.5 0 0 1 19 0" />
    <path d="m15.5 8.5-7 7" />
    <path d="m8.5 8.5 7 7" />
  </svg>
);

// 6. Cat: Pet Food Dish / Health Icon (Health & Grooming)
const PetBowlIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 14c0 3.3 2.7 6 6 6h4c3.3 0 6-2.7 6-6v-3H4v3zm2-5h12c0-1.7-1.3-3-3-3H9C7.3 6 6 7.3 6 9z" />
  </svg>
);

interface PetCategoryBannerProps {
  onSelectPet?: (petType: 'dog' | 'cat') => void;
  className?: string;
}

export const PetCategoryBanner: React.FC<PetCategoryBannerProps> = ({
  onSelectPet,
  className = '',
}) => {
  const handleAction = (petType: 'dog' | 'cat', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onSelectPet) {
      onSelectPet(petType);
    } else {
      const shopEl = document.getElementById('shop');
      if (shopEl) {
        shopEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      id="pet-category-banner"
      aria-label="Shop For Dog and For Cat"
      className={`w-full py-8 sm:py-12 bg-white relative overflow-hidden font-sans ${className}`}
    >
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ==================== Section Header ==================== */}
        <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-9 lg:mb-11">
          <SectionBadge label="Shop by Pet" className="mb-2" />
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#111827] tracking-tight leading-[1.15]">
            Curated For <span className="text-[#7a46e5]">Dogs</span> &amp; <span className="text-[#FF5376]">Cats</span>
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 font-medium pt-1.5 max-w-lg mx-auto leading-relaxed">
            Tailored nutrition, playful toys, and specialized care essentials curated specifically for dogs and cats.
          </p>
        </div>

        {/* ==================== Two Main Cards Grid matching Reference Image ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-7 items-stretch">

          {/* =========================================================================
              CARD 1: FOR DOG
              - Headline: "FOR" (dark teal) + "DOG" (bright cyan)
              - 3 Features: Food & Treats, Toys & Play, Grooming & Care
              - Button: "SHOP NOW >" (cyan pill)
              - Right: Golden Retriever Puppy with Bandana & Doodles from image.png
             ========================================================================= */}
          <div
            onClick={() => handleAction('dog')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAction('dog');
              }
            }}
            aria-label="Shop for Dogs"
            className="group relative overflow-hidden rounded-[26px] sm:rounded-[30px] lg:rounded-[34px] bg-white border border-[#E7E5E4] p-6 sm:p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_45px_-12px_rgba(122,70,229,0.22)] hover:border-[#7a46e5]/50 transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer min-h-[350px] sm:min-h-[410px] lg:min-h-[440px] flex items-center justify-between"
          >
            {/* Left Content Column */}
            <div className="relative z-10 w-[58%] sm:w-[54%] md:w-[56%] flex flex-col justify-between h-full py-1">

              {/* Heading */}
              <div>
                <span className="block font-black text-3xl sm:text-4xl md:text-5xl lg:text-[54px] text-[#002D3A] tracking-tight leading-[0.95]">
                  FOR
                </span>
                <span className="block font-black text-4xl sm:text-5xl md:text-6xl lg:text-[68px] text-[#7a46e5] tracking-tight leading-[0.95] mt-1">
                  DOG
                </span>
              </div>

              {/* 3 Feature Pills */}
              <div className="space-y-2.5 sm:space-y-3 my-4 sm:my-5 lg:my-6">
                {/* 1. Food & Treats */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F4EFFE] text-[#7a46e5] flex items-center justify-center shrink-0 shadow-2xs">
                    <BoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-xs sm:text-sm lg:text-[15px] font-bold text-[#374151] tracking-wide">
                    Food &amp; Treats
                  </span>
                </div>

                {/* 2. Toys & Play */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F4EFFE] text-[#7a46e5] flex items-center justify-center shrink-0 shadow-2xs">
                    <TennisBallIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-xs sm:text-sm lg:text-[15px] font-bold text-[#374151] tracking-wide">
                    Toys &amp; Play
                  </span>
                </div>

                {/* 3. Grooming & Care */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F4EFFE] text-[#7a46e5] flex items-center justify-center shrink-0 shadow-2xs">
                    <PawPrintIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-xs sm:text-sm lg:text-[15px] font-bold text-[#374151] tracking-wide">
                    Grooming &amp; Care
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <ThemeButton
                  onClick={(e) => handleAction('dog', e)}
                  size="md"
                >
                  Shop Now
                </ThemeButton>
              </div>

            </div>

            {/* Right Cutout Image: Golden Retriever with Bandana & Doodles from public/assets/image.png */}
            <div className="absolute right-0 bottom-0 top-0 w-[50%] sm:w-[54%] md:w-[56%] lg:w-[58%] pointer-events-none select-none flex items-end justify-end">
              <img
                src="/assets/banner-dog.webp"
                alt="Happy Golden Retriever with bandana"
                className="h-full w-auto max-w-full object-contain object-right-bottom transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                loading="eager"
              />
            </div>

          </div>

          {/* =========================================================================
              CARD 2: FOR CAT
              - Headline: "FOR" (dark plum) + "CAT" (bright coral pink)
              - 3 Features: Food & Treats, Toys & Accessories, Health & Grooming
              - Button: "SHOP NOW >" (coral pink pill)
              - Right: Kitten with Raised Paw & Doodles from image.png
             ========================================================================= */}
          <div
            onClick={() => handleAction('cat')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAction('cat');
              }
            }}
            aria-label="Shop for Cats"
            className="group relative overflow-hidden rounded-[26px] sm:rounded-[30px] lg:rounded-[34px] bg-white border border-[#E7E5E4] p-6 sm:p-8 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_45px_-12px_rgba(255,83,118,0.22)] hover:border-[#FF5376]/50 transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer min-h-[350px] sm:min-h-[410px] lg:min-h-[440px] flex items-center justify-between"
          >
            {/* Left Content Column */}
            <div className="relative z-10 w-[58%] sm:w-[54%] md:w-[56%] flex flex-col justify-between h-full py-1">

              {/* Heading */}
              <div>
                <span className="block font-black text-3xl sm:text-4xl md:text-5xl lg:text-[54px] text-[#3D1A24] tracking-tight leading-[0.95]">
                  FOR
                </span>
                <span className="block font-black text-4xl sm:text-5xl md:text-6xl lg:text-[68px] text-[#FF5376] tracking-tight leading-[0.95] mt-1">
                  CAT
                </span>
              </div>

              {/* 3 Feature Pills */}
              <div className="space-y-2.5 sm:space-y-3 my-4 sm:my-5 lg:my-6">
                {/* 1. Food & Treats */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FCE7F0] text-[#FF5376] flex items-center justify-center shrink-0 shadow-2xs">
                    <TreatIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-xs sm:text-sm lg:text-[15px] font-bold text-[#374151] tracking-wide">
                    Food &amp; Treats
                  </span>
                </div>

                {/* 2. Toys & Accessories */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FCE7F0] text-[#FF5376] flex items-center justify-center shrink-0 shadow-2xs">
                    <YarnBallIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-xs sm:text-sm lg:text-[15px] font-bold text-[#374151] tracking-wide">
                    Toys &amp; Accessories
                  </span>
                </div>

                {/* 3. Health & Grooming */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FCE7F0] text-[#FF5376] flex items-center justify-center shrink-0 shadow-2xs">
                    <PetBowlIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-xs sm:text-sm lg:text-[15px] font-bold text-[#374151] tracking-wide">
                    Health &amp; Grooming
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <ThemeButton
                  onClick={(e) => handleAction('cat', e)}
                  size="md"
                  className="bg-[#FF5376] hover:bg-[#F43F5E] shadow-[0_4px_16px_rgba(255,83,118,0.35)] hover:shadow-[0_6px_22px_rgba(255,83,118,0.48)] border-transparent"
                >
                  Shop Now
                </ThemeButton>
              </div>

            </div>

            {/* Right Cutout Image: Kitten with Raised Paw & Doodles from public/assets/image.png */}
            <div className="absolute right-0 bottom-0 top-0 w-[50%] sm:w-[54%] md:w-[56%] lg:w-[58%] pointer-events-none select-none flex items-end justify-end">
              <img
                src="/assets/banner-cat.webp"
                alt="Playful kitten with raised paw"
                className="h-full w-auto max-w-full object-contain object-right-bottom transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                loading="eager"
              />
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default PetCategoryBanner;
