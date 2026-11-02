import { ModernHeader } from './ModernHeader';
import { ModernMenu } from './ModernMenu';
import { ModernGallery } from './ModernGallery';
import { ModernReviews } from './ModernReviews';
import { ModernFooter } from './ModernFooter';
import { useFnbDemo } from '../../core/FnbDemoContext';
import { isSectionVisible } from '@/lib/section-utils';

export function ModernLayout() {
  const { client } = useFnbDemo();
  const order = client.sectionOrder?.length 
    ? client.sectionOrder 
    : ['hero', 'menu', 'gallery', 'reviews'];

  const renderSection = (id: string) => {
    if (!isSectionVisible(id, client.hiddenSections)) return null;
    switch (id) {
      case 'hero': return <ModernHeader key={id} />;
      case 'menu': return <ModernMenu key={id} />;
      case 'gallery': return <ModernGallery key={id} />;
      case 'reviews': return <ModernReviews key={id} />;
      default: return null;
    }
  };

  return (
    <div className="bg-stone-50 text-stone-800 antialiased relative overflow-x-hidden">
      {order.map(sectionId => renderSection(sectionId))}
      <ModernFooter />
    </div>
  );
}
