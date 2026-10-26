import test from 'node:test';
import assert from 'node:assert/strict';
import { getTransitionState } from './transitionEngine';
import { VideoClipSegment } from '../types/editor';

test('getTransitionState returns inactive when type is cut', () => {
  const clips: VideoClipSegment[] = [
    { id: '1', rawStart: 0, rawEnd: 3, timelineStart: 0, timelineEnd: 3, duration: 3 },
    { id: '2', rawStart: 5, rawEnd: 9, timelineStart: 3, timelineEnd: 7, duration: 4 },
  ];

  const state = getTransitionState(3.0, clips, { type: 'cut', duration: 0.3 });
  assert.equal(state.isActive, false);
});

test('getTransitionState detects transition active around cut boundary', () => {
  const clips: VideoClipSegment[] = [
    { id: '1', rawStart: 0, rawEnd: 3, timelineStart: 0, timelineEnd: 3, duration: 3 },
    { id: '2', rawStart: 5, rawEnd: 9, timelineStart: 3, timelineEnd: 7, duration: 4 },
  ];

  // Duration is 0.4s -> window is 3.0 +/- 0.2s (2.8s to 3.2s)
  // At 2.7s -> outside window
  const before = getTransitionState(2.7, clips, { type: 'dissolve', duration: 0.4 });
  assert.equal(before.isActive, false);

  // At 3.0s (exact boundary) -> progress should be ~0.5
  const mid = getTransitionState(3.0, clips, { type: 'dissolve', duration: 0.4 });
  assert.equal(mid.isActive, true);
  assert.ok(Math.abs(mid.progress - 0.5) < 0.05);
  assert.equal(mid.clipIndex, 0);

  // At 3.1s -> inside window, progress ~0.75
  const late = getTransitionState(3.1, clips, { type: 'dissolve', duration: 0.4 });
  assert.equal(late.isActive, true);
  assert.ok(Math.abs(late.progress - 0.75) < 0.05);

  // At 3.3s -> outside window
  const after = getTransitionState(3.3, clips, { type: 'dissolve', duration: 0.4 });
  assert.equal(after.isActive, false);
});
