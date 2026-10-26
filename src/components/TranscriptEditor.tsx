import React, { useState } from 'react';
import { Type, Play, Trash2, Edit3, Check, Palette, Sparkles, Scissors, Wand2, FileText, Loader2, BookOpen, ShieldCheck, Languages, CheckCircle2, ArrowRightLeft, GripVertical } from 'lucide-react';
import { TranscriptSegment, WordTiming, SubtitleStyle, NoiseReductionSettings, SubtitleSettings } from '../types/editor';
import { formatTime } from '../utils/timelineEngine';
import { SUBTITLE_STYLES, AVAILABLE_LANGUAGES } from '../data/subtitlePresets';
import { NoiseReductionControl } from './NoiseReductionControl';
import { DEFAULT_NOISE_REDUCTION_SETTINGS } from '../utils/noiseReductionFilter';

interface TranscriptEditorProps {
  segments: TranscriptSegment[];
  originalSegments?: TranscriptSegment[];
  currentTime: number;
  videoDuration: number;
  onSeek: (time: number) => void;
  onToggleWordCut: (segmentId: string, wordId: string) => void;
  onToggleSegmentCut: (segmentId: string) => void;
  onUpdateSegmentText: (segmentId: string, newText: string) => void;
  onAutoTranscribe: () => Promise<void>;
  onApplyCustomScript: (scriptText: string) => Promise<void>;
  selectedSubtitleStyle: string;
  onSelectSubtitleStyle: (styleId: string) => void;
  isTranscribing?: boolean;
  noiseReductionSettings?: NoiseReductionSettings;
  onUpdateNoiseReductionSettings?: (settings: NoiseReductionSettings) => void;
  subtitleSettings?: SubtitleSettings;
  onUpdateSubtitleSettings?: (settings: SubtitleSettings) => void;
  audioBuffer?: AudioBuffer | null;
  // Multi-Language Subtitles & AI Translation
  currentLanguage: string;
  onSelectLanguage: (langCode: string) => void;
  translations?: Record<string, TranscriptSegment[]>;
  onTranslateSubtitles: (targetLanguage: string) => Promise<void>;
  isTranslating?: boolean;
  onSuggestBRollForSegment?: (segment: TranscriptSegment) => Promise<void>;
  onReorderSegments?: (newSegments: TranscriptSegment[]) => void;
  onSnapToAudio?: () => void;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  segments,
  originalSegments,
  currentTime,
  videoDuration,
  onSeek,
  onToggleWordCut,
  onToggleSegmentCut,
  onUpdateSegmentText,
  onAutoTranscribe,
  onApplyCustomScript,
  selectedSubtitleStyle,
  onSelectSubtitleStyle,
  isTranscribing = false,
  noiseReductionSettings = DEFAULT_NOISE_REDUCTION_SETTINGS,
  onUpdateNoiseReductionSettings,
  subtitleSettings = { fontSizeMultiplier: 0.9, maxCharsPerLine: 35, faceAvoidanceEnabled: true, wordPopupAnimation: true },
  onUpdateSubtitleSettings,
  audioBuffer,
  currentLanguage,
  onSelectLanguage,
  translations,
  onTranslateSubtitles,
  isTranslating = false,
  onSuggestBRollForSegment,
  onReorderSegments,
  onSnapToAudio,
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedScript, setPastedScript] = useState('');
  const [showBilingual, setShowBilingual] = useState(true);
  const [draggedSegmentId, setDraggedSegmentId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedSegmentId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedSegmentId || draggedSegmentId === targetId) return;

    const items = [...segments];
    const draggedIdx = items.findIndex(s => s.id === draggedSegmentId);
    const targetIdx = items.findIndex(s => s.id === targetId);
    if (draggedIdx < 0 || targetIdx < 0) return;

    const [removed] = items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, removed);

    onReorderSegments?.(items);
    setDraggedSegmentId(null);
  };

  const moveSegment = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= segments.length) return;
    const items = [...segments];
    const temp = items[index];
    items[index] = items[newIdx];
    items[newIdx] = temp;
    onReorderSegments?.(items);
  };

  const startEdit = (segment: TranscriptSegment) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text);
  };

  const saveEdit = (segmentId: string) => {
    if (editText.trim()) {
      onUpdateSegmentText(segmentId, editText.trim());
    }
    setEditingSegmentId(null);
  };

  const handleApplyScript = async () => {
    if (!pastedScript.trim()) return;
    await onApplyCustomScript(pastedScript.trim());
    setPastedScript('');
    setShowPasteModal(false);
  };

  const scriptTemplates = [
    {
      title: 'Chia Sẻ Kinh Nghiệm AI',
      text: 'Chào mọi người, hôm nay mình chia sẻ bí quyết tự động hóa video bằng AI. Khi bạn ngồi nói chuyện, những đoạn nghỉ ngập ngừng làm tụt tương tác của người xem. AI sẽ tự động phân tích sóng âm và cắt bỏ mọi khoảng lặng. Đồng thời chèn phụ đề viral và hình ảnh minh họa chuyên nghiệp.',
    },
    {
      title: 'Kinh Doanh & Khởi Nghiệp',
      text: 'Trong kinh doanh, tốc độ thực thi là chìa khóa quan trọng nhất. Nếu bạn chần chừ, đối thủ sẽ vượt qua bạn ngay lập tức. Hãy tập trung vào việc tạo ra giá trị thực sự cho khách hàng mỗi ngày. Đừng sợ thất bại vì đó là bước đệm cần thiết.',
    },
    {
      title: 'Phát Triển Kỹ Năng',
      text: 'Học một kỹ năng mới đòi hỏi sự kiên trì và kỷ luật bản thân. Dành 30 phút mỗi ngày sẽ tạo nên sự thay đổi khổng lồ sau một năm. Hãy bắt đầu từ những bước nhỏ nhất ngay hôm nay.',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200">
      {/* Subtitle Style Chooser Bar */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            Kiểu Phụ Đề Viral (TikTok / Reels)
          </div>
          <span className="text-[10px] uppercase font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
            Karaoke Highlight
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SUBTITLE_STYLES.map(style => {
            const isSelected = style.id === selectedSubtitleStyle;
            return (
              <button
                key={style.id}
                onClick={() => onSelectSubtitleStyle(style.id)}
                className={`p-2 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/20'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold truncate leading-tight">{style.name}</div>
                <div
                  className="text-[11px] font-black mt-1 truncate"
                  style={{
                    color: style.highlightColor,
                    textTransform: style.textTransform,
                  }}
                >
                  PHỤ ĐỀ NHẢY CHỮ
                </div>
              </button>
            );
          })}
        </div>

        {/* Snap-to-Audio Button */}
        {onSnapToAudio && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-900 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">Khớp chuẩn sóng âm audio</div>
            <button
              onClick={onSnapToAudio}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
              title="Tự động phát hiện độ lệch thời gian và căn chỉnh phụ đề khớp hoàn toàn với sóng âm"
            >
              🎯 Snap-to-Audio
            </button>
          </div>
        )}
      </div>

      {/* Subtitle Size & Line Wrap Control Panel */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-400" />
            Tùy Chỉnh Kích Thước & Độ Dài Phụ Đề
          </div>
          <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
            Chống Che Mặt
          </span>
        </div>

        {/* Font Size Selector */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Kích thước chữ (Font Size):</span>
            <span className="font-mono text-emerald-400 font-bold">
              {subtitleSettings.fontSizeMultiplier === 0.8 ? 'Nhỏ (Compact)' : subtitleSettings.fontSizeMultiplier === 1.0 ? 'Trung bình (Standard)' : 'Lớn (Large)'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Nhỏ', mult: 0.8, desc: '16px' },
              { label: 'Vừa', mult: 1.0, desc: '20px' },
              { label: 'Lớn', mult: 1.2, desc: '26px' },
            ].map(item => {
              const isActive = subtitleSettings.fontSizeMultiplier === item.mult;
              return (
                <button
                  key={item.mult}
                  onClick={() =>
                    onUpdateSubtitleSettings?.({
                      ...subtitleSettings,
                      fontSizeMultiplier: item.mult,
                    })
                  }
                  className={`p-2 rounded-lg text-center transition border text-xs ${
                    isActive
                      ? 'bg-emerald-500 text-white border-emerald-400 font-bold shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>{item.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Max Chars Per Line Selector */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Giới hạn ký tự tối đa / dòng:</span>
            <span className="font-mono text-sky-400 font-bold">
              {subtitleSettings.maxCharsPerLine} ký tự
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ngắn gọn', chars: 25, desc: '2-3 từ' },
              { label: 'Vừa', chars: 40, desc: '4-6 từ' },
              { label: 'Rộng', chars: 60, desc: 'Cả câu' },
            ].map(item => {
              const isActive = subtitleSettings.maxCharsPerLine === item.chars;
              return (
                <button
                  key={item.chars}
                  onClick={() =>
                    onUpdateSubtitleSettings?.({
                      ...subtitleSettings,
                      maxCharsPerLine: item.chars,
                    })
                  }
                  className={`p-2 rounded-lg text-center transition border text-xs ${
                    isActive
                      ? 'bg-sky-500 text-white border-sky-400 font-bold shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>{item.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? 'text-sky-100' : 'text-slate-500'}`}>{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Face Avoidance AI Toggle */}
        <div className="pt-2.5 border-t border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">AI Tránh Mặt Chủ Thể</div>
              <div className="text-[10px] text-slate-400">Tự động neo phụ đề xuống dưới đáy khi nhận diện khuôn mặt</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={subtitleSettings.faceAvoidanceEnabled ?? true}
              onChange={e =>
                onUpdateSubtitleSettings?.({
                  ...subtitleSettings,
                  faceAvoidanceEnabled: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Word Pop-up Animation Toggle */}
        <div className="pt-2.5 border-t border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-slate-200">Hiệu ứng Chữ Nhảy (Pop-up)</div>
              <div className="text-[10px] text-slate-400">Từ đang nói sẽ phóng to và bật nẩy sinh động</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={subtitleSettings.wordPopupAnimation ?? true}
              onChange={e =>
                onUpdateSubtitleSettings?.({
                  ...subtitleSettings,
                  wordPopupAnimation: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* AI Subtitle Language & Multi-Language Translation Manager */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-sky-400" />
            <span>Ngôn Ngữ Phụ Đề & Dịch Thuật AI</span>
          </div>
          {currentLanguage !== 'vi' && (
            <span className="text-[10px] bg-sky-500/10 text-sky-300 font-semibold px-2 py-0.5 rounded-full border border-sky-500/20 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              Đang xem bản dịch AI
            </span>
          )}
        </div>

        {/* Language Tabs / Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {AVAILABLE_LANGUAGES.map(lang => {
            const isSelected = currentLanguage === lang.code;
            const hasTranslation = lang.code === 'vi' || (translations && translations[lang.code] && translations[lang.code].length > 0);

            return (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={hasTranslation ? `Xem phụ đề ${lang.name}` : `Chưa có bản dịch ${lang.name}. Bấm để dịch bằng AI.`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
                {hasTranslation && lang.code !== 'vi' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Translation Actions & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900 text-xs">
          {currentLanguage !== 'vi' && (!translations || !translations[currentLanguage]) ? (
            <div className="w-full bg-amber-950/30 border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="text-[11px] text-amber-200">
                Chưa có bản dịch cho <strong>{AVAILABLE_LANGUAGES.find(l => l.code === currentLanguage)?.name}</strong>.
              </div>
              <button
                onClick={() => onTranslateSubtitles(currentLanguage)}
                disabled={isTranslating}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1 shrink-0 shadow disabled:opacity-50"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
                    <span>Đang dịch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-slate-950" />
                    <span>Dịch Ngay (AI)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {currentLanguage !== 'vi' && (
                  <button
                    onClick={() => setShowBilingual(!showBilingual)}
                    className={`text-[11px] px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
                      showBilingual
                        ? 'bg-slate-800 border-sky-500/50 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Hiện câu tiếng Việt gốc bên dưới câu dịch để dễ so sánh"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Đối chiếu gốc</span>
                  </button>
                )}

                <span className="text-[11px] text-slate-400">
                  Hiển thị trên video: <strong className="text-sky-300">{AVAILABLE_LANGUAGES.find(l => l.code === currentLanguage)?.name}</strong>
                </span>
              </div>

              {currentLanguage !== 'vi' && (
                <button
                  onClick={() => onTranslateSubtitles(currentLanguage)}
                  disabled={isTranslating}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
                  title="Dịch lại bằng AI với kịch bản mới nhất"
                >
                  {isTranslating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-sky-400" />
                  )}
                  <span>Dịch lại AI</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Background Noise Reduction & AI Subtitle Generation Action Bar */}
      <div className="p-3 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-b border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-emerald-400" />
            Nhận Diện Giọng Nói & Phụ Đề AI
          </div>
          <button
            onClick={() => setShowPasteModal(!showPasteModal)}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            Dán Kịch Bản
          </button>
        </div>

        {/* Noise Reduction Filter Settings Card */}
        {onUpdateNoiseReductionSettings && (
          <NoiseReductionControl
            settings={noiseReductionSettings}
            onChange={onUpdateNoiseReductionSettings}
            audioBuffer={audioBuffer}
          />
        )}

        <button
          onClick={onAutoTranscribe}
          disabled={isTranscribing}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>
                {noiseReductionSettings.enabled
                  ? 'Đang Lọc Tạp Âm & Nhận Diện Giọng Nói...'
                  : 'Đang Nhận Diện Giọng Nói & Đồng Bộ Thời Gian...'}
              </span>
            </>
          ) : (
            <>
              {noiseReductionSettings.enabled ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Lọc Tạp Âm & Nhận Diện Lời Nói Tự Động</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Nhận Diện Lời Nói (Dùng Âm Thanh Gốc)</span>
                </>
              )}
            </>
          )}
        </button>


        {/* Inline Script Paste Drawer */}
        {showPasteModal && (
          <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-700 space-y-2 animate-in fade-in duration-150">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
              <span>Dán nội dung lời thoại của bạn:</span>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <textarea
              value={pastedScript}
              onChange={e => setPastedScript(e.target.value)}
              placeholder="Dán hoặc gõ kịch bản lời nói của bạn vào đây. AI sẽ tự động phân chia thời gian từng câu và từng từ vào video..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            />

            {/* Quick Templates */}
            <div>
              <div className="text-[10px] text-slate-400 mb-1">Mẫu kịch bản có sẵn:</div>
              <div className="flex flex-wrap gap-1">
                {scriptTemplates.map(tmpl => (
                  <button
                    key={tmpl.title}
                    onClick={() => setPastedScript(tmpl.text)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleApplyScript}
              disabled={isTranscribing || !pastedScript.trim()}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
            >
              Căn Chỉnh Thời Gian Phụ Đề Cho Video
            </button>
          </div>
        )}
      </div>

      {/* Transcript Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">
            Danh Sách Phụ Đề ({segments.length} câu)
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Bấm từ để tua • Cắt từ thừa
        </span>
      </div>

      {/* Segments & Word List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {segments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2">
            <BookOpen className="w-8 h-8 text-slate-600" />
            <p>Chưa có phụ đề cho video này.</p>
            <p className="text-[11px] text-slate-500 max-w-[280px]">
              Bấm nút màu xanh <strong className="text-emerald-400">"Nhận Diện Lời Nói & Tạo Phụ Đề Tự Động"</strong> ở trên để AI tạo ngay lập tức!
            </p>
          </div>
        ) : (
          segments.map((seg, index) => {
            const isCurrent = currentTime >= seg.start && currentTime <= seg.end;
            const isEditing = editingSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                draggable
                onDragStart={e => handleDragStart(e, seg.id)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, seg.id)}
                className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                  seg.deleted
                    ? 'opacity-40 bg-slate-950/40 border-slate-800 line-through'
                    : isCurrent
                    ? 'bg-slate-800/90 border-sky-500/60 shadow-md shadow-sky-500/10'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Segment Meta */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="cursor-grab text-slate-500 hover:text-slate-300" title="Kéo thả để sắp xếp lại thứ tự hiển thị phụ đề">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    {/* Quick Move Up/Down */}
                    <div className="flex items-center bg-slate-900 rounded border border-slate-800 text-[10px] text-slate-400">
                      <button
                        onClick={() => moveSegment(index, 'up')}
                        disabled={index === 0}
                        className="px-1.5 py-0.5 hover:bg-slate-800 disabled:opacity-30 rounded-l"
                        title="Đẩy lên trên"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveSegment(index, 'down')}
                        disabled={index === segments.length - 1}
                        className="px-1.5 py-0.5 hover:bg-slate-800 disabled:opacity-30 rounded-r border-l border-slate-800"
                        title="Đẩy xuống dưới"
                      >
                        ▼
                      </button>
                    </div>

                    <div
                      onClick={() => onSeek(seg.start)}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-sky-400 cursor-pointer hover:underline"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      {formatTime(seg.start, true)} - {formatTime(seg.end, true)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onSuggestBRollForSegment && (
                      <button
                        onClick={() => onSuggestBRollForSegment(seg)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition flex items-center gap-1 mr-1"
                        title="AI tạo và chèn B-Roll minh họa chính xác cho câu này"
                      >
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>AI B-Roll</span>
                      </button>
                    )}
                    <button
                      onClick={() => (isEditing ? saveEdit(seg.id) : startEdit(seg))}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
                      title={isEditing ? 'Lưu chỉnh sửa' : 'Sửa chữ'}
                    >
                      {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit3 className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => onToggleSegmentCut(seg.id)}
                      className={`p-1 rounded transition ${
                        seg.deleted
                          ? 'text-emerald-400 hover:bg-slate-800'
                          : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                      }`}
                      title={seg.deleted ? 'Khôi phục đoạn này' : 'Cắt bỏ đoạn này'}
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Editing or Interactive Word Pills */}
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(seg.id)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(seg.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {seg.words.map(w => {
                      const isWordActive = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={w.id}
                          onClick={() => onSeek(w.start)}
                          onContextMenu={e => {
                            e.preventDefault();
                            onToggleWordCut(seg.id, w.id);
                          }}
                          className={`text-xs px-1.5 py-0.5 rounded cursor-pointer transition select-none ${
                            w.deleted
                              ? 'line-through text-slate-600 bg-red-950/20'
                              : isWordActive
                              ? 'bg-amber-400 text-slate-950 font-bold shadow'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                          title={`Bấm để tua đến ${w.start.toFixed(2)}s. Chuột phải để cắt từ này.`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Bilingual Original Text Comparison */}
                {showBilingual && currentLanguage !== 'vi' && (
                  <div className="text-[11px] text-slate-400 italic mt-2.5 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 select-text">
                    <span className="text-[9px] not-italic font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                      Gốc (VI)
                    </span>
                    <span className="line-clamp-2 text-slate-400">
                      {originalSegments?.find(s => s.id === seg.id)?.text || ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
