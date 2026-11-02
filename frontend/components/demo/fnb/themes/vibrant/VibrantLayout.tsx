import { useFnbDemo } from '../../core/FnbDemoContext';
import { VibrantHeader } from './VibrantHeader';
import { VibrantLookbook } from './VibrantLookbook';
import { VibrantMenu } from './VibrantMenu';
import { VibrantReviews } from './VibrantReviews';
import { VibrantFooter } from './VibrantFooter';
import { isSectionVisible } from '@/lib/section-utils';

export function VibrantLayout() {
  const { client } = useFnbDemo();
  const themeColor = client.themeColor || '#f59e0b'; // Default amber-500

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        :root {
          --brand-primary: ${themeColor};
        }
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-sans-bubbletea { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />
      <div className="bg-brand-light/20 text-stone-800 antialiased selection:bg-brand-primary/30 selection:text-brand-primary pb-20 font-sans-bubbletea">
        <VibrantHeader />
        {isSectionVisible('gallery', client.hiddenSections) && <VibrantLookbook />}
        {isSectionVisible('menu', client.hiddenSections) && <VibrantMenu />}
        {isSectionVisible('reviews', client.hiddenSections) && <VibrantReviews />}
        <VibrantFooter />
      </div>
    </>
  );
}
