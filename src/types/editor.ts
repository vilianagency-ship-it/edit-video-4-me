export interface WordTiming {
  id: string;
  word: string;
  start: number; // in seconds
  end: number;
  deleted?: boolean;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: WordTiming[];
  deleted?: boolean;
}

export interface SilenceGap {
  id: string;
  start: number;
  end: number;
  duration: number;
  cut: boolean; // whether this silence is cut/skipped
}

export interface VideoClipSegment {
  id: string;
  rawStart: number;
  rawEnd: number;
  timelineStart: number; // calculated after preceding cuts
  timelineEnd: number;
  duration: number;
  speed: number; // e.g. 0.5 (slow motion), 1.0 (normal), 1.5, 2.0 (fast forward)
}

export type OverlayType = 'badge' | 'illustration' | 'sticker' | 'zoom';

export interface OverlayItem {
  id: string;
  type: OverlayType;
  title: string;
  content: string; // text for badge, emoji/icon for sticker, image url/svg for illustration
  start: number; // raw video time or timeline time
  end: number;
  duration: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center';
  scale?: number;
  animation?: 'pop' | 'slide-up' | 'fade' | 'bounce';
  imageUrl?: string;
  zoomLevel?: number; // for zoom punch-in, e.g. 1.15
  category?: string; // e.g. 'Technology', 'People', 'Historical'
  tags?: string[]; // e.g. ['ai', 'chip', 'future']
}

export interface BRollAsset {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string; // e.g., 'Historical', 'Technology', 'People', 'Business', 'Studio', 'Nature'
  tags: string[]; // e.g., ['ai', 'future', 'robot']
  source: 'ai-generated' | 'preset' | 'custom';
  createdAt: number;
  aiPrompt?: string;
  aiAnalysis?: {
    summary?: string;
    detectedObjects?: string[];
    mood?: string;
    confidence?: number;
  };
}

export interface SubtitleStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  highlightColor: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  textTransform?: 'uppercase' | 'none' | 'capitalize';
  position: 'bottom' | 'middle' | 'top';
  animation: 'karaoke-bounce' | 'glow' | 'simple-highlight' | 'fade';
  badgeBg?: boolean;
}

export interface SilenceSettings {
  thresholdDb: number; // e.g. -32 dB
  minDurationSec: number; // e.g. 0.35s
  paddingSec: number; // e.g. 0.08s buffer before and after speech
}

export type TransitionType =
  | 'cut'
  | 'dissolve'
  | 'fade-black'
  | 'fade-white'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'blur';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // in seconds (e.g. 0.25s)
}

export type NoiseReductionPreset = 'light' | 'balanced' | 'aggressive';

export interface NoiseReductionSettings {
  enabled: boolean;
  preset: NoiseReductionPreset;
  highPassCutoff: number; // Hz (e.g. 90Hz)
  notchHum: boolean; // 50/60Hz AC hum removal
  speechBoost: boolean; // presence clarity boost around 3kHz
  reduceHiss: boolean; // high shelf attenuation
  noiseGate: boolean; // gate low amplitude background noise between words
}

export type MusicCategory = 'lofi' | 'ambient' | 'upbeat' | 'cinematic' | 'custom';

export interface BackgroundMusicTrack {
  id: string;
  name: string;
  artist?: string;
  category: MusicCategory;
  audioUrl: string;
  duration: number;
  bpm?: number;
}

export interface AudioDuckingSettings {
  enabled: boolean;
  duckedVolumePercent: number; // e.g. 20 (lowers to 20% volume during speech)
  attackSec: number; // ramp down duration, e.g. 0.25s
  releaseSec: number; // ramp up duration, e.g. 0.45s
  thresholdPaddingSec: number; // pre/post padding buffer, e.g. 0.15s
}

export interface AIVoiceEnhancementSettings {
  enabled: boolean;
  clarityBoost: boolean;
  normalizeVolume: boolean;
  aggressiveness: 'standard' | 'studio';
}

export interface BackgroundMusicConfig {
  enabled: boolean;
  track: BackgroundMusicTrack | null;
  volume: number; // 0.0 to 1.0 (default 0.35)
  voiceVolume: number; // 0.0 to 2.0 (default 1.0)
  loop: boolean;
  ducking: AudioDuckingSettings;
  aiVoiceEnhancement?: AIVoiceEnhancementSettings;
}

export interface SubtitleLanguage {
  code: string;
  name: string;
  label: string;
  flag: string;
}

export interface SubtitleSettings {
  fontSizeMultiplier: number; // e.g. 0.8 (small), 1.0 (medium), 1.2 (large)
  maxCharsPerLine: number; // e.g. 25, 40, 60
  faceAvoidanceEnabled: boolean; // AI face detection & smart avoidance
  wordPopupAnimation: boolean; // word pop-up animation effect
}

export interface VideoProject {
  id: string;
  title: string;
  videoUrl: string;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  segments: TranscriptSegment[];
  silenceGaps: SilenceGap[];
  overlays: OverlayItem[];
  silenceSettings: SilenceSettings;
  skipSilences: boolean;
  selectedSubtitleStyle: string;
  transitionConfig: TransitionConfig;
  noiseReductionSettings?: NoiseReductionSettings;
  backgroundMusic?: BackgroundMusicConfig;
  selectedLanguage?: string; // e.g. 'vi', 'en', 'es'
  translations?: Record<string, TranscriptSegment[]>;
  brollLibrary?: BRollAsset[];
  subtitleSettings?: SubtitleSettings;
  clipSpeeds?: Record<string, number>;
  timelineMarkers?: TimelineMarker[];
  introOutroConfig?: IntroOutroConfig;
  colorPaletteId?: string;
  videoChapters?: VideoChapter[];
  voiceStylePreset?: string;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  type: 'highlight' | 'emphasis' | 'hook' | 'takeaway';
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
}

export interface IntroOutroConfig {
  enabled: boolean;
  type: 'intro' | 'outro' | 'both';
  title: string;
  subtitle: string;
  logoUrl?: string;
  templateStyle: 'cyberpunk' | 'minimal' | 'cinematic' | 'podcast';
}

