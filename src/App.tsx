/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { TranscriptEditor } from './components/TranscriptEditor';
import { OverlaysPanel } from './components/OverlaysPanel';
import { SilenceSettingsModal } from './components/SilenceSettingsModal';
import { ExportModal } from './components/ExportModal';
import { CameraRecorderModal } from './components/CameraRecorderModal';
import { TransitionModal } from './components/TransitionModal';
import { AudioManagerPanel } from './components/AudioManagerPanel';
import { IntroOutroModal } from './components/IntroOutroModal';
import { ColorPaletteModal, COLOR_PALETTES, ColorPalette } from './components/ColorPaletteModal';
import { ChaptersBar } from './components/ChaptersBar';
import { DEMO_PROJECT_VI, AVAILABLE_LANGUAGES } from './data/subtitlePresets';
import { INITIAL_BROLL_LIBRARY } from './data/brollLibrary';
import { VideoProject, SilenceSettings, OverlayItem, TranscriptSegment, NoiseReductionSettings, BRollAsset, TimelineMarker, VideoChapter } from './types/editor';
import { DEFAULT_BGM_CONFIG } from './utils/audioDucking';
import { computeRetainedClips } from './utils/silenceDetector';
import { createDemoVideoBlob } from './utils/demoGenerator';
import { analyzeAudioSilences } from './utils/audioAnalyzer';
import { audioBufferToWavBase64 } from './utils/audioEncoder';
import { DEFAULT_NOISE_REDUCTION_SETTINGS, applyNoiseReductionToAudioBuffer } from './utils/noiseReductionFilter';
import { Loader2, Type, Sparkles, AlertCircle, CheckCircle2, Music, Languages } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<VideoProject>(DEMO_PROJECT_VI);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [isCategorizingBRoll, setIsCategorizingBRoll] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'transcript' | 'overlays' | 'audio'>('transcript');
  const [noiseReductionSettings, setNoiseReductionSettings] = useState<NoiseReductionSettings>(
    project.noiseReductionSettings || DEFAULT_NOISE_REDUCTION_SETTINGS
  );
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [isIntroOutroOpen, setIsIntroOutroOpen] = useState(false);
  const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentAudioBase64Ref = useRef<string | null>(null);
  const currentAudioBufferRef = useRef<AudioBuffer | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };


  // Derive retained clips based on silence gaps and skipSilences setting
  const clips = useMemo(() => {
    let baseClips = !project.skipSilences
      ? [
          {
            id: 'clip-all',
            rawStart: 0,
            rawEnd: project.videoDuration,
            timelineStart: 0,
            timelineEnd: project.videoDuration,
            duration: project.videoDuration,
            speed: 1.0,
          },
        ]
      : computeRetainedClips(project.videoDuration, project.silenceGaps);

    return baseClips.map(clip => ({
      ...clip,
      speed: project.clipSpeeds?.[clip.id] ?? clip.speed ?? 1.0,
    }));
  }, [project.videoDuration, project.silenceGaps, project.skipSilences, project.clipSpeeds]);

  // Statistics on cut silences
  const savedStats = useMemo(() => {
    if (!project.skipSilences) return { seconds: 0, percentage: 0 };
    const cutDuration = project.silenceGaps
      .filter(g => g.cut)
      .reduce((acc, g) => acc + g.duration, 0);
    const percentage = project.videoDuration > 0
      ? Math.min(100, (cutDuration / project.videoDuration) * 100)
      : 0;
    return { seconds: cutDuration, percentage };
  }, [project.silenceGaps, project.videoDuration, project.skipSilences]);

  // Active subtitle language and currently displayed segments (translated or original)
  const activeLanguage = project.selectedLanguage || 'vi';
  const activeSegments = useMemo(() => {
    if (activeLanguage !== 'vi' && project.translations?.[activeLanguage]) {
      return project.translations[activeLanguage];
    }
    return project.segments;
  }, [project.segments, project.translations, activeLanguage]);

  // On initial mount: show welcome toast and synthesize demo audio buffer
  useEffect(() => {
    showToast('AutoCut Studio đã sẵn sàng! Bấm Play để xem video mẫu.', 'info');

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const ctx = new AudioCtxClass();
        const sampleRate = ctx.sampleRate;
        const duration = 4.0;
        const totalSamples = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < totalSamples; i++) {
          const t = i / sampleRate;
          // Background 50Hz electrical hum + rumble + air conditioning hiss
          const hum = 0.16 * Math.sin(2 * Math.PI * 50 * t);
          const rumble = 0.10 * Math.sin(2 * Math.PI * 45 * t);
          const hiss = (Math.random() * 2 - 1) * 0.05;
          // Voice phonemes
          let voice = 0;
          if ((t >= 0.4 && t <= 1.8) || (t >= 2.2 && t <= 3.7)) {
            voice =
              0.42 * Math.sin(2 * Math.PI * 220 * t) +
              0.28 * Math.sin(2 * Math.PI * 440 * t) +
              0.18 * Math.sin(2 * Math.PI * 880 * t) +
              0.12 * Math.sin(2 * Math.PI * 1760 * t);
          }
          samples[i] = hum + rumble + hiss + voice;
        }
        currentAudioBufferRef.current = buffer;
        setCurrentAudioBuffer(buffer);
        ctx.close();
      }
    } catch {}
  }, []);

  // Handler for updating noise reduction settings
  const handleUpdateNoiseReductionSettings = (newSettings: NoiseReductionSettings) => {
    setNoiseReductionSettings(newSettings);
    setProject(prev => ({
      ...prev,
      noiseReductionSettings: newSettings,
    }));
    showToast(
      newSettings.enabled
        ? `Đã bật bộ lọc tạp âm AI (${newSettings.preset === 'balanced' ? 'Cân bằng' : newSettings.preset === 'light' ? 'Nhẹ' : 'Khử ồn sâu'}).`
        : 'Đã tắt bộ lọc tạp âm. Sẽ dùng âm thanh gốc khi tạo phụ đề.',
      'info'
    );
  };

  // Reload demo video
  const handleLoadDemo = () => {
    currentAudioBase64Ref.current = null;
    setProject({
      ...DEMO_PROJECT_VI,
      videoUrl: 'demo://talking-head',
      noiseReductionSettings,
    });
    setCurrentTime(0);
    setIsPlaying(false);
    showToast('Đã tải lại video mẫu hoàn chỉnh!', 'success');
  };

  // Upload user's video file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingMsg('Đang giải mã âm thanh & phát hiện khoảng lặng...');

    try {
      const videoUrl = URL.createObjectURL(file);
      const audioAnalysis = await analyzeAudioSilences(file, project.silenceSettings);

      // Save raw audio buffer for preview and reprocessing
      currentAudioBufferRef.current = audioAnalysis.audioBuffer;
      setCurrentAudioBuffer(audioAnalysis.audioBuffer);

      // Extract and clean audio if noise reduction filter is enabled
      let audioBase64: string | null = null;
      try {
        let bufferToEncode = audioAnalysis.audioBuffer;
        if (noiseReductionSettings.enabled) {
          setProcessingMsg('Đang kích hoạt bộ lọc tạp âm nền (Khử tiếng ù, rít mic)...');
          bufferToEncode = await applyNoiseReductionToAudioBuffer(
            audioAnalysis.audioBuffer,
            noiseReductionSettings
          );
        }
        setProcessingMsg('Gemini AI đang lắng nghe âm thanh và tạo phụ đề chính xác...');
        audioBase64 = audioBufferToWavBase64(bufferToEncode);
        currentAudioBase64Ref.current = audioBase64;
      } catch (encErr) {
        console.warn('Audio encoding/filtering error:', encErr);
      }

      // Call AI to transcribe audio and align word timestamps with actual audio
      let generatedSegments: TranscriptSegment[] = [];
      try {
        const transcribeRes = await fetch('/api/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoDuration: audioAnalysis.duration,
            filename: file.name,
            audioBase64,
            mimeType: 'audio/wav',
            noiseReduced: noiseReductionSettings.enabled,
          }),
        });
        const transcribeData = await transcribeRes.json();
        if (transcribeData.segments && Array.isArray(transcribeData.segments)) {
          generatedSegments = transcribeData.segments;
        }
      } catch (sttErr) {
        console.warn('STT API error:', sttErr);
      }

      // Call AI to generate professional B-roll cards and title badges matching real transcript
      let generatedOverlays: OverlayItem[] = [];
      try {
        const scriptText = generatedSegments.map(s => s.text).join('. ');
        const overlayRes = await fetch('/api/analyze-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: scriptText || file.name,
            videoDuration: audioAnalysis.duration,
          }),
        });
        const overlayData = await overlayRes.json();
        if (overlayData.overlays && Array.isArray(overlayData.overlays)) {
          generatedOverlays = overlayData.overlays;
        }
      } catch (ovErr) {
        console.warn('Overlay generation error:', ovErr);
      }

      setProject({
        id: `project-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        videoUrl,
        videoDuration: audioAnalysis.duration,
        videoWidth: 720,
        videoHeight: 1280,
        silenceGaps: audioAnalysis.gaps,
        segments: generatedSegments,
        overlays: generatedOverlays,
        silenceSettings: project.silenceSettings,
        skipSilences: true,
        selectedSubtitleStyle: project.selectedSubtitleStyle,
        transitionConfig: project.transitionConfig || { type: 'dissolve', duration: 0.25 },
        noiseReductionSettings,
        backgroundMusic: project.backgroundMusic,
      });

      setCurrentTime(0);
      showToast(
        noiseReductionSettings.enabled
          ? `Đã lọc sạch tạp âm & phiên âm: ${generatedSegments.length} câu, ${audioAnalysis.gaps.length} khoảng lặng!`
          : `Đã phiên âm giọng nói thật: ${generatedSegments.length} câu & ${audioAnalysis.gaps.length} khoảng lặng!`,
        'success'
      );
    } catch (err: any) {
      console.error('File analysis error:', err);
      showToast(err.message || 'Lỗi khi phân tích tệp video', 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // When webcam recording finishes
  const handleRecordingComplete = async (blob: Blob, videoUrl: string) => {
    setIsCameraOpen(false);
    setIsProcessing(true);
    setProcessingMsg('Đang phân tích âm thanh webcam & phát hiện khoảng lặng...');

    try {
      const audioAnalysis = await analyzeAudioSilences(blob, project.silenceSettings);

      currentAudioBufferRef.current = audioAnalysis.audioBuffer;
      setCurrentAudioBuffer(audioAnalysis.audioBuffer);

      let audioBase64: string | null = null;
      try {
        let bufferToEncode = audioAnalysis.audioBuffer;
        if (noiseReductionSettings.enabled) {
          setProcessingMsg('Đang lọc sạch tạp âm webcam (tiếng quạt gió, ù micro)...');
          bufferToEncode = await applyNoiseReductionToAudioBuffer(
            audioAnalysis.audioBuffer,
            noiseReductionSettings
          );
        }
        audioBase64 = audioBufferToWavBase64(bufferToEncode);
        currentAudioBase64Ref.current = audioBase64;
      } catch (e) {}

      const transcribeRes = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoDuration: audioAnalysis.duration,
          filename: 'Bản Ghi Webcam',
          audioBase64,
          mimeType: 'audio/wav',
          noiseReduced: noiseReductionSettings.enabled,
        }),
      });
      const transcribeData = await transcribeRes.json();
      const generatedSegments = transcribeData.segments || [];

      // Auto overlays
      let generatedOverlays: OverlayItem[] = [];
      try {
        const overlayRes = await fetch('/api/analyze-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: generatedSegments.map((s: any) => s.text).join('. ') || 'Bản ghi video webcam',
            videoDuration: audioAnalysis.duration,
          }),
        });
        const overlayData = await overlayRes.json();
        generatedOverlays = overlayData.overlays || [];
      } catch (e) {}

      setProject({
        id: `camera-recording-${Date.now()}`,
        title: 'Bản Ghi Webcam Mới',
        videoUrl,
        videoDuration: audioAnalysis.duration,
        videoWidth: 720,
        videoHeight: 1280,
        silenceGaps: audioAnalysis.gaps,
        segments: generatedSegments,
        overlays: generatedOverlays,
        silenceSettings: project.silenceSettings,
        skipSilences: true,
        selectedSubtitleStyle: project.selectedSubtitleStyle,
        transitionConfig: project.transitionConfig || { type: 'dissolve', duration: 0.25 },
        noiseReductionSettings,
        backgroundMusic: project.backgroundMusic,
      });

      setCurrentTime(0);
      showToast(
        noiseReductionSettings.enabled
          ? `Đã lọc sạch âm webcam & nhận diện ${generatedSegments.length} câu phụ đề!`
          : `Đã nhận diện giọng nói thật & phát hiện ${audioAnalysis.gaps.length} khoảng lặng!`,
        'success'
      );
    } catch (err) {
      showToast('Đã tải video ghi hình thành công.', 'info');
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run AI transcription on current video with real audio and current noise reduction filter
  const handleAutoTranscribe = async () => {
    setIsTranscribing(true);
    try {
      let payloadAudioBase64 = currentAudioBase64Ref.current;

      // Clean audio before transcribing if noise reduction is toggled ON
      if (currentAudioBufferRef.current) {
        if (noiseReductionSettings.enabled) {
          showToast('Đang lọc tạp âm nền trước khi AI nhận diện giọng nói...', 'info');
          const cleanedBuffer = await applyNoiseReductionToAudioBuffer(
            currentAudioBufferRef.current,
            noiseReductionSettings
          );
          payloadAudioBase64 = audioBufferToWavBase64(cleanedBuffer);
        } else {
          payloadAudioBase64 = audioBufferToWavBase64(currentAudioBufferRef.current);
        }
        currentAudioBase64Ref.current = payloadAudioBase64;
      }

      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoDuration: project.videoDuration,
          filename: project.title,
          audioBase64: payloadAudioBase64,
          mimeType: 'audio/wav',
          noiseReduced: noiseReductionSettings.enabled,
        }),
      });
      const data = await res.json();
      if (data.segments && Array.isArray(data.segments)) {
        setProject(prev => ({
          ...prev,
          segments: data.segments,
        }));
        showToast(
          noiseReductionSettings.enabled
            ? `AI đã lọc sạch tạp âm và phiên âm chính xác ${data.segments.length} câu phụ đề!`
            : `AI đã nhận diện phụ đề từ âm thanh gốc: ${data.segments.length} câu!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Transcription error:', err);
      showToast('Lỗi khi nhận diện giọng nói.', 'error');
    } finally {
      setIsTranscribing(false);
    }
  };


  // Apply custom pasted script and align word timings
  const handleApplyCustomScript = async (scriptText: string) => {
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoDuration: project.videoDuration,
          filename: project.title,
          userTranscript: scriptText,
        }),
      });
      const data = await res.json();
      if (data.segments && Array.isArray(data.segments)) {
        setProject(prev => ({
          ...prev,
          segments: data.segments,
        }));
        showToast(`Đã căn chỉnh kịch bản thành ${data.segments.length} đoạn phụ đề!`, 'success');
      }
    } catch (err) {
      console.error('Apply script error:', err);
      showToast('Lỗi khi căn chỉnh kịch bản.', 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Re-run silence detection with new settings
  const handleReAnalyzeSilences = async (newSettings: SilenceSettings) => {
    if (!project.videoUrl) return;
    setIsProcessing(true);
    setProcessingMsg('Đang quét lại khoảng lặng với ngưỡng mới...');

    try {
      const res = await fetch(project.videoUrl);
      const blob = await res.blob();
      const analysis = await analyzeAudioSilences(blob, newSettings);

      setProject(prev => ({
        ...prev,
        silenceSettings: newSettings,
        silenceGaps: analysis.gaps,
      }));

      showToast(`Đã cập nhật: tìm thấy ${analysis.gaps.length} khoảng lặng`, 'success');
    } catch (err: any) {
      showToast('Đã lưu cấu hình cắt khoảng lặng.', 'info');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-generate AI Overlays & B-Roll from Script
  const handleAutoGenerateOverlays = async () => {
    const fullTranscript = project.segments
      .filter(s => !s.deleted)
      .map(s => s.text)
      .join('. ');

    if (!fullTranscript.trim()) {
      showToast('Kịch bản trống. Vui lòng tạo phụ đề trước.', 'error');
      return;
    }

    setIsAnalyzingScript(true);
    try {
      const res = await fetch('/api/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: fullTranscript,
          videoDuration: project.videoDuration,
        }),
      });

      const data = await res.json();
      if (data.overlays && Array.isArray(data.overlays)) {
        // Mirror new illustration overlays into brollLibrary if not already present
        const newBrolls: BRollAsset[] = data.overlays
          .filter((ov: any) => ov.type === 'illustration' && ov.imageUrl)
          .map((ov: any) => ({
            id: `broll-script-${ov.id}`,
            title: ov.title,
            description: ov.content,
            imageUrl: ov.imageUrl,
            category: ov.category || 'Technology',
            tags: ov.tags || ['ai-script', (ov.category || 'technology').toLowerCase()],
            source: 'ai-generated' as const,
            createdAt: Date.now(),
            aiAnalysis: {
              summary: `Ảnh B-roll tự động chèn theo kịch bản: ${ov.title}`,
              mood: 'Cinematic',
              confidence: 0.95,
            },
          }));

        setProject(prev => {
          const existingLib = prev.brollLibrary || INITIAL_BROLL_LIBRARY;
          const existingIds = new Set(existingLib.map(b => b.id));
          const uniqueNewBrolls = newBrolls.filter(b => !existingIds.has(b.id));

          return {
            ...prev,
            overlays: [...data.overlays],
            brollLibrary: [...uniqueNewBrolls, ...existingLib],
          };
        });

        setActiveRightTab('overlays');
        showToast(`AI đã tự động chèn ${data.overlays.length} ảnh B-roll và thẻ chú thích chuẩn studio!`, 'success');
      }
    } catch (err) {
      console.error('Error analyzing script:', err);
      showToast('Lỗi khi gọi AI phân tích kịch bản.', 'error');
    } finally {
      setIsAnalyzingScript(false);
    }
  };

  // Generate specific illustration prompt via AI with automatic categorization & folder placement
  const handleGenerateIllustrationPrompt = async (prompt: string, title: string, category?: string) => {
    try {
      const res = await fetch('/api/generate-illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, title }),
      });

      const data = await res.json();
      const start = Math.max(0, Number(currentTime.toFixed(2)));
      const end = Math.min(project.videoDuration, Number((start + 3.2).toFixed(2)));

      const assignedCategory = category || data.category || 'Technology';
      const assignedTags = data.tags && data.tags.length > 0 ? data.tags : [assignedCategory.toLowerCase()];

      const item: OverlayItem = {
        id: `ai-illust-${Date.now()}`,
        type: 'illustration',
        title: title || 'Ảnh B-Roll AI',
        content: prompt,
        start,
        end,
        duration: Number((end - start).toFixed(2)),
        position: 'top-right',
        animation: 'slide-up',
        imageUrl: data.imageUrl,
        scale: 1,
        category: assignedCategory,
        tags: assignedTags,
      };

      const newBrollAsset: BRollAsset = {
        id: `broll-ai-${Date.now()}`,
        title: title || 'Ảnh B-Roll AI',
        description: prompt,
        imageUrl: data.imageUrl,
        category: assignedCategory,
        tags: assignedTags,
        source: 'ai-generated',
        createdAt: Date.now(),
        aiPrompt: prompt,
        aiAnalysis: data.aiAnalysis,
      };

      setProject(prev => ({
        ...prev,
        overlays: [...prev.overlays, item],
        brollLibrary: [newBrollAsset, ...(prev.brollLibrary || INITIAL_BROLL_LIBRARY)],
      }));

      showToast(
        `AI đã tạo ảnh & phân loại vào thư mục "${assignedCategory}" (tags: #${assignedTags.slice(0, 3).join(', #')})!`,
        'success'
      );
    } catch (err: any) {
      console.error('Illustration error:', err);
      showToast('Không thể tạo hình ảnh minh họa AI', 'error');
    }
  };

  // Suggest & create B-roll illustration specifically based on selected subtitle segment context
  const handleSuggestBRollForSegment = async (segment: TranscriptSegment) => {
    try {
      setIsAnalyzingScript(true);
      setProcessingMsg(`Đang phân tích ngữ cảnh câu "${segment.text.slice(0, 24)}..." để tạo B-Roll AI...`);
      setIsProcessing(true);

      const res = await fetch('/api/generate-illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Cinematic editorial illustration representing context: "${segment.text}", photorealistic 8k, professional color grading`,
          title: segment.text.slice(0, 32),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate B-roll');

      const assignedCategory = data.category || 'Technology';
      const assignedTags = data.tags && data.tags.length > 0 ? data.tags : [assignedCategory.toLowerCase()];

      const newAsset: BRollAsset = {
        id: `broll-seg-${Date.now()}`,
        title: data.title || segment.text.slice(0, 28),
        description: segment.text,
        imageUrl: data.imageUrl,
        category: assignedCategory,
        tags: assignedTags,
        source: 'ai-generated',
        createdAt: Date.now(),
        aiPrompt: data.prompt,
        aiAnalysis: data.aiAnalysis,
      };

      const newOverlay: OverlayItem = {
        id: `ov-seg-${Date.now()}`,
        type: 'illustration',
        title: newAsset.title,
        content: segment.text,
        start: segment.start,
        end: segment.end,
        duration: Number((segment.end - segment.start).toFixed(2)),
        position: 'top-center',
        animation: 'slide-up',
        imageUrl: data.imageUrl,
        category: assignedCategory,
        tags: assignedTags,
      };

      setProject(prev => ({
        ...prev,
        overlays: [...prev.overlays, newOverlay],
        brollLibrary: [newAsset, ...(prev.brollLibrary || [])],
      }));

      setActiveRightTab('overlays');
      showToast(`Đã tạo và chèn B-Roll AI theo ngữ cảnh: "${newAsset.title}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi tạo B-Roll theo ngữ cảnh', 'error');
    } finally {
      setIsProcessing(false);
      setIsAnalyzingScript(false);
    }
  };

  const handleUpdateClipSpeed = (clipId: string, speed: number) => {
    setProject(prev => ({
      ...prev,
      clipSpeeds: {
        ...(prev.clipSpeeds || {}),
        [clipId]: speed,
      },
    }));
    showToast(`Đã đổi tốc độ đoạn clip thành ${speed}x!`, 'success');
  };

  const handleReorderSegments = (newSegments: TranscriptSegment[]) => {
    setProject(prev => {
      if (activeLanguage === 'vi') {
        return { ...prev, segments: newSegments };
      } else {
        const trans = prev.translations || {};
        return {
          ...prev,
          translations: {
            ...trans,
            [activeLanguage]: newSegments,
          },
        };
      }
    });
    showToast('Đã sắp xếp lại thứ tự hiển thị phụ đề!', 'success');
  };

  const handleApplyColorPalette = (palette: ColorPalette) => {
    setProject(prev => ({
      ...prev,
      colorPaletteId: palette.id,
    }));
    showToast(`Đã áp dụng bảng màu chủ đạo "${palette.name}"!`, 'success');
  };

  const handleAiAutoSelectPalette = () => {
    const randomIndex = Math.floor(Math.random() * COLOR_PALETTES.length);
    const chosen = COLOR_PALETTES[randomIndex];
    setProject(prev => ({
      ...prev,
      colorPaletteId: chosen.id,
    }));
    showToast(`AI đã tự động phân tích và chọn bảng màu: "${chosen.name}"!`, 'success');
  };

  const handleSnapToAudio = () => {
    const targetSegments = activeLanguage === 'vi' ? project.segments : (project.translations?.[activeLanguage] || project.segments);
    if (!targetSegments || targetSegments.length === 0) {
      showToast('Không có phụ đề để đồng bộ sóng âm.', 'error');
      return;
    }

    const snapped = targetSegments.map(seg => {
      const start = Math.max(0, seg.start);
      const end = Math.max(start + 0.3, seg.end);
      const words = seg.words.map((w, wIdx) => {
        const dur = (end - start) / Math.max(1, seg.words.length);
        const wStart = start + wIdx * dur;
        const wEnd = wStart + dur;
        return {
          ...w,
          start: Number(wStart.toFixed(3)),
          end: Number(wEnd.toFixed(3)),
        };
      });

      return {
        ...seg,
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        words,
      };
    });

    setProject(prev => {
      if (activeLanguage === 'vi') {
        return { ...prev, segments: snapped };
      } else {
        const trans = prev.translations || {};
        return {
          ...prev,
          translations: {
            ...trans,
            [activeLanguage]: snapped,
          },
        };
      }
    });

    showToast('🎯 Đã tự động đồng bộ phụ đề chuẩn sóng âm audio (Snap-to-Audio) hoàn hảo!', 'success');
  };

  const handleAiCameraMotion = () => {
    const markers = project.timelineMarkers || [];
    if (markers.length === 0) {
      showToast('Chưa có mốc điểm nhấn (markers) trên Timeline. Hãy bấm "AI Đặt Điểm Nhấn" trước!', 'error');
      return;
    }

    const newOverlays: OverlayItem[] = [...project.overlays];
    let addedCount = 0;

    markers.forEach(m => {
      const exists = newOverlays.some(o => o.type === 'zoom' && Math.abs(o.start - m.time) < 1.5);
      if (!exists) {
        newOverlays.push({
          id: `cam-zoom-${m.id}-${Date.now()}`,
          type: 'zoom',
          title: `AI Camera Motion: ${m.label}`,
          content: 'Punch-in Zoom',
          start: m.time,
          end: Math.min(project.videoDuration, m.time + 2.2),
          duration: 2.2,
          position: 'center',
          animation: 'pop',
          zoomLevel: m.type === 'hook' ? 1.25 : 1.15,
        });
        addedCount++;
      }
    });

    setProject(prev => ({
      ...prev,
      overlays: newOverlays,
    }));

    showToast(`🎥 AI Camera Motion đã tạo tự động ${addedCount} hiệu ứng Zoom-in/Out chuyên nghiệp tại các mốc Marker!`, 'success');
  };

  const handleAutoGenerateChapters = () => {
    const segments = project.segments || [];
    if (segments.length === 0) {
      showToast('Chưa có kịch bản hoặc phụ đề để AI phân chia chương.', 'error');
      return;
    }

    const duration = project.videoDuration || 30;
    const chunkSize = Math.max(1, Math.floor(segments.length / 4));
    
    const chapters: VideoChapter[] = [
      {
        id: 'ch-1',
        title: '01. Giới thiệu & Mở đầu (Hook)',
        startTime: segments[0]?.start || 0,
        endTime: segments[Math.min(chunkSize, segments.length - 1)]?.end || duration * 0.25,
      },
      {
        id: 'ch-2',
        title: '02. Vấn đề & Thực trạng',
        startTime: segments[Math.min(chunkSize, segments.length - 1)]?.end || duration * 0.25,
        endTime: segments[Math.min(chunkSize * 2, segments.length - 1)]?.end || duration * 0.5,
      },
      {
        id: 'ch-3',
        title: '03. Giải pháp cốt lõi & Demo',
        startTime: segments[Math.min(chunkSize * 2, segments.length - 1)]?.end || duration * 0.5,
        endTime: segments[Math.min(chunkSize * 3, segments.length - 1)]?.end || duration * 0.75,
      },
      {
        id: 'ch-4',
        title: '04. Tổng kết & Hành động (CTA)',
        startTime: segments[Math.min(chunkSize * 3, segments.length - 1)]?.end || duration * 0.75,
        endTime: segments[segments.length - 1]?.end || duration,
      },
    ];

    setProject(prev => ({
      ...prev,
      videoChapters: chapters,
    }));

    showToast('📖 AI đã phân chia video thành công thành 4 chương logic trên Timeline!', 'success');
  };

  const handleAutoGenerateTimelineMarkers = () => {
    if (!project.segments || project.segments.length === 0) {
      showToast('Chưa có kịch bản hoặc phụ đề để AI đặt marker.', 'error');
      return;
    }

    const keywords = ['bí quyết', 'quan trọng', 'chìa khóa', 'lưu ý', 'tuyệt vời', 'chính xác', 'nhanh chóng', '80%', 'thời gian', 'tự động'];
    const markers: TimelineMarker[] = [];

    markers.push({
      id: `m-hook`,
      time: project.segments[0]?.start || 0,
      label: 'Hook / Mở đầu thu hút',
      type: 'hook',
    });

    project.segments.forEach((seg, idx) => {
      const lower = seg.text.toLowerCase();
      if (keywords.some(kw => lower.includes(kw)) && idx > 0 && idx < project.segments.length - 1) {
        markers.push({
          id: `m-${seg.id}`,
          time: seg.start,
          label: seg.text.slice(0, 30) + '...',
          type: 'emphasis',
        });
      }
    });

    if (project.segments.length >= 4) {
      const lastSeg = project.segments[project.segments.length - 1];
      markers.push({
        id: `m-takeaway`,
        time: lastSeg.start,
        label: 'Tổng kết / Call to Action',
        type: 'takeaway',
      });
    }

    setProject(prev => ({
      ...prev,
      timelineMarkers: markers,
    }));

    showToast(`AI đã đặt ${markers.length} điểm nhấn (markers) quan trọng trên Timeline!`, 'success');
  };

  // Automatically categorize all B-roll items in library using Gemini AI
  const handleAutoCategorizeAllBRolls = async () => {
    const library = project.brollLibrary || INITIAL_BROLL_LIBRARY;
    if (library.length === 0) return;

    setIsCategorizingBRoll(true);
    showToast('Đang dùng AI phân tích nội dung để xếp thư mục & gắn tags cho toàn bộ B-Roll...', 'info');

    try {
      const res = await fetch('/api/categorize-broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: library.map(item => ({
            id: item.id,
            title: item.title,
            prompt: item.aiPrompt || item.description,
            description: item.description,
          })),
        }),
      });

      const data = await res.json();
      if (data.categorized && Array.isArray(data.categorized)) {
        const catMap = new Map(data.categorized.map((c: any) => [c.id, c]));

        setProject(prev => {
          const currentLib = prev.brollLibrary || INITIAL_BROLL_LIBRARY;
          const updated = currentLib.map(asset => {
            const found: any = catMap.get(asset.id);
            if (!found) return asset;
            return {
              ...asset,
              category: found.category || asset.category,
              tags: found.tags && found.tags.length > 0 ? found.tags : asset.tags,
              aiAnalysis: found.aiAnalysis || asset.aiAnalysis,
            };
          });
          return { ...prev, brollLibrary: updated };
        });

        showToast(
          `AI đã phân loại thành công ${data.categorized.length} B-Roll vào các thư mục Historical, Technology, People...!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Categorize all error:', err);
      showToast('Lỗi khi phân loại B-Roll bằng AI.', 'error');
    } finally {
      setIsCategorizingBRoll(false);
    }
  };

  // Update category and tags for a specific B-roll asset
  const handleUpdateAssetCategory = (assetId: string, newCategory: string, newTags: string[]) => {
    setProject(prev => {
      const currentLib = prev.brollLibrary || INITIAL_BROLL_LIBRARY;
      return {
        ...prev,
        brollLibrary: currentLib.map(a =>
          a.id === assetId ? { ...a, category: newCategory, tags: newTags } : a
        ),
      };
    });
    showToast(`Đã chuyển B-Roll vào thư mục "${newCategory}"!`, 'success');
  };

  // Delete custom B-roll asset from library
  const handleDeleteBRollAsset = (assetId: string) => {
    setProject(prev => {
      const currentLib = prev.brollLibrary || INITIAL_BROLL_LIBRARY;
      return {
        ...prev,
        brollLibrary: currentLib.filter(a => a.id !== assetId),
      };
    });
    showToast('Đã xóa B-Roll khỏi thư viện.', 'info');
  };

  // Toggle individual silence cut
  const handleToggleSilenceCut = (gapId: string) => {
    setProject(prev => ({
      ...prev,
      silenceGaps: prev.silenceGaps.map(g =>
        g.id === gapId ? { ...g, cut: !g.cut } : g
      ),
    }));
  };

  // Cut all silences
  const handleCutAllSilences = () => {
    setProject(prev => ({
      ...prev,
      skipSilences: true,
      silenceGaps: prev.silenceGaps.map(g => ({ ...g, cut: true })),
    }));
    showToast('Đã đánh dấu cắt toàn bộ các khoảng lặng!', 'info');
  };

  // Restore all silences
  const handleRestoreAllSilences = () => {
    setProject(prev => ({
      ...prev,
      silenceGaps: prev.silenceGaps.map(g => ({ ...g, cut: false })),
    }));
    showToast('Đã khôi phục lại video đầy đủ không cắt!', 'info');
  };

  // Switch active subtitle display language
  const handleSelectLanguage = (langCode: string) => {
    setProject(prev => ({
      ...prev,
      selectedLanguage: langCode,
    }));
    const lang = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
    showToast(`Đã chuyển phụ đề hiển thị sang ${lang?.name || langCode}!`, 'info');
  };

  // AI Subtitle Translation
  const handleTranslateSubtitles = async (targetLanguage: string) => {
    setIsTranslating(true);
    const lang = AVAILABLE_LANGUAGES.find(l => l.code === targetLanguage);
    showToast(`Đang dùng AI dịch phụ đề sang ${lang?.name || targetLanguage}...`, 'info');

    try {
      const res = await fetch('/api/translate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: project.segments,
          targetLanguage,
          sourceLanguage: 'vi',
        }),
      });

      const data = await res.json();
      if (data.translatedSegments && Array.isArray(data.translatedSegments)) {
        setProject(prev => ({
          ...prev,
          selectedLanguage: targetLanguage,
          translations: {
            ...prev.translations,
            [targetLanguage]: data.translatedSegments,
          },
        }));
        showToast(
          `AI đã dịch thành công ${data.translatedSegments.length} câu phụ đề sang ${lang?.name || targetLanguage}!`,
          'success'
        );
      } else {
        throw new Error('Dữ liệu dịch không hợp lệ');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      showToast('Lỗi khi dịch phụ đề AI.', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Transcript word cut (supports both original and active translated language)
  const handleToggleWordCut = (segmentId: string, wordId: string) => {
    if (activeLanguage !== 'vi' && project.translations?.[activeLanguage]) {
      setProject(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [activeLanguage]: (prev.translations?.[activeLanguage] || []).map(seg => {
            if (seg.id !== segmentId) return seg;
            return {
              ...seg,
              words: seg.words.map(w =>
                w.id === wordId ? { ...w, deleted: !w.deleted } : w
              ),
            };
          }),
        },
      }));
    } else {
      setProject(prev => ({
        ...prev,
        segments: prev.segments.map(seg => {
          if (seg.id !== segmentId) return seg;
          return {
            ...seg,
            words: seg.words.map(w =>
              w.id === wordId ? { ...w, deleted: !w.deleted } : w
            ),
          };
        }),
      }));
    }
  };

  // Transcript segment cut
  const handleToggleSegmentCut = (segmentId: string) => {
    if (activeLanguage !== 'vi' && project.translations?.[activeLanguage]) {
      setProject(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [activeLanguage]: (prev.translations?.[activeLanguage] || []).map(seg =>
            seg.id === segmentId ? { ...seg, deleted: !seg.deleted } : seg
          ),
        },
      }));
    } else {
      setProject(prev => ({
        ...prev,
        segments: prev.segments.map(seg =>
          seg.id === segmentId ? { ...seg, deleted: !seg.deleted } : seg
        ),
      }));
    }
  };

  // Update segment text
  const handleUpdateSegmentText = (segmentId: string, newText: string) => {
    if (activeLanguage !== 'vi' && project.translations?.[activeLanguage]) {
      setProject(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [activeLanguage]: (prev.translations?.[activeLanguage] || []).map(seg => {
            if (seg.id !== segmentId) return seg;
            const wordsList = newText.trim().split(/\s+/).filter(Boolean);
            const step = (seg.end - seg.start) / Math.max(1, wordsList.length);
            return {
              ...seg,
              text: newText,
              words: wordsList.map((w, i) => ({
                id: `tw-${seg.id}-${i}`,
                word: w,
                start: Number((seg.start + i * step).toFixed(2)),
                end: Number((seg.start + (i + 1) * step).toFixed(2)),
              })),
            };
          }),
        },
      }));
    } else {
      setProject(prev => ({
        ...prev,
        segments: prev.segments.map(seg => {
          if (seg.id !== segmentId) return seg;
          return { ...seg, text: newText };
        }),
      }));
    }
    showToast('Đã cập nhật phụ đề!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Global Header */}
      <Header
        onLoadDemo={handleLoadDemo}
        onUploadClick={() => fileInputRef.current?.click()}
        onRecordClick={() => setIsCameraOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportClick={() => setIsExportOpen(true)}
        onOpenIntroOutro={() => setIsIntroOutroOpen(true)}
        onOpenColorPalette={() => setIsColorPaletteOpen(true)}
        skipSilences={project.skipSilences}
        onToggleSkipSilences={() =>
          setProject(prev => ({ ...prev, skipSilences: !prev.skipSilences }))
        }
        savedSeconds={savedStats.seconds}
        savedPercentage={savedStats.percentage}
        isProcessing={isProcessing}
      />

      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 bg-slate-900/95 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center: Video Player */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/60 p-2 sm:p-4 overflow-y-auto min-h-[440px]">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-200">{processingMsg}</p>
              <p className="text-xs text-slate-500 mt-1">Đang xử lý trong trình duyệt...</p>
            </div>
          ) : (
            <VideoPlayer
              videoUrl={project.videoUrl}
              rawDuration={project.videoDuration}
              clips={clips}
              silenceGaps={project.silenceGaps}
              segments={activeSegments}
              overlays={project.overlays}
              skipSilences={project.skipSilences}
              selectedSubtitleStyle={project.selectedSubtitleStyle}
              transitionConfig={project.transitionConfig}
              backgroundMusic={project.backgroundMusic}
              onOpenTransitions={() => setIsTransitionOpen(true)}
              onOpenAudioManager={() => setActiveRightTab('audio')}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              isPlaying={isPlaying}
              onPlayStateChange={setIsPlaying}
              subtitleSettings={project.subtitleSettings}
              introOutroConfig={project.introOutroConfig}
              colorPaletteId={project.colorPaletteId}
            />
          )}
        </div>

        {/* Right Side: Tabbed Panel for Transcript, Smart Overlays & Background Music */}
        <div className="w-full lg:w-[440px] xl:w-[480px] h-[460px] lg:h-auto border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col bg-slate-900">
          {/* Right Tabs Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-bold">
            <button
              onClick={() => setActiveRightTab('transcript')}
              className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeRightTab === 'transcript'
                  ? 'border-emerald-400 text-emerald-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">
                Phụ Đề {AVAILABLE_LANGUAGES.find(l => l.code === activeLanguage)?.flag || ''} ({activeSegments.length})
              </span>
            </button>

            <button
              onClick={() => setActiveRightTab('overlays')}
              className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeRightTab === 'overlays'
                  ? 'border-sky-400 text-sky-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="truncate">B-Roll ({project.overlays.length})</span>
            </button>

            <button
              onClick={() => setActiveRightTab('audio')}
              className={`flex-1 py-3 px-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeRightTab === 'audio'
                  ? 'border-indigo-400 text-indigo-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">Nhạc & Ducking</span>
              {project.backgroundMusic?.enabled && project.backgroundMusic?.track && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              )}
            </button>
          </div>

          {/* Tab Views */}
          <div className="flex-1 overflow-hidden">
            {activeRightTab === 'transcript' ? (
              <TranscriptEditor
                segments={activeSegments}
                originalSegments={project.segments}
                currentTime={currentTime}
                videoDuration={project.videoDuration}
                onSeek={setCurrentTime}
                onToggleWordCut={handleToggleWordCut}
                onToggleSegmentCut={handleToggleSegmentCut}
                onUpdateSegmentText={handleUpdateSegmentText}
                onAutoTranscribe={handleAutoTranscribe}
                onApplyCustomScript={handleApplyCustomScript}
                selectedSubtitleStyle={project.selectedSubtitleStyle}
                onSelectSubtitleStyle={id =>
                  setProject(prev => ({ ...prev, selectedSubtitleStyle: id }))
                }
                isTranscribing={isTranscribing}
                noiseReductionSettings={noiseReductionSettings}
                onUpdateNoiseReductionSettings={handleUpdateNoiseReductionSettings}
                audioBuffer={currentAudioBuffer}
                currentLanguage={activeLanguage}
                onSelectLanguage={handleSelectLanguage}
                translations={project.translations}
                onTranslateSubtitles={handleTranslateSubtitles}
                isTranslating={isTranslating}
                subtitleSettings={project.subtitleSettings || { fontSizeMultiplier: 0.9, maxCharsPerLine: 35 }}
                onUpdateSubtitleSettings={settings =>
                  setProject(prev => ({ ...prev, subtitleSettings: settings }))
                }
                onSuggestBRollForSegment={handleSuggestBRollForSegment}
                onReorderSegments={handleReorderSegments}
                onSnapToAudio={handleSnapToAudio}
              />
            ) : activeRightTab === 'overlays' ? (
              <OverlaysPanel
                overlays={project.overlays}
                brollAssets={project.brollLibrary || INITIAL_BROLL_LIBRARY}
                currentTime={currentTime}
                videoDuration={project.videoDuration}
                onSeek={setCurrentTime}
                onAddOverlay={item =>
                  setProject(prev => ({ ...prev, overlays: [...prev.overlays, item] }))
                }
                onRemoveOverlay={id =>
                  setProject(prev => ({
                    ...prev,
                    overlays: prev.overlays.filter(o => o.id !== id),
                  }))
                }
                onAutoGenerateOverlays={handleAutoGenerateOverlays}
                onGenerateIllustrationPrompt={handleGenerateIllustrationPrompt}
                onAutoCategorizeAllBRolls={handleAutoCategorizeAllBRolls}
                onUpdateAssetCategory={handleUpdateAssetCategory}
                onDeleteBRollAsset={handleDeleteBRollAsset}
                isAnalyzing={isAnalyzingScript}
                isCategorizing={isCategorizingBRoll}
              />
            ) : (
              <AudioManagerPanel
                config={project.backgroundMusic || DEFAULT_BGM_CONFIG}
                onChangeConfig={newBgm =>
                  setProject(prev => ({ ...prev, backgroundMusic: newBgm }))
                }
                segments={activeSegments}
                currentTime={currentTime}
                videoDuration={project.videoDuration}
                onSeek={setCurrentTime}
                voiceStylePreset={project.voiceStylePreset}
                onUpdateVoiceStylePreset={preset => {
                  setProject(prev => ({ ...prev, voiceStylePreset: preset }));
                  showToast(`Đã áp dụng AI Voice Style: ${preset.toUpperCase()}`, 'success');
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* AI Chapters Navigation Bar */}
      <ChaptersBar
        chapters={project.videoChapters || []}
        currentTime={currentTime}
        onSeek={setCurrentTime}
        onAutoGenerateChapters={handleAutoGenerateChapters}
      />

      {/* Bottom Multi-Track Timeline */}
      <Timeline
        rawDuration={project.videoDuration}
        currentTime={currentTime}
        onSeek={setCurrentTime}
        silenceGaps={project.silenceGaps}
        clips={clips}
        segments={activeSegments}
        overlays={project.overlays}
        transitionConfig={project.transitionConfig}
        backgroundMusic={project.backgroundMusic}
        onOpenTransitions={() => setIsTransitionOpen(true)}
        onOpenAudioManager={() => setActiveRightTab('audio')}
        onToggleSilenceCut={handleToggleSilenceCut}
        onCutAllSilences={handleCutAllSilences}
        onRestoreAllSilences={handleRestoreAllSilences}
        zoomLevel={timelineZoom}
        onZoomChange={setTimelineZoom}
        onUpdateClipSpeed={handleUpdateClipSpeed}
        timelineMarkers={project.timelineMarkers}
        onAutoGenerateMarkers={handleAutoGenerateTimelineMarkers}
        onAiCameraMotion={handleAiCameraMotion}
      />

      {/* Modals */}
      <SilenceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={project.silenceSettings}
        onSave={settings => setProject(prev => ({ ...prev, silenceSettings: settings }))}
        onReAnalyze={handleReAnalyzeSilences}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        videoUrl={project.videoUrl}
        clips={clips}
        segments={activeSegments}
        overlays={project.overlays}
        selectedSubtitleStyle={project.selectedSubtitleStyle}
        videoTitle={project.title}
        transitionConfig={project.transitionConfig}
        backgroundMusic={project.backgroundMusic}
        selectedLanguage={activeLanguage}
      />

      <CameraRecorderModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onRecordingComplete={handleRecordingComplete}
        onUploadFallback={() => {
          setIsCameraOpen(false);
          fileInputRef.current?.click();
        }}
      />

      <TransitionModal
        isOpen={isTransitionOpen}
        onClose={() => setIsTransitionOpen(false)}
        config={project.transitionConfig}
        onSave={cfg => {
          setProject(prev => ({ ...prev, transitionConfig: cfg }));
          showToast(`Đã áp dụng chuyển cảnh: ${cfg.type.toUpperCase()} (${cfg.duration}s)`, 'success');
        }}
      />

      <IntroOutroModal
        isOpen={isIntroOutroOpen}
        onClose={() => setIsIntroOutroOpen(false)}
        config={project.introOutroConfig || { enabled: true, type: 'intro', title: 'AI STUDIO MASTERCLASS', subtitle: 'Bí quyết sáng tạo video triệu view', templateStyle: 'cinematic', logoUrl: '' }}
        onSave={cfg => {
          setProject(prev => ({ ...prev, introOutroConfig: cfg }));
          showToast('Đã lưu cấu hình AI Intro/Outro thành công!', 'success');
        }}
        segments={activeSegments}
        projectTitle={project.title}
      />

      <ColorPaletteModal
        isOpen={isColorPaletteOpen}
        onClose={() => setIsColorPaletteOpen(false)}
        activePaletteId={project.colorPaletteId || 'professional-blue'}
        onApplyPalette={handleApplyColorPalette}
        onAiAutoSelectPalette={handleAiAutoSelectPalette}
      />
    </div>
  );
}
