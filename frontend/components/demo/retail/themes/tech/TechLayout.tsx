'use client';

import { BusinessDemo } from '@/lib/types';
import { TechHeader } from './TechHeader';
import { TechHero } from './TechHero';
import { TechProductGrid } from './TechProductGrid';
import { TechLookbook } from './TechLookbook';
import { TechReviews } from './TechReviews';
import { TechFAQ } from './TechFAQ';
import { TechFooter } from './TechFooter';
import { isSectionVisible } from '@/lib/section-utils';

export function TechLayout({ client }: { client: BusinessDemo }) {
  const order = client.sectionOrder || ['hero', 'lookbook', 'katalog', 'testimoni', 'faq'];

  const renderSection = (id: string) => {
    if (!isSectionVisible(id, client.hiddenSections)) return null;
    switch (id) {
      case 'hero': return <TechHero key={id} />;
      case 'lookbook': return <TechLookbook key={id} />;
      case 'katalog': return <TechProductGrid key={id} />;
      case 'testimoni': return <TechReviews key={id} />;
      case 'faq': return <TechFAQ key={id} />;
      case 'gallery': return <TechLookbook key={id} />; // Fallback alias
      case 'menu': return <TechProductGrid key={id} />; // Fallback alias
      case 'reviews': return <TechReviews key={id} />; // Fallback alias
      default: return null;
    }
  };

  return (
    <div className="bg-[#FAFAFA] text-zinc-800 antialiased selection:bg-zinc-900 selection:text-white" style={{ '--theme-color': client.themeColor || '#09090b' } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="font-jakarta">

        <TechHeader />
        
        <main>
          {order.map(sectionId => renderSection(sectionId))}
        </main>

        <TechFooter />
      </div>
    </div>
  );
}
