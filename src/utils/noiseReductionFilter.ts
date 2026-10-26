import { NoiseReductionPreset, NoiseReductionSettings } from '../types/editor';

export const DEFAULT_NOISE_REDUCTION_SETTINGS: NoiseReductionSettings = {
  enabled: true,
  preset: 'balanced',
  highPassCutoff: 90,
  notchHum: true,
  speechBoost: true,
  reduceHiss: true,
  noiseGate: true,
};

export interface NoisePresetInfo {
  name: string;
  badge: string;
  description: string;
  highPassCutoff: number;
  speechBoostGainDb: number;
  hissCutoffHz: number;
  hissReductionDb: number;
  gateThresholdDb: number;
}

export const NOISE_PRESET_CONFIGS: Record<NoiseReductionPreset, NoisePresetInfo> = {
  light: {
    name: 'Nhẹ nhàng (Light)',
    badge: 'Light Clean',
    description: 'Chỉ cắt tiếng ù siêu trầm (<75Hz) và tiếng rít nhẹ, giữ trọn vẹn chất âm tự nhiên.',
    highPassCutoff: 75,
    speechBoostGainDb: 1.5,
    hissCutoffHz: 8500,
    hissReductionDb: -4,
    gateThresholdDb: -48,
  },
  balanced: {
    name: 'Cân bằng (Balanced - Khuyên dùng)',
    badge: 'Balanced AI',
    description: 'Lọc tiếng quạt gió, điều hòa, triệt tiêu tiếng ù điện 50/60Hz và làm nổi bật giọng nói.',
    highPassCutoff: 90,
    speechBoostGainDb: 2.5,
    hissCutoffHz: 7500,
    hissReductionDb: -7,
    gateThresholdDb: -42,
  },
  aggressive: {
    name: 'Khử ồn mạnh (Deep Isolation)',
    badge: 'Deep Isolation',
    description: 'Khử tạp âm môi trường phức tạp (tiếng xe, văn phòng ồn, quán cà phê), tối ưu tối đa cho AI STT.',
    highPassCutoff: 120,
    speechBoostGainDb: 3.5,
    hissCutoffHz: 6500,
    hissReductionDb: -12,
    gateThresholdDb: -35,
  },
};

/**
 * Standard Biquad filter coefficients and state
 */
interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function processBiquad(samples: Float32Array<any>, coeffs: BiquadCoeffs): Float32Array<ArrayBuffer> {
  const output = new Float32Array(samples.length);
  const { b0, b1, b2, a1, a2 } = coeffs;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;

    output[i] = y0;
  }
  return output;
}

/**
 * 2nd-order Butterworth Highpass filter
 * Eliminates low frequency rumble (HVAC, mic handling, wind, desk thumps)
 */
export function calculateHighPassCoeffs(cutoffHz: number, sampleRate: number, Q = 0.7071): BiquadCoeffs {
  const w0 = (2 * Math.PI * Math.min(cutoffHz, sampleRate * 0.45)) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Q);

  const b0_raw = (1 + cosw0) / 2;
  const b1_raw = -(1 + cosw0);
  const b2_raw = (1 + cosw0) / 2;
  const a0_raw = 1 + alpha;
  const a1_raw = -2 * cosw0;
  const a2_raw = 1 - alpha;

  return {
    b0: b0_raw / a0_raw,
    b1: b1_raw / a0_raw,
    b2: b2_raw / a0_raw,
    a1: a1_raw / a0_raw,
    a2: a2_raw / a0_raw,
  };
}

/**
 * Notch (band-stop) filter for 50Hz/60Hz AC mains power hum
 */
export function calculateNotchCoeffs(freqHz: number, sampleRate: number, Q = 4): BiquadCoeffs {
  const w0 = (2 * Math.PI * Math.min(freqHz, sampleRate * 0.45)) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Q);

  const b0_raw = 1;
  const b1_raw = -2 * cosw0;
  const b2_raw = 1;
  const a0_raw = 1 + alpha;
  const a1_raw = -2 * cosw0;
  const a2_raw = 1 - alpha;

  return {
    b0: b0_raw / a0_raw,
    b1: b1_raw / a0_raw,
    b2: b2_raw / a0_raw,
    a1: a1_raw / a0_raw,
    a2: a2_raw / a0_raw,
  };
}

/**
 * Peaking EQ filter for speech clarity boost (2.8kHz - 3.5kHz)
 */
export function calculatePeakingCoeffs(freqHz: number, gainDb: number, sampleRate: number, Q = 1.2): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * Math.min(freqHz, sampleRate * 0.45)) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Q);

  const b0_raw = 1 + alpha * A;
  const b1_raw = -2 * cosw0;
  const b2_raw = 1 - alpha * A;
  const a0_raw = 1 + alpha / A;
  const a1_raw = -2 * cosw0;
  const a2_raw = 1 - alpha / A;

  return {
    b0: b0_raw / a0_raw,
    b1: b1_raw / a0_raw,
    b2: b2_raw / a0_raw,
    a1: a1_raw / a0_raw,
    a2: a2_raw / a0_raw,
  };
}

/**
 * High-Shelf filter to attenuate microphone hiss & high-frequency thermal noise
 */
export function calculateHighShelfCoeffs(freqHz: number, gainDb: number, sampleRate: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * Math.min(freqHz, sampleRate * 0.45)) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const S = 1;
  const alpha = (sinw0 / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
  const twoRootAAlpha = 2 * Math.sqrt(A) * alpha;

  const b0_raw = A * ((A + 1) + (A - 1) * cosw0 + twoRootAAlpha);
  const b1_raw = -2 * A * ((A - 1) + (A + 1) * cosw0);
  const b2_raw = A * ((A + 1) + (A - 1) * cosw0 - twoRootAAlpha);
  const a0_raw = (A + 1) - (A - 1) * cosw0 + twoRootAAlpha;
  const a1_raw = 2 * ((A - 1) - (A + 1) * cosw0);
  const a2_raw = (A + 1) - (A - 1) * cosw0 - twoRootAAlpha;

  return {
    b0: b0_raw / a0_raw,
    b1: b1_raw / a0_raw,
    b2: b2_raw / a0_raw,
    a1: a1_raw / a0_raw,
    a2: a2_raw / a0_raw,
  };
}

/**
 * Smooth downward expander / noise gate:
 * Reduces energy during pauses between spoken words without abrupt cutoffs.
 */
function applySmoothNoiseGate(
  samples: Float32Array<any>,
  sampleRate: number,
  thresholdDb: number
): Float32Array<ArrayBuffer> {
  const output = new Float32Array(samples.length);
  const thresholdLinear = Math.pow(10, thresholdDb / 20);

  // Attack 5ms, Release 60ms
  const attackCoeff = Math.exp(-1 / (0.005 * sampleRate));
  const releaseCoeff = Math.exp(-1 / (0.060 * sampleRate));

  let envelope = 0;

  for (let i = 0; i < samples.length; i++) {
    const input = samples[i];
    const absInput = Math.abs(input);

    if (absInput > envelope) {
      envelope = attackCoeff * envelope + (1 - attackCoeff) * absInput;
    } else {
      envelope = releaseCoeff * envelope + (1 - releaseCoeff) * absInput;
    }

    let gain = 1.0;
    if (envelope < thresholdLinear) {
      // Smooth downward expansion ratio 1:3 down to -18dB floor reduction
      const ratio = envelope / Math.max(1e-6, thresholdLinear);
      const attenuated = Math.pow(ratio, 1.4);
      gain = Math.max(0.12, attenuated);
    }

    output[i] = input * gain;
  }

  return output;
}

/**
 * Peak normalization with soft headroom
 */
function applySoftNormalize(samples: Float32Array<any>, originalPeak: number, targetPeak = 0.92): Float32Array<ArrayBuffer> {
  let maxVal = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxVal) maxVal = abs;
  }

  // Prevent clipping if filter boosted
  if (maxVal > 0.98) {
    const downScale = 0.95 / maxVal;
    const output = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      output[i] = samples[i] * downScale;
    }
    return output;
  }

  // Only apply gentle makeup gain if original signal had substantial speech volume
  // and wasn't purely attenuated noise/silence
  if (originalPeak >= 0.25 && maxVal >= 0.15 && maxVal < targetPeak) {
    const gain = Math.min(1.35, targetPeak / maxVal);
    const output = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      output[i] = Math.max(-1, Math.min(1, samples[i] * gain));
    }
    return output;
  }

  return new Float32Array(samples);
}

/**
 * Core DSP audio filtering function.
 * Runs on Float32Array samples in mono.
 * Can be run in browser or Node test runner.
 */
export function applyNoiseReductionToSamples(
  samples: Float32Array<any>,
  sampleRate: number,
  settings: Partial<NoiseReductionSettings> = {}
): Float32Array<ArrayBuffer> {
  const merged: NoiseReductionSettings = {
    ...DEFAULT_NOISE_REDUCTION_SETTINGS,
    ...settings,
  };

  if (!merged.enabled) {
    return new Float32Array(samples);
  }

  const presetConfig = NOISE_PRESET_CONFIGS[merged.preset] || NOISE_PRESET_CONFIGS.balanced;
  let processed: Float32Array<ArrayBuffer> = new Float32Array(samples);

  let originalPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > originalPeak) originalPeak = abs;
  }

  // 1. High-Pass Low Cut (rumble removal) - 4th-order (2 cascaded biquads) for clean -24dB/octave slope
  const hpCutoff = merged.highPassCutoff || presetConfig.highPassCutoff;
  if (hpCutoff > 20) {
    const hpCoeffs1 = calculateHighPassCoeffs(hpCutoff, sampleRate, 0.54);
    const hpCoeffs2 = calculateHighPassCoeffs(hpCutoff, sampleRate, 1.30);
    processed = processBiquad(processed, hpCoeffs1);
    processed = processBiquad(processed, hpCoeffs2);
  }

  // 2. Mains Hum Notches (50Hz and 60Hz)
  if (merged.notchHum && sampleRate > 200) {
    const notch50 = calculateNotchCoeffs(50, sampleRate, 4);
    processed = processBiquad(processed, notch50);

    const notch60 = calculateNotchCoeffs(60, sampleRate, 4);
    processed = processBiquad(processed, notch60);

    // Harmonic 100Hz / 120Hz for aggressive preset
    if (merged.preset === 'aggressive') {
      const notch100 = calculateNotchCoeffs(100, sampleRate, 4);
      processed = processBiquad(processed, notch100);
      const notch120 = calculateNotchCoeffs(120, sampleRate, 4);
      processed = processBiquad(processed, notch120);
    }
  }

  // 3. Speech Clarity Presence Boost (~3000Hz)
  if (merged.speechBoost && presetConfig.speechBoostGainDb > 0) {
    const presenceCoeffs = calculatePeakingCoeffs(
      3000,
      presetConfig.speechBoostGainDb,
      sampleRate,
      1.2
    );
    processed = processBiquad(processed, presenceCoeffs);
  }

  // 4. High-frequency Hiss Reduction
  if (merged.reduceHiss && presetConfig.hissReductionDb < 0) {
    const hissCoeffs = calculateHighShelfCoeffs(
      presetConfig.hissCutoffHz,
      presetConfig.hissReductionDb,
      sampleRate
    );
    processed = processBiquad(processed, hissCoeffs);
  }

  // 5. Downward Expander / Noise Gate
  if (merged.noiseGate) {
    processed = applySmoothNoiseGate(processed, sampleRate, presetConfig.gateThresholdDb);
  }

  // 6. Normalization with headroom
  processed = applySoftNormalize(processed, originalPeak);

  return processed;
}

/**
 * Apply noise reduction directly to an AudioBuffer.
 * Handles single or multiple channels.
 */
export async function applyNoiseReductionToAudioBuffer(
  inputBuffer: AudioBuffer,
  settings: Partial<NoiseReductionSettings> = {}
): Promise<AudioBuffer> {
  const merged: NoiseReductionSettings = {
    ...DEFAULT_NOISE_REDUCTION_SETTINGS,
    ...settings,
  };

  if (!merged.enabled) {
    return inputBuffer;
  }

  // Try using OfflineAudioContext if available in browser
  const hasAudioContext = typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext);
  if (hasAudioContext) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputBuffer = ctx.createBuffer(
        inputBuffer.numberOfChannels,
        inputBuffer.length,
        inputBuffer.sampleRate
      );

      for (let ch = 0; ch < inputBuffer.numberOfChannels; ch++) {
        const channelSamples = inputBuffer.getChannelData(ch);
        const filtered = applyNoiseReductionToSamples(channelSamples, inputBuffer.sampleRate, merged);
        outputBuffer.copyToChannel(filtered as any, ch);
      }
      ctx.close();
      return outputBuffer;
    } catch {
      // Fallback
    }
  }

  // Fallback return (in node or test environment)
  return inputBuffer;
}

/**
 * Measure noise reduction metrics (RMS dB before vs after)
 */
export function calculateNoiseReductionMetrics(
  rawSamples: Float32Array,
  cleanedSamples: Float32Array
): {
  rawRmsDb: number;
  cleanRmsDb: number;
  noiseDropDb: number;
} {
  const rawRms = calculateRms(rawSamples);
  const cleanRms = calculateRms(cleanedSamples);

  const rawRmsDb = 20 * Math.log10(Math.max(1e-6, rawRms));
  const cleanRmsDb = 20 * Math.log10(Math.max(1e-6, cleanRms));
  const noiseDropDb = Math.max(0, rawRmsDb - cleanRmsDb);

  return {
    rawRmsDb: Math.round(rawRmsDb * 10) / 10,
    cleanRmsDb: Math.round(cleanRmsDb * 10) / 10,
    noiseDropDb: Math.round(noiseDropDb * 10) / 10,
  };
}

function calculateRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / Math.max(1, samples.length));
}
