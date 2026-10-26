import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Zap, Sparkles, Subtitles, Blend, Moon, Sun, ArrowLeft, ArrowRight, Eye, Scissors, Music, Activity } from 'lucide-react';
import { VideoClipSegment, TranscriptSegment, OverlayItem, SilenceGap, TransitionConfig, BackgroundMusicConfig, SubtitleSettings, IntroOutroConfig } from '../types/editor';
import { getJumpTargetForCut, getActiveSubtitle, getActiveOverlays, formatTime, rawToTimelineTime } from '../utils/timelineEngine';
import { getTransitionState } from '../utils/transitionEngine';
import { getEffectiveBgmVolume, isSpeechActiveAtTime } from '../utils/audioDucking';
import { SUBTITLE_STYLES } from '../data/subtitlePresets';
import { COLOR_PALETTES } from './ColorPaletteModal';

interface VideoPlayerProps {
  videoUrl: string;
  rawDuration: number;
  clips: VideoClipSegment[];
  silenceGaps?: SilenceGap[];
  segments: TranscriptSegment[];
  overlays: OverlayItem[];
  skipSilences: boolean;
  selectedSubtitleStyle: string;
  transitionConfig: TransitionConfig;
  backgroundMusic?: BackgroundMusicConfig;
  onOpenTransitions?: () => void;
  onOpenAudioManager?: () => void;
  currentTime: number; // raw time
  onTimeUpdate: (rawTime: number) => void;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  subtitleSettings?: SubtitleSettings;
  introOutroConfig?: IntroOutroConfig;
  colorPaletteId?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  rawDuration,
  clips,
  silenceGaps = [],
  segments,
  overlays,
  skipSilences,
  selectedSubtitleStyle,
  transitionConfig,
  backgroundMusic,
  onOpenTransitions,
  onOpenAudioManager,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onPlayStateChange,
  subtitleSettings,
  introOutroConfig,
  colorPaletteId,
}) => {
  const isDemo = videoUrl.startsWith('demo://');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isJumpHappening, setIsJumpHappening] = useState(false);
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);
  const [subtitlePosition, setSubtitlePosition] = useState<'bottom' | 'middle' | 'top'>('bottom');

  // Audio synthesis for procedural demo
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const baseStyleConfig = SUBTITLE_STYLES.find(s => s.id === selectedSubtitleStyle) || SUBTITLE_STYLES[0];
  const activePalette = COLOR_PALETTES.find(p => p.id === colorPaletteId) || COLOR_PALETTES[0];
  const styleConfig = {
    ...baseStyleConfig,
    highlightColor: activePalette.highlightColor,
  };
  const faceAvoidanceActive = subtitleSettings?.faceAvoidanceEnabled ?? true;
  const subEffectivePosition = faceAvoidanceActive ? 'bottom' : (subtitlePosition || styleConfig.position || 'bottom');

  // Active subtitles and overlays at current raw time
  const { segment: activeSegment, activeWordIndex } = getActiveSubtitle(currentTime, segments);
  const activeOverlays = getActiveOverlays(currentTime, overlays);
  const activeZoom = activeOverlays.find(o => o.type === 'zoom')?.zoomLevel || 1;

  const timelineDuration = clips.length > 0 ? clips[clips.length - 1].timelineEnd : rawDuration;
  const currentTimelineTime = rawToTimelineTime(currentTime, clips);
  const transitionState = getTransitionState(currentTimelineTime, clips, transitionConfig);

  // Setup Web Audio for demo video
  useEffect(() => {
    if (!isDemo) return;

    const initAudio = () => {
      if (audioCtxRef.current) return;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);

        osc.connect(gain);
        gain.connect(filter);
        filter.connect(ctx.destination);
        osc.start();

        audioCtxRef.current = ctx;
        oscRef.current = osc;
        gainRef.current = gain;
      } catch (e) {
        // AudioContext policy
      }
    };

    if (isPlaying) {
      initAudio();
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    }

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isDemo, isPlaying]);

  // Demo Canvas Render and Playback Loop
  useEffect(() => {
    if (!isDemo) return;

    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        const activeClip = clips.find(c => currentTime >= c.rawStart && currentTime <= c.rawEnd) || clips[0];
        const clipSpeed = activeClip?.speed || 1.0;
        let nextTime = currentTime + dt * playbackRate * clipSpeed;

        // Jump-cut auto skipping check
        if (skipSilences && clips.length > 0) {
          const jumpTarget = getJumpTargetForCut(nextTime, clips);
          if (jumpTarget !== null && Math.abs(jumpTarget - nextTime) > 0.05) {
            setIsJumpHappening(true);
            nextTime = jumpTarget;
            setTimeout(() => setIsJumpHappening(false), 200);
          }
        }

        if (nextTime >= rawDuration) {
          onPlayStateChange(false);
          nextTime = clips.length > 0 ? clips[0].rawStart : 0;
        }

        onTimeUpdate(nextTime);
      }

      // Draw Presenter Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPresenterFrame(ctx, canvas.width, canvas.height, currentTime);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isDemo, isPlaying, currentTime, playbackRate, skipSilences, clips, rawDuration, onTimeUpdate, onPlayStateChange]);

  // Audio volume modulation for demo
  useEffect(() => {
    if (!isDemo || !gainRef.current || !audioCtxRef.current) return;
    const isSilent = silenceGaps.some(
      g => g.cut && currentTime >= g.start && currentTime <= g.end
    );

    if (isSilent || isMuted || !isPlaying) {
      gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.02);
    } else {
      const voiceVolMultiplier = backgroundMusic?.voiceVolume ?? 1.0;
      const vol = (0.08 + Math.abs(Math.sin(currentTime * 18)) * 0.06) * voiceVolMultiplier;
      gainRef.current.gain.setTargetAtTime(vol, audioCtxRef.current.currentTime, 0.03);
      if (oscRef.current) {
        const pitch = 130 + Math.sin(currentTime * 4) * 15;
        oscRef.current.frequency.setValueAtTime(pitch, audioCtxRef.current.currentTime);
      }
    }
  }, [isDemo, currentTime, isPlaying, isMuted, silenceGaps, backgroundMusic?.voiceVolume]);

  // Dedicated Background Music (BGM) audio player & synchronizer
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync BGM source, loop and play/pause state
  useEffect(() => {
    if (!backgroundMusic?.enabled || !backgroundMusic?.track) {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
      }
      return;
    }

    const trackUrl = backgroundMusic.track.audioUrl;
    if (!bgmAudioRef.current) {
      const audio = new Audio(trackUrl);
      audio.loop = backgroundMusic.loop;
      bgmAudioRef.current = audio;
    } else if (bgmAudioRef.current.src !== trackUrl) {
      bgmAudioRef.current.src = trackUrl;
      bgmAudioRef.current.loop = backgroundMusic.loop;
    } else {
      bgmAudioRef.current.loop = backgroundMusic.loop;
    }

    if (isPlaying) {
      bgmAudioRef.current.play().catch(() => {});
    } else {
      bgmAudioRef.current.pause();
    }
  }, [backgroundMusic?.enabled, backgroundMusic?.track?.audioUrl, backgroundMusic?.loop, isPlaying]);

  // Sync BGM seek timestamp with video playhead
  useEffect(() => {
    const bgm = bgmAudioRef.current;
    if (!bgm || !backgroundMusic?.enabled || !backgroundMusic?.track) return;
    const dur = bgm.duration || backgroundMusic.track.duration || 12;
    if (dur > 0 && Number.isFinite(dur)) {
      const expectedBgmTime = backgroundMusic.loop ? (currentTime % dur) : Math.min(currentTime, dur);
      if (Math.abs(bgm.currentTime - expectedBgmTime) > 0.35) {
        bgm.currentTime = expectedBgmTime;
      }
    }
  }, [currentTime, backgroundMusic?.enabled, backgroundMusic?.track, backgroundMusic?.loop]);

  // Dynamic real-time auto-ducking volume modulation for BGM
  useEffect(() => {
    const bgm = bgmAudioRef.current;
    if (!bgm || !backgroundMusic?.enabled || !backgroundMusic?.track) return;

    if (isMuted || !isPlaying) {
      bgm.muted = isMuted;
      bgm.volume = 0;
    } else {
      bgm.muted = false;
      const effectiveVol = getEffectiveBgmVolume(currentTime, backgroundMusic, segments);
      bgm.volume = Math.max(0, Math.min(1, effectiveVol));
    }
  }, [currentTime, isPlaying, isMuted, backgroundMusic, segments]);

  // Cleanup BGM on unmount
  useEffect(() => {
    return () => {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
    };
  }, []);

  // Sync voice volume for real video element
  useEffect(() => {
    if (isDemo) return;
    const video = videoRef.current;
    if (!video) return;
    const voiceVol = backgroundMusic?.voiceVolume ?? 1.0;
    video.muted = isMuted;
    video.volume = isMuted ? 0 : Math.max(0, Math.min(1, voiceVol));
  }, [isDemo, isMuted, backgroundMusic?.voiceVolume]);

  // Real Video Element handling for uploaded files
  useEffect(() => {
    if (isDemo) return;
    const video = videoRef.current;
    if (!video) return;

    let animId: number;
    const checkJump = () => {
      if (video && !video.paused && skipSilences && clips.length > 0) {
        const rawTime = video.currentTime;
        const jumpTarget = getJumpTargetForCut(rawTime, clips);
        if (jumpTarget !== null && Math.abs(jumpTarget - rawTime) > 0.05) {
          setIsJumpHappening(true);
          video.currentTime = jumpTarget;
          setTimeout(() => setIsJumpHappening(false), 200);
        }
      }
      animId = requestAnimationFrame(checkJump);
    };

    animId = requestAnimationFrame(checkJump);
    return () => cancelAnimationFrame(animId);
  }, [isDemo, skipSilences, clips]);

  // Sync external currentTime changes for real video
  useEffect(() => {
    if (isDemo) return;
    const video = videoRef.current;
    if (video && Math.abs(video.currentTime - currentTime) > 0.25) {
      video.currentTime = currentTime;
    }
  }, [isDemo, currentTime]);

  // Sync video element playbackRate with active clip speed (Speed Ramp)
  useEffect(() => {
    if (isDemo) return;
    const video = videoRef.current;
    if (!video) return;
    const activeClip = clips.find(c => currentTime >= c.rawStart && currentTime <= c.rawEnd) || clips[0];
    const clipSpeed = activeClip?.speed || 1.0;
    if (video.playbackRate !== clipSpeed) {
      video.playbackRate = clipSpeed;
    }
  }, [currentTime, clips, isDemo]);

  // Sync play / pause for real video
  useEffect(() => {
    if (isDemo) return;
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying && video.paused) {
      video.play().catch(() => onPlayStateChange(false));
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isDemo, isPlaying, onPlayStateChange]);

  const drawPresenterFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    t: number
  ) => {
    const isSilent = silenceGaps.some(
      g => g.cut && t >= g.start && t <= g.end
    );

    // Studio Background
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.4, 50, width / 2, height / 2, width * 0.9);
    bgGrad.addColorStop(0, '#1E293B');
    bgGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ambient Lighting
    const rim = ctx.createLinearGradient(0, 0, width, height);
    rim.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
    rim.addColorStop(0.5, 'transparent');
    rim.addColorStop(1, 'rgba(168, 85, 247, 0.16)');
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, width, height);

    // Soundwave bars in background
    ctx.fillStyle = isSilent ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)';
    const bars = 22;
    const barW = (width - 60) / bars;
    for (let b = 0; b < bars; b++) {
      const h = isSilent ? 2 : 4 + Math.abs(Math.sin(t * 8 + b * 0.45)) * 34;
      ctx.fillRect(30 + b * barW, height * 0.14 - h / 2, barW - 4, h);
    }

    // Presenter
    const headCenterX = width / 2;
    const headCenterY = height * 0.43;

    // Body
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.ellipse(headCenterX, height * 0.77, 180, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar
    ctx.fillStyle = '#1D4ED8';
    ctx.beginPath();
    ctx.moveTo(headCenterX - 35, headCenterY + 140);
    ctx.lineTo(headCenterX + 35, headCenterY + 140);
    ctx.lineTo(headCenterX, headCenterY + 180);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(headCenterX - 30, headCenterY + 65, 60, 80);

    // Head
    ctx.beginPath();
    ctx.ellipse(headCenterX, headCenterY, 82, 102, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY - 45, 88, Math.PI, 0, false);
    ctx.lineTo(headCenterX + 82, headCenterY - 20);
    ctx.quadraticCurveTo(headCenterX, headCenterY - 110, headCenterX - 82, headCenterY - 20);
    ctx.closePath();
    ctx.fill();

    // Eyes
    const blink = Math.sin(t * 2.5) > 0.95;
    if (blink) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(headCenterX - 45, headCenterY - 10, 24, 3);
      ctx.fillRect(headCenterX + 21, headCenterY - 10, 24, 3);
    } else {
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(headCenterX - 32, headCenterY - 10, 9, 0, Math.PI * 2);
      ctx.arc(headCenterX + 32, headCenterY - 10, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(headCenterX - 34, headCenterY - 12, 3, 0, Math.PI * 2);
      ctx.arc(headCenterX + 30, headCenterY - 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headCenterX - 48, headCenterY - 28);
    ctx.quadraticCurveTo(headCenterX - 32, headCenterY - 34, headCenterX - 16, headCenterY - 26);
    ctx.moveTo(headCenterX + 16, headCenterY - 26);
    ctx.quadraticCurveTo(headCenterX + 32, headCenterY - 34, headCenterX + 48, headCenterY - 28);
    ctx.stroke();

    // Mouth
    ctx.fillStyle = '#881337';
    if (isSilent) {
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(headCenterX - 20, headCenterY + 44);
      ctx.quadraticCurveTo(headCenterX, headCenterY + 48, headCenterX + 20, headCenterY + 44);
      ctx.stroke();
    } else {
      const mouthOpen = 5 + Math.abs(Math.sin(t * 18)) * 16;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY + 44, 20, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(headCenterX - 13, headCenterY + 44 - mouthOpen * 0.6, 26, 4);
    }

    // Live Indicator badge
    ctx.fillStyle = isSilent ? '#EF4444' : '#10B981';
    ctx.beginPath();
    ctx.arc(36, 45, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
    ctx.fillText(
      isSilent ? 'ĐANG IM LẶNG (CẮT)' : 'ĐANG NÓI (GIỮ LẠI)',
      50,
      49
    );

    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText(`Raw Time: ${t.toFixed(1)}s`, 36, 75);
  };

  const togglePlay = () => {
    onPlayStateChange(!isPlaying);
  };

  const handleReplay = () => {
    const startTime = clips.length > 0 ? clips[0].rawStart : 0;
    if (isDemo) {
      onTimeUpdate(startTime);
    } else if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      onTimeUpdate(startTime);
    }
    if (!isPlaying) onPlayStateChange(true);
  };

  const handleToggleMute = () => {
    if (!isDemo && videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (!isDemo && videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const effectivePosition = subtitlePosition || styleConfig.position || 'bottom';

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-2 lg:p-4">
      {/* Video Viewport Container (9:16 vertical smartphone frame) */}
      <div
        ref={containerRef}
        className="relative aspect-[9/16] w-full max-w-[340px] sm:max-w-[360px] md:max-w-[380px] max-h-[64vh] rounded-2xl overflow-hidden bg-slate-950 shadow-2xl shadow-indigo-950/40 border border-slate-800 flex items-center justify-center select-none"
      >
        {/* Animated punch-in zoom wrapper */}
        <div
          className="w-full h-full transition-transform duration-200 ease-out origin-center flex items-center justify-center"
          style={{ transform: `scale(${activeZoom})` }}
        >
          {isDemo ? (
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="w-full h-full object-cover cursor-pointer"
              onClick={togglePlay}
            />
          ) : videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover cursor-pointer"
              playsInline
              onTimeUpdate={() => videoRef.current && onTimeUpdate(videoRef.current.currentTime)}
              onEnded={() => onPlayStateChange(false)}
              onClick={togglePlay}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <Zap className="w-12 h-12 text-sky-400 mb-3 animate-pulse" />
              <p className="font-semibold text-slate-200">Chưa tải video</p>
              <p className="text-xs text-slate-500 mt-1">Bấm "Video Mẫu" hoặc "Tải Video Lên" để bắt đầu</p>
            </div>
          )}
        </div>

        {/* Active Transition Effect Visual Layer */}
        {transitionState.isActive && (
          <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
            {transitionState.type === 'fade-black' && (
              <div
                className="w-full h-full bg-black transition-opacity"
                style={{ opacity: Math.sin(transitionState.progress * Math.PI) }}
              />
            )}
            {transitionState.type === 'fade-white' && (
              <div
                className="w-full h-full bg-white transition-opacity"
                style={{ opacity: Math.sin(transitionState.progress * Math.PI) * 0.95 }}
              />
            )}
            {transitionState.type === 'dissolve' && (
              <div
                className="w-full h-full bg-slate-950/60 backdrop-blur-md"
                style={{ opacity: Math.sin(transitionState.progress * Math.PI) * 0.7 }}
              />
            )}
            {transitionState.type === 'blur' && (
              <div
                className="w-full h-full backdrop-blur-lg"
                style={{ opacity: Math.sin(transitionState.progress * Math.PI) }}
              />
            )}
            {transitionState.type === 'slide-left' && (
              <div
                className="w-full h-full bg-gradient-to-r from-transparent via-sky-500/30 to-indigo-600/40 transform transition-transform"
                style={{
                  transform: `translateX(${(transitionState.progress - 0.5) * 100}%)`,
                }}
              />
            )}
            {transitionState.type === 'slide-right' && (
              <div
                className="w-full h-full bg-gradient-to-l from-transparent via-purple-500/30 to-sky-600/40 transform transition-transform"
                style={{
                  transform: `translateX(${-(transitionState.progress - 0.5) * 100}%)`,
                }}
              />
            )}
            {transitionState.type === 'zoom-in' && (
              <div
                className="w-full h-full ring-4 ring-sky-400/50 rounded-2xl transform"
                style={{
                  transform: `scale(${1 + Math.sin(transitionState.progress * Math.PI) * 0.15})`,
                  opacity: Math.sin(transitionState.progress * Math.PI),
                }}
              />
            )}
          </div>
        )}

        {/* Face Avoidance AI Active Badge */}
        {subtitleSettings?.faceAvoidanceEnabled && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 text-[10px] font-bold shadow-lg backdrop-blur border border-emerald-500/40 animate-in fade-in tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AI Face Avoidance: Safe Lower-Third</span>
          </div>
        )}

        {/* Jump-cut Visual Flash */}
        {isJumpHappening && (
          <div className="absolute top-16 left-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[11px] font-black shadow-lg animate-pulse tracking-wide">
            <Zap className="w-3 h-3 fill-current" />
            JUMP CUT ✂️
          </div>
        )}

        {/* Live Audio Ducking Badge */}
        {backgroundMusic?.enabled && backgroundMusic?.track && backgroundMusic.ducking.enabled && isSpeechActiveAtTime(currentTime, segments, backgroundMusic.ducking.thresholdPaddingSec) && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold shadow-lg backdrop-blur animate-in fade-in tracking-wide border border-amber-300">
            <Activity className="w-3 h-3 text-slate-950 animate-bounce" />
            <span>DUCKING (-{100 - backgroundMusic.ducking.duckedVolumePercent}%)</span>
          </div>
        )}

        {/* AI Intro / Outro Overlay */}
        {introOutroConfig?.enabled && (
          <>
            {/* Intro (first 3.2 seconds) */}
            {(introOutroConfig.type === 'intro' || introOutroConfig.type === 'both') && currentTime <= 3.2 && (
              <div className="absolute inset-0 z-40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                {introOutroConfig.logoUrl && (
                  <img
                    src={introOutroConfig.logoUrl}
                    alt="Brand Logo"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.5)] mb-4 animate-bounce"
                  />
                )}
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400 mb-2 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/30">
                  🎬 AI Intro Presentation ({introOutroConfig.templateStyle})
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg max-w-lg">
                  {introOutroConfig.title}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-300 mt-2 max-w-md drop-shadow">
                  {introOutroConfig.subtitle}
                </p>
              </div>
            )}

            {/* Outro (last 3.2 seconds) */}
            {(introOutroConfig.type === 'outro' || introOutroConfig.type === 'both') && currentTime >= timelineDuration - 3.2 && timelineDuration > 3.2 && (
              <div className="absolute inset-0 z-40 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                {introOutroConfig.logoUrl && (
                  <img
                    src={introOutroConfig.logoUrl}
                    alt="Brand Logo"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)] mb-4 animate-pulse"
                  />
                )}
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-2 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                  ✨ Cảm Ơn Đã Xem • Outro
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-lg">
                  {introOutroConfig.title}
                </h2>
                <p className="text-xs font-semibold text-sky-300 mt-2">
                  Đăng ký kênh & Bật chuông thông báo để không bỏ lỡ video mới!
                </p>
              </div>
            )}
          </>
        )}

        {/* Overlays Layer: Badges, Cinematic B-Roll & Illustrations */}
        <div className="absolute inset-0 pointer-events-none z-20 p-4 flex flex-col justify-between">
          {/* Top Overlays */}
          <div className="flex flex-col items-center gap-2">
            {activeOverlays
              .filter(o => o.position?.startsWith('top') || o.position === 'center')
              .map(overlay => {
                if (overlay.type === 'badge') {
                  return (
                    <div
                      key={overlay.id}
                      className="px-4 py-2 rounded-xl bg-slate-950/95 border border-sky-400/60 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200 text-center max-w-[92%]"
                    >
                      <div className="text-[10px] font-black uppercase tracking-widest text-sky-300">
                        {overlay.title}
                      </div>
                      <div className="text-xs font-extrabold text-white mt-0.5 drop-shadow-sm">
                        {overlay.content}
                      </div>
                    </div>
                  );
                }

                if (overlay.type === 'illustration') {
                  return (
                    <div
                      key={overlay.id}
                      className="p-2.5 rounded-2xl bg-slate-950/95 border border-indigo-400/60 shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-[96%] animate-in slide-in-from-top-4 duration-300"
                    >
                      {overlay.imageUrl ? (
                        <img
                          src={overlay.imageUrl}
                          alt={overlay.title}
                          className="w-16 h-16 rounded-xl object-cover bg-slate-900 border border-slate-700 shadow"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-indigo-500/20 flex items-center justify-center text-sky-400 border border-slate-700">
                          <Sparkles className="w-7 h-7" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-black text-white leading-tight">
                          {overlay.title}
                        </div>
                        <div className="text-[11px] font-medium text-slate-300 line-clamp-2 mt-0.5">
                          {overlay.content}
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
          </div>

          {/* Subtitles Layer (Karaoke word-by-word animation) */}
          {subtitlesVisible && (
            <div
              className={`w-full flex justify-center px-2 z-20 transition-all ${
                subEffectivePosition === 'top'
                  ? 'mt-8'
                  : subEffectivePosition === 'middle'
                  ? 'my-auto'
                  : 'mb-8'
              }`}
            >
              {activeSegment ? (
                <div
                  className="max-w-[98%] text-center px-4 py-2 rounded-xl transition-all duration-100 shadow-2xl backdrop-blur-md border border-white/20"
                  style={{
                    backgroundColor: styleConfig.badgeBg
                      ? styleConfig.backgroundColor || 'rgba(15,23,42,0.9)'
                      : 'rgba(0,0,0,0.85)',
                  }}
                >
                  {(() => {
                    const mult = subtitleSettings?.fontSizeMultiplier ?? 0.9;
                    const effectiveFontSize = Math.round(styleConfig.fontSize * mult);
                    const maxChars = subtitleSettings?.maxCharsPerLine ?? 35;

                    const lines: Array<typeof activeSegment.words> = [];
                    let currentLine: typeof activeSegment.words = [];
                    let currentLineChars = 0;

                    for (const w of activeSegment.words) {
                      if (w.deleted) continue;
                      const len = w.word.length + 1;
                      if (currentLine.length > 0 && currentLineChars + len > maxChars) {
                        lines.push(currentLine);
                        currentLine = [w];
                        currentLineChars = w.word.length;
                      } else {
                        currentLine.push(w);
                        currentLineChars += len;
                      }
                    }
                    if (currentLine.length > 0) {
                      lines.push(currentLine);
                    }

                    return (
                      <div className="flex flex-col items-center gap-1">
                        {lines.map((lineWords, lineIdx) => (
                          <div
                            key={lineIdx}
                            className="font-black tracking-wide leading-snug flex flex-wrap justify-center gap-x-1.5 gap-y-1"
                            style={{
                              fontFamily: styleConfig.fontFamily,
                              fontSize: `${effectiveFontSize}px`,
                              textTransform: styleConfig.textTransform,
                            }}
                          >
                            {lineWords.map((wordObj) => {
                              const globalIdx = activeSegment.words.findIndex(w => w.id === wordObj.id);
                              const isActive = globalIdx === activeWordIndex;

                              const isPopup = subtitleSettings?.wordPopupAnimation ?? true;

                              return (
                                <span
                                  key={wordObj.id}
                                  className={`inline-block transition-all duration-150 ${
                                    isActive
                                      ? isPopup
                                        ? 'scale-135 -translate-y-2 font-black z-10 animate-bounce'
                                        : 'scale-120 -translate-y-1 font-black z-10'
                                      : 'opacity-90'
                                  }`}
                                  style={{
                                    color: isActive
                                      ? styleConfig.highlightColor
                                      : styleConfig.color,
                                    WebkitTextStroke: styleConfig.strokeWidth
                                      ? `${styleConfig.strokeWidth}px ${styleConfig.strokeColor}`
                                      : 'none',
                                    paintOrder: 'stroke fill',
                                    textShadow: isActive
                                      ? `0 0 20px ${styleConfig.highlightColor}, 0 3px 6px rgba(0,0,0,0.9)`
                                      : '0 2px 4px rgba(0,0,0,0.9)',
                                  }}
                                >
                                  {wordObj.word}
                                </span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Subtitle placeholder helper if user video has no segment at this second */
                segments.length > 0 && (
                  <div className="text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800">
                    Đang phát video (Phụ đề sẽ hiện khi có giọng nói)
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Center Play Button when paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute z-30 w-16 h-16 rounded-full bg-sky-500/95 text-white flex items-center justify-center shadow-xl shadow-sky-500/30 backdrop-blur hover:scale-105 active:scale-95 transition"
            aria-label="Phát video"
          >
            <Play className="w-8 h-8 fill-current translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Modern Compact Player Control Bar */}
      <div className="w-full max-w-[340px] sm:max-w-[360px] md:max-w-[380px] mt-3 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition"
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={handleReplay}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Xem lại từ đầu"
            aria-label="Xem lại từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
            aria-label="Âm lượng"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Subtitle toggle button */}
          <button
            onClick={() => setSubtitlesVisible(!subtitlesVisible)}
            className={`p-1.5 rounded-lg text-xs font-black transition flex items-center gap-0.5 ${
              subtitlesVisible
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
            }`}
            title={subtitlesVisible ? 'Tắt hiển thị phụ đề' : 'Bật hiển thị phụ đề'}
          >
            <Subtitles className="w-3.5 h-3.5" />
            <span className="text-[10px]">CC</span>
          </button>

          {/* Subtitle position switch */}
          <button
            onClick={() => {
              const posList: ('bottom' | 'middle' | 'top')[] = ['bottom', 'middle', 'top'];
              const next = posList[(posList.indexOf(effectivePosition) + 1) % posList.length];
              setSubtitlePosition(next);
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] uppercase font-bold"
            title={`Vị trí phụ đề hiện tại: ${effectivePosition}. Bấm để đổi vị trí.`}
          >
            {effectivePosition === 'bottom' ? 'Dưới' : effectivePosition === 'middle' ? 'Giữa' : 'Trên'}
          </button>

          {/* Transitions button */}
          {onOpenTransitions && (
            <button
              onClick={onOpenTransitions}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-[10px] font-bold flex items-center gap-1 transition"
              title={`Chuyển cảnh hiện tại: ${transitionConfig.type}. Bấm để chọn hiệu ứng Fade, Dissolve, Slide...`}
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span className="capitalize">{transitionConfig.type === 'dissolve' ? 'Dissolve' : transitionConfig.type === 'fade-black' ? 'Chớp Đen' : transitionConfig.type === 'fade-white' ? 'Chớp Sáng' : transitionConfig.type === 'slide-left' ? 'Slide' : transitionConfig.type}</span>
            </button>
          )}

          {/* Audio Manager shortcut button */}
          {onOpenAudioManager && (
            <button
              onClick={onOpenAudioManager}
              className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                backgroundMusic?.enabled && backgroundMusic?.track
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
              title={
                backgroundMusic?.enabled && backgroundMusic?.track
                  ? `Nhạc nền: ${backgroundMusic.track.name} (${Math.round(backgroundMusic.volume * 100)}%). Bấm để quản lý âm thanh.`
                  : 'Bấm để thêm nhạc nền và bật Auto-Ducking'
              }
            >
              <Music className="w-3.5 h-3.5 text-indigo-400" />
              {backgroundMusic?.enabled && backgroundMusic?.track && (
                <span className="text-[10px] hidden sm:inline">
                  {backgroundMusic.ducking.enabled && isSpeechActiveAtTime(currentTime, segments, backgroundMusic.ducking.thresholdPaddingSec)
                    ? 'Ducking'
                    : 'BGM'}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Time display: Timeline / Raw */}
        <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
          <span className="text-sky-400 font-semibold">{formatTime(currentTimelineTime)}</span>
          <span>/</span>
          <span>{formatTime(timelineDuration)}</span>
        </div>

        {/* Speed button */}
        <button
          onClick={cyclePlaybackRate}
          className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono text-[11px] font-medium transition"
          title="Tốc độ phát"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};
