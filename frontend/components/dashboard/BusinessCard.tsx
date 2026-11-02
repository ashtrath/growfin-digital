'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Store, 
  ExternalLink, 
  ArrowRight, 
  CalendarDays, 
  MessageCircle, 
  Eye, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Edit3,
  Gift,
  Globe
} from 'lucide-react';
import { ShareWebsiteButton } from '@/components/dashboard/ShareWebsiteModal';
import { CheckoutModal } from '@/components/demo/checkout/CheckoutModal';
import { DomainRequestModal } from '@/components/dashboard/DomainRequestModal';
import { PACKAGE_LIMITS, PackageTier } from '@/lib/site-config';

export interface BusinessCardData {
  id: string;
  name: string;
  slug: string;
  category: string;
  city?: string | null;
  status: string;
  package_tier?: string | null;
  created_at: string;
  metadata?: any;
  draft_metadata?: any;
  fomo_expires_at?: string | null;
  site_active_until?: string | null;
  domain_active_until?: string | null;
  custom_domain?: string | null;
}

interface BusinessCardProps {
  business: BusinessCardData;
  views: number;
  waClicks: number;
  rootDomain: string;
}

export function BusinessCard({ business, views, waClicks, rootDomain }: BusinessCardProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // 1. Ambil metadata visual & domain request
  const meta = business.draft_metadata || business.metadata || {};
  const themeColor = meta.themeColor || meta.theme_color || '#00b894';
  const heroImage = meta.heroImage || meta.logoUrl || null;

  // Domain Request state
  const currentTier = (business.package_tier as PackageTier) || 'free_trial';
  const limits = PACKAGE_LIMITS[currentTier] || PACKAGE_LIMITS['free_trial'];
  const supportsCustomDomain = limits.customDomain === true;

  const domainRequest = meta.domainRequest || business.metadata?.domainRequest || business.draft_metadata?.domainRequest;
  const hasCustomDomain = !!business.custom_domain;
  const isDomainPending = !hasCustomDomain && domainRequest?.status === 'pending';

  // 2. Logika Masa Aktif & Terkunci (Locked Status)
  const now = new Date();
  const isExplicitLocked = business.status === 'locked';
  const isFomoExpired = business.status === 'draft' && !!business.fomo_expires_at && now > new Date(business.fomo_expires_at);
  const isSubscriptionExpired = business.status === 'published' && !!business.site_active_until && now > new Date(business.site_active_until);
  const isLocked = isExplicitLocked || isFomoExpired || isSubscriptionExpired;

  // 3. Hitung rasio konversi leads
  const conversionRate = views > 0 ? ((waClicks / views) * 100).toFixed(1) : null;

  // 4. Resolusi URL Website Publik
  const publicWebUrl = business.custom_domain 
    ? `https://${business.custom_domain}` 
    : `https://${rootDomain}/${business.slug}`;

  // 5. Format Label Paket
  const tierLabels: Record<string, { label: string; color: string }> = {
    'free_trial': { label: 'Trial Demo', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    'instan': { label: 'Instan (299rb)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    'pro-basic': { label: 'Pro Basic', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    'pro-advanced': { label: 'Pro Advanced', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  };

  const currentTierInfo = tierLabels[business.package_tier || 'free_trial'] || {
    label: business.package_tier || 'Belum ada paket',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };

  return (
    <>
      <div className={`bg-[#14141A] border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isLocked 
          ? 'border-red-500/30 hover:border-red-500/50' 
          : 'border-[#262633] hover:border-[#38384a]'
      }`}>
        {/* COVER PREVIEW HEADER */}
        <div className="h-44 relative overflow-hidden bg-gradient-to-br from-[#1C1C26] to-[#121218] group">
          {heroImage && !imgError ? (
            <img 
              src={heroImage} 
              alt={business.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
              <div 
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, ${themeColor} 0%, transparent 70%)`
                }}
              />
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-white/10"
                style={{ backgroundColor: `${themeColor}20` }}
              >
                <Store className="w-7 h-7" style={{ color: themeColor }} />
              </div>
              <p className="text-xs font-semibold text-gray-400 truncate max-w-[200px]">
                {business.category}
              </p>
            </div>
          )}

          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#14141A] via-transparent to-black/60 pointer-events-none" />

          {/* Floating Badges Header: Tema & Status */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-auto">
            {/* Indikator Warna Tema */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs shadow-lg transition-transform hover:scale-105"
              title={`Warna Tema Website: ${themeColor}`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20 shadow-sm shrink-0" 
                style={{ backgroundColor: themeColor }} 
              />
              <span className="font-mono text-[11px] font-semibold text-gray-200 uppercase">
                {themeColor}
              </span>
            </div>

            {/* Status Badge */}
            {isLocked ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/90 text-white flex items-center gap-1 shadow-md animate-pulse">
                <Lock className="w-3 h-3" /> Terkunci
              </span>
            ) : business.status === 'published' || business.status === 'paid' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#00b894]/90 text-white flex items-center gap-1 shadow-md">
                <CheckCircle2 className="w-3 h-3" /> Aktif
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-white flex items-center gap-1 shadow-md">
                <Clock className="w-3 h-3" /> Trial Aktif
              </span>
            )}
          </div>

          {/* Accent Line Warna Tema */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1 z-10" 
            style={{ 
              background: `linear-gradient(90deg, ${themeColor}, transparent)` 
            }} 
          />

          {/* OVERLAY GEMBOK & TOMBOL BUKA KUNCI JIKA TERKUNCI */}
          {isLocked && (
            <div className="absolute inset-0 bg-[#0B0B0E]/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-2 shadow-lg">
                <Lock className="w-5 h-5 animate-bounce" />
              </div>
              <p className="text-white font-extrabold text-sm mb-0.5">
                {isFomoExpired 
                  ? 'Masa Trial Habis' 
                  : isSubscriptionExpired 
                    ? 'Masa Langganan Habis' 
                    : 'Website Terkunci'}
              </p>
              <p className="text-[#8E8EA0] text-[11px] mb-3 max-w-[210px] line-clamp-1">
                {isFomoExpired 
                  ? 'Aktifkan paket untuk terima order' 
                  : isSubscriptionExpired 
                    ? 'Perpanjang untuk onlinekan web' 
                    : 'Buka kunci website sekarang'}
              </p>
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="px-3.5 py-1.5 bg-[#00b894] hover:bg-[#00e0b8] text-white text-xs font-black rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Buka Kunci Sekarang
              </button>
            </div>
          )}
        </div>

        {/* CARD BODY CONTENT */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="text-base sm:text-lg font-black text-white group-hover:text-[#00b894] transition-colors line-clamp-1">
                {business.name}
              </h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-xs text-[#8E8EA0] font-medium">
                {business.category} {business.city ? `• ${business.city}` : ''}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentTierInfo.color}`}>
                {currentTierInfo.label}
              </span>
            </div>

            {/* Quick Analytics & Date Badges */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#1A1A24] border border-[#262633]/60 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8E8EA0] font-semibold">Pengunjung</p>
                  <p className="text-xs font-black text-white">{views}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-[#00b894]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8E8EA0] font-semibold">Leads WA</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-black text-white">{waClicks}</p>
                    {conversionRate !== null && (
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded">
                        {conversionRate}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Managed Domain Status / Claim Button (Khusus Tier dengan customDomain === true) */}
            {supportsCustomDomain && (
              <div className="mb-2.5">
                {hasCustomDomain ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Globe className="w-3.5 h-3.5" /> Domain Aktif:
                      </span>
                      {business.domain_active_until && (
                        <span className="text-[10px] text-emerald-300/80">
                          s/d {new Date(business.domain_active_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <a
                      href={`https://${business.custom_domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white font-mono text-[11px] hover:underline truncate block"
                    >
                      https://{business.custom_domain}
                    </a>
                  </div>
                ) : isDomainPending ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px] mb-1">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Permintaan Domain Diproses
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Permintaan domain (<span className="font-mono text-amber-300 font-bold">{domainRequest.requestedDomain}</span>) sedang diproses admin (Maks. 1x24 Jam).
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDomainModalOpen(true)}
                    className="w-full py-2 px-3 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 hover:from-purple-500/30 hover:to-emerald-500/30 border border-purple-500/30 hover:border-purple-400/50 text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5 text-purple-400" />
                    <span>🎁 Klaim Gratis Domain (.com) Anda</span>
                  </button>
                )}
              </div>
            )}

            <p className="text-[11px] text-[#8E8EA0] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-500" /> Dibuat {new Date(business.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-3 border-t border-[#262633] space-y-2.5">
            {isLocked && (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-2 bg-gradient-to-r from-red-500/20 to-amber-500/20 hover:from-red-500/30 hover:to-amber-500/30 border border-red-500/40 text-red-300 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Status Terkunci • Buka Kunci Sekarang</span>
              </button>
            )}

            {/* Tombol Utama: Edit Website / Kelola Menu (Langsung ke Live Editor Mode Owner) */}
            <Link
              href={`/demo/${business.slug}`}
              className="w-full py-2.5 px-3.5 bg-white hover:bg-gray-100 text-black font-extrabold rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] text-center"
              title="Buka Live Editor terpusat (edit tema, warna, produk, menu, foto hero, promo, dan urutan seksi)"
            >
              <Edit3 className="w-3.5 h-3.5 text-black" />
              <span>Edit Website / Kelola Menu</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-500" />
            </Link>

            {/* Tombol Sekunder: Bagikan Web & Lihat Web */}
            <div className="flex items-center gap-2">
              <div className="shrink-0">
                <ShareWebsiteButton business={business} />
              </div>

              <Link
                href={publicWebUrl}
                target="_blank"
                className="flex-1 py-2 px-3 border border-[#262633] hover:border-gray-500 text-white font-bold rounded-lg hover:bg-[#262633] transition-colors text-xs flex items-center justify-center gap-1.5 text-center"
                title="Lihat website versi publik"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Lihat Web</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CHECKOUT MODAL UNTUK BUKA KUNCI */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        slug={business.slug}
        currentTier={business.package_tier || 'free_trial'}
        isRenewal={isSubscriptionExpired}
        client={meta}
      />

      {/* DOMAIN REQUEST MODAL */}
      <DomainRequestModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
      />
    </>
  );
}
