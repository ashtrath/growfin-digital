'use client';

import React, { useState } from 'react';
import { X, Globe, Gift, CheckCircle2, AlertCircle, Loader2, Send, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DomainRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onSuccess?: (requestedDomain: string) => void;
}

export function DomainRequestModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  onSuccess,
}: DomainRequestModalProps) {
  const router = useRouter();
  const [requestedDomain, setRequestedDomain] = useState('');
  const [alternativeDomain, setAlternativeDomain] = useState('');
  const [whatsappContact, setWhatsappContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMain = requestedDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    if (!cleanMain) {
      setError('Harap masukkan nama domain pilihan utama Anda.');
      return;
    }

    if (!cleanMain.includes('.')) {
      setError('Format domain harus menyertakan ekstensi (contoh: tokokamu.com).');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/dashboard/domain-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          requested_domain: cleanMain,
          alternative_domain: alternativeDomain.trim(),
          whatsapp_contact: whatsappContact.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengirim pengajuan domain.');
      }

      setIsSuccess(true);
      if (onSuccess) {
        onSuccess(cleanMain);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat mengirim pengajuan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isSuccess) {
      router.refresh();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#14141A] border border-[#262633] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Header Bar */}
        <div className="p-6 border-b border-[#262633] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-emerald-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Gift className="w-5 h-5 text-[#00b894]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Klaim Domain Gratis <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-[#8E8EA0]">{businessName}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#1A1A24] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[#00b894] mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-white">Permintaan Berhasil Dikirim!</h4>
                <p className="text-xs text-[#8E8EA0] max-w-sm mx-auto leading-relaxed">
                  Permintaan domain <span className="font-mono text-[#00b894] font-bold">{requestedDomain}</span> telah masuk ke antrean Super Admin.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0B0B0E] border border-[#262633] text-left text-xs text-slate-300 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#00b894]" /> Apa langkah selanjutnya?
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[#8E8EA0] text-[11px] leading-relaxed">
                  <li>Tim admin akan mengecek ketersediaan domain dan melakukan pendaftaran resmi.</li>
                  <li>DNS dan sertifikat SSL akan disetup secara otomatis (terima beres).</li>
                  <li>Website Anda akan aktif maksimal dalam <strong>1x24 jam kerja</strong>.</li>
                </ol>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold rounded-xl transition-all shadow-md active:scale-95 text-sm"
              >
                Selesai & Kembali ke Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
                🎉 Paket Anda sudah mencakup <strong>Domain Kustom (.com) Resmi</strong> selama 1 tahun tanpa biaya tambahan. Anda cukup mengajukan nama yang diinginkan, tim Growfin yang akan setup sampai live!
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Field 1: Domain Pilihan Utama */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Nama Domain Pilihan Utama <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-gray-500">Contoh: kopisenja.com</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="namabisnis.com"
                    value={requestedDomain}
                    onChange={(e) => setRequestedDomain(e.target.value)}
                    className="w-full bg-[#0B0B0E] border border-[#262633] focus:border-[#00b894] text-white px-4 py-2.5 rounded-xl font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Field 2: Domain Cadangan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Domain Cadangan (Opsional)</span>
                  <span className="text-[10px] text-gray-500">Jika pilihan 1 sudah diambil orang</span>
                </label>
                <input
                  type="text"
                  placeholder="namabisnisid.com atau namabisnis.co.id"
                  value={alternativeDomain}
                  onChange={(e) => setAlternativeDomain(e.target.value)}
                  className="w-full bg-[#0B0B0E] border border-[#262633] focus:border-[#00b894] text-white px-4 py-2.5 rounded-xl font-mono text-sm focus:outline-none"
                />
              </div>

              {/* Field 3: WhatsApp Contact */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Nomor WhatsApp Aktif <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-gray-500">Untuk konfirmasi cepat tim admin</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={whatsappContact}
                  onChange={(e) => setWhatsappContact(e.target.value)}
                  className="w-full bg-[#0B0B0E] border border-[#262633] focus:border-[#00b894] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 border border-[#262633] hover:bg-[#262633] text-gray-300 font-bold rounded-xl transition-all text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] py-3 bg-[#00b894] hover:bg-[#00e0b8] text-black font-black rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Pengajuan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Pengajuan Domain 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
