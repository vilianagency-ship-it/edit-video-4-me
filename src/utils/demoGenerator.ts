import { DEMO_PROJECT_VI } from '../data/subtitlePresets';

/**
 * Generate a realistic talking-head presenter video with synchronized voice-like speech
 * and clear silent pauses that match the demo project timestamps.
 */
export async function createDemoVideoBlob(): Promise<Blob> {
  const width = 540;
  const height = 960; // 9:16 vertical video format (TikTok / Reels / Shorts)
  const duration = DEMO_PROJECT_VI.videoDuration; // ~28.5 seconds
  const fps = 24;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  // Voice synthesis: Oscillator with formant filter and speech cadence
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(125, audioCtx.currentTime); // male/warm speech fundamental
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(250, audioCtx.currentTime);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  filter.Q.setValueAtTime(3, audioCtx.currentTime);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(filter);
  filter.connect(dest);

  osc.start();
  osc2.start();

  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm',
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      osc.stop();
      osc2.stop();
      audioCtx.close();
      const finalBlob = new Blob(chunks, { type: 'video/webm' });
      resolve(finalBlob);
    };

    recorder.start();

    // Render loop
    const startTime = performance.now();
    let frameId: number;

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= duration) {
        recorder.stop();
        cancelAnimationFrame(frameId);
        return;
      }

      // Check if current time is within a silence gap
      const isSilent = DEMO_PROJECT_VI.silenceGaps.some(
        gap => gap.cut && elapsed >= gap.start && elapsed <= gap.end
      );

      // Modulate audio volume
      if (isSilent) {
        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      } else {
        // Speech cadence modulation
        const speechSyllable = Math.sin(elapsed * 18);
        const speechVolume = speechSyllable > 0.1 ? 0.14 : 0.04;
        gain.gain.setValueAtTime(speechVolume, audioCtx.currentTime);
        // Vary pitch slightly
        const pitchJitter = 125 + Math.sin(elapsed * 4) * 15;
        osc.frequency.setValueAtTime(pitchJitter, audioCtx.currentTime);
      }

      // Draw Presenter Canvas
      // 1. Studio Backdrop (Modern tech gradient + subtle ambient lighting)
      const bgGrad = ctx.createRadialGradient(width / 2, height * 0.4, 60, width / 2, height / 2, width * 0.9);
      bgGrad.addColorStop(0, '#1E293B');
      bgGrad.addColorStop(1, '#090D16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Studio rim light accent
      const rimGrad = ctx.createLinearGradient(0, 0, width, height);
      rimGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      rimGrad.addColorStop(0.5, 'transparent');
      rimGrad.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
      ctx.fillStyle = rimGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle soundwave meter in background
      ctx.fillStyle = isSilent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)';
      const bars = 24;
      const barW = (width - 80) / bars;
      for (let b = 0; b < bars; b++) {
        const h = isSilent
          ? 3
          : 6 + Math.abs(Math.sin(elapsed * 8 + b * 0.4)) * 36;
        ctx.fillRect(40 + b * barW, height * 0.14 - h / 2, barW - 4, h);
      }

      // Talking Head Avatar (Professional modern vector creator)
      const headCenterX = width / 2;
      const headCenterY = height * 0.42;

      // Body / Shoulders
      ctx.fillStyle = '#2563EB'; // Blue smart casual polo/shirt
      ctx.beginPath();
      ctx.ellipse(headCenterX, height * 0.76, 180, 160, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shirt collar
      ctx.fillStyle = '#1D4ED8';
      ctx.beginPath();
      ctx.moveTo(headCenterX - 35, headCenterY + 140);
      ctx.lineTo(headCenterX + 35, headCenterY + 140);
      ctx.lineTo(headCenterX, headCenterY + 180);
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = '#FBCFE8'; // Skin tone
      ctx.fillRect(headCenterX - 30, headCenterY + 65, 60, 80);

      // Head
      ctx.fillStyle = '#FDE047'; // Warm golden skin
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY, 85, 105, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stylish hair
      ctx.fillStyle = '#1E1B4B';
      ctx.beginPath();
      ctx.arc(headCenterX, headCenterY - 45, 90, Math.PI, 0, false);
      ctx.lineTo(headCenterX + 85, headCenterY - 20);
      ctx.quadraticCurveTo(headCenterX, headCenterY - 115, headCenterX - 85, headCenterY - 20);
      ctx.closePath();
      ctx.fill();

      // Eyes with occasional blinking
      const blink = Math.sin(elapsed * 2.5) > 0.95;
      ctx.fillStyle = '#0F172A';
      if (blink) {
        ctx.fillRect(headCenterX - 45, headCenterY - 10, 24, 3);
        ctx.fillRect(headCenterX + 21, headCenterY - 10, 24, 3);
      } else {
        ctx.beginPath();
        ctx.arc(headCenterX - 33, headCenterY - 10, 9, 0, Math.PI * 2);
        ctx.arc(headCenterX + 33, headCenterY - 10, 9, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(headCenterX - 35, headCenterY - 12, 3, 0, Math.PI * 2);
        ctx.arc(headCenterX + 31, headCenterY - 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyebrows
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headCenterX - 50, headCenterY - 28);
      ctx.quadraticCurveTo(headCenterX - 33, headCenterY - 35, headCenterX - 18, headCenterY - 27);
      ctx.moveTo(headCenterX + 18, headCenterY - 27);
      ctx.quadraticCurveTo(headCenterX + 33, headCenterY - 35, headCenterX + 50, headCenterY - 28);
      ctx.stroke();

      // Mouth animation (talking vs silent)
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      if (isSilent) {
        // Closed mouth with subtle smile
        ctx.strokeStyle = '#881337';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(headCenterX - 22, headCenterY + 45);
        ctx.quadraticCurveTo(headCenterX, headCenterY + 49, headCenterX + 22, headCenterY + 45);
        ctx.stroke();
      } else {
        // Open/Moving mouth animated with speech phonemes
        const mouthOpen = 6 + Math.abs(Math.sin(elapsed * 18)) * 18;
        ctx.ellipse(headCenterX, headCenterY + 45, 20, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
        // Teeth
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(headCenterX - 14, headCenterY + 45 - mouthOpen * 0.6, 28, 4);
      }

      // Status indicator on video
      ctx.fillStyle = isSilent ? '#EF4444' : '#10B981';
      ctx.beginPath();
      ctx.arc(40, 50, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(
        isSilent ? 'ĐANG IM LẶNG (CẦN CẮT)' : 'ĐANG NÓI CHUYỆN (GIỮ LẠI)',
        58,
        55
      );

      // Time display overlay
      ctx.font = '13px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`Raw Time: ${elapsed.toFixed(1)}s / ${duration.toFixed(1)}s`, 40, 85);

      frameId = requestAnimationFrame(render);
    };

    render();
  });
}
