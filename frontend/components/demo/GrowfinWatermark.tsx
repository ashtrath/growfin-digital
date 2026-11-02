'use client';

import Link from 'next/link';

export function GrowfinWatermark() {
  return (
    <aside
      aria-label="Watermark Growfin Digital"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[45] pointer-events-auto"
    >
      <Link
        href="https://growfin.my.id"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#14141A]/90 hover:bg-[#14141A] text-white text-xs font-medium shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md border border-white/10 hover:border-[#00b894]/50 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
      >
        <span className="text-amber-400 font-extrabold text-sm leading-none drop-shadow">⚡</span>
        <span className="text-slate-200">
          Website UMKM oleh <strong className="font-bold text-white group-hover:text-[#00e0b8] transition-colors">Growfin Digital</strong>
        </span>
        <span className="text-slate-500 font-bold">—</span>
        <span className="text-[#00e0b8] font-bold underline decoration-[#00e0b8]/40 underline-offset-2 group-hover:text-[#00b894]">
          Buat Web Gratis
        </span>
      </Link>
    </aside>
  );
}
