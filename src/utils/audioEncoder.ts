/**
 * Convert an AudioBuffer to a standard 16kHz mono 16-bit PCM WAV Blob or base64.
 * This produces a lightweight audio payload (~32KB/s) suitable for sending to Gemini API.
 */
export function audioBufferToWavBase64(audioBuffer: AudioBuffer, targetSampleRate = 16000): string {
  const numChannels = 1;
  const originalSampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Resample down to targetSampleRate if higher
  let samples: Float32Array;
  if (originalSampleRate === targetSampleRate) {
    samples = channelData;
  } else {
    const ratio = originalSampleRate / targetSampleRate;
    const newLength = Math.round(channelData.length / ratio);
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origIndex = Math.min(channelData.length - 1, Math.round(i * ratio));
      samples[i] = channelData[origIndex];
    }
  }

  // 16-bit PCM WAV header (44 bytes)
  const byteRate = targetSampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples clamped between -1 and 1
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  // Convert buffer to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunkSize, len)) as any
    );
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
