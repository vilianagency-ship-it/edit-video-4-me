import test from 'node:test';
import assert from 'node:assert/strict';
import { audioBufferToWavBase64 } from './audioEncoder';

test('audioBufferToWavBase64 generates valid WAV header and base64 string', () => {
  // Mock AudioBuffer with 1 second of 16kHz sine wave
  const sampleRate = 16000;
  const channelData = new Float32Array(sampleRate);
  for (let i = 0; i < sampleRate; i++) {
    channelData[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }

  const mockAudioBuffer = {
    sampleRate,
    length: sampleRate,
    duration: 1.0,
    numberOfChannels: 1,
    getChannelData: () => channelData,
  } as unknown as AudioBuffer;

  const base64 = audioBufferToWavBase64(mockAudioBuffer, 16000);
  assert.ok(typeof base64 === 'string');
  assert.ok(base64.length > 100);

  // Decode first 12 bytes to verify RIFF and WAVE header
  const binary = atob(base64.slice(0, 40));
  assert.equal(binary.slice(0, 4), 'RIFF');
  assert.equal(binary.slice(8, 12), 'WAVE');
});
