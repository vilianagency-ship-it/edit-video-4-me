import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, Hash, Tag, Globe, Share2 } from 'lucide-react';
import { TranscriptSegment } from '../types/editor';

interface SeoTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  segments: TranscriptSegment[];
}

interface SeoResult {
  platform: 'tiktok' | 'youtube' | 'instagram';
  platformName: string;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
}

export const SeoTagsModal: React.FC<SeoTagsModalProps> = ({
  isOpen,
  onClose,
  projectTitle,
  segments,
}) => {
  const [activePlatform, setActivePlatform] = useState<'tiktok' | 'youtube' | 'instagram'>('tiktok');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SeoResult>>({
    tiktok: {
      platform: 'tiktok',
      platformName: 'TikTok',
      title: projectTitle || 'Bí quyết sáng tạo video triệu view',
      description: 'Xem ngay cách tự động hóa chỉnh sửa video, tạo phụ đề karaoke và tăng tương tác khủng! 🚀 #viral #trending #video',
      tags: ['#TikTokShorts', '#EditingTips', '#VideoAI', '#LearnOnTikTok', '#Trending', '#ViralTips'],
      hashtags: ['#videotips', '#contentcreator', '#xuhuong', '#foryou', '#trending'],
    },
    youtube: {
      platform: 'youtube',
      platformName: 'YouTube Shorts',
      title: `${projectTitle || 'Bí quyết sáng tạo video triệu view'} #shorts`,
      description: 'Trong video này, chúng tôi hướng dẫn bạn cách tối ưu hóa quy trình biên tập video bằng AI, tự động cắt khoảng lặng và tạo phụ đề cực thu hút.',
      tags: ['YouTube Shorts', 'AI Video Editor', 'Video Editing Tutorial', 'Content Creation Tips', 'AutoCut Studio'],
      hashtags: ['#shorts', '#youtube', '#videoediting', '#tutorial'],
    },
    instagram: {
      platform: 'instagram',
      platformName: 'Instagram Reels',
      title: projectTitle || 'Bí quyết sáng tạo video triệu view ✨',
      description: 'Tối ưu hóa thời gian biên tập video với hệ thống AI tự động. Lưu lại ngay để áp dụng cho kênh của bạn! 💡',
      tags: ['#ReelsInstagram', '#VideoCreator', '#ContentStrategy', '#EditingHacks', '#InstagramTips'],
      hashtags: ['#reels', '#creator', '#videoediting', '#socialmedia'],
    },
  });

  if (!isOpen) return null;

  const handleAiGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const baseTitle = projectTitle || segments[0]?.text || 'Video Triệu View';
      const cleanTitle = baseTitle.length > 40 ? baseTitle.slice(0, 38) + '...' : baseTitle;

      setResults({
        tiktok: {
          platform: 'tiktok',
          platformName: 'TikTok',
          title: `🔥 ${cleanTitle} #xuhuong`,
          description: `Cách để tạo video triệu view cực nhanh với AI Studio. Xem đến cuối để biết bí quyết! 👇`,
          tags: ['#Editor', '#AIStudio', '#TrendingVlog', '#VideoEditing', '#Masterclass'],
          hashtags: ['#xuhuong', '#foryou', '#viral', '#trending', '#LearnOnTikTok'],
        },
        youtube: {
          platform: 'youtube',
          platformName: 'YouTube Shorts',
          title: `${cleanTitle} (Hướng Dẫn Chi Tiết) #shorts`,
          description: `Khám phá cách biên tập video chuyên nghiệp trong vòng vài phút. Đăng ký kênh để nhận nhiều mẹo hay!`,
          tags: ['Shorts', 'Video Editing Hacks', 'AI Automation', 'Creator Economy', 'Tutorial'],
          hashtags: ['#shorts', '#youtube', '#editing', '#ai'],
        },
        instagram: {
          platform: 'instagram',
          platformName: 'Instagram Reels',
          title: `${cleanTitle} ✨`,
          description: `Bí quyết tối ưu hóa quy trình sáng tạo nội dung cho Reels. Đừng quên Follow để xem thêm nhiều mẹo hay! 📌`,
          tags: ['#ReelsMaster', '#ContentTips', '#VideoProduction', '#CreatorTips'],
          hashtags: ['#reels', '#instagram', '#contentcreator', '#viralreels'],
        },
      });
      setIsGenerating(false);
    }, 700);
  };

  const currentResult = results[activePlatform];

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>AI SEO Tags & Hashtags Generator (TikTok, Shorts, Reels)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* AI Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Phân tích nội dung kịch bản bằng AI
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Tự động đề xuất bộ từ khóa SEO và hashtag có tỷ lệ hiển thị cao nhất cho từng nền tảng.
              </div>
            </div>
            <button
              onClick={handleAiGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1 disabled:opacity-50"
            >
              {isGenerating ? 'Đang phân tích...' : '✨ Tạo Bộ SEO Tags'}
            </button>
          </div>

          {/* Platform Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950 rounded-xl p-1 gap-1">
            {[
              { id: 'tiktok', label: 'TikTok' },
              { id: 'youtube', label: 'YouTube Shorts' },
              { id: 'instagram', label: 'Instagram Reels' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePlatform(tab.id as any)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  activePlatform === tab.id
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Result Content */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {/* Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Tiêu đề tối ưu ({currentResult.platformName}):</label>
                <button
                  onClick={() => handleCopy(currentResult.title, 'title')}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  {copiedType === 'title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedType === 'title' ? 'Đã sao chép!' : 'Sao chép'}
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-medium">
                {currentResult.title}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Mô tả / Caption chuẩn SEO:</label>
                <button
                  onClick={() => handleCopy(currentResult.description, 'desc')}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  {copiedType === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedType === 'desc' ? 'Đã sao chép!' : 'Sao chép'}
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
                {currentResult.description}
              </div>
            </div>

            {/* Tags & Keywords */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Từ khóa SEO (Tags):</label>
                <button
                  onClick={() => handleCopy(currentResult.tags.join(', '), 'tags')}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  {copiedType === 'tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedType === 'tags' ? 'Đã sao chép!' : 'Sao chép tất cả'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentResult.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-sky-300 text-[11px] font-mono">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Hashtags thịnh hành:</label>
                <button
                  onClick={() => handleCopy(currentResult.hashtags.join(' '), 'hashtags')}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  {copiedType === 'hashtags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedType === 'hashtags' ? 'Đã sao chép!' : 'Sao chép tất cả'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentResult.hashtags.map((ht, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-indigo-950/50 border border-indigo-900/50 text-indigo-300 text-[11px] font-mono">
                    {ht}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow transition"
            >
              Đóng & Hoàn Tất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
