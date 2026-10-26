import React from 'react';
import { BookOpen, Play, Bookmark } from 'lucide-react';
import { VideoChapter } from '../types/editor';
import { formatTime } from '../utils/timelineEngine';

interface ChaptersBarProps {
  chapters: VideoChapter[];
  currentTime: number;
  onSeek: (time: number) => void;
  onAutoGenerateChapters: () => void;
}

export const ChaptersBar: React.FC<ChaptersBarProps> = ({
  chapters = [],
  currentTime,
  onSeek,
  onAutoGenerateChapters,
}) => {
  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-3 select-none overflow-x-auto">
      <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/30">
        <BookOpen className="w-3.5 h-3.5 text-sky-400" />
        <span>Các Chương (Chapters)</span>
      </div>

      {chapters.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Chưa có phân chia chương tự động.</span>
          <button
            onClick={onAutoGenerateChapters}
            className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center gap-1"
          >
            <Bookmark className="w-3 h-3" />
            <span>✨ AI Phân Chương</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {chapters.map((ch, idx) => {
            const isActive = currentTime >= ch.startTime && currentTime <= ch.endTime;
            return (
              <button
                key={ch.id}
                onClick={() => onSeek(ch.startTime)}
                className={`px-3 py-1.5 rounded-xl text-left border transition shrink-0 flex items-center gap-2 ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md shadow-sky-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-900 text-sky-400'}`}>
                  {idx + 1}
                </span>
                <div>
                  <div className="text-xs font-bold truncate max-w-[160px]">{ch.title}</div>
                  <div className={`text-[10px] font-mono ${isActive ? 'text-slate-900/80 font-bold' : 'text-slate-400'}`}>
                    {formatTime(ch.startTime, true)} - {formatTime(ch.endTime, true)}
                  </div>
                </div>
              </button>
            );
          })}
          <button
            onClick={onAutoGenerateChapters}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700 shrink-0 flex items-center gap-1"
            title="Tạo lại các chương bằng AI"
          >
            <span>🔄 AI Cập Nhật</span>
          </button>
        </div>
      )}
    </div>
  );
};
