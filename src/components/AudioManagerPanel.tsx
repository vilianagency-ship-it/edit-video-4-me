import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Volume1,
  Upload,
  Play,
  Pause,
  Repeat,
  Sparkles,
  Sliders,
  CheckCircle2,
  Mic,
  Activity,
  Radio,
  FileAudio,
  Trash2,
  Info,
} from 'lucide-react';
import { BackgroundMusicConfig, BackgroundMusicTrack, TranscriptSegment } from '../types/editor';
import { getPresetTracks, DUCKING_PRESETS, isSpeechActiveAtTime, calculateDuckingGain } from '../utils/audioDucking';

interface AudioManagerPanelProps {
  config: BackgroundMusicConfig;
  onChangeConfig: (config: BackgroundMusicConfig) => void;
  segments: TranscriptSegment[];
  currentTime: number;
  videoDuration: number;
  onSeek?: (time: number) => void;
  voiceStylePreset?: string;
  onUpdateVoiceStylePreset?: (preset: string) => void;
}

export const AudioManagerPanel: React.FC<AudioManagerPanelProps> = ({
  config,
  onChangeConfig,
  segments,
  currentTime,
  videoDuration,
  voiceStylePreset,
  onUpdateVoiceStylePreset,
}) => {
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const presetTracks = getPresetTracks();

  // Determine live speech status and ducking gain at current playhead time
  const isSpeech = isSpeechActiveAtTime(
    currentTime,
    segments,
    config.ducking.thresholdPaddingSec
  );
  const currentDuckingGain = config.ducking.enabled
    ? calculateDuckingGain(currentTime, segments, config.ducking)
    : 1.0;
  const effectiveVolumePercent = Math.round(config.volume * currentDuckingGain * 100);

  // Handle preview playback of library presets
  const handleTogglePreview = (track: BackgroundMusicTrack) => {
    if (previewTrackId === track.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewTrackId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(track.audioUrl);
      audio.volume = config.volume;
      audio.onended = () => setPreviewTrackId(null);
      audio.play().catch(() => {});
      previewAudioRef.current = audio;
      setPreviewTrackId(track.id);
    }
  };

  // Cleanup preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Handle custom audio file upload (MP3, WAV, AAC, M4A)
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const customTrack: BackgroundMusicTrack = {
      id: `custom-bgm-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Tệp tải lên',
      category: 'custom',
      audioUrl: fileUrl,
      duration: 0, // Loaded asynchronously by player
    };

    // Calculate duration via temporary audio element
    const tempAudio = new Audio(fileUrl);
    tempAudio.onloadedmetadata = () => {
      customTrack.duration = tempAudio.duration;
      onChangeConfig({
        ...config,
        enabled: true,
        track: customTrack,
      });
    };
    tempAudio.onerror = () => {
      onChangeConfig({
        ...config,
        enabled: true,
        track: customTrack,
      });
    };

    if (e.target) {
      e.target.value = '';
    }
  };

  // Select a track as active BGM
  const handleSelectTrack = (track: BackgroundMusicTrack) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewTrackId(null);
    }
    onChangeConfig({
      ...config,
      enabled: true,
      track: track,
    });
  };

  // Remove BGM
  const handleRemoveTrack = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewTrackId(null);
    }
    onChangeConfig({
      ...config,
      track: null,
    });
  };

  // Quick ducking preset application
  const handleApplyDuckingPreset = (presetId: string) => {
    const preset = DUCKING_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    onChangeConfig({
      ...config,
      ducking: {
        ...config.ducking,
        duckedVolumePercent: preset.percent,
        attackSec: preset.attackSec,
        releaseSec: preset.releaseSec,
      },
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200 overflow-y-auto p-4 space-y-5 text-sm select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg"
        className="hidden"
        onChange={handleCustomAudioUpload}
      />

      {/* Top Banner / Master Toggle */}
      <div className="bg-gradient-to-r from-sky-950/70 via-indigo-950/60 to-slate-900 border border-sky-800/40 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-inner">
              <Music className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm sm:text-base">
                Trình Quản Lý Nhạc Nền & Ducking
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động hạ nhỏ âm lượng nhạc khi bạn cất lời nói
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => onChangeConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>

        {/* Live Audio Ducking Status Indicator */}
        {config.enabled && config.track && (
          <div className="mt-3 pt-3 border-t border-sky-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSpeech && config.ducking.enabled
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
              ></span>
              <span className="font-medium text-slate-300">
                {config.ducking.enabled ? (
                  isSpeech ? (
                    <span className="text-amber-300 flex items-center gap-1.5 font-bold">
                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                      Phát hiện giọng nói: Đang giảm nhạc ({config.ducking.duckedVolumePercent}%)
                    </span>
                  ) : (
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Khoảng lặng: Nhạc nền phát 100% âm lượng
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">Ducking đang tắt (Âm lượng cố định)</span>
                )}
              </span>
            </div>

            <div className="bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-700/60 font-mono text-[11px] text-sky-300">
              Mức hiện tại: <strong>{effectiveVolumePercent}%</strong>
            </div>
          </div>
        )}
      </div>

      {/* AI Voice Style Transfer & Mastering */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-purple-400" />
            <span>AI Voice Style Transfer & Master Tone</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
            Professional Studio
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Chuyển đổi phong cách giọng nói, cân bằng âm lượng và áp dụng hiệu ứng âm thanh chuyên nghiệp cho toàn bộ video.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { id: 'natural', name: 'Natural Clean', desc: 'Trung thực, sạch nhiễu' },
            { id: 'podcast-studio', name: 'Podcast Studio', desc: 'Nâng độ ấm, nén vocal' },
            { id: 'cinematic-deep', name: 'Cinematic Deep', desc: 'Trầm ấm uy lực (Trailer)' },
            { id: 'broadcast-clarity', name: 'Broadcast Clarity', desc: 'Phát thanh viên trong trẻo' },
            { id: 'warm-radio', name: 'Warm Radio Vintage', desc: 'Đài phát thanh hoài cổ' },
          ].map(preset => {
            const isSelected = (voiceStylePreset || 'podcast-studio') === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onUpdateVoiceStylePreset?.(preset.id)}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 ${
                  isSelected
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-sm shadow-purple-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{preset.name}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{preset.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Selected Track Card */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            Bản nhạc đang áp dụng
          </span>
          {config.track && (
            <button
              onClick={handleRemoveTrack}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              title="Gỡ bỏ bản nhạc hiện tại"
            >
              <Trash2 className="w-3 h-3" />
              Gỡ nhạc
            </button>
          )}
        </div>

        {config.track ? (
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="font-semibold text-slate-100 truncate text-sm">
                  {config.track.name}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold text-sky-400 border border-slate-700">
                    {config.track.category}
                  </span>
                  <span>{config.track.artist || 'AutoCut Library'}</span>
                  {config.track.bpm && <span>• {config.track.bpm} BPM</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2 shrink-0">
              <button
                onClick={() => handleTogglePreview(config.track!)}
                className={`p-2 rounded-lg border transition ${
                  previewTrackId === config.track.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Nghe thử"
              >
                {previewTrackId === config.track.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-5 border-2 border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
            Chưa có nhạc nền. Hãy chọn từ kho nhạc bên dưới hoặc tải lên tệp âm thanh của bạn!
          </div>
        )}
      </div>

      {/* Preset Music Library */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Kho Nhạc Nền Royalty-Free Tích Hợp
          </label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 transition flex items-center gap-1.5"
          >
            <Upload className="w-3 h-3" />
            Tải Nhạc Lên (.mp3 / .wav)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presetTracks.map(track => {
            const isSelected = config.track?.id === track.id;
            const isAuditioning = previewTrackId === track.id;

            return (
              <div
                key={track.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500/70 shadow-sm shadow-sky-950'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <button
                    onClick={() => handleTogglePreview(track)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition ${
                      isAuditioning
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title="Nghe thử"
                  >
                    {isAuditioning ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-200 truncate">
                      {track.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="capitalize">{track.category}</span>
                      {track.bpm && <span>• {track.bpm} BPM</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTrack(track)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1 ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span>Đang chọn</span>
                    </>
                  ) : (
                    <span>Chọn</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Volume & Audio Balance Sliders */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Cân Bằng Âm Lượng (Audio Mixer)
          </span>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
            <Repeat className="w-3.5 h-3.5 text-sky-400" />
            <span>Lặp lại nhạc</span>
            <input
              type="checkbox"
              checked={config.loop}
              onChange={e => onChangeConfig({ ...config, loop: e.target.checked })}
              className="accent-sky-500 rounded"
            />
          </label>
        </div>

        {/* BGM Master Volume */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1.5 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              Âm Lượng Nhạc Nền (BGM):
            </span>
            <span className="font-mono text-sky-400 font-bold">
              {Math.round(config.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={config.volume}
            onChange={e => onChangeConfig({ ...config, volume: parseFloat(e.target.value) })}
            className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Tắt (0%)</span>
            <span>Khuyên dùng (30% - 40%)</span>
            <span>Lớn (100%)</span>
          </div>
        </div>

        {/* Video / Voice Volume */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1.5 font-medium">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              Âm Lượng Giọng Nói (Voice Boost):
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {Math.round(config.voiceVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={config.voiceVolume}
            onChange={e => onChangeConfig({ ...config, voiceVolume: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>50%</span>
            <span>Chuẩn gốc (100%)</span>
            <span>Khuếch đại (150%)</span>
          </div>
        </div>
      </div>

      {/* AI Voice Enhancement Card */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950/80 to-slate-950 border border-emerald-800/40 rounded-xl p-4 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Tăng Cường Giọng Nói AI
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30 font-bold">
                  NEURAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Chuẩn hóa âm lượng & làm sạch giọng nói chuyên sâu
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.aiVoiceEnhancement?.enabled ?? false}
              onChange={e =>
                onChangeConfig({
                  ...config,
                  aiVoiceEnhancement: {
                    enabled: e.target.checked,
                    clarityBoost: config.aiVoiceEnhancement?.clarityBoost ?? true,
                    normalizeVolume: config.aiVoiceEnhancement?.normalizeVolume ?? true,
                    aggressiveness: config.aiVoiceEnhancement?.aggressiveness ?? 'studio',
                  },
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {config.aiVoiceEnhancement?.enabled && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-200">
            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    aiVoiceEnhancement: {
                      ...config.aiVoiceEnhancement!,
                      normalizeVolume: !config.aiVoiceEnhancement?.normalizeVolume,
                    },
                  })
                }
                className={`p-2 rounded-lg border text-left transition flex items-center justify-between text-xs ${
                  config.aiVoiceEnhancement?.normalizeVolume
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-medium">Chuẩn Hóa Âm Lượng</span>
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${config.aiVoiceEnhancement?.normalizeVolume ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>✓</span>
              </button>

              <button
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    aiVoiceEnhancement: {
                      ...config.aiVoiceEnhancement!,
                      clarityBoost: !config.aiVoiceEnhancement?.clarityBoost,
                    },
                  })
                }
                className={`p-2 rounded-lg border text-left transition flex items-center justify-between text-xs ${
                  config.aiVoiceEnhancement?.clarityBoost
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-medium">Tăng Độ Rõ (Presence)</span>
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${config.aiVoiceEnhancement?.clarityBoost ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>✓</span>
              </button>
            </div>

            {/* Aggressiveness selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-slate-400 font-semibold block">
                Mức độ xử lý thông minh:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['standard', 'studio'] as const).map(mode => {
                  const isActive = config.aiVoiceEnhancement?.aggressiveness === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() =>
                        onChangeConfig({
                          ...config,
                          aiVoiceEnhancement: {
                            ...config.aiVoiceEnhancement!,
                            aggressiveness: mode,
                          },
                        })
                      }
                      className={`p-2 rounded-lg border text-center transition text-xs font-semibold ${
                        isActive
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'standard' ? 'Cơ bản (Standard)' : 'Studio Chuyên Sâu'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-2.5 text-[11px] text-emerald-300/90 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Đang áp dụng mô hình lọc nhiễu nền nâng cao kết hợp nén dải động (Dynamic Compressor) và khử vang giọng nói theo thời gian thực.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Auto-Ducking Settings Box */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Tự Động Giảm Âm Lượng (Auto-Ducking)
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.ducking.enabled}
              onChange={e =>
                onChangeConfig({
                  ...config,
                  ducking: { ...config.ducking, enabled: e.target.checked },
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {config.ducking.enabled ? (
          <div className="space-y-4">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">
                Mức độ giảm âm lượng (Presets):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DUCKING_PRESETS.map(preset => {
                  const isActive =
                    config.ducking.duckedVolumePercent === preset.percent &&
                    config.ducking.attackSec === preset.attackSec;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyDuckingPreset(preset.id)}
                      className={`p-2 rounded-xl text-left border transition flex flex-col justify-between ${
                        isActive
                          ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 shadow-sm'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{preset.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                        Còn {preset.percent}% vol
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-900">
              {/* Ducked Volume Percentage */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Âm lượng nhạc khi có tiếng nói:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {config.ducking.duckedVolumePercent}% (Giảm{' '}
                    {100 - config.ducking.duckedVolumePercent}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={config.ducking.duckedVolumePercent}
                  onChange={e =>
                    onChangeConfig({
                      ...config,
                      ducking: {
                        ...config.ducking,
                        duckedVolumePercent: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Attack and Release ramps */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Hạ âm (Attack):</span>
                    <span className="font-mono text-sky-400">
                      {Math.round(config.ducking.attackSec * 1000)}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.5"
                    step="0.02"
                    value={config.ducking.attackSec}
                    onChange={e =>
                      onChangeConfig({
                        ...config,
                        ducking: {
                          ...config.ducking,
                          attackSec: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Hồi phục (Release):</span>
                    <span className="font-mono text-emerald-400">
                      {Math.round(config.ducking.releaseSec * 1000)}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.9"
                    step="0.05"
                    value={config.ducking.releaseSec}
                    onChange={e =>
                      onChangeConfig({
                        ...config,
                        ducking: {
                          ...config.ducking,
                          releaseSec: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
            Ducking đang tắt. Khi tắt tính năng này, nhạc nền sẽ giữ nguyên âm lượng không đổi trong suốt video mà không tự động né lời nói.
          </div>
        )}
      </div>

      {/* Helpful Studio Tip */}
      <div className="bg-sky-950/20 border border-sky-900/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200 block mb-0.5">Mẹo Biên Tập Studio:</strong>
          Hệ thống đồng bộ trực tiếp với các mốc thời gian lời thoại trong kịch bản. Khi bạn bấm Play hoặc tua trên timeline, âm thanh sẽ tự động né giọng nói một cách mượt mà và tự nhiên nhất.
        </div>
      </div>
    </div>
  );
};
