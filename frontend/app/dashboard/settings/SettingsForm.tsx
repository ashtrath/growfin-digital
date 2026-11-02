'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Save, Store, MapPin, Phone, ExternalLink, Image as ImageIcon, Utensils } from 'lucide-react';
import Link from 'next/link';
import { CloudinaryUploader } from '@/components/dashboard/CloudinaryUploader';
import { MenuManager } from '@/components/dashboard/MenuManager';

export function SettingsForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Extract from draft_metadata or fall back to main column
  const meta = initialData.draft_metadata || initialData.metadata || {};
  
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    phone: initialData.phone || '',
    city: initialData.city || '',
    maps_url: initialData.maps_url || '',
    description: meta.description || '',
    heroTitle: meta.heroTitle || '',
    heroSubtitle: meta.heroSubtitle || '',
    address: meta.address || '',
    heroImage: meta.heroImage || '',
    heroImagePublicId: meta.heroImagePublicId || '',
    logoUrl: meta.logoUrl || meta.logo_url || '',
    logoImagePublicId: meta.logoImagePublicId || '',
    menu: meta.menu || meta.products || [],
  });

  const handleHeroImageUpload = async (url: string, publicId: string) => {
    if (formData.heroImagePublicId) {
      try {
        await supabase.functions.invoke('delete-cloudinary-image', {
          body: { public_id: formData.heroImagePublicId }
        });
      } catch (err) {
        console.error("Failed to delete old image:", err);
      }
    }
    setFormData(prev => ({ ...prev, heroImage: url, heroImagePublicId: publicId }));
  };

  const handleLogoUpload = async (url: string, publicId: string) => {
    if (formData.logoImagePublicId) {
      try {
        await supabase.functions.invoke('delete-cloudinary-image', {
          body: { public_id: formData.logoImagePublicId }
        });
      } catch (err) {
        console.error("Failed to delete old logo:", err);
      }
    }
    setFormData(prev => ({ ...prev, logoUrl: url, logoImagePublicId: publicId }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // Update both column and metadata
      const updatedMetadata = {
        ...meta,
        logoUrl: formData.logoUrl,
        logoImagePublicId: formData.logoImagePublicId,
        description: formData.description,
        heroTitle: formData.heroTitle,
        heroSubtitle: formData.heroSubtitle,
        address: formData.address,
        heroImage: formData.heroImage,
        heroImagePublicId: formData.heroImagePublicId,
        menu: formData.menu,
      };

      const response = await fetch('/api/dashboard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initialData.id,
          name: formData.name,
          phone: formData.phone,
          city: formData.city,
          maps_url: formData.maps_url,
          metadata: updatedMetadata,
          draft_metadata: updatedMetadata
        })
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Gagal menyimpan perubahan.');
      }
      
      setSuccessMsg('Perubahan berhasil disimpan! Website Anda kini sudah diperbarui.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
      {successMsg && (
        <div className="p-4 bg-[#00b894]/10 border border-[#00b894]/30 rounded-xl text-[#00b894] text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <Link href={`/demo/${initialData.slug}`} target="_blank" className="font-bold underline flex items-center gap-1">
            Lihat Website <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
      
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Basic Info Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#262633] pb-2">
          <Store className="w-5 h-5 text-[#00b894]" /> Informasi Dasar
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8E8EA0] uppercase">Nama Bisnis</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8E8EA0] uppercase">Nomor WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8EA0]" />
              <input 
                type="text" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8E8EA0] uppercase">Deskripsi Singkat Bisnis</label>
          <textarea 
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors resize-none"
            placeholder="Ceritakan sedikit tentang bisnis Anda..."
          />
        </div>

        {/* Logo Bisnis (Opsional untuk WhatsApp & OpenGraph) */}
        <div className="space-y-3 pt-3 border-t border-[#262633]">
          <label className="text-xs font-bold text-[#8E8EA0] uppercase flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span>Logo Bisnis (Opsional)</span>
            <span className="text-[11px] text-[#00b894] font-normal normal-case">
              - Digunakan untuk thumbnail WhatsApp, OpenGraph & Google Local
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <CloudinaryUploader 
              currentImageUrl={formData.logoUrl}
              onUploadSuccess={handleLogoUpload}
              label="Unggah File Logo"
            />
            <div className="space-y-2">
              <label className="text-xs text-[#8E8EA0]">Atau Masukkan URL Logo Langsung:</label>
              <input 
                type="url"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors text-sm font-mono"
              />
              <p className="text-xs text-[#8E8EA0] leading-relaxed">
                Rekomendasi rasio 1:1 atau 1200x630px. Jika belum diisi, foto banner utama (Hero Image) otomatis dijadikan gambar thumbnail pratinjau.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Website Display Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#262633] pb-2 mt-8">
          <Store className="w-5 h-5 text-[#00b894]" /> Tampilan Halaman Depan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8E8EA0] uppercase">Judul Utama (Hero Title)</label>
            <input 
              type="text" 
              name="heroTitle"
              value={formData.heroTitle}
              onChange={handleChange}
              className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
              placeholder="Contoh: Kopi Terbaik di Kota"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8E8EA0] uppercase">Sub-judul (Hero Subtitle)</label>
            <input 
              type="text" 
              name="heroSubtitle"
              value={formData.heroSubtitle}
              onChange={handleChange}
              className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
              placeholder="Contoh: Diseduh dengan cinta setiap hari."
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#262633]">
           <CloudinaryUploader 
             currentImageUrl={formData.heroImage}
             onUploadSuccess={handleHeroImageUpload}
             label="Hero Image (Banner Utama)"
           />
        </div>
      </section>

      {/* Menu / Catalog Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#262633] pb-2 mt-8">
          <Utensils className="w-5 h-5 text-[#00b894]" /> Manajemen Menu & Katalog
        </h3>
        
        <MenuManager 
          initialMenu={formData.menu}
          onChange={(newMenu) => setFormData(prev => ({ ...prev, menu: newMenu }))}
          packageTier={initialData.package_tier || 'free_trial'}
        />
      </section>

      {/* Location Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#262633] pb-2 mt-8">
          <MapPin className="w-5 h-5 text-[#00b894]" /> Lokasi & Alamat
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8E8EA0] uppercase">Kota</label>
            <input 
              type="text" 
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8E8EA0] uppercase">Link Google Maps</label>
            <input 
              type="text" 
              name="maps_url"
              value={formData.maps_url}
              onChange={handleChange}
              className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors"
              placeholder="https://g.page/..."
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8E8EA0] uppercase">Alamat Lengkap</label>
          <textarea 
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={2}
            className="w-full bg-[#0B0B0E] border border-[#262633] rounded-xl px-4 py-3 text-white focus:border-[#00b894] focus:outline-none transition-colors resize-none"
          />
        </div>
      </section>

      <div className="pt-4 border-t border-[#262633] flex justify-end">
        <button 
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-[#00b894] hover:bg-[#00e0b8] text-[#14141A] font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(0,184,148,0.2)]"
        >
          {isSaving ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan Perubahan</>}
        </button>
      </div>
    </form>
  );
}
