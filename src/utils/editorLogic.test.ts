import test from 'node:test';
import assert from 'node:assert/strict';
import { amplitudeToDb, detectSilencesFromRms, computeRetainedClips } from './silenceDetector';
import { timelineToRawTime, rawToTimelineTime, getJumpTargetForCut, getActiveSubtitle, formatTime } from './timelineEngine';
import { TranscriptSegment } from '../types/editor';

test('amplitudeToDb converts linear amplitudes to decibels correctly', () => {
  assert.equal(amplitudeToDb(1.0), 0);
  // 0.1 linear is -20 dB
  assert.ok(Math.abs(amplitudeToDb(0.1) - (-20)) < 0.001);
  // Zero amplitude should clamp to -100
  assert.equal(amplitudeToDb(0), -100);
});

test('detectSilencesFromRms detects silence intervals with padding', () => {
  // 10 frames of 0.1s each (total 1.0s)
  // Frames 0-2 loud (0.5), 3-6 quiet (0.01 = -40dB), 7-9 loud (0.5)
  const rms = [0.5, 0.5, 0.5, 0.01, 0.01, 0.01, 0.01, 0.5, 0.5, 0.5];
  const gaps = detectSilencesFromRms(rms, 0.1, 1.0, {
    thresholdDb: -30,
    minDurationSec: 0.3,
    paddingSec: 0.05,
  });

  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].cut, true);
  // Raw silence: 0.3s to 0.7s (0.4s duration)
  // With padding 0.05s: starts 0.35s, ends 0.65s (0.3s duration)
  assert.equal(gaps[0].start, 0.35);
  assert.equal(gaps[0].end, 0.65);
  assert.equal(gaps[0].duration, 0.3);
});

test('computeRetainedClips creates speech segments excluding cuts', () => {
  const totalDuration = 10;
  const cuts = [
    { id: '1', start: 2, end: 4, duration: 2, cut: true },
    { id: '2', start: 7, end: 8, duration: 1, cut: true },
  ];

  const clips = computeRetainedClips(totalDuration, cuts);
  assert.equal(clips.length, 3);

  // Clip 1: 0 to 2 -> timeline 0 to 2
  assert.equal(clips[0].rawStart, 0);
  assert.equal(clips[0].rawEnd, 2);
  assert.equal(clips[0].timelineStart, 0);
  assert.equal(clips[0].timelineEnd, 2);

  // Clip 2: 4 to 7 (duration 3) -> timeline 2 to 5
  assert.equal(clips[1].rawStart, 4);
  assert.equal(clips[1].rawEnd, 7);
  assert.equal(clips[1].timelineStart, 2);
  assert.equal(clips[1].timelineEnd, 5);

  // Clip 3: 8 to 10 (duration 2) -> timeline 5 to 7
  assert.equal(clips[2].rawStart, 8);
  assert.equal(clips[2].rawEnd, 10);
  assert.equal(clips[2].timelineStart, 5);
  assert.equal(clips[2].timelineEnd, 7);
});

test('timelineToRawTime maps timeline coordinate accurately across cut boundaries', () => {
  const clips = [
    { id: '1', rawStart: 0, rawEnd: 2, timelineStart: 0, timelineEnd: 2, duration: 2 },
    { id: '2', rawStart: 5, rawEnd: 9, timelineStart: 2, timelineEnd: 6, duration: 4 },
  ];

  // At timeline 1.0 -> raw 1.0
  assert.equal(timelineToRawTime(1.0, clips), 1.0);
  // At timeline 3.0 -> 1 second into clip 2 -> raw 6.0
  assert.equal(timelineToRawTime(3.0, clips), 6.0);
});

test('rawToTimelineTime maps raw coordinate and silence gaps accurately', () => {
  const clips = [
    { id: '1', rawStart: 0, rawEnd: 2, timelineStart: 0, timelineEnd: 2, duration: 2 },
    { id: '2', rawStart: 5, rawEnd: 9, timelineStart: 2, timelineEnd: 6, duration: 4 },
  ];

  assert.equal(rawToTimelineTime(1.5, clips), 1.5);
  // In the cut gap (between 2 and 5), e.g. 3.0 -> snaps to start of clip 2 (timeline 2.0)
  assert.equal(rawToTimelineTime(3.0, clips), 2.0);
  assert.equal(rawToTimelineTime(7.0, clips), 4.0);
});

test('getJumpTargetForCut detects when playback enters a silence cut', () => {
  const clips = [
    { id: '1', rawStart: 0, rawEnd: 2, timelineStart: 0, timelineEnd: 2, duration: 2 },
    { id: '2', rawStart: 5, rawEnd: 9, timelineStart: 2, timelineEnd: 6, duration: 4 },
  ];

  // Inside clip 1
  assert.equal(getJumpTargetForCut(1.0, clips), null);
  // At 2.5 (inside cut gap) -> jump to clip 2 rawStart = 5
  assert.equal(getJumpTargetForCut(2.5, clips), 5);
});

test('getActiveSubtitle locates active segment and word timing', () => {
  const segments: TranscriptSegment[] = [
    {
      id: 's1',
      start: 1.0,
      end: 3.0,
      text: 'Xin chào các bạn',
      words: [
        { id: 'w1', word: 'Xin', start: 1.0, end: 1.5 },
        { id: 'w2', word: 'chào', start: 1.5, end: 2.0 },
        { id: 'w3', word: 'các', start: 2.0, end: 2.5 },
        { id: 'w4', word: 'bạn', start: 2.5, end: 3.0 },
      ],
    },
  ];

  const res = getActiveSubtitle(1.7, segments);
  assert.ok(res.segment !== null);
  assert.equal(res.activeWordIndex, 1);
  assert.equal(res.activeWord?.word, 'chào');
});

test('formatTime produces correct mm:ss string', () => {
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(9), '00:09');
  assert.equal(formatTime(125.4, true), '02:05.4');
});
