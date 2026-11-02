'use client';

import { BusinessDemo } from '@/lib/types';
import { ArtisanHeader } from './ArtisanHeader';
import { ArtisanHero } from './ArtisanHero';
import { ArtisanLookbook } from './ArtisanLookbook';
import { ArtisanProductGrid } from './ArtisanProductGrid';
import { ArtisanReviews } from './ArtisanReviews';
import { ArtisanFAQ } from './ArtisanFAQ';
import { ArtisanFooter } from './ArtisanFooter';
import { isSectionVisible } from '@/lib/section-utils';

export function ArtisanLayout({ client }: { client: BusinessDemo }) {
  const themeColor = client.themeColor || '#2D4739';

  const order = client.sectionOrder || ['hero', 'lookbook', 'katalog', 'testimoni', 'faq'];

  const renderSection = (id: string) => {
    if (!isSectionVisible(id, client.hiddenSections)) return null;
    switch (id) {
      case 'hero': return <ArtisanHero key={id} />;
      case 'lookbook': return <ArtisanLookbook key={id} />;
      case 'katalog': return <ArtisanProductGrid key={id} />;
      case 'testimoni': return <ArtisanReviews key={id} />;
      case 'faq': return <ArtisanFAQ key={id} />;
      case 'gallery': return <ArtisanLookbook key={id} />; // Fallback alias
      case 'menu': return <ArtisanProductGrid key={id} />; // Fallback alias
      case 'reviews': return <ArtisanReviews key={id} />; // Fallback alias
      default: return null;
    }
  };

  return (
    <div className="bg-[#FBF9F5] text-zinc-800 antialiased selection:bg-[#2D4739] selection:text-amber-100" style={{ '--theme-color': themeColor } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-serif-display { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      
      <div className="font-jakarta">

        <ArtisanHeader />
        
        <main>
          {order.map(sectionId => renderSection(sectionId))}
        </main>

        <ArtisanFooter />
      </div>
    </div>
  );
}
