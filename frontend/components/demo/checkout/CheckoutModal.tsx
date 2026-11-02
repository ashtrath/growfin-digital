'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Lock, CheckCircle2, ChevronRight, Mail, Key } from 'lucide-react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { siteConfig } from '@/lib/site-config';
import { trackMetaEvent } from '@/lib/fpixel';
import { BusinessDemo } from '@/lib/types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  currentTier?: string;
  isRenewal?: boolean;
  client?: BusinessDemo;
}

const TIER_RANK: Record<string, number> = {
  'free_trial': 0,
  'instan': 1,
  'pro-basic': 2,
  'pro-advanced': 3,
  'enterprise': 4
};

export function CheckoutModal({ isOpen, onClose, slug, currentTier, isRenewal, client }: CheckoutModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<'auth' | 'payment' | 'success'>('auth');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Auth States
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Payment States
  const [hasPromoConfigured, setHasPromoConfigured] = useState(false);
  const currentRank = TIER_RANK[currentTier || 'free_trial'] || 0;

  const packages = siteConfig.pricing
    .filter((p) => p.id !== 'enterprise') // Enterprise is custom/project-based
    .map((p) => ({
      id: p.id,
      name: p.titleId,
      price: p.priceNumeric,
      desc: p.descId,
      isDisabled: isRenewal ? false : TIER_RANK[p.id] <= currentRank
    }));
  
  // Set default selected package to the first available upgrade or current tier if renewal
  const availableUpgrade = isRenewal
    ? (packages.find(p => p.id === currentTier) || packages.find(p => !p.isDisabled) || packages[0])
    : (packages.find(p => !p.isDisabled) || packages[packages.length - 1]);
  const [selectedPackage, setSelectedPackage] = useState(availableUpgrade);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      setIsCheckingSession(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setStep('payment');
      } else {
        setStep('auth');
      }
      setIsCheckingSession(false);
    };
    if (isOpen) {
      if (availableUpgrade) {
        setSelectedPackage(availableUpgrade);
      }
      checkSession();

      // Cek apakah user sudah mengisi promo saat masa trial
      const promoLabel = client?.marketing?.promoLabel;
      const discountPercentage = client?.marketing?.discountPercentage;
      if (promoLabel || (discountPercentage !== undefined && discountPercentage > 0)) {
        setHasPromoConfigured(true);
      } else if (slug) {
        supabase
          .from('business_demos')
          .select('draft_metadata, metadata')
          .eq('slug', slug)
          .single()
          .then(({ data }) => {
            const m = data?.draft_metadata?.marketing || data?.metadata?.marketing;
            if (m?.promoLabel || (m?.discountPercentage !== undefined && m.discountPercentage > 0)) {
              setHasPromoConfigured(true);
            }
          });
      }

      trackMetaEvent('InitiateCheckout', {
        content_name: (availableUpgrade || selectedPackage)?.name || 'Paket Website Growfin',
        content_category: 'Website Subscription',
        content_ids: (availableUpgrade || selectedPackage) ? [(availableUpgrade || selectedPackage).id] : [],
        value: (availableUpgrade || selectedPackage)?.price || 0,
        currency: 'IDR'
      });
    }
  }, [isOpen]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      // Create user or Sign in
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      let finalUserId = null;

      if (error) {
        // If user exists, try to sign in instead
        if (error.message.includes('already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (signInError) throw signInError;
          finalUserId = signInData.user.id;
        } else {
          throw error;
        }
      } else if (data.user) {
        finalUserId = data.user.id;
      }

      if (finalUserId) {
        setUserId(finalUserId);
        
        // Execute Intermediate Claim (Silent)
        try {
          await fetch('/api/demo/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, user_id: finalUserId })
          });
        } catch (e) {
          console.error("Failed to execute intermediate claim:", e);
        }
      }

      // Automatically move to payment step
      setStep('payment');

    } catch (err: any) {
      setAuthError(err.message || 'Terjadi kesalahan saat otentikasi.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsPaymentLoading(true);
    try {
      // Get midtrans token from backend
      const txType = isRenewal 
        ? 'renewal' 
        : (currentTier && currentTier !== 'free_trial' ? 'upgrade' : 'activation');

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slug, 
          amount: selectedPackage.price,
          package_tier: selectedPackage.id,
          user_id: userId,
          transaction_type: txType
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendapatkan token pembayaran');

      // Trigger Midtrans Snap
      // @ts-ignore
      window.snap.pay(data.token, {
        onSuccess: async function (result: any) {
          // Track Pixel Purchase event
          trackMetaEvent('Purchase', {
            value: selectedPackage.price,
            currency: 'IDR',
            content_name: selectedPackage.name,
            content_ids: [selectedPackage.id],
            order_id: result.order_id,
          });

          // Update status in backend or database directly
          await fetch('/api/checkout/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              order_id: result.order_id, 
              slug,
              payment_method: result.payment_type,
              payment_gateway_ref: result.transaction_id
            })
          });
          router.refresh();
          setStep('success');
        },
        onPending: function (result: any) {
          alert('Menunggu pembayaran Anda...');
        },
        onError: function (result: any) {
          alert('Pembayaran gagal! Silakan coba lagi.');
        },
        onClose: function () {
          alert('Anda menutup pop-up pembayaran sebelum menyelesaikannya.');
        }
      });

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  if (!isOpen) return null;

  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
  const snapUrl = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  return (
    <>
      {/* Load Midtrans Snap.js */}
      <Script
        src={snapUrl}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />

      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
        <div className="bg-[#14141A] border border-[#262633] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#262633]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#00b894]" />
              {step === 'auth' ? (isRenewal ? 'Masuk ke Akun Anda' : 'Amankan Website Anda') : step === 'payment' ? 'Selesaikan Pembayaran' : 'Selamat!'}
            </h2>
            {step !== 'success' && (
              <button onClick={onClose} className="text-[#8E8EA0] hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Stepper */}
          {step !== 'success' && (
            <div className="flex p-6 bg-[#0B0B0E] border-b border-[#262633]">
              <div className={`flex items-center text-sm font-semibold ${step === 'auth' ? 'text-[#00b894]' : 'text-[#8E8EA0]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 border-2 ${step === 'auth' ? 'border-[#00b894]' : 'border-[#262633]'}`}>1</div>
                {isRenewal ? 'Masuk Akun' : 'Buat Akun'}
              </div>
              <div className="mx-4 text-[#262633]">
                <ChevronRight className="w-5 h-5" />
              </div>
              <div className={`flex items-center text-sm font-semibold ${step === 'payment' ? 'text-[#00b894]' : 'text-[#8E8EA0]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 border-2 ${step === 'payment' ? 'border-[#00b894]' : 'border-[#262633]'}`}>2</div>
                Pembayaran
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {isCheckingSession ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-[#262633] border-t-[#00b894] rounded-full animate-spin"></div>
              </div>
            ) : step === 'auth' ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <p className="text-[#8E8EA0] text-sm mb-6">
                  {isRenewal
                    ? 'Masuk atau daftarkan akun Anda untuk mengaktifkan kembali website ini. Akun ini digunakan untuk mengakses Dashboard Admin.'
                    : 'Buat akun untuk mengklaim kepemilikan website ini. Nantinya akun ini digunakan untuk masuk ke Dashboard Admin.'}
                </p>
                {authError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
                    {authError}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8EA0]" />
                    <input 
                      type="email" 
                      placeholder="Email Anda"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl pl-11 pr-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8EA0]" />
                    <input 
                      type="password" 
                      placeholder="Password (Min. 6 karakter)"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl pl-11 pr-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full mt-6 py-3 bg-white hover:bg-gray-200 text-black font-bold rounded-xl transition-colors"
                >
                  {isAuthLoading ? 'Memproses...' : 'Lanjutkan ke Pembayaran'}
                </button>
              </form>
            ) : step === 'payment' ? (
              <div className="space-y-6">
                
                {/* Package Selection */}
                <div className="grid gap-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      disabled={pkg.isDisabled}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                        pkg.isDisabled 
                          ? 'border-[#262633] bg-[#0B0B0E] opacity-50 cursor-not-allowed'
                          : selectedPackage.id === pkg.id 
                            ? 'border-[#00b894] bg-[#00b894]/10 ring-1 ring-[#00b894]' 
                            : 'border-[#262633] bg-[#14141A] hover:border-[#8E8EA0]'
                      }`}
                    >
                      <div>
                        <div className={`font-bold ${pkg.isDisabled ? 'text-[#8E8EA0]' : selectedPackage.id === pkg.id ? 'text-[#00b894]' : 'text-white'}`}>
                          {pkg.name} {pkg.isDisabled ? '(Paket Saat Ini/Lebih Rendah)' : (isRenewal && pkg.id === currentTier ? '(Paket Saat Ini)' : '')}
                        </div>
                        <div className="text-xs text-[#8E8EA0] mt-1">{pkg.desc}</div>
                      </div>
                      <div className={`font-black text-lg ${selectedPackage.id === pkg.id ? 'text-[#00b894]' : 'text-white'}`}>
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Peringatan Downgrade Fitur jika memilih Paket Instan padahal sudah isi Promo saat trial */}
                {hasPromoConfigured && selectedPackage.id === 'instan' && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                    <span className="text-base shrink-0 leading-none">ℹ️</span>
                    <p className="leading-relaxed">
                      <strong className="text-amber-200">Catatan:</strong> Paket Instan tidak mencakup fitur Flash Sale/Promo Badge & Domain .com. Pilih <strong>Pro Basic</strong> agar fitur promo yang sudah Anda atur tetap tampil di website publik.
                    </p>
                  </div>
                )}

                <div className="bg-[#0B0B0E] border border-[#262633] rounded-xl p-5">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-sm text-[#8E8EA0]">
                      <CheckCircle2 className="w-4 h-4 text-[#00b894] mr-2" /> Akses Dashboard Seumur Hidup
                    </li>
                    <li className="flex items-center text-sm text-[#8E8EA0]">
                      <CheckCircle2 className="w-4 h-4 text-[#00b894] mr-2" /> Hapus Label Demo
                    </li>
                    <li className="flex items-center text-sm text-[#8E8EA0]">
                      <CheckCircle2 className="w-4 h-4 text-[#00b894] mr-2" /> Dukungan Domain Kustom (.com/.id)
                    </li>
                  </ul>
                  <div className="pt-4 border-t border-[#262633] flex justify-between items-center">
                    <span className="text-white font-medium">Total Pembayaran</span>
                    <span className="text-2xl font-black text-[#00b894]">Rp {selectedPackage.price.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={isPaymentLoading}
                  className="w-full py-4 bg-[#00b894] hover:bg-[#00e0b8] text-[#14141A] font-black rounded-xl transition-colors shadow-[0_0_20px_rgba(0,184,148,0.3)] text-lg"
                >
                  {isPaymentLoading ? 'Memuat Midtrans...' : 'Bayar Sekarang'}
                </button>
              </div>
            ) : step === 'success' ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#00b894]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-[#00b894]" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">Pembayaran Berhasil!</h3>
                <p className="text-[#8E8EA0] mb-8">
                  Website Anda kini resmi berstatus aktif dan siap dikelola 100% melalui Dashboard.
                </p>
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-4 bg-white hover:bg-gray-200 text-[#14141A] font-bold rounded-xl transition-colors"
                >
                  Masuk ke Dashboard Saya
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
