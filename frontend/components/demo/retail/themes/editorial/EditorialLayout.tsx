'use client';

import { BusinessDemo } from '@/lib/types';
import { EditorialHeader } from './EditorialHeader';
import { EditorialHero } from './EditorialHero';
import { EditorialLookbook } from './EditorialLookbook';
import { EditorialProductGrid } from './EditorialProductGrid';
import { EditorialReviews } from './EditorialReviews';
import { EditorialFAQ } from './EditorialFAQ';
import { EditorialFooter } from './EditorialFooter';
import { isSectionVisible } from '@/lib/section-utils';

export function EditorialLayout({ client }: { client: BusinessDemo }) {
  const order = client.sectionOrder || ['hero', 'lookbook', 'katalog', 'testimoni', 'faq'];

  const renderSection = (id: string) => {
    if (!isSectionVisible(id, client.hiddenSections)) return null;
    switch (id) {
      case 'hero': return <EditorialHero key={id} />;
      case 'lookbook': return <EditorialLookbook key={id} />;
      case 'katalog': return <EditorialProductGrid key={id} />;
      case 'testimoni': return <EditorialReviews key={id} />;
      case 'faq': return <EditorialFAQ key={id} />;
      case 'gallery': return <EditorialLookbook key={id} />; // Fallback alias
      case 'menu': return <EditorialProductGrid key={id} />; // Fallback alias
      case 'reviews': return <EditorialReviews key={id} />; // Fallback alias
      default: return null;
    }
  };

  return (
    <div className="font-sans antialiased text-[#121212] bg-[#F5F5F5] min-h-screen relative selection:bg-[#8C907E] selection:text-white">
      
      {/* Styles for Marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        .font-serif-custom { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-100%); }
        }
        .animate-marquee {
            display: inline-block;
            white-space: nowrap;
            animation: marquee 30s linear infinite;
        }
      `}} />

      <EditorialHeader />
      <main>
        {order.map(sectionId => renderSection(sectionId))}
      </main>
      <EditorialFooter />
    </div>
  );
}
