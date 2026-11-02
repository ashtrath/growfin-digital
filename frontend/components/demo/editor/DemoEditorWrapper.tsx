'use client';

import { useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { BusinessDemo } from '@/lib/types';
import { DynamicThemeProvider } from '../DynamicThemeProvider';
import { FnbDemoClient } from '../fnb-demo-client';
import { ServiceDemoClient } from '../service-demo-client';
import { GroomingDemoClient } from '../grooming-demo-client';
import { RetailDemoClient } from '../retail-demo-client';
import { OwnerToolbar } from './OwnerToolbar';
import { LiveEditorDrawer } from './LiveEditorDrawer';
import { MobileSegmentedControl } from './MobileSegmentedControl';
import { CheckoutModal } from '../checkout/CheckoutModal';
import { siteConfig } from '@/lib/site-config';

interface DemoEditorWrapperProps {
  initialClient: BusinessDemo;
  initialLayout: string;
  templateType: 'fnb' | 'service' | 'retail' | 'grooming';
  slug: string;
}

export function DemoEditorWrapper({ initialClient, initialLayout, templateType, slug }: DemoEditorWrapperProps) {
  const [client, setClient] = useState<BusinessDemo>(initialClient);
  const normalizedInitialLayout = (templateType === 'fnb' && (initialLayout === 'classic' || !initialLayout))
    ? 'fnb-theme-classic'
    : initialLayout;
  const [layoutVariant, setLayoutVariant] = useState(normalizedInitialLayout);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const handleClientChange = useCallback((updater: Partial<BusinessDemo> | ((prev: BusinessDemo) => BusinessDemo)) => {
    if (typeof updater === 'function') {
      setClient(prev => updater(prev));
    } else {
      setClient(prev => ({ ...prev, ...updater }));
    }
  }, []);

  // Re-render the correct demo client based on template type
  let demoComponent;
  if (templateType === 'fnb') {
    demoComponent = <FnbDemoClient client={client} themeVariant={layoutVariant} />;
  } else if (templateType === 'service') {
    demoComponent = <ServiceDemoClient client={client} />;
  } else if (templateType === 'grooming') {
    demoComponent = <GroomingDemoClient client={client} themeVariant={layoutVariant} />;
  } else {
    demoComponent = <RetailDemoClient client={client} themeVariant={layoutVariant} />;
  }

  return (
    <DynamicThemeProvider themeColor={client.themeColor}>
      {demoComponent}
      
      {/* Editor Controls for Owner */}
      <OwnerToolbar 
        onEditClick={() => setIsEditorOpen(true)} 
        onPublishClick={() => setIsCheckoutOpen(true)} 
      />
      
      <LiveEditorDrawer 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        client={client} 
        onChange={handleClientChange} 
        layoutVariant={layoutVariant}
        onLayoutChange={setLayoutVariant}
        templateType={templateType}
        slug={slug}
        onUpgradeClick={() => {
          setIsEditorOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Floating Segmented Bar khusus layar HP: [ ✏️ Edit Formulir | 👁️ Intip Hasil ] */}
      <MobileSegmentedControl 
        isEditorOpen={isEditorOpen} 
        onToggle={(open) => setIsEditorOpen(open)} 
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        slug={slug} 
        currentTier={client.package_tier}
        client={client}
      />

      {/* Floating Support/Help CTA */}
      <div className="fixed bottom-6 right-6 z-[90]">
        <a 
          href={`https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodeURIComponent(`Halo Tim Growfin, saya butuh bantuan terkait Live Editor website saya di: https://growfin.my.id/demo/${slug}`)}`}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3 bg-white p-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-105 transition-all duration-300 border border-gray-100"
        >
          <span className="hidden md:block max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap pl-2 text-sm font-bold text-gray-800">
            Butuh Bantuan?
          </span>
          <div className="w-10 h-10 bg-[#00b894] rounded-full flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
        </a>
      </div>
    </DynamicThemeProvider>
  );
}
