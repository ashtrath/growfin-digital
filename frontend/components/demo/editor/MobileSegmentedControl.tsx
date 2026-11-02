'use client';

interface MobileSegmentedControlProps {
  isEditorOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function MobileSegmentedControl({ isEditorOpen, onToggle }: MobileSegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label="Mode Tampilan Editor"
      className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[130] bg-[#14141A]/95 p-1 rounded-full border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.55)] backdrop-blur-lg flex items-center gap-1 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      {/* Tab 1: Edit Formulir */}
      <button
        type="button"
        role="tab"
        aria-selected={isEditorOpen}
        onClick={() => onToggle(true)}
        className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition-all duration-200 active:scale-95 whitespace-nowrap ${
          isEditorOpen
            ? 'bg-gradient-to-r from-[#00b894] to-[#00e0b8] text-[#14141A] shadow-[0_2px_12px_rgba(0,184,148,0.4)]'
            : 'text-slate-300 hover:text-white hover:bg-white/5'
        }`}
      >
        <span>✏️</span>
        <span>Edit Formulir</span>
      </button>

      {/* Tab 2: Intip Hasil */}
      <button
        type="button"
        role="tab"
        aria-selected={!isEditorOpen}
        onClick={() => onToggle(false)}
        className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition-all duration-200 active:scale-95 whitespace-nowrap ${
          !isEditorOpen
            ? 'bg-gradient-to-r from-[#00b894] to-[#00e0b8] text-[#14141A] shadow-[0_2px_12px_rgba(0,184,148,0.4)]'
            : 'text-slate-300 hover:text-white hover:bg-white/5'
        }`}
      >
        <span>👁️</span>
        <span>Intip Hasil</span>
      </button>
    </div>
  );
}
