import React, { useState } from 'react';
import { X, Palette, Check, Sparkles, Wand2 } from 'lucide-react';

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  highlight: string;
  subtitleColor: string;
  highlightColor: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'professional-blue',
    name: 'Professional Blue',
    description: 'Tông xanh chuyên nghiệp, tin cậy cho video tài chính & tech',
    primary: '#38bdf8',
    secondary: '#0284c7',
    highlight: '#0ea5e9',
    subtitleColor: '#ffffff',
    highlightColor: '#38bdf8',
  },
  {
    id: 'energetic-orange',
    name: 'Energetic Orange',
    description: 'Tông cam năng động, thu hút cho vlog, lifestyle & fitness',
    primary: '#fb923c',
    secondary: '#ea580c',
    highlight: '#f97316',
    subtitleColor: '#ffffff',
    highlightColor: '#fb923c',
  },
  {
    id: 'emerald-creator',
    name: 'Emerald Creator',
    description: 'Tông xanh ngọc sáng tạo, tươi mới cho giáo dục & review',
    primary: '#34d399',
    secondary: '#059669',
    highlight: '#10b981',
    subtitleColor: '#ffffff',
    highlightColor: '#34d399',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    description: 'Tông hồng neon rực rỡ, cá tính mạnh mẽ cho gaming & TikTok',
    primary: '#f43f5e',
    secondary: '#e11d48',
    highlight: '#fb7185',
    subtitleColor: '#ffffff',
    highlightColor: '#f43f5e',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Tông tím hoàng gia sang trọng, huyền bí cho nghệ thuật & podcast',
    primary: '#c084fc',
    secondary: '#9333ea',
    highlight: '#a855f7',
    subtitleColor: '#ffffff',
    highlightColor: '#c084fc',
  },
  {
    id: 'minimalist-mono',
    name: 'Minimalist Mono',
    description: 'Tông tối giản tinh tế, sang trọng cho tài liệu & phim ngắn',
    primary: '#e2e8f0',
    secondary: '#64748b',
    highlight: '#94a3b8',
    subtitleColor: '#ffffff',
    highlightColor: '#cbd5e1',
  },
];

interface ColorPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePaletteId?: string;
  onApplyPalette: (palette: ColorPalette) => void;
  onAiAutoSelectPalette: () => void;
}

export const ColorPaletteModal: React.FC<ColorPaletteModalProps> = ({
  isOpen,
  onClose,
  activePaletteId = 'professional-blue',
  onApplyPalette,
  onAiAutoSelectPalette,
}) => {
  const [selectedId, setSelectedId] = useState(activePaletteId);

  if (!isOpen) return null;

  const handleApply = () => {
    const pal = COLOR_PALETTES.find(p => p.id === selectedId) || COLOR_PALETTES[0];
    onApplyPalette(pal);
    onClose();
  };

  const handleAiAuto = () => {
    onAiAutoSelectPalette();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Palette className="w-4 h-4 text-sky-400" />
            <span>Color Palette AI • Phối Màu Chủ Đạo Đồng Nhất</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* AI Auto Suggestion */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                AI Tự Động Phân Tích & Chọn Tông Màu
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                AI sẽ tự động nhận diện nội dung kịch bản để chọn bảng màu phù hợp nhất.
              </div>
            </div>
            <button
              onClick={handleAiAuto}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Tự Chọn</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-300 pt-1">
            Hoặc chọn thủ công bảng màu thương hiệu:
          </div>

          {/* Palettes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOR_PALETTES.map(pal => {
              const isSelected = selectedId === pal.id;
              return (
                <div
                  key={pal.id}
                  onClick={() => setSelectedId(pal.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400 shadow-md shadow-sky-500/10'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shadow" style={{ backgroundColor: pal.primary }}></span>
                      <span>{pal.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight">
                    {pal.description}
                  </p>

                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-900">
                    <span className="text-[10px] text-slate-500 mr-1">Màu:</span>
                    <span className="w-5 h-4 rounded shadow" style={{ backgroundColor: pal.primary }} title="Primary"></span>
                    <span className="w-5 h-4 rounded shadow" style={{ backgroundColor: pal.secondary }} title="Secondary"></span>
                    <span className="w-5 h-4 rounded shadow" style={{ backgroundColor: pal.highlightColor }} title="Highlight"></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Hủy
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Áp Dụng Bảng Màu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
