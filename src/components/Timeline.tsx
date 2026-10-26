import React, { useRef, useState } from 'react';
import { Scissors, Undo2, Sparkles, MessageSquare, Volume2, Image as ImageIcon, Music, Activity, ZoomIn, ZoomOut, Gauge, Flag, Video } from 'lucide-react';
import { VideoClipSegment, SilenceGap, TranscriptSegment, OverlayItem, TransitionConfig, BackgroundMusicConfig, TimelineMarker } from '../types/editor';
import { formatTime } from '../utils/timelineEngine';

interface TimelineProps {
  rawDuration: number;
  currentTime: number;
  onSeek: (rawTime: number) => void;
  silenceGaps: SilenceGap[];
  clips: VideoClipSegment[];
  segments: TranscriptSegment[];
  overlays: OverlayItem[];
  transitionConfig: TransitionConfig;
  backgroundMusic?: BackgroundMusicConfig;
  onOpenTransitions?: () => void;
  onOpenAudioManager?: () => void;
  onToggleSilenceCut: (gapId: string) => void;
  onCutAllSilences: () => void;
  onRestoreAllSilences: () => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  onUpdateClipSpeed?: (clipId: string, speed: number) => void;
  timelineMarkers?: TimelineMarker[];
  onAutoGenerateMarkers?: () => void;
  onAiCameraMotion?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  rawDuration,
  currentTime,
  onSeek,
  silenceGaps,
  clips,
  segments,
  overlays,
  transitionConfig,
  backgroundMusic,
  onOpenTransitions,
  onOpenAudioManager,
  onToggleSilenceCut,
  onCutAllSilences,
  onRestoreAllSilences,
  zoomLevel,
  onZoomChange,
  onUpdateClipSpeed,
  timelineMarkers = [],
  onAutoGenerateMarkers,
  onAiCameraMotion,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalZoom, setInternalZoom] = useState(1.0);
  const currentZoom = zoomLevel ?? internalZoom;

  const handleZoom = (newZoom: number) => {
    const clamped = Math.max(1.0, Math.min(4.0, newZoom));
    if (onZoomChange) onZoomChange(clamped);
    setInternalZoom(clamped);
  };

  const duration = Math.max(1, rawDuration);
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));
    const targetRawTime = percent * duration;
    onSeek(targetRawTime);
  };

  const cutGapsCount = silenceGaps.filter(g => g.cut).length;
  const totalCutDuration = silenceGaps
    .filter(g => g.cut)
    .reduce((acc, g) => acc + g.duration, 0);

  return (
    <div className="w-full bg-slate-950 border-t border-slate-800 p-3 select-none flex flex-col gap-2">
      {/* Timeline Controls & Quick Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Timeline Biên Tập (Markers & Speed)
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Điểm nhấn:{' '}
            <span className="text-amber-400 font-bold">{timelineMarkers.length}</span> mốc | Khoảng lặng:{' '}
            <span className="text-amber-400 font-bold">{cutGapsCount}</span> đoạn
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Markers Button */}
          {onAutoGenerateMarkers && (
            <button
              onClick={onAutoGenerateMarkers}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition flex items-center gap-1.5 shadow"
              title="AI phân tích kịch bản để tự động đặt các điểm nhấn quan trọng"
            >
              <Flag className="w-3 h-3 text-amber-400" />
              <span>AI Đặt Điểm Nhấn (Markers)</span>
            </button>
          )}

          {/* AI Camera Motion Button */}
          {onAiCameraMotion && (
            <button
              onClick={onAiCameraMotion}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition flex items-center gap-1.5 shadow"
              title="Tự động tạo hiệu ứng zoom-in và zoom-out (camera movement) chuyên nghiệp tại các vị trí marker"
            >
              <Video className="w-3 h-3 text-indigo-400" />
              <span>🎥 AI Camera Motion</span>
            </button>
          )}

          {/* Timeline Zoom Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-1 py-0.5 text-slate-300">
            <button
              onClick={() => handleZoom(currentZoom - 0.5)}
              disabled={currentZoom <= 1.0}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition text-sky-400"
              title="Thu nhỏ timeline (Zoom Out)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-sky-300">
              {currentZoom.toFixed(1)}x
            </span>
            <button
              onClick={() => handleZoom(currentZoom + 0.5)}
              disabled={currentZoom >= 4.0}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition text-sky-400"
              title="Phóng to timeline (Zoom In)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenAudioManager && (
            <button
              onClick={onOpenAudioManager}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition flex items-center gap-1.5"
              title="Mở trình quản lý âm thanh và nhạc nền"
            >
              <Music className="w-3 h-3 text-indigo-400" />
              <span>Nhạc Nền</span>
            </button>
          )}

          {onOpenTransitions && (
            <button
              onClick={onOpenTransitions}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition flex items-center gap-1"
              title="Chọn hiệu ứng chuyển cảnh"
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Chuyển Cảnh</span>
            </button>
          )}

          <button
            onClick={onCutAllSilences}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition flex items-center gap-1"
          >
            <Scissors className="w-3 h-3" />
            Cắt Hết Khoảng Lặng
          </button>

          <button
            onClick={onRestoreAllSilences}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition flex items-center gap-1"
          >
            <Undo2 className="w-3 h-3" />
            Gốc
          </button>
        </div>
      </div>

      {/* Main Track Area with Horizontal Scroll & Zoom */}
      <div className="relative w-full bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto pt-4">
        {/* AI Markers Pins Track Bar */}
        {timelineMarkers.length > 0 && (
          <div className="absolute top-1 left-0 right-0 h-4 z-40 pointer-events-none px-2.5">
            <div className="relative w-full h-full" style={{ width: `${currentZoom * 100}%`, minWidth: '100%' }}>
              {timelineMarkers.map(m => {
                const left = (m.time / duration) * 100;
                return (
                  <div
                    key={m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(m.time);
                    }}
                    className="absolute transform -translate-x-1/2 cursor-pointer pointer-events-auto group flex flex-col items-center"
                    style={{ left: `${left}%` }}
                    title={`Mốc điểm nhấn [${m.type.toUpperCase()}] ${m.label} (${formatTime(m.time)})`}
                  >
                    <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md group-hover:scale-125 transition flex items-center justify-center">
                      <Flag className="w-2 h-2 text-slate-950 fill-current" />
                    </div>
                    <div className="hidden group-hover:flex absolute top-4 bg-slate-900 border border-amber-400/60 text-[10px] text-amber-200 px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50">
                      ⭐ {m.label} ({formatTime(m.time)})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          onClick={handleTrackClick}
          className="relative bg-slate-900 p-2.5 cursor-pointer flex flex-col gap-2 min-h-[140px]"
          style={{ width: `${currentZoom * 100}%`, minWidth: '100%' }}
        >
          {/* Playhead Vertical Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none transition-all duration-75 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-3 h-3.5 bg-rose-500 -ml-1.5 rounded-sm flex items-center justify-center shadow">
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Track 1: Audio / Video & Silence Cuts */}
          <div className="relative h-10 w-full bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800/80 flex items-center">
            <div className="absolute left-2 text-[10px] text-slate-400 font-semibold z-10 flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded">
              <Volume2 className="w-3 h-3 text-sky-400" />
              Video & Âm Thanh (Speed Ramp)
            </div>

            {/* Retained Clips (Speech) */}
            {clips.map(clip => {
              const left = (clip.rawStart / duration) * 100;
              const width = (clip.duration / duration) * 100;
              const clipSpeed = clip.speed || 1.0;

              return (
                <div
                  key={clip.id}
                  className="absolute top-1 bottom-1 bg-indigo-600/40 border border-indigo-400/40 rounded flex items-center justify-between px-2 overflow-hidden group"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`Đoạn nói: ${formatTime(clip.rawStart)} - ${formatTime(clip.rawEnd)} (Tốc độ: ${clipSpeed}x)`}
                >
                  {/* Visual Audio Waveform bars */}
                  <div className="absolute inset-0 w-full h-full flex items-center justify-around opacity-40 px-1 pointer-events-none">
                    {Array.from({ length: Math.max(3, Math.floor(clip.duration * 4 * currentZoom)) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-sky-300 rounded-full"
                        style={{
                          height: `${30 + Math.sin(i * 1.5) * 45}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Speed Ramp Badge per clip */}
                  <div className="relative z-10 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
                        const currentIdx = speeds.indexOf(clipSpeed);
                        const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
                        onUpdateClipSpeed?.(clip.id, nextSpeed);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition shadow flex items-center gap-1 ${
                        clipSpeed !== 1.0
                          ? 'bg-amber-500 text-slate-950 border border-amber-300'
                          : 'bg-slate-950/90 text-sky-300 border border-slate-700 hover:bg-slate-900'
                      }`}
                      title="Bấm để đổi tốc độ (Speed Ramp: 0.5x -> 2.0x)"
                    >
                      <Gauge className="w-2.5 h-2.5" />
                      <span>{clipSpeed}x</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Silence Gaps (Cuts) */}
            {silenceGaps.map(gap => {
              const left = (gap.start / duration) * 100;
              const width = (gap.duration / duration) * 100;

              return (
                <div
                  key={gap.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSilenceCut(gap.id);
                  }}
                  className={`absolute top-0 bottom-0 z-20 transition cursor-pointer flex items-center justify-center border-x ${
                    gap.cut
                      ? 'bg-rose-500/25 border-rose-500 text-rose-300 hover:bg-rose-500/40'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={gap.cut ? `Cắt khoảng lặng ${gap.duration}s (Bấm để khôi phục)` : `Đã giữ lại ${gap.duration}s (Bấm để cắt)`}
                >
                  {gap.duration > 0.2 && (
                    <div className="flex items-center gap-0.5 text-[9px] font-bold">
                      <Scissors className={`w-2.5 h-2.5 ${gap.cut ? 'text-rose-400' : 'text-amber-400'}`} />
                      {currentZoom >= 1.5 && <span className="hidden sm:inline">{gap.duration.toFixed(1)}s</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Track 2: Subtitle Phrase Track */}
          <div className="relative h-7 w-full bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800/80 flex items-center">
            <div className="absolute left-2 text-[10px] text-slate-400 font-semibold z-10 flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded">
              <MessageSquare className="w-3 h-3 text-emerald-400" />
              Phụ Đề
            </div>

            {segments.map(seg => {
              if (seg.deleted) return null;
              const left = (seg.start / duration) * 100;
              const width = ((seg.end - seg.start) / duration) * 100;

              return (
                <div
                  key={seg.id}
                  className="absolute top-1 bottom-1 bg-emerald-500/20 border border-emerald-400/40 rounded px-1.5 flex items-center text-[10px] text-emerald-200 truncate"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={seg.text}
                >
                  <span className="truncate">{seg.text}</span>
                </div>
              );
            })}
          </div>

          {/* Track 3: AI Overlays Track (Badges & Illustrations) */}
          <div className="relative h-7 w-full bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800/80 flex items-center">
            <div className="absolute left-2 text-[10px] text-slate-400 font-semibold z-10 flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded">
              <ImageIcon className="w-3 h-3 text-amber-400" />
              Minh Họa & Sticker
            </div>

            {overlays.map(overlay => {
              const left = (overlay.start / duration) * 100;
              const width = (overlay.duration / duration) * 100;

              return (
                <div
                  key={overlay.id}
                  className="absolute top-1 bottom-1 bg-amber-500/20 border border-amber-400/40 rounded px-1.5 flex items-center text-[10px] text-amber-200 truncate gap-1"
                  style={{ left: `${left}%`, width: `${Math.max(2, width)}%` }}
                  title={`${overlay.type.toUpperCase()}: ${overlay.title}`}
                >
                  <span>{overlay.type === 'sticker' ? overlay.content : '✨'}</span>
                  <span className="truncate">{overlay.title}</span>
                </div>
              );
            })}
          </div>

          {/* Track 4: Background Music Track with live Auto-Ducking indicators */}
          {backgroundMusic?.enabled && (
            <div className="relative h-8 w-full bg-slate-950/80 rounded-lg overflow-hidden border border-sky-900/40 flex items-center">
              <div className="absolute left-2 text-[10px] text-sky-400 font-semibold z-10 flex items-center gap-1.5 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800">
                <Music className="w-3 h-3 text-sky-400" />
                <span className="truncate max-w-[150px] sm:max-w-[200px]">
                  BGM: {backgroundMusic.track?.name || 'Chưa chọn'}
                </span>
                {backgroundMusic.ducking.enabled && (
                  <span className="text-[9px] text-amber-400 ml-1 font-mono font-normal flex items-center gap-0.5">
                    <Activity className="w-2.5 h-2.5 text-amber-400" />
                    Ducking: -{100 - backgroundMusic.ducking.duckedVolumePercent}%
                  </span>
                )}
              </div>

              {/* Base waveform audio bars */}
              <div className="w-full h-full flex items-center justify-around opacity-25 px-2 pointer-events-none">
                {Array.from({ length: Math.round(44 * currentZoom) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-sky-400 rounded-full"
                    style={{ height: `${25 + Math.sin(i * 0.75) * 45}%` }}
                  />
                ))}
              </div>

              {/* Ducked zones where speech is happening */}
              {backgroundMusic.ducking.enabled &&
                segments
                  .filter(s => !s.deleted)
                  .map(seg => {
                    const left = (seg.start / duration) * 100;
                    const width = ((seg.end - seg.start) / duration) * 100;

                    return (
                      <div
                        key={`duck-${seg.id}`}
                        className="absolute top-0.5 bottom-0.5 bg-amber-500/20 border-y border-amber-500/60 flex items-center justify-center text-[9px] font-mono text-amber-300 pointer-events-none"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`Tự động giảm âm lượng BGM xuống ${backgroundMusic.ducking.duckedVolumePercent}% khi có lời nói`}
                      >
                        <div className="flex items-center gap-0.5 opacity-90 scale-90">
                          <Activity className="w-2.5 h-2.5 text-amber-400" />
                          <span className="hidden md:inline">Ducking ({backgroundMusic.ducking.duckedVolumePercent}%)</span>
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
