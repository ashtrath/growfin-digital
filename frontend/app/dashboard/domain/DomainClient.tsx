'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, CheckCircle2, Copy, Check, ExternalLink, ShieldCheck, Server, AlertCircle, ArrowUpRight, Store } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

interface Business {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  package_tier?: string;
  custom_domain?: string | null;
  site_active_until?: string | null;
  domain_active_until?: string | null;
}

export function DomainClient({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(businesses[0]?.id || '');
  const currentBiz = businesses.find((b) => b.id === selectedId) || businesses[0];

  const [domainInput, setDomainInput] = useState<string>(currentBiz?.custom_domain || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!businesses || businesses.length === 0) {
    return (
      <div className="p-10 text-center bg-[#14141A] border border-[#262633] rounded-2xl">
        <Store className="w-12 h-12 text-[#262633] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Belum Ada Website Aktif</h3>
        <p className="text-[#8E8EA0] text-sm mb-6">
          Anda belum memiliki website bisnis. Buat website terlebih dahulu untuk menghubungkan domain kustom.
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
    setDomainInput(target?.custom_domain || '');
    setMessage(null);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/dashboard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBiz.id,
          custom_domain: domainInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal menyimpan domain');
      }

      setMessage({
        type: 'success',
        text: domainInput.trim()
          ? `Domain ${domainInput.trim()} berhasil dihubungkan! Ikuti panduan DNS di bawah ini agar website aktif.`
          : 'Domain kustom berhasil dilepaskan dari website ini.',
      });
      router.refresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Apakah Anda yakin ingin melepas domain ${currentBiz.custom_domain} dari website ${currentBiz.name}?`)) {
      return;
    }
    setDomainInput('');
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/dashboard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBiz.id,
          custom_domain: '',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal melepas domain');
      }

      setMessage({ type: 'success', text: 'Domain kustom berhasil dilepaskan.' });
      router.refresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem' });
    } finally {
      setIsSaving(false);
    }
  };

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'growfin.my.id';
  const defaultUrl = `https://${rootDomain}/${currentBiz.slug}`;
  const customUrl = currentBiz.custom_domain ? `https://${currentBiz.custom_domain}` : null;
  const isInstan = currentBiz.package_tier === 'instan' || currentBiz.package_tier === 'free_trial';

  return (
    <div className="space-y-6">
      {/* Business Switcher (if user owns more than 1 business) */}
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

      {/* Feedback Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-[#00b894]/10 border-[#00b894]/30 text-[#00b894]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Section 1: Active URLs */}
      <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#00b894]" /> Status Domain Saat Ini
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Default Growfin Domain */}
          <div className="bg-[#0B0B0E] border border-[#262633] rounded-xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#8E8EA0] uppercase tracking-wider">Domain Bawaan (Growfin)</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#00b894]/20 text-[#00b894] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Aktif & SSL
                </span>
              </div>
              <p className="text-white font-mono text-sm break-all font-semibold">{defaultUrl}</p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#262633]/60">
              <a
                href={defaultUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00b894] hover:underline"
              >
                Buka Link <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(defaultUrl, 'default')}
                className="inline-flex items-center gap-1 text-xs text-[#8E8EA0] hover:text-white transition-colors ml-auto"
              >
                {copiedKey === 'default' ? <Check className="w-3.5 h-3.5 text-[#00b894]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'default' ? 'Tersalin' : 'Salin URL'}
              </button>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="bg-[#0B0B0E] border border-[#262633] rounded-xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#8E8EA0] uppercase tracking-wider">Domain Kustom Pribadi</span>
                {customUrl ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#00b894]/20 text-[#00b894] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Terhubung
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#262633] text-[#8E8EA0]">
                    Belum Dihubungkan
                  </span>
                )}
              </div>
              <p className="text-white font-mono text-sm break-all font-semibold">
                {customUrl || 'Belum ada domain kustom'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#262633]/60">
              {customUrl ? (
                <>
                  <a
                    href={customUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00b894] hover:underline"
                  >
                    Kunjungi Website <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(customUrl, 'custom')}
                    className="inline-flex items-center gap-1 text-xs text-[#8E8EA0] hover:text-white transition-colors ml-auto"
                  >
                    {copiedKey === 'custom' ? <Check className="w-3.5 h-3.5 text-[#00b894]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'custom' ? 'Tersalin' : 'Salin'}
                  </button>
                </>
              ) : (
                <span className="text-xs text-[#8E8EA0]">Gunakan form di bawah untuk menghubungkan</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Form Hubungkan Domain */}
      <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-[#00b894]" /> Hubungkan Domain Kustom
        </h3>

        {isInstan ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              Fitur Domain Kustom Tersedia di Paket Pro
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Website Anda saat ini menggunakan paket <strong>{currentBiz.package_tier || 'Instan'}</strong>. Untuk
              menggunakan domain kustom berekstensi <code>.com</code>, <code>.id</code>, atau lainnya, silakan upgrade ke paket Pro Basic atau Pro Advanced.
            </p>
            <Link
              href={`/demo/${currentBiz.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-lg transition-all"
            >
              Upgrade Paket Sekarang <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSaveDomain} className="space-y-4 pt-1">
            <p className="text-sm text-[#8E8EA0] leading-relaxed">
              Masukkan nama domain yang telah Anda beli di registrar domain (contoh: Niagahoster, Domainesia, Rumahweb, Cloudflare).
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Domain</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="contoh: tokokamu.com atau www.tokokamu.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="flex-1 bg-[#0B0B0E] border border-[#262633] text-white px-4 py-3 rounded-xl focus:border-[#00b894] focus:outline-none font-mono text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {isSaving ? 'Menyimpan...' : 'Hubungkan Domain'}
                </button>
              </div>
            </div>

            {currentBiz.custom_domain && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline transition-colors"
                >
                  Lepaskan Domain dari Website Ini
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Section 3: Panduan DNS */}
      <div className="bg-[#14141A] border border-[#262633] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262633] pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00b894]" /> Panduan Konfigurasi DNS
            </h3>
            <p className="text-xs text-[#8E8EA0] mt-1">
              Tambahkan 2 baris DNS Record ini di panel kontrol registrar tempat Anda membeli domain.
            </p>
          </div>
        </div>

        {/* DNS Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-[#262633] rounded-xl overflow-hidden">
            <thead className="bg-[#0B0B0E] text-[#8E8EA0] uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3 border-b border-[#262633]">Tipe</th>
                <th className="p-3 border-b border-[#262633]">Host / Name</th>
                <th className="p-3 border-b border-[#262633]">Target / Value</th>
                <th className="p-3 border-b border-[#262633]">TTL</th>
                <th className="p-3 border-b border-[#262633] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262633] font-mono text-white">
              <tr className="hover:bg-[#1f1f28]/50 transition-colors">
                <td className="p-3 font-bold text-[#00b894]">CNAME</td>
                <td className="p-3">www</td>
                <td className="p-3 break-all">cname.growfin.my.id</td>
                <td className="p-3 text-[#8E8EA0]">3600 (Otomatis)</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyToClipboard('cname.growfin.my.id', 'dns-cname')}
                    className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-[#8E8EA0] hover:text-white px-2 py-1 bg-[#262633] rounded-lg transition-colors"
                  >
                    {copiedKey === 'dns-cname' ? <Check className="w-3 h-3 text-[#00b894]" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'dns-cname' ? 'Tersalin' : 'Salin'}
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-[#1f1f28]/50 transition-colors">
                <td className="p-3 font-bold text-blue-400">A</td>
                <td className="p-3">@</td>
                <td className="p-3">76.76.21.21</td>
                <td className="p-3 text-[#8E8EA0]">3600 (Otomatis)</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyToClipboard('76.76.21.21', 'dns-a')}
                    className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-[#8E8EA0] hover:text-white px-2 py-1 bg-[#262633] rounded-lg transition-colors"
                  >
                    {copiedKey === 'dns-a' ? <Check className="w-3 h-3 text-[#00b894]" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'dns-a' ? 'Tersalin' : 'Salin'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Steps */}
        <div className="bg-[#0B0B0E] border border-[#262633] rounded-xl p-4 space-y-2.5 text-xs text-[#8E8EA0]">
          <p className="font-bold text-white text-sm mb-1">Langkah Mudah Aktivasi:</p>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#262633] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
            <span>Buka dashboard registrar domain Anda (Niagahoster, Domainesia, dsb) lalu pilih menu <strong>DNS Management</strong>.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#262633] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
            <span>Tambahkan baris <strong>CNAME</strong> dan <strong>A Record</strong> persis seperti tabel di atas.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#262633] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
            <span>Tunggu proses propagasi global (umumnya 5–30 menit, maksimal 24 jam). Sertifikat SSL HTTPS akan otomatis diterbitkan.</span>
          </div>
        </div>

        {/* Help WhatsApp */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#00b894]/5 border border-[#00b894]/20 rounded-xl p-4">
          <div>
            <p className="text-sm font-bold text-white">Bingung cara setting DNS domain?</p>
            <p className="text-xs text-[#8E8EA0] mt-0.5">Tim teknis Growfin siap membantu Anda melakukan setup sampai domain live.</p>
          </div>
          <a
            href={`https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodeURIComponent(
              `Halo Tim Growfin, saya ingin meminta bantuan untuk menghubungkan custom domain ${currentBiz.custom_domain || ''} ke website saya (${currentBiz.slug}).`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-[#00b894] hover:bg-[#00e0b8] text-black font-extrabold text-xs rounded-lg transition-all shrink-0"
          >
            Bantuan Setup Domain (WhatsApp)
          </a>
        </div>
      </div>
    </div>
  );
}
