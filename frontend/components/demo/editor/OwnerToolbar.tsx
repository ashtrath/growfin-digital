'use client';

import { Edit3, Rocket, X } from 'lucide-react';
import { useState } from 'react';

interface OwnerToolbarProps {
  onEditClick: () => void;
  onPublishClick: () => void;
}

export function OwnerToolbar({ onEditClick, onPublishClick }: OwnerToolbarProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <div className="fixed bottom-6 left-6 z-[100] animate-in fade-in duration-300">
        <button
          onClick={() => setIsVisible(true)}
          className="group flex items-center gap-2 bg-[#14141A]/90 hover:bg-[#1f1f28] text-white p-2.5 rounded-full border border-[#262633] shadow-2xl hover:scale-105 transition-all duration-300"
          title="Buka Toolbar Editor"
        >
          <div className="w-8 h-8 rounded-full bg-[#00b894]/20 text-[#00b894] flex items-center justify-center">
            <Edit3 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold pr-2 hidden group-hover:inline transition-all duration-300 whitespace-nowrap text-slate-200">
            Buka Toolbar
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-[#14141A]/90 backdrop-blur-md border border-[#262633] rounded-full p-2 flex items-center gap-2 shadow-2xl">
        
        {/* Info Text (Hidden on small screens) */}
        <div className="hidden sm:block px-4 text-xs font-semibold text-[#8E8EA0] border-r border-[#262633]">
          Demo Preview
        </div>

        {/* Edit Button */}
        <button 
          onClick={onEditClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#262633] hover:bg-[#323242] text-white text-sm font-semibold rounded-full transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span className="hidden sm:inline">Edit Konten</span>
        </button>

        {/* Publish Button */}
        <button 
          onClick={onPublishClick}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#00b894] to-[#00e0b8] hover:opacity-90 text-[#14141A] text-sm font-black rounded-full transition-opacity shadow-[0_0_15px_rgba(0,184,148,0.4)]"
        >
          <Rocket className="w-4 h-4" />
          <span>Publish Web</span>
        </button>

        {/* Close/Hide Button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="p-2 ml-1 text-[#8E8EA0] hover:text-white rounded-full transition-colors"
          title="Sembunyikan Toolbar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
