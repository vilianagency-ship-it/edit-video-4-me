import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Zap,
  Sliders,
  CheckCircle2,
  Play,
  Square,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NoiseReductionPreset, NoiseReductionSettings } from '../types/editor';
import {
  NOISE_PRESET_CONFIGS,
  applyNoiseReductionToSamples,
  calculateNoiseReductionMetrics,
} from '../utils/noiseReductionFilter';

interface NoiseReductionControlProps {
  settings: NoiseReductionSettings;
  onChange: (newSettings: NoiseReductionSettings) => void;
  audioBuffer?: AudioBuffer | null;
  compact?: boolean;
}

export const NoiseReductionControl: React.FC<NoiseReductionControlProps> = ({
  settings,
  onChange,
  audioBuffer,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [previewState, setPreviewState] = useState<'idle' | 'playing_raw' | 'playing_clean'>('idle');
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);

  const activePresetInfo = NOISE_PRESET_CONFIGS[settings.preset] || NOISE_PRESET_CONFIGS.balanced;

  const handleToggle = () => {
    stopPreview();
    onChange({
      ...settings,
      enabled: !settings.enabled,
    });
  };

  const handleSelectPreset = (preset: NoiseReductionPreset) => {
    stopPreview();
    const config = NOISE_PRESET_CONFIGS[preset];
    onChange({
      ...settings,
      preset,
      highPassCutoff: config.highPassCutoff,
    });
  };

  const stopPreview = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {}
      activeSourceRef.current = null;
    }
    if (previewCtxRef.current) {
      try {
        previewCtxRef.current.close();
      } catch {}
      previewCtxRef.current = null;
    }
    setPreviewState('idle');
  };

  const handlePlayPreview = async (type: 'raw' | 'clean') => {
    stopPreview();

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      previewCtxRef.current = ctx;

      let previewBuffer: AudioBuffer;

      if (audioBuffer && audioBuffer.length > 0) {
        // Use up to 3.5 seconds from project audio
        const durationToPlay = Math.min(3.5, audioBuffer.duration);
        const sampleCount = Math.floor(durationToPlay * audioBuffer.sampleRate);
        const rawSamples = new Float32Array(audioBuffer.getChannelData(0).subarray(0, sampleCount));

        let finalSamples: Float32Array<any> = rawSamples;
        if (type === 'clean') {
          finalSamples = applyNoiseReductionToSamples(rawSamples, audioBuffer.sampleRate, {
            ...settings,
            enabled: true,
          });
        }

        previewBuffer = ctx.createBuffer(1, finalSamples.length, audioBuffer.sampleRate);
        previewBuffer.copyToChannel(finalSamples as any, 0);
      } else {
        // Generate simulated voice + background hum snippet (3s)
        const sampleRate = ctx.sampleRate;
        const duration = 3.0;
        const totalSamples = Math.floor(sampleRate * duration);
        const rawSamples = new Float32Array(totalSamples);

        for (let i = 0; i < totalSamples; i++) {
          const t = i / sampleRate;
          // Background 50Hz hum + fan noise (white noise)
          const hum = 0.18 * Math.sin(2 * Math.PI * 50 * t);
          const rumble = 0.12 * Math.sin(2 * Math.PI * 40 * t);
          const hiss = (Math.random() * 2 - 1) * 0.08;
          // Voice burst intervals (0.5s - 1.2s, 1.8s - 2.6s)
          let voice = 0;
          if ((t >= 0.4 && t <= 1.3) || (t >= 1.7 && t <= 2.7)) {
            voice =
              0.45 * Math.sin(2 * Math.PI * 220 * t) +
              0.3 * Math.sin(2 * Math.PI * 440 * t) +
              0.2 * Math.sin(2 * Math.PI * 880 * t) +
              0.15 * Math.sin(2 * Math.PI * 1760 * t);
          }
          rawSamples[i] = hum + rumble + hiss + voice;
        }

        let finalSamples: Float32Array<any> = rawSamples;
        if (type === 'clean') {
          finalSamples = applyNoiseReductionToSamples(rawSamples, sampleRate, {
            ...settings,
            enabled: true,
          });
        }

        previewBuffer = ctx.createBuffer(1, finalSamples.length, sampleRate);
        previewBuffer.copyToChannel(finalSamples as any, 0);
      }

      const source = ctx.createBufferSource();
      source.buffer = previewBuffer;
      source.connect(ctx.destination);
      activeSourceRef.current = source;

      setPreviewState(type === 'raw' ? 'playing_raw' : 'playing_clean');

      source.onended = () => {
        setPreviewState('idle');
        activeSourceRef.current = null;
      };

      source.start(0);
    } catch (e) {
      console.warn('Audio preview error:', e);
      setPreviewState('idle');
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-lg">
      {/* Header and Toggle Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              settings.enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {settings.enabled ? <ShieldCheck className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white leading-none">
                Lọc Tạp Âm Nền (Noise Reduction)
              </span>
              {settings.enabled ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Bật
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Tắt
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {settings.enabled
                ? 'Làm sạch tiếng ù điều hòa, quạt gió & khử nhiễu trước khi AI tạo phụ đề'
                : 'Sử dụng trực tiếp âm thanh gốc chưa qua bộ lọc'}
            </p>
          </div>
        </div>

        {/* Big Switch Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            settings.enabled ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
          role="switch"
          aria-checked={settings.enabled}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Preset Selection & Controls (shown when enabled) */}
      {settings.enabled && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Mức độ khử ồn:</span>
            <span className="text-emerald-400 font-semibold">{activePresetInfo.badge}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(['light', 'balanced', 'aggressive'] as NoiseReductionPreset[]).map(presetKey => {
              const isSelected = settings.preset === presetKey;
              const cfg = NOISE_PRESET_CONFIGS[presetKey];
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => handleSelectPreset(presetKey)}
                  className={`py-1.5 px-2 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{cfg.name.split(' (')[0]}</div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">
                    {presetKey === 'balanced' ? 'Khuyên dùng' : presetKey === 'light' ? 'Chất âm thật' : 'Khử triệt để'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Audition Player: Listen to Raw vs Cleaned Audio */}
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-[11px] font-semibold text-slate-300">
                Nghe thử nghiệm thu âm:
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {previewState === 'playing_raw' ? (
                <button
                  type="button"
                  onClick={stopPreview}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 animate-pulse"
                >
                  <Square className="w-2.5 h-2.5 fill-current" /> Dừng (Gốc)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlayPreview('raw')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1 border border-slate-700"
                >
                  <Play className="w-2.5 h-2.5 fill-current" /> Gốc (Chưa lọc)
                </button>
              )}

              {previewState === 'playing_clean' ? (
                <button
                  type="button"
                  onClick={stopPreview}
                  className="px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-sm shadow-emerald-500/20"
                >
                  <Square className="w-2.5 h-2.5 fill-current" /> Dừng (Đã lọc)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlayPreview('clean')}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm shadow-emerald-600/20"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-200" /> Đã lọc sạch
                </button>
              )}
            </div>
          </div>

          {/* Toggle details / DSP breakdown */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] font-medium text-slate-400 hover:text-slate-300 flex items-center gap-1 w-full justify-between pt-1"
            >
              <span>Chi tiết thông số xử lý âm thanh</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDetails && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-300 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>High-Pass Butterworth: Triệt tiêu rung gió & ù mic ({settings.highPassCutoff}Hz)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Notch Filter 50Hz/60Hz: Khử hoàn toàn tiếng vo ve nguồn điện AC</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Speech Presence Boost: Làm sáng phụ âm và âm rõ nét (+{activePresetInfo.speechBoostGainDb}dB ở 3kHz)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Smooth Noise Gate: Đóng cổng hạ sàn nhiễu giữa các từ ({activePresetInfo.gateThresholdDb}dB)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
