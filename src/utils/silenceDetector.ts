import { SilenceGap, VideoClipSegment, SilenceSettings } from '../types/editor';

/**
 * Convert linear RMS amplitude (0.0 to 1.0) to decibels (dB).
 * -Infinity for 0, clamped to min -100 dB.
 */
export function amplitudeToDb(amp: number): number {
  if (amp <= 0.00001) return -100;
  return 20 * Math.log10(amp);
}

/**
 * Detect silence intervals from an array of RMS energy frames.
 * @param rmsFrames Array of RMS values (0.0 to 1.0)
 * @param frameDurationSec Duration of each RMS sample in seconds
 * @param totalDurationSec Total length of the audio track
 * @param settings Silence threshold, minimum duration, and speech padding
 */
export function detectSilencesFromRms(
  rmsFrames: number[],
  frameDurationSec: number,
  totalDurationSec: number,
  settings: SilenceSettings
): SilenceGap[] {
  const { thresholdDb, minDurationSec, paddingSec } = settings;
  const isSilent: boolean[] = rmsFrames.map(rms => amplitudeToDb(rms) < thresholdDb);

  const rawGaps: { start: number; end: number }[] = [];
  let gapStart: number | null = null;

  for (let i = 0; i < isSilent.length; i++) {
    const time = i * frameDurationSec;
    if (isSilent[i]) {
      if (gapStart === null) {
        gapStart = time;
      }
    } else {
      if (gapStart !== null) {
        const gapEnd = time;
        if (gapEnd - gapStart >= minDurationSec) {
          rawGaps.push({ start: gapStart, end: gapEnd });
        }
        gapStart = null;
      }
    }
  }

  // Handle trailing silence
  if (gapStart !== null) {
    const gapEnd = Math.min(rmsFrames.length * frameDurationSec, totalDurationSec);
    if (gapEnd - gapStart >= minDurationSec) {
      rawGaps.push({ start: gapStart, end: gapEnd });
    }
  }

  // Apply speech padding: shrink gaps slightly so speech onset & decay aren't clipped
  const paddedGaps: SilenceGap[] = [];
  for (let i = 0; i < rawGaps.length; i++) {
    const raw = rawGaps[i];
    // Start cutting a little bit after speech ends, stop cutting a little before speech resumes
    const paddedStart = Math.min(raw.end, raw.start + paddingSec);
    const paddedEnd = Math.max(paddedStart, raw.end - paddingSec);
    const duration = paddedEnd - paddedStart;

    if (duration >= 0.1) {
      paddedGaps.push({
        id: `silence-${i + 1}`,
        start: Number(paddedStart.toFixed(3)),
        end: Number(paddedEnd.toFixed(3)),
        duration: Number(duration.toFixed(3)),
        cut: true,
      });
    }
  }

  return paddedGaps;
}

/**
 * Given video duration and a list of active silence cuts,
 * computes the retained video clips (speech segments) with timeline mapping.
 */
export function computeRetainedClips(
  totalDurationSec: number,
  silenceGaps: SilenceGap[]
): VideoClipSegment[] {
  // Only consider gaps that are marked as cut
  const activeCuts = silenceGaps
    .filter(g => g.cut && g.end > g.start)
    .sort((a, b) => a.start - b.start);

  // Merge any overlapping or contiguous cuts
  const mergedCuts: { start: number; end: number }[] = [];
  for (const cut of activeCuts) {
    if (mergedCuts.length === 0) {
      mergedCuts.push({ start: Math.max(0, cut.start), end: Math.min(totalDurationSec, cut.end) });
    } else {
      const last = mergedCuts[mergedCuts.length - 1];
      if (cut.start <= last.end) {
        last.end = Math.max(last.end, Math.min(totalDurationSec, cut.end));
      } else {
        mergedCuts.push({ start: cut.start, end: Math.min(totalDurationSec, cut.end) });
      }
    }
  }

  // Derive retained clips
  const retained: { start: number; end: number }[] = [];
  let cursor = 0;

  for (const cut of mergedCuts) {
    if (cut.start > cursor + 0.02) {
      retained.push({ start: cursor, end: cut.start });
    }
    cursor = Math.max(cursor, cut.end);
  }

  if (cursor < totalDurationSec - 0.02) {
    retained.push({ start: cursor, end: totalDurationSec });
  }

  // If entire video is kept (no cuts)
  if (retained.length === 0 && totalDurationSec > 0) {
    retained.push({ start: 0, end: totalDurationSec });
  }

  // Map to timeline positions (timeline cursor increments monotonically)
  let timelineCursor = 0;
  return retained.map((clip, index) => {
    const duration = Number((clip.end - clip.start).toFixed(3));
    const segment: VideoClipSegment = {
      id: `clip-${index + 1}`,
      rawStart: Number(clip.start.toFixed(3)),
      rawEnd: Number(clip.end.toFixed(3)),
      timelineStart: Number(timelineCursor.toFixed(3)),
      timelineEnd: Number((timelineCursor + duration).toFixed(3)),
      duration,
      speed: 1.0,
    };
    timelineCursor += duration;
    return segment;
  });
}
