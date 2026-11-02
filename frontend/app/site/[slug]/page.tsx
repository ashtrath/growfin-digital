import { BusinessDemo } from '@/lib/types';
import { PackageTier, PACKAGE_LIMITS } from '@/lib/site-config';
import { ServiceDemoClient } from '@/components/demo/service-demo-client';
import { FnbDemoClient } from '@/components/demo/fnb-demo-client';
import { RetailDemoClient } from '@/components/demo/retail-demo-client';
import { GroomingDemoClient } from '@/components/demo/grooming-demo-client';
import { supabase } from '@/lib/supabase';
import { resolveTemplateType } from '@/lib/template-resolver';
import { DynamicThemeProvider } from '@/components/demo/DynamicThemeProvider';
import { ExpiredSiteScreen } from '@/components/demo/ExpiredSiteScreen';
import { GlobalClickTracker } from '@/components/demo/GlobalClickTracker';
import { GrowfinWatermark } from '@/components/demo/GrowfinWatermark';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface SitePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

function getLocalBusinessType(category: string = '', templateType: string = ''): string {
  const cat = category.toLowerCase();
  if (templateType === 'fnb') {
    if (cat.includes('cafe') || cat.includes('kopi')) return 'CafeOrCoffeeShop';
    if (cat.includes('bakery') || cat.includes('roti') || cat.includes('kue')) return 'Bakery';
    return 'Restaurant';
  }
  if (templateType === 'grooming') {
    if (cat.includes('barber')) return 'BarberShop';
    return 'BeautySalon';
  }
  if (templateType === 'retail') {
    return 'Store';
  }
  if (templateType === 'service') {
    if (cat.includes('klinik') || cat.includes('medis') || cat.includes('dental') || cat.includes('gigi')) {
      return 'MedicalBusiness';
    }
    return 'ProfessionalService';
  }
  return 'LocalBusiness';
}

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { slug } = await params;

  // Fetch from Supabase (by slug or custom_domain, including locked/expired status)
  const { data: dbData } = await supabase
    .from('business_demos')
    .select('name, slug, custom_domain, metadata, status, site_active_until')
    .or(`slug.eq.${slug},custom_domain.eq.${slug}`)
    .single();

  if (!dbData) return { title: 'Site Not Found' };

  const now = new Date();
  const isLockedOrExpired = dbData.status === 'locked' || (!!dbData.site_active_until && new Date(dbData.site_active_until) < now);
  const clientName = dbData.metadata?.name || dbData.name;

  if (isLockedOrExpired) {
    return {
      title: `${clientName} — Masa Pembaruan Layanan | By Growfin`,
      description: `Website ${clientName} sedang dalam masa pembaruan layanan.`,
    };
  }

  const description = dbData.metadata?.tagline || dbData.metadata?.description || `Website resmi ${clientName}. Temukan informasi, produk, promo, dan layanan terbaik kami di sini.`;
  
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'growfin.my.id';
  const siteUrl = dbData.custom_domain
    ? `https://${dbData.custom_domain}`
    : `https://${rootDomain}/${dbData.slug || slug}`;

  // WhatsApp & OpenGraph image resolution (Priority: logoUrl -> heroImage -> fallback default)
  const rawImage = dbData.metadata?.logoUrl || dbData.metadata?.heroImage || '/image/landing/growfin-logo-icon.png';
  const imageUrl = rawImage.startsWith('http')
    ? rawImage
    : `https://${rootDomain}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

  return {
    title: `${clientName} | By Growfin`,
    description,
    metadataBase: new URL(`https://${rootDomain}`),
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: `${clientName} - Website Resmi`,
      description,
      url: siteUrl,
      siteName: clientName,
      locale: 'id_ID',
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${clientName} Preview Thumbnail`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${clientName} - Website Resmi`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SitePage({ params }: SitePageProps) {
  const { slug } = await params;

  // 1. Fetch from Supabase (by slug or custom_domain, without throwing away locked status)
  const { data: dbData } = await supabase
    .from('business_demos')
    .select('*')
    .or(`slug.eq.${slug},custom_domain.eq.${slug}`)
    .single();

  if (!dbData) {
    notFound();
  }

  // 2. Penegakan Kedaluwarsa & Kunci Website Publik
  const now = new Date();
  const isLocked = dbData.status === 'locked';
  const isExpired = !!dbData.site_active_until && new Date(dbData.site_active_until) < now;

  // Jika locked atau expired, jangan render katalog toko! Render ExpiredSiteScreen yang sopan untuk pengunjung
  if (isLocked || isExpired) {
    return <ExpiredSiteScreen businessName={dbData.metadata?.name || dbData.name} />;
  }

  // Jika status bukan published atau tidak memiliki metadata yang valid, tampilkan 404
  if (dbData.status !== 'published' || !dbData.metadata) {
    notFound();
  }

  // 3. Determine Template Type using Resolver
  const templateType = resolveTemplateType(dbData.category);

  // 4. Map DB metadata to genericClient (Strictly use metadata, NEVER draft_metadata)
  const metadataSource = dbData.metadata;

  // Gating Aturan: Jangan biarkan user yang membeli paket instan menikmati fitur Pro hanya karena datanya sudah terlanjur tersimpan di JSONB metadata saat masa free_trial!
  const activeTier: PackageTier = (dbData.package_tier as PackageTier) || 'instan';
  const tierLimits = PACKAGE_LIMITS[activeTier] || PACKAGE_LIMITS['instan'];

  // Jika paket tidak mendukung promoFeatures, matikan promoLabel, discountPercentage & flashSaleEnd di live site
  const sanitizedMarketing = tierLimits.promoFeatures
    ? metadataSource?.marketing
    : { usps: metadataSource?.marketing?.usps || [] };

  const sanitizedUiLabels = tierLimits.promoFeatures
    ? metadataSource?.uiLabels
    : undefined;

  const genericClient: BusinessDemo = {
    ...metadataSource,
    marketing: sanitizedMarketing,
    uiLabels: sanitizedUiLabels,
    name: metadataSource?.name || dbData.name,
    category: dbData.category,
    city: dbData.city,
    phone: metadataSource?.phone || dbData.phone || '',
    googleMapsUrl: metadataSource?.googleMapsUrl || dbData.maps_url,
    waNumber: (metadataSource?.waNumber || metadataSource?.phone || dbData.phone || '').replace(/\D/g, ''),
    rating: dbData.metadata.rating,
    reviewCount: dbData.metadata.reviewCount,
    address: dbData.metadata.address,
    hours: typeof dbData.metadata.hours === 'string'
      ? dbData.metadata.hours
      : (dbData.metadata.hours?.text || "Buka Setiap Hari"),
    openTime: dbData.metadata.openTime || dbData.metadata.hours?.openTime,
    closeTime: dbData.metadata.closeTime || dbData.metadata.hours?.closeTime,
    tagline: dbData.metadata.tagline,
    iconEmoji: dbData.metadata.iconEmoji || '🏢',
    practitioners: dbData.metadata.practitioners || (dbData.metadata.doctor ? [
      {
        id: '1',
        name: dbData.metadata.doctor.name || 'Admin',
        role: dbData.metadata.doctor.role || 'Staff',
        avatarEmoji: dbData.metadata.doctor.avatarEmoji || '👨‍💼',
        avatarUrl: dbData.metadata.doctor.avatarUrl,
      }
    ] : [
      { id: '1', name: 'Admin', role: 'Staff', avatarEmoji: '👨‍💼' }
    ]),
    categories: dbData.metadata.categories || [],
    menu: dbData.metadata.menu || dbData.metadata.products || [],
    reviews: dbData.metadata.reviews || [],
    heroImage: dbData.metadata.heroImage,
    logoUrl: metadataSource?.logoUrl || metadataSource?.logo_url,
    instagramFeed: dbData.metadata.instagramFeed,
    fbType: dbData.metadata.fbType,
    themeColor: dbData.metadata.themeColor || dbData.metadata.theme_color,
    package_tier: dbData.package_tier,
  };

  // 5. Construct Schema.org JSON-LD for Google Local SEO
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'growfin.my.id';
  const siteUrl = dbData.custom_domain
    ? `https://${dbData.custom_domain}`
    : `https://${rootDomain}/${dbData.slug || slug}`;

  const rawImage = dbData.metadata?.logoUrl || dbData.metadata?.heroImage || '/image/landing/growfin-logo-icon.png';
  const ogImageUrl = rawImage.startsWith('http')
    ? rawImage
    : `https://${rootDomain}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

  const logoUrl = dbData.metadata?.logoUrl
    ? (dbData.metadata.logoUrl.startsWith('http')
        ? dbData.metadata.logoUrl
        : `https://${rootDomain}${dbData.metadata.logoUrl.startsWith('/') ? '' : '/'}${dbData.metadata.logoUrl}`)
    : ogImageUrl;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': getLocalBusinessType(dbData.category, templateType),
    name: genericClient.name,
    description: genericClient.tagline || (dbData.metadata as any)?.description || `Website resmi ${genericClient.name}`,
    url: siteUrl,
    telephone: genericClient.phone || genericClient.waNumber || undefined,
    image: ogImageUrl,
    logo: logoUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: genericClient.address || `${genericClient.city}, Indonesia`,
      addressLocality: genericClient.city || 'Indonesia',
      addressCountry: 'ID',
    },
    priceRange: '$$',
    ...(genericClient.googleMapsUrl ? { hasMap: genericClient.googleMapsUrl } : {}),
    ...(genericClient.rating && genericClient.reviewCount ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: genericClient.rating,
        reviewCount: genericClient.reviewCount,
      },
    } : {}),
    ...(genericClient.openTime && genericClient.closeTime ? {
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          opens: genericClient.openTime,
          closes: genericClient.closeTime,
        },
      ],
    } : {}),
  };

  // Route to the appropriate template directly (No Editor Wrapper)
  const layoutVariant = dbData.layout_id === 'modern-default' ? 'classic' : dbData.layout_id;

  let demoComponent;
  if (templateType === 'fnb') {
    demoComponent = <FnbDemoClient client={genericClient} themeVariant={layoutVariant} />;
  } else if (templateType === 'service') {
    demoComponent = <ServiceDemoClient client={genericClient} />;
  } else if (templateType === 'grooming') {
    demoComponent = <GroomingDemoClient client={genericClient} themeVariant={layoutVariant} />;
  } else {
    demoComponent = <RetailDemoClient client={genericClient} themeVariant={layoutVariant} />;
  }

  return (
    <DynamicThemeProvider themeColor={genericClient.themeColor}>
      {/* Schema.org LocalBusiness JSON-LD for Google Local SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GlobalClickTracker businessId={dbData.id} />
      {demoComponent}
      {!tierLimits.removeBranding && <GrowfinWatermark />}
    </DynamicThemeProvider>
  );
}
