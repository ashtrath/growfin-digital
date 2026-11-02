import { ClassicHeader } from './ClassicHeader';
import { ClassicHeroScreen } from './ClassicHeroScreen';
import { ClassicGallery } from './ClassicGallery';
import { ClassicServiceList } from './ClassicServiceList';
import { ClassicReviews } from './ClassicReviews';
import { ClassicProfileScreen } from './ClassicProfileScreen';
import { useFnbDemo } from '../../core/FnbDemoContext';
import { isSectionVisible } from '@/lib/section-utils';

export function ClassicLayout() {
  const { client } = useFnbDemo();
  const order = client.sectionOrder?.length 
    ? client.sectionOrder 
    : ['hero', 'gallery', 'reviews', 'menu'];

  const renderSection = (id: string) => {
    if (!isSectionVisible(id, client.hiddenSections)) return null;
    switch (id) {
      case 'hero': return <ClassicHeroScreen key={id} />;
      case 'gallery': return <ClassicGallery key={id} />;
      case 'reviews': return <ClassicReviews key={id} />;
      case 'menu': return <ClassicServiceList key={id} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-brand-primary/30 bg-stone-50 text-stone-800">
      <ClassicHeader />
      <main>
        {order.map(sectionId => renderSection(sectionId))}
      </main>
      <ClassicProfileScreen />
    </div>
  );
}
