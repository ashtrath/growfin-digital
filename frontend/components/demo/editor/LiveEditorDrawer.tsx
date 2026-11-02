'use client';

import { X, Save, Check, Eye, EyeOff, Image as ImageIcon, Type, Plus, Trash2, Edit2, LayoutTemplate, Rocket, Palette, Store, LayoutDashboard, ShoppingBag, HeartHandshake, ChevronRight, ArrowLeft, Clock, MapPin, Phone, Mail, MessageSquare, Star, Users, HelpCircle, Tag, Settings, Link, Percent, Calendar } from 'lucide-react';
import { BusinessDemo, MenuItem } from '@/lib/types';
import { useState, useEffect, useRef } from 'react';
import { PackageTier, PACKAGE_LIMITS } from '@/lib/site-config';
import { CloudinaryUploader } from '@/components/dashboard/CloudinaryUploader';
import { createClient } from '@/utils/supabase/client';

interface LiveEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: BusinessDemo;
  onChange: (updater: BusinessDemo | ((prev: BusinessDemo) => BusinessDemo)) => void;
  layoutVariant: string;
  onLayoutChange: (newLayout: string) => void;
  templateType: 'fnb' | 'service' | 'retail' | 'grooming';
  slug: string;
  onUpgradeClick: () => void;
}

type CategoryId = 'desain' | 'profil' | 'hero' | 'katalog' | 'lookbook' | 'sosial';

const CATEGORIES = [
  { id: 'desain', label: 'Tampilan', icon: Palette, color: 'text-fuchsia-500', bg: 'bg-fuchsia-100', desc: 'Atur warna, tema & tombol biar makin pas' },
  { id: 'profil', label: 'Profil Usaha', icon: Store, color: 'text-blue-500', bg: 'bg-blue-100', desc: 'Nama, alamat, jam buka, & sosmed' },
  { id: 'hero', label: 'Banner Utama', icon: LayoutDashboard, color: 'text-emerald-500', bg: 'bg-emerald-100', desc: 'Banner depan biar pelanggan langsung nengok' },
  { id: 'katalog', label: 'Katalog & Menu', icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-100', desc: 'Pajang produk atau layanan terbaikmu' },
  { id: 'lookbook', label: 'Galeri Foto', icon: ImageIcon, color: 'text-indigo-500', bg: 'bg-indigo-100', desc: 'Pamerin suasana atau hasil karya kamu' },
  { id: 'sosial', label: 'Trust Center', icon: HeartHandshake, color: 'text-rose-500', bg: 'bg-rose-100', desc: 'Ulasan, FAQ, & Keunggulan toko' },
] as const;

export function LiveEditorDrawer({
  isOpen,
  onClose,
  client,
  onChange,
  layoutVariant,
  onLayoutChange,
  templateType,
  slug,
  onUpgradeClick
}: LiveEditorDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDirty, setIsDirty] = useState(false);

  // States for Menu Editor Form
  const [editingMenuIdx, setEditingMenuIdx] = useState<number | null>(null);
  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({});
  const [menuFormError, setMenuFormError] = useState<string | null>(null);
  const [pendingImageToDelete, setPendingImageToDelete] = useState<string | null>(null);
  const [tempUploadedPublicIds, setTempUploadedPublicIds] = useState<string[]>([]);

  // Refs for Tracking Changes & Preventing Stale Closures
  const isInitialMount = useRef(true);
  const lastSavedPayloadRef = useRef<string>(JSON.stringify({ client, layoutVariant }));
  const latestClientRef = useRef(client);
  const latestLayoutRef = useRef(layoutVariant);

  useEffect(() => {
    latestClientRef.current = client;
    latestLayoutRef.current = layoutVariant;
  }, [client, layoutVariant]);

  // 1. Debounced Auto-Save (2.5 Detik)
  useEffect(() => {
    // Abaikan auto-save pada inisialisasi awal render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentPayload = JSON.stringify({ client, layoutVariant });
    if (currentPayload === lastSavedPayloadRef.current) {
      return;
    }

    setIsDirty(true);
    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/demo/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            clientData: latestClientRef.current,
            layout_id: latestLayoutRef.current,
            publish: false
          })
        });

        if (!res.ok) throw new Error('Auto-save failed');

        lastSavedPayloadRef.current = JSON.stringify({
          client: latestClientRef.current,
          layoutVariant: latestLayoutRef.current
        });
        setIsDirty(false);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save error:', err);
        setSaveStatus('error');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [client, layoutVariant, slug]);

  // 2. beforeunload Protection saat ada perubahan data belum tersimpan
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isMenuFormDirty = !!(editingMenuIdx !== null || menuForm.name?.trim() || menuForm.price?.trim());
      if (isDirty || isMenuFormDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, editingMenuIdx, menuForm.name, menuForm.price]);

  const supabase = createClient();

  const currentTier: PackageTier = (client.package_tier || 'free_trial') as PackageTier;
  const limits = PACKAGE_LIMITS[currentTier] || PACKAGE_LIMITS['free_trial'];
  const isTrial = currentTier === 'free_trial';
  const tierLimits = limits;
  const isFreeTrial = isTrial;
  const canEditPromo = limits.promoFeatures;

  const deleteCloudinaryImage = async (publicId: string | null | undefined) => {
    if (!publicId) return;
    try {
      await supabase.functions.invoke('delete-cloudinary-image', {
        body: { public_id: publicId }
      });
    } catch (e) {
      console.error('Failed to delete Cloudinary image:', publicId, e);
    }
  };

  // Functional state handlers to prevent stale closure bugs
  const handleFieldChange = <K extends keyof BusinessDemo>(field: K, value: BusinessDemo[K]) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  const handleMultipleFieldsChange = (updates: Partial<BusinessDemo>) => {
    onChange((prev) => ({ ...prev, ...updates }));
  };

  const handleChange = (field: keyof BusinessDemo, value: any) => {
    handleFieldChange(field, value);
  };

  const normalizedLayoutVariant = (templateType === 'fnb' && (layoutVariant === 'classic' || !layoutVariant))
    ? 'fnb-theme-classic'
    : layoutVariant;

  const getAvailableThemes = () => {
    if (templateType === 'fnb') {
      return [
        { id: 'fnb-theme-classic', label: 'Classic' },
        { id: 'fnb-theme-modern', label: 'Modern' },
        { id: 'fnb-theme-premium', label: 'Premium' },
        { id: 'fnb-theme-artisan', label: 'Artisan' },
        { id: 'fnb-theme-elegant', label: 'Elegant' },
        { id: 'fnb-theme-bold', label: 'Bold' },
        { id: 'fnb-theme-vibrant', label: 'Vibrant' }
      ];
    } else if (templateType === 'grooming') {
      if (client.category.toLowerCase().includes('barber') || client.category.toLowerCase().includes('pangkas') || client.category.toLowerCase().includes('cukur')) {
        return [
          { id: 'grooming-barbershop-default', label: 'Barbershop Vintage' },
          { id: 'grooming-barbershop-light', label: 'Salon Chic' }
        ];
      }
      if (client.category.toLowerCase().includes('nail') || client.category.toLowerCase().includes('manicure') || client.category.toLowerCase().includes('pedicure')) {
        return [
          { id: 'grooming-nailspa-default', label: 'Aesthetic Nail Studio' }
        ];
      }
      return [
        { id: 'grooming-beautynspa-default', label: 'Beauty Minimalist' },
        { id: 'grooming-beautynspa-lumiere', label: 'Beauty Lumiere' },
        { id: 'grooming-beautynspa-dayspa', label: 'Beauty Sanctuary' }
      ];
    } else if (templateType === 'retail') {
      return [
        { id: 'retail-theme-urban', label: 'Urban Minimalist' },
        { id: 'retail-theme-editorial', label: 'Editorial Layout' },
        { id: 'retail-theme-tech', label: 'Modern Aesthetic' },
        { id: 'retail-theme-dark', label: 'Dark Mode' },
        { id: 'retail-theme-fresh', label: 'Fresh Vibe' },
        { id: 'retail-theme-artisan', label: 'Artisan Crafted' }
      ];
    }
    return [{ id: layoutVariant, label: 'Theme Default' }];
  };
  const themes = getAvailableThemes();

  // Menu CRUD handlers
  const handleSaveMenuForm = async () => {
    if (!menuForm.name?.trim() || !menuForm.price?.trim()) {
      setMenuFormError('Nama produk dan harga wajib diisi ya!');
      return;
    }

    // Validasi Batas Kategori (maxCategories)
    const trimmedCat = menuForm.category?.trim();
    const existingCategories = client.categories || [];
    const isNewCategory = trimmedCat && !existingCategories.includes(trimmedCat);

    if (isNewCategory && existingCategories.length >= limits.maxCategories) {
      alert(`Batas kategori untuk paket ${currentTier.toUpperCase()} adalah maksimal ${limits.maxCategories} kategori. Silakan pilih kategori yang sudah ada atau upgrade paket Anda.`);
      return;
    }

    // 1. Hapus foto lama Cloudinary hanya setelah user benar-benar menekan Simpan
    if (pendingImageToDelete) {
      await deleteCloudinaryImage(pendingImageToDelete);
      setPendingImageToDelete(null);
    }

    // 2. Jika user mengunggah beberapa foto baru berturut-turut di sesi ini, bersihkan foto perantara yang tidak terpakai
    const finalPublicId = menuForm.imagePublicId;
    const intermediateUploads = tempUploadedPublicIds.filter(id => id !== finalPublicId);
    for (const id of intermediateUploads) {
      deleteCloudinaryImage(id);
    }
    setTempUploadedPublicIds([]);

    const updatedMenu = [...(client.menu || [])];
    if (editingMenuIdx !== null) {
      updatedMenu[editingMenuIdx] = menuForm as MenuItem;
    } else {
      updatedMenu.push({
        ...(menuForm as MenuItem),
        id: Date.now()
      });
    }

    // Auto-update categories jika ada kategori baru yang ditambahkan
    const currentCategories = client.categories || ['Semua'];
    let updatedCategories = [...currentCategories];
    if (menuForm.category && menuForm.category.trim() !== '') {
      const trimmedCategory = menuForm.category.trim();
      if (!updatedCategories.some(c => c.toLowerCase() === trimmedCategory.toLowerCase())) {
        updatedCategories.push(trimmedCategory);
      }
    }

    handleMultipleFieldsChange({
      menu: updatedMenu,
      categories: updatedCategories
    });
    setEditingMenuIdx(null);
    setMenuForm({});
    setMenuFormError(null);
  };

  const handleCancelMenuForm = async () => {
    // Hapus semua foto baru yang diunggah di Cloudinary karena user membatalkan edit/tambah
    for (const id of tempUploadedPublicIds) {
      await deleteCloudinaryImage(id);
    }
    setTempUploadedPublicIds([]);
    setPendingImageToDelete(null);
    setEditingMenuIdx(null);
    setMenuForm({});
    setMenuFormError(null);
  };

  const handleDeleteMenu = async (idx: number) => {
    const updated = [...(client.menu || [])];
    const itemToDelete = updated[idx];
    if (itemToDelete?.imagePublicId) {
      await deleteCloudinaryImage(itemToDelete.imagePublicId);
    }
    updated.splice(idx, 1);
    handleFieldChange('menu', updated);

    // Perbaiki editingMenuIdx agar tidak desync saat item dihapus
    if (editingMenuIdx !== null) {
      if (editingMenuIdx === idx) {
        setEditingMenuIdx(null);
        setMenuForm({});
        setMenuFormError(null);
        setPendingImageToDelete(null);
        setTempUploadedPublicIds([]);
      } else if (editingMenuIdx > idx) {
        setEditingMenuIdx(editingMenuIdx - 1);
      }
    }
  };

  const moveMenuUp = (idx: number) => {
    if (idx === 0) return;
    const newMenu = [...(client.menu || [])];
    [newMenu[idx - 1], newMenu[idx]] = [newMenu[idx], newMenu[idx - 1]];
    handleFieldChange('menu', newMenu);
  };

  const moveMenuDown = (idx: number) => {
    if (idx === (client.menu?.length || 0) - 1) return;
    const newMenu = [...(client.menu || [])];
    [newMenu[idx + 1], newMenu[idx]] = [newMenu[idx], newMenu[idx + 1]];
    handleFieldChange('menu', newMenu);
  };

  const openMenuForm = (idx: number | null) => {
    setMenuFormError(null);
    setPendingImageToDelete(null);
    setTempUploadedPublicIds([]);
    if (idx !== null) {
      setMenuForm({ ...client.menu[idx] });
      setEditingMenuIdx(idx);
    } else {
      setMenuForm({ name: '', desc: '', price: '', category: 'Semua', imageUrl: '' });
      setEditingMenuIdx(null);
    }
  };

  const handleSaveToAPI = async (publish: boolean) => {
    setIsSaving(true);
    if (!publish) setSaveStatus('saving');
    try {
      const res = await fetch('/api/demo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          clientData: client,
          layout_id: layoutVariant,
          publish
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      const resData = await res.json();

      lastSavedPayloadRef.current = JSON.stringify({ client, layoutVariant });
      setIsDirty(false);
      setSaveStatus('saved');

      if (publish && (!client.package_tier || client.package_tier === 'free_trial' || resData.requiresUpgrade)) {
        onClose();
        onUpgradeClick();
      } else {
        alert(publish ? 'Website kamu berhasil di-publish! 🎉' : 'Sip, draft udah tersimpan! 👍');
      }
    } catch (error) {
      console.error(error);
      if (!publish) setSaveStatus('error');
      alert('Waduh, gagal nyimpen nih. Coba lagi ya.');
    } finally {
      setIsSaving(false);
    }
  };

  const ComingSoonField = ({ label, placeholder, icon: Icon, type = "text" }: { label: string, placeholder: string, icon: any, type?: string }) => (
    <div className="space-y-1.5 opacity-60 relative group">
      <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-slate-400" /> {label}
      </label>
      <div className="relative">
        <input type={type} disabled placeholder={placeholder} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl">Sabar ya, lagi disiapin tim dev! 🛠️</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]" onClick={onClose} />
      )}

      {isPublishConfirmOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-200">
              <Rocket className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-3">Siap Online-in Sekarang?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Kalo kamu publish, semua editan barusan bakal langsung tayang dan bisa dilihat pelanggan. Udah yakin semuanya pas?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPublishConfirmOpen(false)}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cek Lagi Deh
              </button>
              <button
                onClick={() => { setIsPublishConfirmOpen(false); handleSaveToAPI(true); }}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2"
              >
                {isSaving ? 'Tunggu bentar...' : 'Gas, Publish! 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-slate-50 border-l border-slate-200 z-[120] transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 leading-tight">Editor Praktis</h3>
              {/* Status Auto-save Indicator */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium transition-all mt-0.5">
                {saveStatus === 'saving' && (
                  <span className="text-amber-600 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Menyimpan draf...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-600 flex items-center gap-1 animate-in fade-in duration-150">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    Tersimpan otomatis ✓
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-rose-500 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Gagal menyimpan draf
                  </span>
                )}
                {saveStatus === 'idle' && (
                  <span className="text-slate-400 text-[10px]">
                    Siap diedit
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 pb-24 sm:pb-5 scrollbar-hide relative">

          {/* CATEGORY LIST (MASTER VIEW) */}
          {!activeCategory && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <p className="text-xs font-bold text-slate-400 uppercase mb-4 px-1 tracking-wider">Mau ngedit apa nih?</p>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as CategoryId)}
                  className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-slate-900 font-bold text-sm">{cat.label}</h4>
                    <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          )}

          {/* DETAIL VIEWS */}
          {activeCategory && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-300">
              {/* Back Button */}
              <button
                onClick={() => {
                  setActiveCategory(null);
                  setEditingMenuIdx(null);
                  setMenuForm({});
                  setMenuFormError(null);
                  setPendingImageToDelete(null);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm font-bold transition-colors bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" /> Balik ke Menu
              </button>

              <h2 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                {(() => {
                  const cat = CATEGORIES.find(c => c.id === activeCategory);
                  const Icon = cat?.icon || Settings;
                  return <Icon className={`w-6 h-6 ${cat?.color || 'text-slate-500'}`} />;
                })()}
                {CATEGORIES.find(c => c.id === activeCategory)?.label}
              </h2>

              {/* 1. DESAIN & IDENTITAS */}
              {activeCategory === 'desain' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Atur Susunan Halaman</label>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Urutan Seksi</span>
                    </div>
                    {templateType === 'service' || templateType === 'grooming' ? (
                      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm text-xs text-slate-500 leading-relaxed">
                        Susunan tata letak halaman untuk bisnis <span className="font-bold text-slate-700 capitalize">{templateType}</span> sudah dirancang optimal khusus untuk pengalaman reservasi & booking pelanggan.
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 shadow-sm p-2 rounded-xl">
                        {(() => {
                          const defaultOrder = templateType === 'retail'
                            ? ['hero', 'lookbook', 'katalog', 'testimoni']
                            : (normalizedLayoutVariant === 'fnb-theme-classic'
                              ? ['hero', 'gallery', 'reviews', 'menu']
                              : ['hero', 'menu', 'gallery', 'reviews']);
                          const currentOrder = client.sectionOrder?.length ? client.sectionOrder : defaultOrder;

                          const moveUp = (index: number) => {
                            if (index <= 1) return;
                            const newOrder = [...currentOrder];
                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                            handleChange('sectionOrder', newOrder);
                          };

                          const moveDown = (index: number) => {
                            if (index === currentOrder.length - 1 || index === 0) return;
                            const newOrder = [...currentOrder];
                            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                            handleChange('sectionOrder', newOrder);
                          };

                          const toggleHideSection = (sectionId: string) => {
                            const currentHidden = client.hiddenSections || [];
                            const isHidden = currentHidden.includes(sectionId);
                            const nextHidden = isHidden
                              ? currentHidden.filter(id => id !== sectionId)
                              : [...currentHidden, sectionId];
                            handleChange('hiddenSections', nextHidden);
                          };

                          const retailLabels: Record<string, string> = {
                            hero: 'Banner Utama',
                            lookbook: 'Galeri Lookbook',
                            katalog: 'Katalog Produk',
                            testimoni: 'Ulasan Pelanggan'
                          };

                          const fnbLabels: Record<string, string> = {
                            hero: 'Banner Utama',
                            menu: 'Daftar Menu',
                            gallery: 'Galeri Foto',
                            reviews: 'Ulasan Pelanggan'
                          };

                          const getSectionLabel = (id: string) => {
                            if (templateType === 'retail') {
                              return retailLabels[id] || id;
                            }
                            return fnbLabels[id] || id;
                          };

                          return currentOrder.map((sectionId, idx) => {
                            const isHidden = (client.hiddenSections || []).includes(sectionId);
                            return (
                              <div
                                key={sectionId}
                                className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-lg ${
                                  isHidden ? 'bg-slate-50/80 opacity-60' : ''
                                }`}
                              >
                                <span className={`text-sm font-bold flex items-center gap-2 ${
                                  sectionId === 'hero' ? 'text-slate-400' : isHidden ? 'text-slate-400 line-through' : 'text-slate-700'
                                }`}>
                                  {getSectionLabel(sectionId)}
                                  {sectionId === 'hero' && (
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Tetap di atas)</span>
                                  )}
                                  {isHidden && (
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal no-underline">
                                      Disembunyikan
                                    </span>
                                  )}
                                </span>
                                {sectionId !== 'hero' && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleHideSection(sectionId)}
                                      className={`p-1.5 rounded-md transition-all ${
                                        isHidden
                                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 hover:scale-105'
                                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                      }`}
                                      title={isHidden ? 'Tampilkan kembali seksi ini' : 'Sembunyikan seksi ini'}
                                    >
                                      {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveUp(idx)}
                                      disabled={idx <= 1}
                                      className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md disabled:opacity-30 transition-colors"
                                      title="Geser ke atas"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveDown(idx)}
                                      disabled={idx === currentOrder.length - 1}
                                      className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md disabled:opacity-30 transition-colors"
                                      title="Geser ke bawah"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pilih Gaya Tampilan</label>
                    {themes.length === 1 ? (
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
                        <p className="font-bold">{themes[0].label}</p>
                        <p className="text-xs mt-1 opacity-80">Tampilan ini khusus didesain spesial buat tipe usahamu.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {themes.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => onLayoutChange(theme.id)}
                            className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${normalizedLayoutVariant === theme.id
                              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                          >
                            <span className={`font-bold text-sm ${normalizedLayoutVariant === theme.id ? 'text-emerald-700' : 'text-slate-700'}`}>{theme.label}</span>
                            {normalizedLayoutVariant === theme.id ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md w-max">Lagi Dipake</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Pilih Ini</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Warna Khas Brand-mu</label>
                    <div className="flex gap-4 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-slate-100 shadow-inner">
                        <input
                          type="color"
                          value={client.themeColor || '#000000'}
                          onChange={(e) => handleChange('themeColor', e.target.value)}
                          className="absolute -inset-4 w-24 h-24 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={client.themeColor || ''}
                        onChange={(e) => handleChange('themeColor', e.target.value)}
                        className="flex-1 bg-transparent border-none text-sm text-slate-900 focus:outline-none uppercase font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Kata-kata di Tombol (Call to Action)</label>
                      {isTrial ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          ✨ Fitur Pro Basic (Gratis Dicoba di Mode Demo)
                        </span>
                      ) : !limits.promoFeatures ? (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Terkunci (Paket Instan)
                        </span>
                      ) : null}
                    </div>

                    {!limits.promoFeatures && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                          <span>🔒</span> Fitur Flash Sale, Badge Diskon & Custom Tombol eksklusif untuk Paket Pro Basic & Pro Advanced.
                        </p>
                        <button
                          type="button"
                          onClick={onUpgradeClick}
                          className="px-3.5 py-2 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold rounded-lg text-xs transition-all whitespace-nowrap shadow-sm shrink-0 active:scale-95 text-center"
                        >
                          Upgrade ke Pro Basic
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-slate-400" /> Tombol Beli / Pesan
                      </label>
                      <input
                        type="text"
                        disabled={!limits.promoFeatures}
                        placeholder="Misal: Pesan Sekarang / Beli Langsung"
                        value={client.uiLabels?.buyButtonText || ''}
                        onChange={(e) => handleChange('uiLabels', { ...client.uiLabels, buyButtonText: e.target.value })}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm transition-all ${
                          !limits.promoFeatures ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : ''
                        }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-slate-400" /> Tombol Lookbook / Galeri
                      </label>
                      <input
                        type="text"
                        disabled={!limits.promoFeatures}
                        placeholder="Misal: Inspirasi Setup / Galeri"
                        value={client.uiLabels?.lookbookButtonText || ''}
                        onChange={(e) => handleChange('uiLabels', { ...client.uiLabels, lookbookButtonText: e.target.value })}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm transition-all ${
                          !limits.promoFeatures ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : ''
                        }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-slate-400" /> Tombol Lihat Semua
                      </label>
                      <input
                        type="text"
                        disabled={!limits.promoFeatures}
                        placeholder="Misal: Liat Menu Lainnya / Buka Etalase"
                        value={client.uiLabels?.viewAllButtonText || ''}
                        onChange={(e) => handleChange('uiLabels', { ...client.uiLabels, viewAllButtonText: e.target.value })}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm transition-all ${
                          !limits.promoFeatures ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Promo & Flash Sale (Marketing)</label>
                      {isTrial ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          ✨ Fitur Pro Basic (Gratis Dicoba di Mode Demo)
                        </span>
                      ) : !limits.promoFeatures ? (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Terkunci (Paket Instan)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Aktif di Banner
                        </span>
                      )}
                    </div>

                    {!limits.promoFeatures && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                          <span>🔒</span> Fitur Flash Sale, Badge Diskon & Custom Tombol eksklusif untuk Paket Pro Basic & Pro Advanced.
                        </p>
                        <button
                          type="button"
                          onClick={onUpgradeClick}
                          className="px-3.5 py-2 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold rounded-lg text-xs transition-all whitespace-nowrap shadow-sm shrink-0 active:scale-95 text-center"
                        >
                          Upgrade ke Pro Basic
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-slate-400" /> Label Diskon/Promo
                      </label>
                      <input
                        type="text"
                        disabled={!canEditPromo}
                        placeholder="Misal: Promo Gila! / Penawaran Terbatas"
                        value={client.marketing?.promoLabel || ''}
                        onChange={(e) => handleChange('marketing', { ...client.marketing, promoLabel: e.target.value })}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm transition-all ${
                          !canEditPromo ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : ''
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-slate-400" /> Persentase Diskon (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!canEditPromo}
                        placeholder="Misal: 25"
                        value={client.marketing?.discountPercentage ?? ''}
                        onChange={(e) => handleChange('marketing', { ...client.marketing, discountPercentage: Number(e.target.value) })}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm transition-all ${
                          !canEditPromo ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : ''
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" /> Batas Waktu Flash Sale
                      </label>
                      <input
                        type="datetime-local"
                        disabled={!canEditPromo}
                        value={client.marketing?.flashSaleEnd ? client.marketing.flashSaleEnd.slice(0, 16) : ''}
                        onChange={(e) => handleChange('marketing', { ...client.marketing, flashSaleEnd: e.target.value })}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm transition-all ${
                          !canEditPromo ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : ''
                        }`}
                      />
                      <p className="text-[11px] text-slate-400">
                        Atur batas waktu untuk memunculkan badge countdown atau batas akhir promo di etalase/banner.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PROFIL & KONTAK */}
              {activeCategory === 'profil' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Info Dasar Usaha</label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Nama Usahamu (Misal: Kedai Kopi Mantap)"
                        value={client.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                      />
                      <textarea
                        placeholder="Slogan atau tagline singkat yang ngena banget"
                        value={client.tagline}
                        onChange={(e) => handleChange('tagline', e.target.value)}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Buka Jam</label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input type="time" value={client.openTime || ''} onChange={(e) => handleChange('openTime', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 outline-none shadow-sm" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tutup Jam</label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input type="time" value={client.closeTime || ''} onChange={(e) => handleChange('closeTime', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 outline-none shadow-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div>
                        <label className="text-sm font-bold text-slate-900 block">Status Toko</label>
                        <span className="text-xs text-slate-500">Tampilin label Buka/Tutup di web</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={client.isOpen !== false} onChange={(e) => handleChange('isOpen', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Titik Lokasi & Kontak</label>
                    <div className="space-y-3">
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <textarea placeholder="Alamat lengkap biar gampang dicari" value={client.address || ''} onChange={(e) => handleChange('address', e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none shadow-sm resize-none" />
                      </div>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="url" placeholder="Link Google Maps (Biar bisa di-klik)" value={client.googleMapsUrl || ''} onChange={(e) => handleChange('googleMapsUrl', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none shadow-sm" />
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="No WhatsApp (Pakai 628... ya)"
                          value={client.waNumber || client.phone || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleMultipleFieldsChange({ waNumber: val, phone: val });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none shadow-sm"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="email" placeholder="Alamat Email (Opsional)" value={client.userEmail || ''} onChange={(e) => handleChange('userEmail', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none shadow-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pamerin Sosmedmu</label>
                    <div className="space-y-3">
                      {['instagram', 'tiktok', 'facebook'].map((platform) => {
                        const smData = client.socialMedia?.[platform as keyof typeof client.socialMedia] || { url: '', active: false };
                        return (
                          <div key={platform} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-700 capitalize flex items-center gap-2">
                                <Link className="w-4 h-4 text-slate-400" /> {platform}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={smData.active} onChange={(e) => handleChange('socialMedia', { ...client.socialMedia, [platform]: { ...smData, active: e.target.checked } })} className="sr-only peer" />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                            {smData.active && (
                              <input type="url" placeholder={`Link akun ${platform} kamu`} value={smData.url} onChange={(e) => handleChange('socialMedia', { ...client.socialMedia, [platform]: { ...smData, url: e.target.value } })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white outline-none" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Biar Makin Keren (Coming Soon)</label>
                    <ComingSoonField label="Kota Asal Bisnis" placeholder="Biar ketahuan dari mana, misal: Jaksel" icon={MapPin} />
                    <ComingSoonField label="Angka Rating Toko" placeholder="Pamerin ratingmu, misal: 4.8" icon={Star} type="number" />
                    <ComingSoonField label="Emoji Khas Toko" placeholder="Pilih emoji yang paling menggambarkan usahamu 🍣" icon={Settings} />
                  </div>
                </div>
              )}

              {/* 3. ETALASE UTAMA */}
              {activeCategory === 'hero' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Upload Spanduk Depan</label>
                    <div className="bg-white p-2 border border-slate-200 rounded-2xl shadow-sm">
                      <CloudinaryUploader
                        currentImageUrl={client.heroImage}
                        onUploadSuccess={async (url, publicId) => {
                          if (client.heroImagePublicId) {
                            try { await supabase.functions.invoke('delete-cloudinary-image', { body: { public_id: client.heroImagePublicId } }); } catch (e) { }
                          }
                          onChange({ ...client, heroImage: url, heroImagePublicId: publicId });
                        }}
                        label="Ganti Foto"
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-amber-500" /> Atur Tombol Ekstra
                    </h4>
                    <p className="text-xs text-slate-500">Selain pesen, pengunjung web bisa ngapain lagi dari tombol ini?</p>
                    <select
                      value={client.heroSecondaryAction || (client.fbType === 'DINE_IN' ? 'whatsapp' : 'cart')}
                      onChange={(e) => handleChange('heroSecondaryAction', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none font-medium"
                    >
                      <option value="whatsapp">Langsung chat WA (Tanya-tanya dulu)</option>
                      <option value="cart">Langsung masuk ke pemesanan</option>
                      <option value="gallery">Lihat-lihat foto galeri dulu</option>
                    </select>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ganti Judul Biar Unik</label>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Judul Galeri</label>
                        <input type="text" placeholder="Misal: Intip Suasana Kita" value={client.galleryTitle || ''} onChange={(e) => handleChange('galleryTitle', e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Judul Katalog</label>
                        <input type="text" placeholder="Misal: Pilihan Terbaik Buat Kamu" value={client.menuTitle || ''} onChange={(e) => handleChange('menuTitle', e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Judul Ulasan</label>
                        <input type="text" placeholder="Misal: Kata Mereka Soal Kita" value={client.reviewsTitle || ''} onChange={(e) => handleChange('reviewsTitle', e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. KATALOG PRODUK */}
              {activeCategory === 'katalog' && (
                <div className="space-y-4">
                  {menuForm.name !== undefined ? (
                    <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-5 space-y-5 animate-in slide-in-from-bottom-4 fade-in">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-extrabold text-slate-900">{editingMenuIdx !== null ? 'Edit Produk Ini' : 'Tambah Produk Baru'}</h4>
                        <button
                          type="button"
                          onClick={handleCancelMenuForm}
                          className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                          title="Batal dan tutup"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {menuFormError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                          <X className="w-4 h-4 shrink-0" />
                          <span>{menuFormError}</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Nama Produk (Misal: Kopi Susu Aren) *"
                          value={menuForm.name || ''}
                          onChange={(e) => {
                            if (menuFormError) setMenuFormError(null);
                            setMenuForm(prev => ({ ...prev, name: e.target.value }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white outline-none font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Harga (Misal: Rp 15.000) *"
                          value={menuForm.price || ''}
                          onChange={(e) => {
                            if (menuFormError) setMenuFormError(null);
                            setMenuForm(prev => ({ ...prev, price: e.target.value }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white outline-none font-medium"
                        />
                        <textarea placeholder="Tulisin penjelasan singkat biar pada ngiler..." value={menuForm.desc || ''} onChange={(e) => setMenuForm(prev => ({ ...prev, desc: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white outline-none resize-none font-medium" rows={3} />
                        <input type="text" placeholder="Kategori (Misal: Minuman Dingin)" value={menuForm.category || ''} onChange={(e) => setMenuForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white outline-none font-medium" />
                      </div>

                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Pajang Fotonya Biar Menarik</label>
                        <div className="border border-slate-200 rounded-xl p-1 bg-slate-50">
                          <CloudinaryUploader
                            currentImageUrl={menuForm.imageUrl}
                            onUploadSuccess={(url, publicId) => {
                              // Catat foto lama produk yang sedang diedit (hanya dihapus saat user klik Simpan)
                              if (editingMenuIdx !== null && client.menu[editingMenuIdx]?.imagePublicId) {
                                setPendingImageToDelete(client.menu[editingMenuIdx].imagePublicId!);
                              }
                              // Catat foto baru yang baru diupload agar bisa dibersihkan jika dibatalkan
                              setTempUploadedPublicIds(prev => [...prev, publicId]);
                              setMenuForm(prev => ({ ...prev, imageUrl: url, imagePublicId: publicId }));
                            }}
                            label="Upload Foto Baru"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <ComingSoonField label="Varian (Ukuran/Topping)" placeholder="Biar pelanggan bisa milih-milih" icon={LayoutTemplate} />
                        <ComingSoonField label="Label Promo Khusus" placeholder="Kasih label 'Best Seller' gitu" icon={Tag} />
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={handleCancelMenuForm}
                          className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveMenuForm}
                          className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
                        >
                          Sip, Simpan Produk!
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(client.menu?.length || 0) >= limits.maxProducts ? (
                        <button onClick={onUpgradeClick} className="w-full py-5 border-2 border-dashed border-amber-300 bg-amber-50 text-amber-700 rounded-2xl font-bold flex flex-col justify-center items-center gap-2 hover:bg-amber-100 transition-colors text-sm">
                          <span className="flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Udah Mentok Nih Kuotanya</span>
                          <span className="text-xs font-medium opacity-80 text-center px-4">Paket {currentTier.toUpperCase()} cuma bisa muat {limits.maxProducts} produk. Yuk upgrade biar bisa jualan lebih banyak!</span>
                        </button>
                      ) : (
                        <button onClick={() => openMenuForm(null)} className="w-full py-4 border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-600 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-emerald-100 transition-colors text-sm">
                          <Plus className="w-5 h-5" /> Tambah Produk Baru Yuk!
                        </button>
                      )}

                      <div className="space-y-3 mt-4">
                        {client.menu.map((item, idx) => (
                          <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex gap-4 items-center group hover:border-emerald-300 hover:shadow-md transition-all">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-slate-100" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 border border-slate-200"><ImageIcon className="w-5 h-5 opacity-50" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-extrabold text-slate-900 truncate">{item.name}</h4>
                              <p className="text-xs font-bold text-emerald-600 mt-1">{item.price}</p>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex flex-col gap-1 border-r border-slate-200 pr-2 mr-1">
                                <button onClick={() => moveMenuUp(idx)} disabled={idx === 0} className="text-slate-400 hover:text-emerald-500 disabled:opacity-30">↑</button>
                                <button onClick={() => moveMenuDown(idx)} disabled={idx === client.menu.length - 1} className="text-slate-400 hover:text-emerald-500 disabled:opacity-30">↓</button>
                              </div>
                              <div className="flex flex-col gap-2">
                                <button onClick={() => openMenuForm(idx)} className="p-2 text-blue-500 hover:bg-blue-50 bg-slate-50 border border-slate-100 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteMenu(idx)} className="p-2 text-rose-500 hover:bg-rose-50 bg-slate-50 border border-slate-100 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 5. LOOKBOOK */}
              {activeCategory === 'lookbook' && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 items-start">
                    <ImageIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-800 font-medium leading-relaxed">
                      Biar pelanggan makin yakin, pamerin foto-foto terbaik hasil kerjamu atau suasana tempat usahamu di sini (maks 6 foto ya).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {client.lookbook?.map((item, idx) => (
                      <div key={item.id} className="relative group rounded-2xl overflow-hidden aspect-[4/5] bg-white border border-slate-200 shadow-sm">
                        <img src={item.imageUrl} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                          <span className="text-[10px] font-bold text-white px-2 py-1 bg-white/20 rounded-md">Foto {idx + 1}</span>
                          <button
                            onClick={async () => {
                              const newLookbook = [...(client.lookbook || [])];
                              const deletedItem = newLookbook[idx];
                              newLookbook.splice(idx, 1);
                              handleChange('lookbook', newLookbook);
                              if (deletedItem.imagePublicId) {
                                try { await supabase.functions.invoke('delete-cloudinary-image', { body: { public_id: deletedItem.imagePublicId } }); } catch (e) { }
                              }
                            }}
                            className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg transition-transform hover:scale-110"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!client.lookbook || client.lookbook.length < 6) && (
                      <div className="aspect-[4/5] rounded-2xl overflow-hidden border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer flex flex-col items-center justify-center bg-white group">
                        <div className="scale-90 opacity-80 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none mb-2">
                          {/* We pass a custom label through CloudinaryUploader via standard label prop */}
                        </div>
                        <CloudinaryUploader
                          onUploadSuccess={(url, publicId) => {
                            const newLookbook = [...(client.lookbook || [])];
                            newLookbook.push({
                              id: Date.now().toString(),
                              name: `Gallery ${newLookbook.length + 1}`,
                              imageUrl: url,
                              imagePublicId: publicId
                            });
                            handleChange('lookbook', newLookbook);
                          }}
                          label="Tambah Foto"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Biar Makin Personal (Coming Soon)</label>
                    <ComingSoonField label="Ganti Judul Foto" placeholder="Bisa namain foto sesukamu" icon={Type} />
                    <ComingSoonField label="Ceritain Fotonya" placeholder="Bisa kasih cerita di balik foto ini" icon={MessageSquare} />
                  </div>
                </div>
              )}

              {/* 6. BUKTI SOSIAL */}
              {activeCategory === 'sosial' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" /> Tunjukin Apa Hebatnya Usahamu!
                      </span>
                      {templateType === 'retail' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Tampil di Banner Depan
                        </span>
                      )}
                    </label>
                    {templateType !== 'retail' && (
                      <p className="text-xs text-slate-400">
                        Poin keunggulan ini diutamakan dan langsung tampil di etalase/banner pada tema Retail & Toko.
                      </p>
                    )}
                    <div className="space-y-3">
                      {[0, 1, 2].map((idx) => {
                        const usps = client.marketing?.usps || [
                          { title: '15-30 Menit', desc: 'Garansi Cepat Sampai' },
                          { title: '100% Higienis', desc: 'Kualitas Terjaga' },
                          { title: 'Kemasan Aman', desc: 'Suhu Tetap Stabil' }
                        ];
                        const currentUsp = usps[idx] || { title: '', desc: '' };
                        return (
                          <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-2.5">
                            <input
                              type="text"
                              placeholder="Kelebihan utama (Misal: Pasti Enak!)"
                              value={currentUsp.title}
                              onChange={(e) => {
                                const newUsps = [...usps];
                                newUsps[idx] = { ...currentUsp, title: e.target.value };
                                handleChange('marketing', { ...client.marketing, usps: newUsps });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-extrabold text-slate-900 focus:border-emerald-500 focus:bg-white outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Penjelasan singkatnya..."
                              value={currentUsp.desc}
                              onChange={(e) => {
                                const newUsps = [...usps];
                                newUsps[idx] = { ...currentUsp, desc: e.target.value };
                                handleChange('marketing', { ...client.marketing, usps: newUsps });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 focus:border-emerald-500 focus:bg-white outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Biar Gak Banyak Nanya (Coming Soon)</label>
                    <ComingSoonField label="Ulasan & Testimoni Pelanggan" placeholder="Masukin kata mereka yang udah beli" icon={MessageSquare} />
                    <ComingSoonField label="Pertanyaan Sering Muncul (FAQ)" placeholder="Biar pelanggan langsung tau jawabannya" icon={HelpCircle} />
                    <ComingSoonField label="Pamerin Tim Jagoanmu" placeholder="Masukin foto karyawannya" icon={Users} />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Floating Footer */}
        <div className="p-5 pb-20 sm:pb-5 border-t border-slate-200 bg-white/90 backdrop-blur-md flex gap-3 z-20">
          <button
            onClick={() => handleSaveToAPI(false)}
            disabled={isSaving}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Lagi nyimpen...' : 'Simpan Dulu'}
          </button>
          <button
            onClick={() => setIsPublishConfirmOpen(true)}
            disabled={isSaving}
            className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
          >
            <Rocket className="w-4 h-4" /> Langsung Live!
          </button>
        </div>
      </div>
    </>
  );
}
