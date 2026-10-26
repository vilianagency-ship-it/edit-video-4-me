import React, { useState, useRef } from 'react';
import { X, Download, FileText, CheckCircle, Film, Sparkles, Loader2, Music } from 'lucide-react';
import { VideoClipSegment, TranscriptSegment, OverlayItem, SubtitleStyle, TransitionConfig, BackgroundMusicConfig } from '../types/editor';
import { formatTime, getActiveSubtitle, getActiveOverlays, rawToTimelineTime } from '../utils/timelineEngine';
import { getTransitionState } from '../utils/transitionEngine';
import { SUBTITLE_STYLES } from '../data/subtitlePresets';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  clips: VideoClipSegment[];
  segments: TranscriptSegment[];
  overlays: OverlayItem[];
  selectedSubtitleStyle: string;
  videoTitle: string;
  transitionConfig: TransitionConfig;
  backgroundMusic?: BackgroundMusicConfig;
  selectedLanguage?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  clips,
  segments,
  overlays,
  selectedSubtitleStyle,
  videoTitle,
  transitionConfig,
  backgroundMusic,
  selectedLanguage = 'vi',
}) => {
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const styleConfig = SUBTITLE_STYLES.find(s => s.id === selectedSubtitleStyle) || SUBTITLE_STYLES[0];
  const finalDuration = clips.length > 0 ? clips[clips.length - 1].timelineEnd : 0;

  // Generate .SRT Subtitle String
  const generateSrt = (): string => {
    let srt = '';
    let counter = 1;

    segments.forEach(seg => {
      if (seg.deleted) return;
      const startSrt = formatSrtTime(seg.start);
      const endSrt = formatSrtTime(seg.end);
      srt += `${counter}\n${startSrt} --> ${endSrt}\n${seg.text}\n\n`;
      counter++;
    });

    return srt;
  };

  const formatSrtTime = (sec: number): string => {
    const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(sec % 60).toString().padStart(2, '0');
    const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
    return `${hrs}:${mins}:${secs},${ms}`;
  };

  const handleDownloadSrt = () => {
    const srtText = generateSrt();
    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const langSuffix = selectedLanguage && selectedLanguage !== 'vi' ? `_${selectedLanguage}` : '';
    a.download = `${videoTitle || 'autocut_video'}${langSuffix}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadVtt = () => {
    const srtText = generateSrt();
    const vttText = `WEBVTT\n\n` + srtText.replace(/,/g, '.');
    const blob = new Blob([vttText], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const langSuffix = selectedLanguage && selectedLanguage !== 'vi' ? `_${selectedLanguage}` : '';
    a.download = `${videoTitle || 'autocut_video'}${langSuffix}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadEdlJson = () => {
    const edlData = {
      title: videoTitle,
      retainedClips: clips,
      segments,
      overlays,
      backgroundMusic,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(edlData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoTitle || 'autocut_project'}_edl.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Video Render with Canvas & MediaRecorder
  const handleRenderVideo = async () => {
    if (!videoUrl || clips.length === 0) return;
    setIsExportingVideo(true);
    setExportProgress(5);

    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.muted = false;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const width = 540;
      const height = 960; // 9:16 vertical
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Capture canvas stream
      const canvasStream = canvas.captureStream(30);

      // Web Audio capture from video
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(video);
      const audioDest = audioCtx.createMediaStreamDestination();
      source.connect(audioDest);
      source.connect(audioCtx.destination);

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm',
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: 'video/webm' });
        const finalUrl = URL.createObjectURL(finalBlob);
        setDownloadUrl(finalUrl);
        setIsExportingVideo(false);
        setExportProgress(100);
        audioCtx.close();
      };

      recorder.start();

      let currentClipIdx = 0;
      video.currentTime = clips[0].rawStart;
      await video.play();

      const renderInterval = setInterval(() => {
        const rawTime = video.currentTime;
        const currentClip = clips[currentClipIdx];

        if (!currentClip) {
          clearInterval(renderInterval);
          video.pause();
          recorder.stop();
          return;
        }

        // Check if reached end of current clip
        if (rawTime >= currentClip.rawEnd) {
          currentClipIdx++;
          if (currentClipIdx < clips.length) {
            video.currentTime = clips[currentClipIdx].rawStart;
          } else {
            clearInterval(renderInterval);
            video.pause();
            recorder.stop();
            return;
          }
        }

        // Draw video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Apply Transition Effect at jump cut boundaries
        const timelineTime = rawToTimelineTime(rawTime, clips);
        const transState = getTransitionState(timelineTime, clips, transitionConfig);
        if (transState.isActive && transState.type !== 'cut') {
          const p = transState.progress;
          ctx.save();
          if (transState.type === 'fade-black') {
            const opacity = 1 - Math.abs(p - 0.5) * 2;
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(1, opacity))})`;
            ctx.fillRect(0, 0, width, height);
          } else if (transState.type === 'fade-white') {
            const opacity = 1 - Math.abs(p - 0.5) * 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, opacity))})`;
            ctx.fillRect(0, 0, width, height);
          } else if (transState.type === 'dissolve') {
            const opacity = (1 - Math.abs(p - 0.5) * 2) * 0.45;
            ctx.fillStyle = `rgba(30, 27, 75, ${Math.max(0, Math.min(0.6, opacity))})`;
            ctx.fillRect(0, 0, width, height);
          } else if (transState.type === 'blur') {
            const opacity = (1 - Math.abs(p - 0.5) * 2) * 0.35;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(0.4, opacity))})`;
            ctx.fillRect(0, 0, width, height);
          }
          ctx.restore();
        }

        // Draw Subtitles
        const { segment: activeSeg, activeWordIndex } = getActiveSubtitle(rawTime, segments);
        if (activeSeg) {
          ctx.save();
          const subtitleY =
            styleConfig.position === 'top'
              ? height * 0.15
              : styleConfig.position === 'middle'
              ? height * 0.5
              : height * 0.82;

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `900 ${styleConfig.fontSize + 2}px sans-serif`;

          // Measure words
          let fullText = activeSeg.words.map(w => w.word).join(' ');
          if (styleConfig.textTransform === 'uppercase') fullText = fullText.toUpperCase();

          // Background box
          if (styleConfig.badgeBg) {
            const metrics = ctx.measureText(fullText);
            const boxW = metrics.width + 36;
            const boxH = 44;
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.beginPath();
            ctx.roundRect(width / 2 - boxW / 2, subtitleY - boxH / 2, boxW, boxH, 12);
            ctx.fill();
          }

          // Render active word with highlight
          ctx.fillStyle = styleConfig.highlightColor || '#FACC15';
          ctx.lineWidth = styleConfig.strokeWidth || 3;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(fullText, width / 2, subtitleY);
          ctx.fillText(fullText, width / 2, subtitleY);
          ctx.restore();
        }

        // Draw Overlays
        const activeOv = getActiveOverlays(rawTime, overlays);
        for (const ov of activeOv) {
          if (ov.type === 'badge') {
            ctx.save();
            ctx.fillStyle = 'rgba(30, 27, 75, 0.9)';
            ctx.strokeStyle = '#818CF8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(width / 2 - 140, 60, 280, 50, 14);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#C7D2FE';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ov.title.toUpperCase(), width / 2, 78);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(ov.content, width / 2, 96);
            ctx.restore();
          } else if (ov.type === 'sticker') {
            ctx.save();
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ov.content, width - 60, 120);
            ctx.restore();
          }
        }

        // Update progress
        const elapsedTimeline = clips
          .slice(0, currentClipIdx)
          .reduce((sum, c) => sum + c.duration, 0) + (rawTime - currentClip.rawStart);
        const percent = Math.min(99, Math.floor((elapsedTimeline / Math.max(1, finalDuration)) * 100));
        setExportProgress(percent);
      }, 33);
    } catch (err: any) {
      console.error('Export error:', err);
      setIsExportingVideo(false);
      alert('Không thể xuất video trực tiếp trong trình duyệt này. Bạn vẫn có thể tải tệp phụ đề SRT hoặc danh sách cắt EDL.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-base text-white">Xuất Video & Phụ Đề Hoàn Thiện</h3>
              <p className="text-[11px] text-slate-400">Đã áp dụng cắt bỏ khoảng lặng và chèn phụ đề viral</p>
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
          {/* Main Video Export Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Xuất Video Đã Cắt Ghép (WebM / MP4)
              </div>
              <span className="text-xs font-mono text-sky-400 font-semibold">
                {formatTime(finalDuration)}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Tự động ghép các đoạn nói chuyện, loại bỏ triệt để các khoảng nghỉ ngập ngừng và in chết phụ đề nhảy chữ (burned-in subtitles).
            </p>

            {backgroundMusic?.enabled && backgroundMusic?.track && (
              <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between text-xs">
                <span className="text-indigo-300 flex items-center gap-1.5 font-medium">
                  <Music className="w-3.5 h-3.5 text-indigo-400" />
                  Nhạc nền: <strong>{backgroundMusic.track.name}</strong>
                </span>
                <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {backgroundMusic.ducking.enabled
                    ? `Ducking: -${100 - backgroundMusic.ducking.duckedVolumePercent}%`
                    : 'Ducking Tắt'}
                </span>
              </div>
            )}

            {isExportingVideo ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Đang render video...</span>
                  <span className="text-sky-400 font-bold">{exportProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-150"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            ) : downloadUrl ? (
              <a
                href={downloadUrl}
                download={`${videoTitle || 'autocut_video'}_final.webm`}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
              >
                <CheckCircle className="w-4 h-4 text-slate-950" />
                Tải Video Xuống Máy Ngay
              </a>
            ) : (
              <button
                onClick={handleRenderVideo}
                className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Bắt Đầu Render & Xuất Video
              </button>
            )}
          </div>

          {/* Subtitle & EDL Formats */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={handleDownloadSrt}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition"
            >
              <FileText className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-xs font-bold text-white">Tải Phụ Đề .SRT</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Dành cho CapCut / Premiere</div>
            </button>

            <button
              onClick={handleDownloadVtt}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition"
            >
              <FileText className="w-4 h-4 text-indigo-400 mb-1" />
              <div className="text-xs font-bold text-white">Tải Phụ Đề .VTT</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Dành cho Web / YouTube</div>
            </button>

            <button
              onClick={handleDownloadEdlJson}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition"
            >
              <Film className="w-4 h-4 text-amber-400 mb-1" />
              <div className="text-xs font-bold text-white">Danh Sách Cắt EDL</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Tọa độ thời gian JSON</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
