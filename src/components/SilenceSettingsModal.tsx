import React, { useState } from 'react';
import { X, Sliders, Scissors, Check, RefreshCw } from 'lucide-react';
import { SilenceSettings } from '../types/editor';

interface SilenceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SilenceSettings;
  onSave: (newSettings: SilenceSettings) => void;
  onReAnalyze: (newSettings: SilenceSettings) => void;
}

export const SilenceSettingsModal: React.FC<SilenceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onReAnalyze,
}) => {
  const [thresholdDb, setThresholdDb] = useState(settings.thresholdDb);
  const [minDurationSec, setMinDurationSec] = useState(settings.minDurationSec);
  const [paddingSec, setPaddingSec] = useState(settings.paddingSec);

  if (!isOpen) return null;

  const handleApply = () => {
    const updated: SilenceSettings = {
      thresholdDb,
      minDurationSec,
      paddingSec,
    };
    onSave(updated);
    onReAnalyze(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-white">Cài Đặt Cắt Khoảng Lặng (Jump Cut)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Threshold slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Ngưỡng âm lượng im lặng:</span>
              <span className="font-mono text-sky-400 font-bold">{thresholdDb} dB</span>
            </div>
            <input
              type="range"
              min={-50}
              max={-15}
              step={1}
              value={thresholdDb}
              onChange={e => setThresholdDb(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Âm thanh dưới mức này sẽ được coi là khoảng lặng. Mặc định: -32 dB.
            </p>
          </div>

          {/* Min Duration slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Độ dài khoảng lặng tối thiểu:</span>
              <span className="font-mono text-amber-400 font-bold">{minDurationSec.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0.15}
              max={1.5}
              step={0.05}
              value={minDurationSec}
              onChange={e => setMinDurationSec(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Chỉ cắt các đoạn nghỉ dài hơn giá trị này. Thường từ 0.3s - 0.5s.
            </p>
          </div>

          {/* Speech Padding slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">Vùng đệm giọng nói (Speech Padding):</span>
              <span className="font-mono text-emerald-400 font-bold">{(paddingSec * 1000).toFixed(0)} ms</span>
            </div>
            <input
              type="range"
              min={0.02}
              max={0.25}
              step={0.01}
              value={paddingSec}
              onChange={e => setPaddingSec(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Giữ lại một chút đầu và cuối câu nói để giọng nói không bị cụt âm. Mặc định: 80ms.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Áp Dụng & Quét Lại
          </button>
        </div>
      </div>
    </div>
  );
};
