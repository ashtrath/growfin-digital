'use client';

import { BusinessDemo } from '@/lib/types';
import { DarkHeader } from './DarkHeader';
import { DarkHero } from './DarkHero';
import { DarkProductGrid } from './DarkProductGrid';
import { DarkLookbook } from './DarkLookbook';
import { DarkReviews } from './DarkReviews';
import { DarkFAQ } from './DarkFAQ';
import { DarkFooter } from './DarkFooter';
import { isSectionVisible } from '@/lib/section-utils';

export function DarkLayout({ client }: { client: BusinessDemo }) {
  const order = client.sectionOrder || ['hero', 'lookbook', 'katalog', 'testimoni', 'faq'];

  const renderSection = (id: string) => {
    if (!isSectionVisible(id, client.hiddenSections)) return null;
    switch (id) {
      case 'hero': return <DarkHero key={id} />;
      case 'lookbook': return <DarkLookbook key={id} />;
      case 'katalog': return <DarkProductGrid key={id} />;
      case 'testimoni': return <DarkReviews key={id} />;
      case 'faq': return <DarkFAQ key={id} />;
      case 'gallery': return <DarkLookbook key={id} />; // Fallback alias
      case 'menu': return <DarkProductGrid key={id} />; // Fallback alias
      case 'reviews': return <DarkReviews key={id} />; // Fallback alias
      default: return null;
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-black" style={{ '--theme-color': client.themeColor || '#06b6d4' } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="font-jakarta">
        <DarkHeader />
        
        <main>
          {order.map(sectionId => renderSection(sectionId))}
        </main>

        <DarkFooter />

      </div>
    </div>
  );
}
