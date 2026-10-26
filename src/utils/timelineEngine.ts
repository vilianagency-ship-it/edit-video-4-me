import { VideoClipSegment, TranscriptSegment, OverlayItem, WordTiming } from '../types/editor';

/**
 * Given a list of retained clips and a timeline time, find the corresponding raw video time.
 * If timeline time falls at the end of all clips, returns the raw end of the last clip.
 */
export function timelineToRawTime(timelineTime: number, clips: VideoClipSegment[]): number {
  if (clips.length === 0) return timelineTime;

  for (const clip of clips) {
    if (timelineTime >= clip.timelineStart && timelineTime <= clip.timelineEnd) {
      const offset = timelineTime - clip.timelineStart;
      return clip.rawStart + offset;
    }
  }

  // If beyond last clip
  const lastClip = clips[clips.length - 1];
  if (timelineTime > lastClip.timelineEnd) {
    return lastClip.rawEnd;
  }

  return clips[0].rawStart;
}

/**
 * Given raw video time, find the corresponding timeline time.
 * If raw video time falls inside a cut silence gap, maps to the start of the next clip.
 */
export function rawToTimelineTime(rawTime: number, clips: VideoClipSegment[]): number {
  if (clips.length === 0) return rawTime;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (rawTime >= clip.rawStart && rawTime <= clip.rawEnd) {
      const offset = rawTime - clip.rawStart;
      return clip.timelineStart + offset;
    }

    // Check if rawTime falls in a gap between this clip and previous
    if (rawTime < clip.rawStart) {
      return clip.timelineStart;
    }
  }

  const lastClip = clips[clips.length - 1];
  return lastClip.timelineEnd;
}

/**
 * During video playback in raw video coordinates, if rawTime falls inside a cut gap,
 * find where to jump (the start of the next retained clip).
 * Returns null if current time is within a retained clip.
 */
export function getJumpTargetForCut(rawTime: number, clips: VideoClipSegment[]): number | null {
  if (clips.length === 0) return null;

  // Check if inside any clip
  for (const clip of clips) {
    if (rawTime >= clip.rawStart && rawTime < clip.rawEnd - 0.01) {
      return null;
    }
  }

  // In a cut gap: find the next clip
  for (const clip of clips) {
    if (clip.rawStart > rawTime) {
      return clip.rawStart;
    }
  }

  // Reached beyond all clips
  return clips[clips.length - 1].rawEnd;
}

/**
 * Find active transcript segment and active word at raw video time.
 */
export function getActiveSubtitle(
  rawTime: number,
  segments: TranscriptSegment[]
): {
  segment: TranscriptSegment | null;
  activeWordIndex: number;
  activeWord: WordTiming | null;
} {
  for (const seg of segments) {
    if (seg.deleted) continue;
    if (rawTime >= seg.start - 0.05 && rawTime <= seg.end + 0.1) {
      let activeIndex = -1;
      let activeWord: WordTiming | null = null;

      for (let i = 0; i < seg.words.length; i++) {
        const w = seg.words[i];
        if (w.deleted) continue;
        if (rawTime >= w.start - 0.05 && rawTime <= w.end + 0.05) {
          activeIndex = i;
          activeWord = w;
          break;
        }
      }

      return { segment: seg, activeWordIndex: activeIndex, activeWord };
    }
  }

  return { segment: null, activeWordIndex: -1, activeWord: null };
}

/**
 * Get all active overlays at the specified raw video time.
 */
export function getActiveOverlays(rawTime: number, overlays: OverlayItem[]): OverlayItem[] {
  return overlays.filter(item => rawTime >= item.start && rawTime <= item.end);
}

/**
 * Format seconds into mm:ss or mm:ss.ms
 */
export function formatTime(seconds: number, includeMs = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);

  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (includeMs) {
    return `${mm}:${ss}.${ms}`;
  }
  return `${mm}:${ss}`;
}
