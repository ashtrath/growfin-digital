'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Sparkles, ExternalLink, Check, CheckCircle2, LayoutTemplate, Store, ArrowRight, Paintbrush } from 'lucide-react';
import Link from 'next/link';

interface Business {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  package_tier?: string;
  layout_id?: string;
  metadata?: any;
  draft_metadata?: any;
}

const COLOR_PRESETS = [
  { name: 'Emerald Fresh', hex: '#00b894', desc: 'Segar & Modern (F&B / Toko)' },
  { name: 'Sunset Warm', hex: '#e17055', desc: 'Hangat & Ramah (Cafe / Kuliner)' },
  { name: 'Royal Indigo', hex: '#6c5ce7', desc: 'Kreatif & Elegan (Grooming / Salon)' },
  { name: 'Ocean Blue', hex: '#0984e3', desc: 'Profesional & Kuat (Jasa / Klinik)' },
  { name: 'Bold Crimson', hex: '#d63031', desc: 'Dinamis & Berani (Retail / Otomotif)' },
  { name: 'Golden Luxury', hex: '#f39c12', desc: 'Mewah & Premium (Eksklusif)' },
  { name: 'Rose Glam', hex: '#e84393', desc: 'Cantik & Estetik (Spa / Skincare)' },
  { name: 'Dark Slate', hex: '#2d3436', desc: 'Maskulin & Minimalis (Barbershop)' },
];

const LAYOUT_VARIANTS = [
  {
    id: 'classic',
    title: 'Klasik Standar (Balanced)',
    desc: 'Tata letak rapi dan profesional dengan hierarki section yang seimbang untuk semua jenis usaha.',
    badge: 'Paling Populer',
  },
  {
    id: 'modern-card',
    title: 'Kartu Modern (Card Flow)',
    desc: 'Penonjolan visual dengan kartu rounded dan efek hover interaktif, sangat cocok untuk katalog foto.',
    badge: 'Visual Tinggi',
  },
  {
    id: 'minimalist',
    title: 'Minimalis Ringkas (Clean & Fast)',
    desc: 'Struktur ramping dan bersih yang memprioritaskan kecepatan akses menu dan tombol WhatsApp.',
    badge: 'Akses Cepat',
  },
];

export function ThemeClient({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(businesses[0]?.id || '');
  const currentBiz = businesses.find((b) => b.id === selectedId) || businesses[0];

  const meta = currentBiz?.draft_metadata || currentBiz?.metadata || {};
  const initialThemeColor = meta.themeColor || meta.theme_color || '#00b894';
  const initialLayout = currentBiz?.layout_id || 'classic';

  const [currentColor, setCurrentColor] = useState<string>(initialThemeColor);
  const [currentLayout, setCurrentLayout] = useState<string>(initialLayout);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!businesses || businesses.length === 0) {
    return (
      <div className="p-10 text-center bg-[#14141A] border border-[#262633] rounded-2xl">
        <Store className="w-12 h-12 text-[#262633] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Belum Ada Website Aktif</h3>
        <p className="text-[#8E8EA0] text-sm mb-6">
          Anda belum memiliki website bisnis. Buat website terlebih dahulu untuk mengatur tampilan & tema.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold rounded-xl transition-all"
        >
          Buat Website Sekarang
        </Link>
      </div>
    );
  }

  const handleSelectBusiness = (id: string) => {
    setSelectedId(id);
    const target = businesses.find((b) => b.id === id);
    const targetMeta = target?.draft_metadata || target?.metadata || {};
    setCurrentColor(targetMeta.themeColor || targetMeta.theme_color || '#00b894');
    setCurrentLayout(target?.layout_id || 'classic');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updatedMetadata = {
        ...meta,
        themeColor: currentColor,
        theme_color: currentColor,
      };

      const res = await fetch('/api/dashboard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBiz.id,
          layout_id: currentLayout,
          metadata: updatedMetadata,
          draft_metadata: updatedMetadata,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan tema.');
      }

      setSuccessMsg('Tampilan tema & tata letak website berhasil diperbarui!');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan tema.');
    } finally {
      setIsSaving(false);
    }
  };

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'growfin.my.id';
  const liveUrl = currentBiz.custom_domain
    ? `https://${currentBiz.custom_domain}`
    : `https://${rootDomain}/${currentBiz.slug}`;

  return (
    <div className="space-y-6">
      {/* Business Switcher if multiple */}
      {businesses.length > 1 && (
        <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#8E8EA0] font-semibold uppercase tracking-wider">Pilih Website Bisnis:</p>
            <p className="text-sm font-bold text-white mt-0.5">{currentBiz.name}</p>
          </div>
          <select
            value={currentBiz.id}
            onChange={(e) => handleSelectBusiness(e.target.value)}
            className="w-full sm:w-auto bg-[#0B0B0E] border border-[#262633] text-white text-sm rounded-xl px-4 py-2.5 focus:border-[#00b894] focus:outline-none"
          >
            {businesses.map((biz) => (
              <option key={biz.id} value={biz.id}>
                {biz.name} ({biz.slug})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Success / Error Message */}
      {successMsg && (
        <div className="p-4 bg-[#00b894]/10 border border-[#00b894]/30 rounded-xl text-[#00b894] text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {successMsg}
          </span>
          <a href={liveUrl} target="_blank" rel="noreferrer" className="font-bold underline flex items-center gap-1 shrink-0">
            Lihat Hasil <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Card 1: Visual Live Editor CTA */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#14141A] to-[#1c1c24] border border-[#00b894]/30 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00b894]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00b894]/15 border border-[#00b894]/30 text-[#00b894] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Rekomendasi Cara Desain
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">Visual Live Customizer 🎨</h3>
            <p className="text-sm text-[#8E8EA0] leading-relaxed">
              Buka website Anda dalam mode interaktif! Anda dapat mengganti foto banner, warna aksen, susunan produk, teks judul, hingga ulasan secara instan dengan pratinjau real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              href={`/demo/${currentBiz.slug}`}
              className="px-6 py-3.5 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              Buka Visual Live Editor <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3.5 border border-[#262633] hover:bg-[#262633] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm"
            >
              Lihat Web <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Card 2: Quick Theme Color & Layout Form */}
      <form onSubmit={handleSaveTheme} className="space-y-6">
        {/* Color Palette Section */}
        <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-[#00b894]" /> Warna Utama Brand (Accent Color)
            </h3>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: currentColor }}
              />
              <span className="font-mono text-xs font-bold text-slate-300">{currentColor.toUpperCase()}</span>
            </div>
          </div>

          <p className="text-sm text-[#8E8EA0]">
            Pilih dari palet warna pilihan yang telah teruji ramah konversi, atau tentukan kode warna HEX unik brand Anda:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {COLOR_PRESETS.map((preset) => {
              const isSelected = currentColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setCurrentColor(preset.hex)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-[#00b894] bg-[#00b894]/10 ring-1 ring-[#00b894]'
                      : 'border-[#262633] bg-[#0B0B0E] hover:border-[#8E8EA0]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-7 h-7 rounded-lg border border-white/20 shadow-md shrink-0"
                      style={{ backgroundColor: preset.hex }}
                    />
                    {isSelected && <Check className="w-4 h-4 text-[#00b894]" />}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isSelected ? 'text-[#00b894]' : 'text-white'}`}>
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-[#8E8EA0] mt-0.5">{preset.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Hex Input */}
          <div className="pt-3 border-t border-[#262633] flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs text-[#8E8EA0] font-semibold">Warna Custom (HEX):</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-[#262633] bg-transparent cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                placeholder="#00b894"
                className="bg-[#0B0B0E] border border-[#262633] rounded-lg px-3 py-1.5 font-mono text-xs text-white uppercase focus:border-[#00b894] focus:outline-none w-28"
              />
            </div>
          </div>
        </div>

        {/* Layout Variant Section */}
        <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-[#00b894]" /> Pilihan Tata Letak (Layout Variant)
          </h3>
          <p className="text-sm text-[#8E8EA0]">
            Sesuaikan struktur tampilan website dengan gaya bisnis Anda:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {LAYOUT_VARIANTS.map((layout) => {
              const isSelected = currentLayout === layout.id;
              return (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => setCurrentLayout(layout.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-[#00b894] bg-[#00b894]/10 ring-1 ring-[#00b894]'
                      : 'border-[#262633] bg-[#0B0B0E] hover:border-[#8E8EA0]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#262633] text-[#8E8EA0]">
                        {layout.badge}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#00b894]" />}
                    </div>
                    <h4 className={`text-sm font-bold ${isSelected ? 'text-[#00b894]' : 'text-white'}`}>
                      {layout.title}
                    </h4>
                    <p className="text-xs text-[#8E8EA0] mt-1.5 leading-relaxed">{layout.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm"
          >
            {isSaving ? 'Menyimpan Perubahan...' : 'Simpan Tampilan & Tema'}
          </button>
        </div>
      </form>
    </div>
  );
}
