import React, { useState, useRef, useEffect } from 'react';
import { X, Video, Mic, Square, Circle, RefreshCw, AlertCircle, Upload, ShieldAlert } from 'lucide-react';

interface CameraRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (blob: Blob, url: string) => void;
  onUploadFallback?: () => void;
}

export const CameraRecorderModal: React.FC<CameraRecorderModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
  onUploadFallback,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micVolume, setMicVolume] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      initCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const initCamera = async () => {
    setPermissionError(null);
    setIsRequesting(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError('Trình duyệt của bạn không hỗ trợ ghi hình trực tiếp qua camera.');
      setIsRequesting(false);
      return;
    }

    try {
      // First try standard high quality video and audio
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 720 }, height: { ideal: 1280 }, facingMode: 'user' },
          audio: true,
        });
      } catch (firstErr: any) {
        // Fallback to basic video and audio constraints if ideal resolution failed
        if (firstErr.name !== 'NotAllowedError' && firstErr.name !== 'PermissionDeniedError') {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } else {
          throw firstErr;
        }
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Mic volume meter
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const src = audioCtx.createMediaStreamSource(mediaStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          analyser.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          setMicVolume(Math.min(100, Math.floor((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (audioErr) {
        // Mic meter non-fatal
      }
    } catch (err: any) {
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || err?.message?.includes('denied')) {
        setPermissionError(
          'Quyền truy cập Camera hoặc Microphone bị từ chối. Vui lòng nhấn biểu tượng ổ khóa/camera trên thanh địa chỉ của trình duyệt để cấp quyền "Allow" (Cho phép), sau đó nhấn "Thử Lại".'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setPermissionError('Không tìm thấy thiết bị camera hoặc microphone nào được kết nối.');
      } else {
        setPermissionError(`Không thể khởi tạo camera: ${err?.message || 'Lỗi không xác định'}`);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm',
    });

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const recordedBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(recordedBlob);
      stopCamera();
      onRecordingComplete(recordedBlob, videoUrl);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);
    setRecordSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordSeconds(s => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-sm text-white">Ghi Hình Video Ngồi Nói Trực Tiếp</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 flex flex-col items-center">
          {/* Camera Viewport */}
          <div className="relative aspect-[9/16] w-[260px] max-h-[50vh] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex items-center justify-center">
            {permissionError ? (
              <div className="p-5 text-center text-xs text-rose-300 flex flex-col items-center gap-3">
                <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
                <span className="leading-relaxed text-[11px]">{permissionError}</span>

                <div className="flex flex-col gap-2 w-full pt-2">
                  <button
                    onClick={initCamera}
                    disabled={isRequesting}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRequesting ? 'animate-spin' : ''}`} />
                    Thử Lại Cấp Quyền
                  </button>

                  {onUploadFallback && (
                    <button
                      onClick={onUploadFallback}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Tải Tệp Video Lên Thay Thế
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            )}

            {/* Recording badge & timer */}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-xs font-bold animate-pulse shadow">
                <Circle className="w-2.5 h-2.5 fill-current" />
                <span>{Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}</span>
              </div>
            )}

            {/* Mic Level bar */}
            {!permissionError && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800">
                <Mic className="w-3.5 h-3.5 text-sky-400" />
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {!permissionError && (
            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Hãy nói tự nhiên. Nếu bạn ngập ngừng hoặc im lặng, thuật toán sẽ tự động cắt tỉa sau khi hoàn thành!
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-800">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={!!permissionError || isRequesting}
              className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-40"
            >
              <Circle className="w-3.5 h-3.5 fill-current" />
              Bắt Đầu Ghi Hình
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs shadow-lg flex items-center gap-2 transition active:scale-95 animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Dừng & Chuyển Sang Chỉnh Sửa
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
