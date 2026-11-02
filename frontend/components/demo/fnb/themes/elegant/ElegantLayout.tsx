import { ElegantHeader } from './ElegantHeader';
import { ElegantMenu } from './ElegantMenu';
import { ElegantGallery } from './ElegantGallery';
import { ElegantReviews } from './ElegantReviews';
import { ElegantFooter } from './ElegantFooter';
import { useFnbDemo } from '../../core/FnbDemoContext';
import { isSectionVisible } from '@/lib/section-utils';

export function ElegantLayout() {
  const { client } = useFnbDemo();
  const themeColor = client.themeColor || '#C94A29'; // Default orange/red

  const order = client.sectionOrder?.length 
    ? client.sectionOrder 
    : ['hero', 'menu', 'gallery', 'reviews'];

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        :root {
          --brand-primary: ${themeColor};
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        .font-sans-bakery { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-serif-title { font-family: 'Playfair Display', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="bg-stone-50 text-stone-900 antialiased selection:bg-brand-primary selection:text-white pb-20 font-sans-bakery">
        {order.map((sectionId) => {
          if (!isSectionVisible(sectionId, client.hiddenSections)) return null;
          switch (sectionId) {
            case 'hero': return <ElegantHeader key="hero" />;
            case 'menu': return <ElegantMenu key="menu" />;
            case 'gallery': return <ElegantGallery key="gallery" />;
            case 'reviews': return <ElegantReviews key="reviews" />;
            default: return null;
          }
        })}
        <ElegantFooter />
      </div>
    </>
  );
}
