import React from 'react';
import { Scissors, Sparkles, Upload, Video, Download, Sliders, RefreshCw, Layers, Clapperboard, Palette } from 'lucide-react';

interface HeaderProps {
  onLoadDemo: () => void;
  onUploadClick: () => void;
  onRecordClick: () => void;
  onOpenSettings: () => void;
  onExportClick: () => void;
  onOpenIntroOutro: () => void;
  onOpenColorPalette: () => void;
  skipSilences: boolean;
  onToggleSkipSilences: () => void;
  savedSeconds: number;
  savedPercentage: number;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadDemo,
  onUploadClick,
  onRecordClick,
  onOpenSettings,
  onExportClick,
  onOpenIntroOutro,
  onOpenColorPalette,
  skipSilences,
  onToggleSkipSilences,
  savedSeconds,
  savedPercentage,
  isProcessing = false,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 flex items-center justify-between select-none sticky top-0 z-40">
      {/* Brand & Concept */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-amber-400 p-[1.5px] flex items-center justify-center shadow-lg shadow-sky-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Scissors className="w-4 h-4 text-sky-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 tracking-tight text-base">
              AutoCut <span className="text-sky-400 font-extrabold">Studio</span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              video-use engine
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Tự động cắt khoảng lặng • Phụ đề viral • Color Palette AI
          </p>
        </div>
      </div>

      {/* Center Jump-cut Quick Toggle & Stats */}
      <div className="hidden md:flex items-center gap-3 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
        <button
          onClick={onToggleSkipSilences}
          className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
            skipSilences
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Bật/Tắt tự động cắt bỏ khoảng im lặng khi xem và xuất video"
        >
          <Scissors className="w-3.5 h-3.5" />
          {skipSilences ? 'Đang bật Auto Jump Cut' : 'Đã tắt cắt khoảng lặng'}
        </button>

        {savedSeconds > 0 && (
          <div className="text-xs text-slate-300 flex items-center gap-1.5 pl-1 border-l border-slate-800">
            <span className="text-amber-400 font-bold">-{savedSeconds.toFixed(1)}s</span>
            <span className="text-slate-400">({savedPercentage.toFixed(0)}% thời lượng)</span>
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title="Tùy chỉnh ngưỡng phát hiện âm thanh"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        {onOpenColorPalette && (
          <button
            onClick={onOpenColorPalette}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition shadow"
            title="Chọn tông màu chủ đạo đồng nhất cho phụ đề, thẻ chú thích và hiệu ứng"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Color Palette AI</span>
          </button>
        )}

        {onOpenIntroOutro && (
          <button
            onClick={onOpenIntroOutro}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition shadow"
            title="Tạo Intro hoặc Outro bắt mắt với logo và hiệu ứng chuyển cảnh chuyên nghiệp"
          >
            <Clapperboard className="w-3.5 h-3.5 text-sky-400" />
            <span>AI Intro/Outro</span>
          </button>
        )}

        <button
          onClick={onLoadDemo}
          disabled={isProcessing}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isProcessing ? 'animate-spin' : ''}`} />
          Video Mẫu
        </button>

        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xs:inline">Tải Video Lên</span>
        </button>

        <button
          onClick={onRecordClick}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition"
        >
          <Video className="w-3.5 h-3.5 text-rose-400" />
          Quay Camera
        </button>

        <button
          onClick={onExportClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md shadow-sky-500/20 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Xuất Video
        </button>
      </div>
    </header>
  );
};
