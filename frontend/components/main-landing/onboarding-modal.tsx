'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { trackMetaEvent } from '@/lib/fpixel';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'generate' | 'find'>('generate');
  const [isMapsMode, setIsMapsMode] = useState(true);
  const [step, setStep] = useState<'form' | 'loading' | 'existing' | 'confirmation' | 'emailSent'>('form');
  const [realName, setRealName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Restaurant',
    phone: '',
    email: '',
    city: '',
    mapsUrl: '',
    businessDescription: '',
    force: false,
    turnstileToken: ''
  });

  const [findPhone, setFindPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMapsNotFound, setIsMapsNotFound] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('growfin_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('growfin_device_id', id);
    }
    setDeviceId(id);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === 'loading') {
        const message = 'Proses AI sedang berjalan! Jika Anda memuat ulang (refresh) halaman, pembuatan website Anda bisa gagal atau terhenti.';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  if (!isOpen) return null;

  const validatePhone = (phone: string) => {
    if (!phone) return 'Nomor WhatsApp tidak boleh kosong.';
    if (!/^\d+$/.test(phone)) return 'Nomor WhatsApp hanya boleh berisi angka.';
    if (!phone.startsWith('628')) return 'Format salah. Harus diawali dengan 628 (contoh: 62812...). Jangan gunakan 08...';
    if (phone.length > 15) return 'Maksimal 15 digit angka.';
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'generate' | 'find') => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('0')) {
      val = '62' + val.substring(1);
    }
    if (val.length <= 15) {
      if (field === 'generate') {
        setFormData({ ...formData, phone: val });
      } else {
        setFindPhone(val);
      }
    }
  };

  const handleSubmitGenerate = async (e?: React.FormEvent, isForce = false) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      setErrorMsg(phoneError);
      return;
    }

    if (isMapsMode && !formData.mapsUrl) {
      setErrorMsg('Link Google Maps wajib diisi. Jika bisnis Anda belum terdaftar di Maps, silakan pilih tab "Belum di Maps" di atas.');
      return;
    }

    if (!isMapsMode && !formData.businessDescription) {
      setErrorMsg('Deskripsi bisnis wajib diisi agar AI bisa membuatkan website yang sesuai.');
      return;
    }

    if (!formData.turnstileToken) {
      setErrorMsg('Mohon centang verifikasi keamanan (CAPTCHA).');
      return;
    }

    setStep('loading');
    setIsMapsNotFound(false);

    try {
      const payload = { ...formData, force: isForce, isMapsMode, deviceId };
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 404 || data.notFoundOnMaps) {
        setIsMapsNotFound(true);
        setErrorMsg(data.error || 'Bisnis tidak ditemukan di Google Maps.');
        setStep('form');
        return;
      }

      if (data.needsConfirmation) {
        setRealName(data.realName);
        setStep('confirmation');
        return;
      }

      if (data.success && data.slug) {
        trackMetaEvent('Lead', {
          content_name: formData.name,
          content_category: formData.category,
          city: formData.city,
        });
        setStep('emailSent');
      } else {
        setErrorMsg(data.error || 'Gagal membuat template.');
        setStep('form');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Terjadi kesalahan jaringan.');
      setStep('form');
    }
  };

  const handleSubmitFind = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const phoneError = validatePhone(findPhone);
    if (phoneError) {
      setErrorMsg(phoneError);
      return;
    }

    setStep('loading');

    try {
      const res = await fetch('/api/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: findPhone }),
      });

      const data = await res.json();

      if (data.success && data.slug) {
        setStep('existing');
        setTimeout(() => {
          router.push(`/demo/${data.slug}`);
          onClose();
          setStep('form');
        }, 2000);
      } else {
        setErrorMsg(data.error || 'Nomor tidak ditemukan.');
        setStep('form');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Terjadi kesalahan jaringan.');
      setStep('form');
    }
  };

  const categoryGroups = [
    {
      label: 'F&B (Makanan & Minuman)',
      options: [
        { value: 'Restaurant', label: 'Restoran' },
        { value: 'Cafe & Coffee Shop', label: 'Kafe & Kedai Kopi' },
        { value: 'Bakery & Dessert Shop', label: 'Toko Roti & Makanan Penutup' },
        { value: 'Fast Food Restaurant', label: 'Restoran Cepat Saji' },
        { value: 'Bubble Tea Shop / Juice Shop', label: 'Toko Boba / Jus' },
      ]
    },
    {
      label: 'Grooming (Kecantikan & Perawatan Pribadi)',
      options: [
        { value: 'Beauty Salon', label: 'Salon Kecantikan' },
        { value: 'Hair Salon & Barbershop', label: 'Salon Rambut & Barbershop' },
        { value: 'Nail Salon', label: 'Salon Kuku' },
        { value: 'Day Spa & Massage Spa', label: 'Spa & Pijat' },
        { value: 'Skin Care Clinic', label: 'Klinik Perawatan Kulit' },
        { value: 'Make-up Artist', label: 'Penata Rias (MUA)' }
      ]
    },
    {
      label: 'Retail (Pusat Belanja / Toko Fisik)',
      options: [
        { value: 'Supermarket & Grocery Store', label: 'Supermarket & Toko Kelontong' },
        { value: 'Convenience Store', label: 'Minimarket' },
        { value: 'Clothing Store & Boutique', label: 'Toko Pakaian & Butik' },
        { value: 'Electronics Store', label: 'Toko Elektronik' },
        { value: 'Shoe Store', label: 'Toko Sepatu' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => {
        if (step === 'form') {
          onClose();
          setTimeout(() => { setStep('form'); setMode('generate'); setErrorMsg(''); }, 300);
        }
      }}></div>
      <div className="relative bg-white rounded-[2rem] p-8 max-w-md w-full border-4 border-emerald-soft shadow-2xl animate-pop-up z-10 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-soft blob-shape opacity-50"></div>

        {step === 'form' && (
          <button
            onClick={() => {
              onClose();
              setTimeout(() => { setStep('form'); setMode('generate'); setErrorMsg(''); }, 300);
            }}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="relative z-10">

          {step === 'form' && mode === 'generate' && (
            <>
              <h3 className="text-2xl font-extrabold text-dark mb-1">Ceritakan Bisnis Kamu</h3>
              {/* <p className="text-sm text-slate-500 mb-4 font-medium">Isi detail singkat ini, dan sistem kami akan meracik website untuk Anda!</p> */}

              {/* Tabs Ada di Maps vs Belum di Maps */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setIsMapsMode(true); setIsMapsNotFound(false); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isMapsMode ? 'bg-white text-emerald shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Bisnis Tersedia di Maps
                </button>
                <button
                  type="button"
                  onClick={() => { setIsMapsMode(false); setIsMapsNotFound(false); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isMapsMode ? 'bg-white text-emerald shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Belum ada di Maps
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-xl text-center font-bold">
                  {errorMsg}
                </div>
              )}

              {isMapsNotFound && isMapsMode && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald/20 rounded-2xl text-center">
                  <p className="text-xs text-slate-600 mb-2 font-medium">
                    Bisnis belum ada di Maps? Tenang, sistem kami tetap bisa membuatkan website untuk bisnis Anda!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMapsMode(false);
                      setIsMapsNotFound(false);
                      setErrorMsg('');
                    }}
                    className="w-full py-2.5 px-3 bg-emerald hover:bg-emerald-light text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>Bisnis belum ada di Maps? Isi Deskripsi Manual ➔</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmitGenerate} className="space-y-4">
                <div>
                  <input type="text" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-emerald focus:bg-white transition-all" placeholder="Nama Bisnis" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <select className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 text-slate-600 focus:outline-none focus:border-emerald focus:bg-white transition-all" required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="" disabled>Kategori Bisnis</option>
                    {categoryGroups.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <input type="tel" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-emerald focus:bg-white transition-all" placeholder="Nomor WhatsApp (Cth: 628...)" required value={formData.phone} onChange={(e) => handlePhoneChange(e, 'generate')} />
                </div>
                <div>
                  <input type="email" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-emerald focus:bg-white transition-all" placeholder="Alamat Email (Untuk kirim hasil website)" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <input type="text" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-emerald focus:bg-white transition-all" placeholder="Kota" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                {isMapsMode ? (
                  <div>
                    <input type="url" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-emerald focus:bg-white transition-all" placeholder="Link Google Maps (Wajib)" required value={formData.mapsUrl} onChange={(e) => setFormData({ ...formData, mapsUrl: e.target.value })} />
                  </div>
                ) : (
                  <div>
                    <textarea
                      className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-emerald focus:bg-white transition-all resize-none"
                      placeholder="Deskripsikan bisnis kamu secara singkat (Misal: Kedai kopi kekinian dengan area outdoor yang luas...)"
                      rows={3}
                      required
                      value={formData.businessDescription}
                      onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                    />
                  </div>
                )}
                <div className="flex justify-center pt-2">
                  <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} onSuccess={(token) => setFormData({ ...formData, turnstileToken: token })} />
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-4 bg-emerald hover:bg-emerald-light text-white font-extrabold rounded-2xl shadow-[0_10px_20px_rgba(0,184,148,0.2)] hover:shadow-[0_15px_25px_rgba(0,184,148,0.3)] transition-all active:scale-95">
                    Buat Website Sekarang
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => { setMode('find'); setErrorMsg(''); }} className="text-slate-400 hover:text-emerald text-xs font-bold transition-colors">
                  Sudah pernah generate? Masuk di sini
                </button>
              </div>
            </>
          )}

          {step === 'form' && mode === 'find' && (
            <>
              <h3 className="text-2xl font-extrabold text-dark mb-1">Cari Template Anda</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Masukkan nomor WA yang Anda daftarkan sebelumnya.</p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-xl text-center font-bold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmitFind} className="space-y-4">
                <div>
                  <input type="tel" className="w-full px-5 py-3.5 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-emerald focus:bg-white transition-all" placeholder="Nomor WhatsApp" required value={findPhone} onChange={(e) => handlePhoneChange(e, 'find')} />
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-4 bg-emerald hover:bg-emerald-light text-white font-extrabold rounded-2xl shadow-[0_10px_20px_rgba(0,184,148,0.2)] hover:shadow-[0_15px_25px_rgba(0,184,148,0.3)] transition-all active:scale-95">
                    Buka Template Saya
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => { setMode('generate'); setErrorMsg(''); }} className="text-slate-400 hover:text-emerald text-xs font-bold transition-colors">
                  ← Kembali ke pendaftaran baru
                </button>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-emerald/20 border-4 border-emerald-soft rounded-full animate-ping"></div>
                <div className="w-full h-full bg-emerald-soft border-4 border-emerald rounded-full flex items-center justify-center relative z-10">
                  <div className="w-4 h-4 bg-emerald rounded-full animate-bounce"></div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-dark">Membangun Website Anda...</h3>
                <p className="text-sm text-slate-500 font-medium">Sistem sedang meracik tampilan terbaik untuk bisnis Anda. hasilnya akan dikirim ke {formData.email}</p>
              </div>
              <div className="w-full max-w-xs bg-slate-100 rounded-full h-2.5 mt-4 overflow-hidden relative">
                <div className="bg-emerald h-2.5 rounded-full animate-[progress_3s_ease-in-out_infinite]" style={{ width: '100%', transformOrigin: 'left' }}></div>
              </div>
            </div>
          )}

          {step === 'existing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="w-20 h-20 bg-blue-50 border-2 border-blue-500 rounded-full flex items-center justify-center relative z-10 shadow-lg">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-dark">Data Ditemukan!</h3>
                <p className="text-sm text-slate-500 font-medium">Mengarahkan Anda ke Live Preview sekarang...</p>
              </div>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="w-20 h-20 bg-yellow-50 border-2 border-yellow-500 rounded-full flex items-center justify-center relative z-10 shadow-lg">
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-extrabold text-dark">Konfirmasi Data Bisnis</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Berdasarkan Link Google Maps, nama bisnis Anda terdeteksi sebagai: <br />
                  <span className="text-lg font-bold text-yellow-600 block mt-2 mb-1">{realName}</span>
                  (Berbeda dengan yang Anda input: <span className="font-semibold text-dark">{formData.name}</span>).
                </p>
                <p className="text-sm text-slate-500 font-medium">Apakah Anda ingin melanjutkan dengan nama asli dari Google Maps?</p>
              </div>

              <div className="flex w-full gap-3 pt-4">
                <button
                  onClick={() => { setStep('form'); }}
                  className="flex-1 py-3 px-4 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-colors"
                >
                  Ubah Data
                </button>
                <button
                  onClick={() => handleSubmitGenerate(undefined, true)}
                  className="flex-1 py-3 px-4 bg-yellow-500 hover:bg-yellow-400 text-white text-sm font-extrabold rounded-xl transition-all shadow-[0_5px_15px_rgba(234,179,8,0.3)] active:scale-95"
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          )}

          {step === 'emailSent' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-500 rounded-full flex items-center justify-center relative z-10 shadow-lg">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-extrabold text-dark">Cek Email Anda!</h3>
                <p className="text-sm text-slate-500 font-medium">Link website berhasil dibuat dan telah dikirim ke <span className="font-bold text-dark">{formData.email}</span>.</p>
                <p className="text-xs text-slate-400">Silakan periksa kotak masuk atau folder spam Anda.</p>
              </div>
              <button onClick={() => { onClose(); setTimeout(() => { setStep('form'); setMode('generate'); setFormData({ ...formData, turnstileToken: '' }); }, 300); }} className="w-full py-4 bg-emerald hover:bg-emerald-light text-white font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 mt-4">
                Selesai
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
