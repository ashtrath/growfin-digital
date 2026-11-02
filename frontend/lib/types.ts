import { PackageTier } from './site-config';

export interface MenuItemVariant {
  name: string;
  options: string[];
}

export interface MenuItemAddon {
  name: string;
  price: number;
}

export interface MenuItem {
  id: number;
  name: string;
  desc: string;
  price: string;
  tag?: string;
  category?: string;
  imageUrl?: string;
  imagePublicId?: string;
  duration?: number; // In minutes
  variants?: MenuItemVariant[];
  addons?: MenuItemAddon[];
}

export interface PractitionerInfo {
  id: string;
  name: string;
  role: string;
  licenseNumber?: string;
  avatarEmoji?: string;
  avatarUrl?: string;
  schedule?: string;
}

export interface ReviewInfo {
  authorName: string;
  rating: number;
  text: string;
  time?: string;
}

export interface LookbookItem {
  id: string;
  name: string;
  imageUrl: string;
  imagePublicId?: string;
  desc?: string;
}

export interface BusinessDemo {
  name: string;
  category: string;
  city: string;
  rating: number;
  reviewCount: number;
  phone: string;
  address: string;
  googleMapsUrl: string;
  hours: string;
  isOpen?: boolean;
  openTime?: string; // Format "HH:MM", e.g., "08:00"
  closeTime?: string; // Format "HH:MM", e.g., "22:00"
  waNumber: string; // format internasional tanpa tanda +, contoh: 628123456789
  tagline: string;
  iconEmoji: string;
  practitioners?: PractitionerInfo[];
  categories: string[];
  menu: MenuItem[];
  reviews?: ReviewInfo[];
  lookbook?: LookbookItem[];
  heroImage?: string;
  heroImagePublicId?: string;
  logoUrl?: string;
  logoImagePublicId?: string;
  instagramFeed?: string[]; // Array of image URLs for social proof
  fbType?: 'DINE_IN' | 'QUICK_SERVICE' | 'PRE_ORDER'; // Determines order form fields
  themeColor?: string; // Hex color string, e.g. '#10b981'
  package_tier?: PackageTier; // Track subscription level
  heroSecondaryAction?: 'whatsapp' | 'cart' | 'gallery';
  galleryTitle?: string;
  galleryDescription?: string;
  menuTitle?: string;
  menuDescription?: string;
  reviewsTitle?: string;
  reviewsDescription?: string;
  sectionOrder?: string[];
  hiddenSections?: string[];
  marketing?: {
    promoLabel?: string;
    discountPercentage?: number;
    flashSaleEnd?: string;
    usps?: { title: string; desc: string }[];
  };
  uiLabels?: {
    buyButtonText?: string;
    viewAllButtonText?: string;
    lookbookButtonText?: string;
  };
  userEmail?: string;
  socialMedia?: {
    instagram?: { url: string; active: boolean };
    tiktok?: { url: string; active: boolean };
    facebook?: { url: string; active: boolean };
  };
  faqs?: {
    question: string;
    answer: string;
  }[];
  domainRequest?: {
    requestedDomain: string;       // contoh: "kopisenja.com"
    alternativeDomain?: string;    // contoh: "kopisenjaid.com"
    whatsappContact?: string;
    status: 'pending' | 'processing' | 'active' | 'rejected';
    requestedAt: string;
    adminNotes?: string;
  };
  doctor?: any;
  admin?: any;
  metadata?: any;
}
