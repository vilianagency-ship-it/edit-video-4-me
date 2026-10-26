import React, { useState } from 'react';
import { X, Sparkles, Check, Blend, Moon, Sun, ArrowLeft, ArrowRight, ZoomIn, Eye, Scissors, Clock } from 'lucide-react';
import { TransitionType, TransitionConfig } from '../types/editor';
import { TRANSITION_PRESETS } from '../utils/transitionEngine';

interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TransitionConfig;
  onSave: (newConfig: TransitionConfig) => void;
}

export const TransitionModal: React.FC<TransitionModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState<TransitionType>(config.type);
  const [duration, setDuration] = useState<number>(config.duration || 0.25);
  const [previewProgress, setPreviewProgress] = useState(0.5);

  if (!isOpen) return null;

  const handleApply = () => {
    onSave({
      type: selectedType,
      duration,
    });
    onClose();
  };

  const getIcon = (id: TransitionType) => {
    switch (id) {
      case 'dissolve':
        return <Blend className="w-5 h-5 text-sky-400" />;
      case 'fade-black':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'fade-white':
        return <Sun className="w-5 h-5 text-amber-300" />;
      case 'slide-left':
        return <ArrowLeft className="w-5 h-5 text-emerald-400" />;
      case 'slide-right':
        return <ArrowRight className="w-5 h-5 text-purple-400" />;
      case 'zoom-in':
        return <ZoomIn className="w-5 h-5 text-rose-400" />;
      case 'blur':
        return <Eye className="w-5 h-5 text-teal-400" />;
      default:
        return <Scissors className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Hiệu Ứng Chuyển Cảnh Giữa Các Đoạn Cắt (Transitions)</h3>
              <p className="text-[11px] text-slate-400">Làm mượt mà các điểm cắt bỏ khoảng lặng (Jump Cut)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Transition Presets Grid */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">Chọn kiểu chuyển cảnh chuyên nghiệp:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TRANSITION_PRESETS.map(preset => {
                const isSelected = preset.id === selectedType;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedType(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-400 text-sky-200 shadow-md shadow-sky-500/10 ring-1 ring-sky-400/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        {getIcon(preset.id)}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Slider */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Thời lượng chuyển cảnh:
              </span>
              <span className="font-mono text-sky-400 font-bold">{(duration * 1000).toFixed(0)} ms ({duration.toFixed(2)}s)</span>
            </div>
            <input
              type="range"
              min={0.10}
              max={0.60}
              step={0.05}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Nhanh (100ms - giòn giã)</span>
              <span>Chuẩn Talking-Head (250ms)</span>
              <span>Chậm (600ms - mềm mại)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">
            Tự động áp dụng mượt mà tại mọi điểm nối giữa các clip.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Hủy
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              Áp Dụng Cho Tất Cả Điểm Cắt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
