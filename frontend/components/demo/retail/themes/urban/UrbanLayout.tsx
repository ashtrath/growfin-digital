'use client';

import { useRetailDemo } from '../../core/RetailDemoContext';
import { UrbanHeader } from './UrbanHeader';
import { UrbanHero } from './UrbanHero';
import { UrbanLookbook } from './UrbanLookbook';
import { UrbanProductGrid } from './UrbanProductGrid';
import { UrbanReviews } from './UrbanReviews';
import { UrbanFAQ } from './UrbanFAQ';
import { UrbanFooter } from './UrbanFooter';
import { BusinessDemo } from '@/lib/types';
import { isSectionVisible } from '@/lib/section-utils';

function RetailDemoContent() {
  const { client } = useRetailDemo();

  const order = client.sectionOrder || ['hero', 'lookbook', 'katalog', 'testimoni'];

  const renderSection = (id: string) => {
    if (!isSectionVisible(id, client.hiddenSections)) return null;
    switch (id) {
      case 'hero': return <UrbanHero key={id} />;
      case 'lookbook': return <UrbanLookbook key={id} />;
      case 'katalog': return <UrbanProductGrid key={id} />;
      case 'testimoni': return <UrbanReviews key={id} />;
      case 'gallery': return <UrbanLookbook key={id} />; // Fallback alias
      case 'menu': return <UrbanProductGrid key={id} />; // Fallback alias
      case 'reviews': return <UrbanReviews key={id} />; // Fallback alias
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased text-gray-800 bg-white relative overflow-hidden pb-20 md:pb-0">
      
      <UrbanHeader />

      <main className="flex-1 w-full pt-20 relative z-10">
        {order.map(sectionId => renderSection(sectionId))}
        <UrbanFAQ />
      </main>

      <UrbanFooter />

    </div>
  );
}

export function UrbanLayout({ client }: { client: BusinessDemo }) {
  return <RetailDemoContent />;
}
