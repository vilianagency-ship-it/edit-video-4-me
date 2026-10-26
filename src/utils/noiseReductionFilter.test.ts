import test from 'node:test';
import assert from 'node:assert';
import {
  applyNoiseReductionToSamples,
  calculateNoiseReductionMetrics,
  DEFAULT_NOISE_REDUCTION_SETTINGS,
  NOISE_PRESET_CONFIGS,
} from './noiseReductionFilter';

function generateSine(freqHz: number, durationSec: number, sampleRate: number, amplitude = 0.5): Float32Array {
  const numSamples = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return samples;
}

function calculateRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / Math.max(1, samples.length));
}

test('applyNoiseReductionToSamples returns unmodified samples when enabled is false', () => {
  const sampleRate = 16000;
  const input = generateSine(400, 0.1, sampleRate, 0.4);
  const output = applyNoiseReductionToSamples(input, sampleRate, { enabled: false });

  assert.strictEqual(output.length, input.length);
  assert.strictEqual(output[100], input[100]);
});

test('high-pass filter significantly attenuates low frequency rumble (40Hz)', () => {
  const sampleRate = 16000;
  // 40Hz rumble (sub-bass / HVAC noise)
  const rumble = generateSine(40, 0.3, sampleRate, 0.5);
  const processedRumble = applyNoiseReductionToSamples(rumble, sampleRate, {
    enabled: true,
    preset: 'balanced',
    highPassCutoff: 90,
    noiseGate: false, // test filter curve alone
  });

  const rawRms = calculateRms(rumble);
  const cleanRms = calculateRms(processedRumble);

  // 40Hz is well below 90Hz cutoff, so RMS should drop significantly
  assert.ok(cleanRms < rawRms * 0.4, `Expected clean RMS ${cleanRms} to be < 40% of raw RMS ${rawRms}`);
});

test('speech frequency (1000Hz) is preserved well by filter', () => {
  const sampleRate = 16000;
  const speechTone = generateSine(1000, 0.2, sampleRate, 0.4);
  const processedTone = applyNoiseReductionToSamples(speechTone, sampleRate, {
    enabled: true,
    preset: 'balanced',
    highPassCutoff: 90,
    noiseGate: false,
  });

  const rawRms = calculateRms(speechTone);
  const cleanRms = calculateRms(processedTone);

  // Speech frequency should remain strong and not be cut
  assert.ok(cleanRms > rawRms * 0.7, `Expected clean RMS ${cleanRms} to be > 70% of raw RMS ${rawRms}`);
});

test('notch filter reduces 50Hz electrical hum', () => {
  const sampleRate = 16000;
  const hum50 = generateSine(50, 0.3, sampleRate, 0.5);
  const processed = applyNoiseReductionToSamples(hum50, sampleRate, {
    enabled: true,
    notchHum: true,
    highPassCutoff: 30, // low cutoff so notch effect is clear
    noiseGate: false,
  });

  const rawRms = calculateRms(hum50);
  const cleanRms = calculateRms(processed);

  assert.ok(cleanRms < rawRms * 0.35, `Expected 50Hz hum to be notched: clean ${cleanRms} vs raw ${rawRms}`);
});

test('noise gate suppresses quiet ambient noise', () => {
  const sampleRate = 16000;
  // Very quiet noise (-52dB, amplitude 0.0025)
  const quietHiss = generateSine(350, 0.2, sampleRate, 0.0025);
  const processed = applyNoiseReductionToSamples(quietHiss, sampleRate, {
    enabled: true,
    preset: 'balanced',
    noiseGate: true,
  });

  const rawRms = calculateRms(quietHiss);
  const cleanRms = calculateRms(processed);

  // Noise gate should attenuate quiet noise floor
  assert.ok(cleanRms < rawRms, `Expected noise gate to attenuate low level audio: clean ${cleanRms} vs raw ${rawRms}`);
});

test('preset configs contain valid parameters', () => {
  assert.ok(NOISE_PRESET_CONFIGS.light);
  assert.ok(NOISE_PRESET_CONFIGS.balanced);
  assert.ok(NOISE_PRESET_CONFIGS.aggressive);

  assert.strictEqual(NOISE_PRESET_CONFIGS.balanced.highPassCutoff, 90);
  assert.strictEqual(NOISE_PRESET_CONFIGS.aggressive.highPassCutoff, 120);
});

test('calculateNoiseReductionMetrics reports accurate stats', () => {
  const raw = new Float32Array([0.5, -0.5, 0.5, -0.5]);
  const clean = new Float32Array([0.1, -0.1, 0.1, -0.1]);

  const metrics = calculateNoiseReductionMetrics(raw, clean);
  assert.ok(metrics.rawRmsDb > metrics.cleanRmsDb);
  assert.ok(metrics.noiseDropDb > 0);
});
