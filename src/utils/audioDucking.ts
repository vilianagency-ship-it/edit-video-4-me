import { BackgroundMusicTrack, AudioDuckingSettings, BackgroundMusicConfig, TranscriptSegment } from '../types/editor';

export const DEFAULT_DUCKING_SETTINGS: AudioDuckingSettings = {
  enabled: true,
  duckedVolumePercent: 20, // Reduced to 20% during speech
  attackSec: 0.20,
  releaseSec: 0.45,
  thresholdPaddingSec: 0.15,
};

export const DUCKING_PRESETS: {
  id: string;
  name: string;
  description: string;
  percent: number;
  attackSec: number;
  releaseSec: number;
}[] = [
  {
    id: 'subtle',
    name: 'Nhẹ nhàng (-40%)',
    description: 'Giảm nhẹ nhạc nền, phù hợp nhạc acoustic hoặc nhạc tiết tấu chậm',
    percent: 60,
    attackSec: 0.25,
    releaseSec: 0.50,
  },
  {
    id: 'balanced',
    name: 'Cân bằng (-80%)',
    description: 'Chuẩn studio podcast & YouTube, lời nói rõ ràng nổi bật',
    percent: 20,
    attackSec: 0.18,
    releaseSec: 0.40,
  },
  {
    id: 'aggressive',
    name: 'Mạnh mẽ (-90%)',
    description: 'Nhạc nền chìm hẳn khi nói, tối ưu cho video hướng dẫn & giáo dục',
    percent: 10,
    attackSec: 0.12,
    releaseSec: 0.35,
  },
];

/**
 * Procedural music loop synthesizer: generates pleasant, royalty-free audio tracks as WAV Data URLs.
 * High quality stereo 44.1kHz audio generated in-browser without external network dependencies.
 */
function generatePresetWavUrl(type: 'lofi' | 'ambient' | 'upbeat' | 'cinematic'): { url: string; duration: number } {
  const sampleRate = 44100;
  const duration = 12.0; // 12-second seamless loop
  const totalSamples = Math.floor(sampleRate * duration);
  
  // Create 16-bit PCM WAV buffer
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Musical Chord definitions (frequencies in Hz)
  // Cmaj7 (C4, E4, G4, B4), Am7 (A3, C4, E4, G4), Dm7 (D4, F4, A4, C5), G7 (G3, B3, D4, F4)
  const lofiChords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [293.66, 349.23, 440.00, 523.25], // Dm7
    [196.00, 246.94, 293.66, 349.23], // G7
  ];

  const ambientChords = [
    [174.61, 261.63, 329.63, 392.00], // Fmaj7 (F3, C4, E4, G4)
    [196.00, 293.66, 349.23, 440.00], // Gsus (G3, D4, F4, A4)
    [220.00, 261.63, 329.63, 440.00], // Am (A3, C4, E4, A4)
    [164.81, 246.94, 329.63, 392.00], // Em7 (E3, B3, E4, G4)
  ];

  const upbeatBass = [130.81, 146.83, 164.81, 196.00]; // C, D, E, G

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor((t / (duration / 4))) % 4;
    const chordTime = (t % (duration / 4));
    
    let left = 0;
    let right = 0;

    if (type === 'lofi') {
      // Warm electric piano chords with gentle vibrato and vinyl texture
      const chord = lofiChords[chordIndex];
      const env = Math.exp(-chordTime * 0.9) * 0.45 + 0.12;
      const vibrato = Math.sin(2 * Math.PI * 5 * t) * 1.5;
      
      for (let noteIdx = 0; noteIdx < chord.length; noteIdx++) {
        const freq = chord[noteIdx] + vibrato;
        // Warm harmonic series
        const tone = (
          Math.sin(2 * Math.PI * freq * t) * 0.6 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
          Math.sin(2 * Math.PI * freq * 3 * t) * 0.1
        ) * env;
        left += tone * (noteIdx % 2 === 0 ? 0.8 : 0.5);
        right += tone * (noteIdx % 2 === 1 ? 0.8 : 0.5);
      }

      // Soft bass note
      const bassFreq = chord[0] / 2;
      const bassTone = Math.sin(2 * Math.PI * bassFreq * t) * 0.3 * Math.exp(-chordTime * 0.6);
      left += bassTone;
      right += bassTone;

      // Soft vinyl crackle & warm breath
      const crackle = (Math.random() > 0.994 ? (Math.random() * 2 - 1) * 0.08 : 0);
      const warmHiss = (Math.random() * 2 - 1) * 0.008;
      left += crackle + warmHiss;
      right += crackle + warmHiss;
    } else if (type === 'ambient') {
      // Lush evolving pad with gentle shimmer
      const chord = ambientChords[chordIndex];
      const swell = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t / (duration / 2)));
      for (let noteIdx = 0; noteIdx < chord.length; noteIdx++) {
        const freq = chord[noteIdx];
        const detune = Math.sin(2 * Math.PI * 0.3 * t + noteIdx) * 1.2;
        const tone = (
          Math.sin(2 * Math.PI * (freq + detune) * t) * 0.4 +
          Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.15
        ) * swell * 0.3;
        left += tone * (0.6 + 0.3 * Math.sin(t + noteIdx));
        right += tone * (0.6 + 0.3 * Math.cos(t + noteIdx));
      }
    } else if (type === 'upbeat') {
      // Rhythmic tech groove: pulse synth arpeggio + snappy sub bass
      const bass = upbeatBass[chordIndex];
      const bassEnv = Math.exp(-((t % 0.5)) * 6.0);
      const bassTone = Math.sin(2 * Math.PI * bass * t) * 0.4 * bassEnv;
      left += bassTone;
      right += bassTone;

      // 16th note arp
      const arpStep = Math.floor((t % 0.5) / 0.125);
      const arpFreq = bass * 2 * (1 + arpStep * 0.25);
      const arpEnv = Math.exp(-((t % 0.125)) * 12.0);
      const arpTone = Math.sin(2 * Math.PI * arpFreq * t) * 0.22 * arpEnv;
      left += arpTone * (arpStep % 2 === 0 ? 0.8 : 0.4);
      right += arpTone * (arpStep % 2 === 1 ? 0.8 : 0.4);
    } else {
      // Cinematic: warm layered piano + sustained strings
      const chord = lofiChords[chordIndex];
      const pianoEnv = Math.exp(-chordTime * 0.8) * 0.5;
      for (let noteIdx = 0; noteIdx < chord.length; noteIdx++) {
        const freq = chord[noteIdx];
        const pianoTone = (
          Math.sin(2 * Math.PI * freq * t) * 0.5 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.2
        ) * pianoEnv;
        left += pianoTone * 0.6;
        right += pianoTone * 0.6;

        // String sustain
        const stringTone = Math.sin(2 * Math.PI * (freq / 2) * t) * 0.12;
        left += stringTone * 0.8;
        right += stringTone * 0.8;
      }
    }

    // Master limiting & soft clip
    const clamp = (val: number) => {
      const v = Math.max(-1, Math.min(1, val * 0.75));
      return v < 0 ? -(v * v * 0.15 - v) : (v - v * v * 0.15);
    };

    const intL = Math.floor(Math.max(-32767, Math.min(32767, clamp(left) * 32767)));
    const intR = Math.floor(Math.max(-32767, Math.min(32767, clamp(right) * 32767)));

    view.setInt16(offset, intL, true);
    view.setInt16(offset + 2, intR, true);
    offset += 4;
  }

  // Convert to Base64 data URL
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let b = 0; b < len; b++) {
    binary += String.fromCharCode(bytes[b]);
  }
  const base64 = btoa(binary);
  return {
    url: `data:audio/wav;base64,${base64}`,
    duration: duration,
  };
}

// Generate lazy or memoized preset tracks
let cachedPresets: BackgroundMusicTrack[] | null = null;

export function getPresetTracks(): BackgroundMusicTrack[] {
  if (cachedPresets) return cachedPresets;

  const lofi = generatePresetWavUrl('lofi');
  const tech = generatePresetWavUrl('upbeat');
  const ambient = generatePresetWavUrl('ambient');
  const cinematic = generatePresetWavUrl('cinematic');

  cachedPresets = [
    {
      id: 'bgm-lofi-chill',
      name: 'Lo-Fi Chill Hop (Ấm áp)',
      artist: 'AutoCut Studio Library',
      category: 'lofi',
      audioUrl: lofi.url,
      duration: lofi.duration,
      bpm: 82,
    },
    {
      id: 'bgm-tech-growth',
      name: 'Tech Inspiration (Hiện đại)',
      artist: 'AutoCut Studio Library',
      category: 'upbeat',
      audioUrl: tech.url,
      duration: tech.duration,
      bpm: 120,
    },
    {
      id: 'bgm-ambient-calm',
      name: 'Cinematic Ambient (Sâu lắng)',
      artist: 'AutoCut Studio Library',
      category: 'ambient',
      audioUrl: ambient.url,
      duration: ambient.duration,
      bpm: 72,
    },
    {
      id: 'bgm-warm-story',
      name: 'Acoustic Storytelling (Truyền cảm hứng)',
      artist: 'AutoCut Studio Library',
      category: 'cinematic',
      audioUrl: cinematic.url,
      duration: cinematic.duration,
      bpm: 90,
    },
  ];

  return cachedPresets;
}

export const DEFAULT_BGM_CONFIG: BackgroundMusicConfig = {
  enabled: true,
  track: null, // Initialized when preset is loaded or user chooses
  volume: 0.35,
  voiceVolume: 1.0,
  loop: true,
  ducking: DEFAULT_DUCKING_SETTINGS,
};

/**
 * Checks whether speech is actively happening at timestamp `currentTime` (in seconds).
 * Inspects all non-deleted transcript segments and non-deleted words with threshold padding.
 */
export function isSpeechActiveAtTime(
  currentTime: number,
  segments: TranscriptSegment[],
  paddingSec: number = 0.15
): boolean {
  if (!segments || segments.length === 0) return false;

  for (const seg of segments) {
    if (seg.deleted) continue;

    // Check segment range with padding
    if (currentTime >= seg.start - paddingSec && currentTime <= seg.end + paddingSec) {
      // If words are available, check if any non-deleted word is within range
      if (seg.words && seg.words.length > 0) {
        const wordMatch = seg.words.some(
          w => !w.deleted && currentTime >= w.start - paddingSec && currentTime <= w.end + paddingSec
        );
        if (wordMatch) return true;
      } else {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculates ducking gain multiplier at a specific time `currentTime`.
 * Returns a value between `duckedVolumePercent / 100` and `1.0`.
 * Includes smooth attack (ramp down) and release (ramp up) envelopes.
 */
export function calculateDuckingGain(
  currentTime: number,
  segments: TranscriptSegment[],
  ducking: AudioDuckingSettings
): number {
  if (!ducking.enabled) {
    return 1.0;
  }

  const minRatio = Math.max(0.01, Math.min(1.0, ducking.duckedVolumePercent / 100));
  const padding = ducking.thresholdPaddingSec || 0.15;
  const attack = Math.max(0.05, ducking.attackSec || 0.2);
  const release = Math.max(0.05, ducking.releaseSec || 0.45);

  // Collect all active speech intervals [start, end]
  const intervals: { start: number; end: number }[] = [];
  for (const seg of segments) {
    if (seg.deleted) continue;
    if (seg.words && seg.words.length > 0) {
      for (const w of seg.words) {
        if (!w.deleted) {
          intervals.push({ start: w.start - padding, end: w.end + padding });
        }
      }
    } else {
      intervals.push({ start: seg.start - padding, end: seg.end + padding });
    }
  }

  if (intervals.length === 0) return 1.0;

  // Check if inside any speech interval
  for (const iv of intervals) {
    if (currentTime >= iv.start && currentTime <= iv.end) {
      return minRatio;
    }
  }

  // Check if in attack ramp (approaching an upcoming speech interval)
  let closestUpcomingStart: number | null = null;
  for (const iv of intervals) {
    if (iv.start > currentTime) {
      if (closestUpcomingStart === null || iv.start < closestUpcomingStart) {
        closestUpcomingStart = iv.start;
      }
    }
  }

  if (closestUpcomingStart !== null) {
    const timeUntilSpeech = closestUpcomingStart - currentTime;
    if (timeUntilSpeech <= attack) {
      // Smooth cosine ramp down from 1.0 to minRatio
      const progress = 1 - timeUntilSpeech / attack; // 0 -> 1
      const ramp = 0.5 * (1 - Math.cos(progress * Math.PI)); // 0 -> 1
      return 1.0 - ramp * (1.0 - minRatio);
    }
  }

  // Check if in release ramp (just exited a speech interval)
  let mostRecentEnd: number | null = null;
  for (const iv of intervals) {
    if (iv.end < currentTime) {
      if (mostRecentEnd === null || iv.end > mostRecentEnd) {
        mostRecentEnd = iv.end;
      }
    }
  }

  if (mostRecentEnd !== null) {
    const timeSinceSpeech = currentTime - mostRecentEnd;
    if (timeSinceSpeech <= release) {
      // Smooth cosine ramp up from minRatio to 1.0
      const progress = timeSinceSpeech / release; // 0 -> 1
      const ramp = 0.5 * (1 - Math.cos(progress * Math.PI)); // 0 -> 1
      return minRatio + ramp * (1.0 - minRatio);
    }
  }

  return 1.0;
}

/**
 * Computes effective background music volume factoring in master volume and ducking
 */
export function getEffectiveBgmVolume(
  currentTime: number,
  config: BackgroundMusicConfig,
  segments: TranscriptSegment[]
): number {
  if (!config.enabled || !config.track) return 0;
  const duckingMult = config.ducking.enabled
    ? calculateDuckingGain(currentTime, segments, config.ducking)
    : 1.0;
  return Math.max(0, Math.min(1.0, config.volume * duckingMult));
}
