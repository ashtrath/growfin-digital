'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Store, Palette, Globe, LogOut, Menu, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const menuItems = [
  { name: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Toko & Bisnis', href: '/dashboard/settings', icon: Store },
  { name: 'Tampilan & Tema', href: '/dashboard/theme', icon: Palette },
  { name: 'Domain Kustom', href: '/dashboard/domain', icon: Globe },
];

interface DashboardSidebarProps {
  userEmail?: string | null;
}

export function DashboardSidebar({ userEmail }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close drawer whenever pathname changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* ========================================================
          1. MOBILE TOP NAVBAR (Screens < 768px)
      ======================================================== */}
      <header className="md:hidden sticky top-0 z-40 w-full h-16 bg-[#14141A] border-b border-[#262633] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-1 text-[#8E8EA0] hover:text-white hover:bg-[#262633] rounded-xl transition-colors focus:outline-none"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src="/image/landing/growfin-logo-icon.png"
              alt="Growfin"
              className="w-7 h-7 object-contain"
            />
            <span className="font-extrabold text-white text-base tracking-tight">
              Growfin <span className="text-[#00b894] font-medium text-xs px-1.5 py-0.5 rounded bg-[#00b894]/10">Dashboard</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#262633] border border-[#00b894] flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {userInitial}
          </div>
        </div>
      </header>

      {/* ========================================================
          2. MOBILE DRAWER & BACKDROP (Screens < 768px)
      ======================================================== */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0B0B0E] border-r border-[#262633] z-50 flex flex-col transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#262633] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/image/landing/growfin-logo-icon.png"
              alt="Growfin"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h2 className="text-base font-black text-white leading-tight">Growfin</h2>
              <span className="text-[10px] text-[#00b894] font-semibold tracking-wider uppercase">Dashboard Admin</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-[#8E8EA0] hover:text-white hover:bg-[#14141A] rounded-lg transition-colors"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Bar */}
        {userEmail && (
          <div className="px-5 py-3.5 bg-[#14141A] border-b border-[#262633] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#262633] border-2 border-[#00b894] flex items-center justify-center text-sm font-bold text-white shrink-0">
              {userInitial}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{userEmail}</p>
              <p className="text-[10px] text-[#00b894] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00b894] inline-block animate-pulse" />
                Akun Pro Bisnis
              </p>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                  active
                    ? 'bg-[#00b894]/15 text-[#00b894] font-bold shadow-[0_0_15px_rgba(0,184,148,0.12)] border border-[#00b894]/20'
                    : 'text-[#8E8EA0] hover:bg-[#14141A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-[#00b894]' : 'text-[#8E8EA0]'}`} />
                  {item.name}
                </div>
                {active && (
                  <span className="w-2 h-2 rounded-full bg-[#00b894] shadow-[0_0_8px_#00b894]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer / Logout */}
        <div className="p-4 border-t border-[#262633]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors font-semibold text-sm text-red-400 hover:bg-red-500/10 active:scale-98"
          >
            <LogOut className="w-5 h-5" />
            Keluar dari Akun
          </button>
        </div>
      </aside>

      {/* ========================================================
          3. DESKTOP SIDEBAR (Screens >= 768px)
      ======================================================== */}
      <aside className="hidden md:flex w-64 bg-[#0B0B0E] border-r border-[#262633] h-screen flex-col fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-[#262633] flex items-center gap-3">
          <img
            src="/image/landing/growfin-logo-icon.png"
            alt="Growfin"
            className="w-8 h-8 object-contain"
          />
          <div>
            <h2 className="text-lg font-black text-white leading-tight">Growfin</h2>
            <span className="text-[11px] text-[#00b894] font-semibold tracking-wider uppercase">Dashboard Admin</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                  active
                    ? 'bg-[#00b894]/15 text-[#00b894] font-bold shadow-[0_0_15px_rgba(0,184,148,0.12)] border border-[#00b894]/20'
                    : 'text-[#8E8EA0] hover:bg-[#14141A] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-[#00b894]' : 'text-[#8E8EA0]'}`} />
                  {item.name}
                </div>
                {active && (
                  <span className="w-2 h-2 rounded-full bg-[#00b894] shadow-[0_0_8px_#00b894]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#262633]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors font-semibold text-sm text-red-400 hover:bg-red-500/10 active:scale-98"
          >
            <LogOut className="w-5 h-5" />
            Keluar dari Akun
          </button>
        </div>
      </aside>
    </>
  );
}
