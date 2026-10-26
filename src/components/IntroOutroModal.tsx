import React, { useState } from 'react';
import { X, Sparkles, Clapperboard, Layers, Image as ImageIcon, Check } from 'lucide-react';
import { IntroOutroConfig, TranscriptSegment } from '../types/editor';

interface IntroOutroModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IntroOutroConfig;
  onSave: (config: IntroOutroConfig) => void;
  segments: TranscriptSegment[];
  projectTitle: string;
}

const DEFAULT_CONFIG: IntroOutroConfig = {
  enabled: true,
  type: 'intro',
  title: 'AI STUDIO MASTERCLASS',
  subtitle: 'Bí quyết sáng tạo video triệu view',
  templateStyle: 'cinematic',
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
};

const TEMPLATE_STYLES = [
  { id: 'cinematic', label: 'Cinematic Đẳng Cấp', desc: 'Hào nhoáng, sang trọng, màu sắc hoàng gia' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Tương lai, rực rỡ, hiệu ứng ánh sáng mạnh' },
  { id: 'minimal', label: 'Minimalist Tinh Tế', desc: 'Đơn giản, hiện đại, chuyên nghiệp' },
  { id: 'podcast', label: 'Podcast & Talkshow', desc: 'Thân thiện, ấm áp, phong cách studio' },
];

export const IntroOutroModal: React.FC<IntroOutroModalProps> = ({
  isOpen,
  onClose,
  config = DEFAULT_CONFIG,
  onSave,
  segments,
  projectTitle,
}) => {
  const [formData, setFormData] = useState<IntroOutroConfig>(config || DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleAiGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const firstLine = segments[0]?.text || projectTitle || 'SÁNG TẠO NỘI DUNG SỐ';
      const cleanTitle = firstLine.length > 28 ? firstLine.slice(0, 26).toUpperCase() + '...' : firstLine.toUpperCase();

      setFormData(prev => ({
        ...prev,
        enabled: true,
        title: cleanTitle,
        subtitle: `Tạo bởi AI Studio • ${segments.length} đoạn hội thoại`,
        templateStyle: 'cinematic',
      }));
      setIsGenerating(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Clapperboard className="w-4 h-4 text-sky-400" />
            <span>Tạo Intro / Outro Chuyên Nghiệp (AI)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* AI Generator Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Đề xuất Intro/Outro bằng AI từ kịch bản
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Tự động trích xuất tiêu đề hook và định hình phong cách phù hợp nhất.
              </div>
            </div>
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1 disabled:opacity-50"
            >
              {isGenerating ? 'Đang tạo...' : '✨ AI Tự Động'}
            </button>
          </div>

          {/* Enable & Position */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Trạng thái:</label>
              <select
                value={formData.enabled ? 'yes' : 'no'}
                onChange={e => setFormData({ ...formData, enabled: e.target.value === 'yes' })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="yes">Bật (Enabled)</option>
                <option value="no">Tắt (Disabled)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Vị trí áp dụng:</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="intro">Chỉ Intro (Đầu video)</option>
                <option value="outro">Chỉ Outro (Cuối video)</option>
                <option value="both">Cả Intro & Outro</option>
              </select>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Tiêu đề chính (Title):</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="VD: AI STUDIO MASTERCLASS"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-sky-400 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Tiêu đề phụ / Slogan (Subtitle):</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="VD: Bí quyết sáng tạo video triệu view"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Logo thương hiệu (URL hình ảnh):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.logoUrl || ''}
                  onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                />
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo preview" className="w-9 h-9 rounded-lg object-cover border border-slate-700 bg-slate-900" />
                )}
              </div>
            </div>
          </div>

          {/* Template Styles */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Phong cách Template:</label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_STYLES.map(style => {
                const isSelected = formData.templateStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, templateStyle: style.id as any })}
                    className={`p-2.5 rounded-xl text-left border transition flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between text-white">
                      <span>{style.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{style.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Lưu & Áp Dụng Intro/Outro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
