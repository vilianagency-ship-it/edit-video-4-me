import { SilenceGap, SilenceSettings } from '../types/editor';
import { detectSilencesFromRms } from './silenceDetector';

/**
 * Extract audio from a video/audio File or Blob and detect silent gaps using Web Audio API.
 */
export async function analyzeAudioSilences(
  fileOrBlob: Blob,
  settings: SilenceSettings,
  onProgress?: (percent: number) => void
): Promise<{
  gaps: SilenceGap[];
  duration: number;
  rmsFrames: number[];
  frameDuration: number;
  audioBuffer: AudioBuffer;
}> {
  onProgress?.(15);
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  onProgress?.(35);

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let audioBuffer: AudioBuffer;

  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    audioCtx.close();
    throw new Error('Không thể giải mã âm thanh từ tệp này. Hãy kiểm tra định dạng video.');
  }

  onProgress?.(60);

  const totalDuration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const rawChannelData = audioBuffer.getChannelData(0); // analyze first channel

  // Calculate RMS in windows of 25ms (~40 frames per second)
  const windowSize = Math.floor(sampleRate * 0.025);
  const frameDuration = windowSize / sampleRate;
  const numFrames = Math.floor(rawChannelData.length / windowSize);
  const rmsFrames: number[] = new Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    const startIdx = i * windowSize;
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      const val = rawChannelData[startIdx + j];
      sumSquares += val * val;
    }
    rmsFrames[i] = Math.sqrt(sumSquares / windowSize);

    if (i % 2000 === 0 && onProgress) {
      onProgress(60 + Math.floor((i / numFrames) * 30));
    }
  }

  onProgress?.(95);

  const gaps = detectSilencesFromRms(rmsFrames, frameDuration, totalDuration, settings);
  audioCtx.close();

  onProgress?.(100);

  return {
    gaps,
    duration: totalDuration,
    rmsFrames,
    frameDuration,
    audioBuffer,
  };
}
