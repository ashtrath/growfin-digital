import { useFnbDemo } from '../../core/FnbDemoContext';
import { BoldHeader } from './BoldHeader';
import { BoldMenu } from './BoldMenu';
import { BoldLookbook } from './BoldLookbook';
import { BoldReviews } from './BoldReviews';
import { BoldFooter } from './BoldFooter';
import { isSectionVisible } from '@/lib/section-utils';

export function BoldLayout() {
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
        .font-sans-fastfood { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />
      <div className="bg-neutral-50 text-neutral-900 antialiased selection:bg-brand-primary selection:text-white pb-20 font-sans-fastfood">
        <BoldHeader />
        {isSectionVisible('menu', client.hiddenSections) && <BoldMenu />}
        {isSectionVisible('gallery', client.hiddenSections) && <BoldLookbook />}
        {isSectionVisible('reviews', client.hiddenSections) && <BoldReviews />}
        <BoldFooter />
      </div>
    </>
  );
}
