import { test } from 'node:test';
import assert from 'node:assert';
import {
  isSpeechActiveAtTime,
  calculateDuckingGain,
  getEffectiveBgmVolume,
  getPresetTracks,
  DEFAULT_DUCKING_SETTINGS,
} from './audioDucking.js';
import { TranscriptSegment } from '../types/editor.js';

test('isSpeechActiveAtTime detects speech accurately with padding', () => {
  const segments: TranscriptSegment[] = [
    {
      id: 'seg-1',
      start: 2.0,
      end: 4.0,
      text: 'Test speech',
      words: [
        { id: 'w-1', word: 'Test', start: 2.0, end: 2.8 },
        { id: 'w-2', word: 'speech', start: 3.1, end: 4.0 },
      ],
    },
    {
      id: 'seg-2',
      start: 6.0,
      end: 8.0,
      text: 'Deleted text',
      deleted: true,
      words: [{ id: 'w-3', word: 'Deleted', start: 6.0, end: 8.0 }],
    },
  ];

  // At t=0.5, no speech
  assert.strictEqual(isSpeechActiveAtTime(0.5, segments, 0.1), false);

  // At t=1.95, inside padding (2.0 - 0.1)
  assert.strictEqual(isSpeechActiveAtTime(1.95, segments, 0.1), true);

  // At t=2.5, inside word
  assert.strictEqual(isSpeechActiveAtTime(2.5, segments, 0.1), true);

  // At t=5.0, no speech (silence gap between seg-1 and seg-2)
  assert.strictEqual(isSpeechActiveAtTime(5.0, segments, 0.1), false);

  // At t=7.0, segment is deleted, should return false
  assert.strictEqual(isSpeechActiveAtTime(7.0, segments, 0.1), false);
});

test('calculateDuckingGain returns minimum ratio during speech and 1.0 during silence', () => {
  const segments: TranscriptSegment[] = [
    {
      id: 'seg-1',
      start: 2.0,
      end: 4.0,
      text: 'Speaking',
      words: [{ id: 'w-1', word: 'Speaking', start: 2.0, end: 4.0 }],
    },
  ];

  const ducking = {
    ...DEFAULT_DUCKING_SETTINGS,
    duckedVolumePercent: 20,
    attackSec: 0.2,
    releaseSec: 0.4,
    thresholdPaddingSec: 0.1,
  };

  // During speech at t=3.0: should be exactly duckedVolumePercent / 100 = 0.2
  const duringGain = calculateDuckingGain(3.0, segments, ducking);
  assert.strictEqual(Math.round(duringGain * 100) / 100, 0.2);

  // Far before speech at t=0.5: should be 1.0 (full volume)
  const farBeforeGain = calculateDuckingGain(0.5, segments, ducking);
  assert.strictEqual(farBeforeGain, 1.0);

  // Far after speech at t=6.0: should be 1.0
  const farAfterGain = calculateDuckingGain(6.0, segments, ducking);
  assert.strictEqual(farAfterGain, 1.0);

  // In attack ramp: t=1.8 (within 0.2s of interval start 1.9)
  const attackGain = calculateDuckingGain(1.8, segments, ducking);
  assert.ok(attackGain < 1.0 && attackGain > 0.2, `Attack gain ${attackGain} should be between 0.2 and 1.0`);

  // In release ramp: t=4.2 (interval ends at 4.1, release is 0.4s ending at 4.5)
  const releaseGain = calculateDuckingGain(4.2, segments, ducking);
  assert.ok(releaseGain < 1.0 && releaseGain > 0.2, `Release gain ${releaseGain} should be between 0.2 and 1.0`);
});

test('getEffectiveBgmVolume scales by master volume and ducking', () => {
  const segments: TranscriptSegment[] = [
    {
      id: 'seg-1',
      start: 2.0,
      end: 4.0,
      text: 'Speaking',
      words: [{ id: 'w-1', word: 'Speaking', start: 2.0, end: 4.0 }],
    },
  ];

  const presets = getPresetTracks();
  assert.ok(presets.length >= 4, 'Should have at least 4 preset tracks');

  const config = {
    enabled: true,
    track: presets[0],
    volume: 0.5,
    voiceVolume: 1.0,
    loop: true,
    ducking: {
      enabled: true,
      duckedVolumePercent: 20,
      attackSec: 0.2,
      releaseSec: 0.4,
      thresholdPaddingSec: 0.1,
    },
  };

  // During silence: volume = 0.5 * 1.0 = 0.5
  const silenceVol = getEffectiveBgmVolume(0.5, config, segments);
  assert.strictEqual(silenceVol, 0.5);

  // During speech: volume = 0.5 * 0.2 = 0.1
  const speechVol = getEffectiveBgmVolume(3.0, config, segments);
  assert.strictEqual(Math.round(speechVol * 100) / 100, 0.1);

  // When ducking disabled: volume remains 0.5
  const noDuckingConfig = { ...config, ducking: { ...config.ducking, enabled: false } };
  const unDuckedVol = getEffectiveBgmVolume(3.0, noDuckingConfig, segments);
  assert.strictEqual(unDuckedVol, 0.5);
});
