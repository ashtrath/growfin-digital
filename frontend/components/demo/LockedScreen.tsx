'use client';

import { Clock, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CheckoutModal } from './checkout/CheckoutModal';

// Ini nih yang bikin error tadi bestie, interface-nya wajib ada! 🎀
interface LockedScreenProps {
  type: 'fomo_expired' | 'subscription_expired';
  businessName: string;
  isClaimed: boolean;
  slug: string;
  currentTier?: string;
}

export function LockedScreen({ type, businessName, isClaimed, slug, currentTier }: LockedScreenProps) {
  const isFomo = type === 'fomo_expired';
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 text-center text-slate-800">
        <div className="max-w-md bg-white border-4 border-[#ddf4e8] p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">

          {/* Ornamen blob kecil biar gemes ☁️ */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#ddf4e8] rounded-full opacity-50"></div>

          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10 border border-red-100">
            {isFomo ? <Clock className="w-8 h-8 text-red-400" /> : <Lock className="w-8 h-8 text-red-400" />}
          </div>

          <h1 className="text-2xl font-extrabold text-[#1e293b] mb-3 relative z-10">
            {isFomo ? 'Waktu Preview Habis!' : 'Oops, Web kamu lagi offline!'}
          </h1>

          <p className="text-slate-500 mb-8 leading-relaxed font-medium relative z-10">
            {!isClaimed
              ? `Waktu lihat-lihat gratis buat web ${businessName} udah abis nih. Yuk amankan dan klaim website ini sekarang!`
              : isFomo
                ? `Waktu lihat-lihat gratis buat web ${businessName} udah abis nih. Onlinekan lagi yuukk!`
                : `Masa aktif langganan buat ${businessName} udah abis nih. No worries, yukk perpanjang biar web nya online lagi.`}
          </p>

          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="block w-full bg-[#00b894] hover:bg-[#00e0b8] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all relative z-10 active:scale-95"
          >
            {!isClaimed ? 'Klaim Website Ini 🚀' : 'Onlinekan Sekarang 🚀'}
          </button>

          {isClaimed && (
            <div className="mt-4 relative z-10">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        slug={slug} 
        currentTier={currentTier}
        isRenewal={isClaimed}
      />
    </>
  );
}