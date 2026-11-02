import React from 'react';
import Link from 'next/link';
import { Store, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

interface ExpiredSiteScreenProps {
  businessName?: string;
}

export function ExpiredSiteScreen({ businessName }: ExpiredSiteScreenProps) {
  const displayTitle = businessName || 'Bisnis Ini';
  const supportWa = siteConfig.contact.whatsappNumber;

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col items-center justify-center p-4 selection:bg-[#00b894] selection:text-black">
      {/* Background radial glow */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(0, 184, 148, 0.15) 0%, transparent 60%)'
        }}
      />

      <div className="w-full max-w-md bg-[#14141A] border border-[#262633] p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 text-center">
        {/* Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-[#00b894]/10 border border-[#00b894]/30 flex items-center justify-center mx-auto mb-6 text-[#00b894] shadow-inner">
          <RefreshCw className="w-8 h-8 text-[#00b894]" />
        </div>

        {/* Business Title Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#262633]/60 border border-white/5 text-xs text-gray-300 font-semibold mb-3">
          <Store className="w-3.5 h-3.5 text-[#00b894]" />
          <span>{displayTitle}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white mb-4 leading-snug">
          Masa Pembaruan Layanan
        </h1>

        {/* Polite Visitor Message */}
        <p className="text-slate-300 text-sm leading-relaxed mb-8">
          Website <strong className="text-white font-extrabold">{displayTitle}</strong> Sedang Dalam Masa Pembaruan Layanan. Jika Anda adalah pemilik bisnis ini, silakan masuk ke Dashboard Growfin untuk memperpanjang masa aktif.
        </p>

        {/* Action Button */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-5 bg-[#00b894] hover:bg-[#00e0b8] text-black font-black rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
          >
            <span>Masuk ke Dashboard Growfin</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href={`https://wa.me/${supportWa}?text=${encodeURIComponent(`Halo Growfin, saya ingin bertanya tentang perpanjangan website ${displayTitle}`)}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 bg-transparent hover:bg-[#1C1C26] text-gray-400 hover:text-white font-bold rounded-xl transition-all border border-[#262633] flex items-center justify-center gap-2 text-xs"
          >
            <span>Bantuan Layanan (WhatsApp)</span>
          </a>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-[#262633] flex items-center justify-center gap-1.5 text-[11px] text-[#8E8EA0]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00b894]" />
          <span>Growfin Digital Platform UMKM</span>
        </div>
      </div>
    </div>
  );
}
