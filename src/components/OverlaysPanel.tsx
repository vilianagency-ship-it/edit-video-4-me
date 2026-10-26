import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Image as ImageIcon,
  Trash2,
  Play,
  ZoomIn,
  Tag,
  Loader2,
  Camera,
  Folder,
  FolderOpen,
  Search,
  X,
  Check,
  Filter,
  Cpu,
  Users,
  Landmark,
  TrendingUp,
  Video,
  Mountain,
  Edit2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { OverlayItem, OverlayType, BRollAsset } from '../types/editor';
import { formatTime } from '../utils/timelineEngine';
import { BROLL_CATEGORIES, filterBRollAssets, StandardBRollCategory } from '../utils/brollCategorization';

interface OverlaysPanelProps {
  overlays: OverlayItem[];
  brollAssets: BRollAsset[];
  currentTime: number;
  videoDuration: number;
  onSeek: (time: number) => void;
  onAddOverlay: (overlay: OverlayItem) => void;
  onRemoveOverlay: (id: string) => void;
  onAutoGenerateOverlays: () => void;
  onGenerateIllustrationPrompt: (prompt: string, title: string, category?: string) => Promise<void>;
  onAutoCategorizeAllBRolls: () => Promise<void>;
  onUpdateAssetCategory: (assetId: string, newCategory: string, newTags: string[]) => void;
  onDeleteBRollAsset?: (assetId: string) => void;
  isAnalyzing: boolean;
  isCategorizing?: boolean;
}

export const OverlaysPanel: React.FC<OverlaysPanelProps> = ({
  overlays,
  brollAssets,
  currentTime,
  videoDuration,
  onSeek,
  onAddOverlay,
  onRemoveOverlay,
  onAutoGenerateOverlays,
  onGenerateIllustrationPrompt,
  onAutoCategorizeAllBRolls,
  onUpdateAssetCategory,
  onDeleteBRollAsset,
  isAnalyzing,
  isCategorizing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'library' | 'ai' | 'badge'>('library');
  const [badgeTitle, setBadgeTitle] = useState('');
  const [badgeSubtitle, setBadgeSubtitle] = useState('');
  const [illustPrompt, setIllustPrompt] = useState('');
  const [illustTitle, setIllustTitle] = useState('');
  const [illustTargetFolder, setIllustTargetFolder] = useState<string>('auto');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  // Library browsing states
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  const [editTagsText, setEditTagsText] = useState<string>('');
  const [expandedInfoId, setExpandedInfoId] = useState<string | null>(null);

  // Filtered B-roll assets based on folder, tag, search
  const filteredAssets = useMemo(() => {
    return filterBRollAssets(brollAssets, selectedFolder, selectedTag, searchQuery);
  }, [brollAssets, selectedFolder, selectedTag, searchQuery]);

  // Dynamic counts per category
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { All: brollAssets.length };
    for (const cat of BROLL_CATEGORIES) {
      counts[cat.id] = brollAssets.filter(a => a.category.toLowerCase() === cat.id.toLowerCase()).length;
    }
    return counts;
  }, [brollAssets]);

  // Dynamic available tags across current pool
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    const pool = selectedFolder === 'All'
      ? brollAssets
      : brollAssets.filter(a => a.category.toLowerCase() === selectedFolder.toLowerCase());

    for (const asset of pool) {
      for (const t of asset.tags || []) {
        tagSet.add(t.toLowerCase());
      }
    }
    return Array.from(tagSet).slice(0, 16);
  }, [brollAssets, selectedFolder]);

  // Insert B-Roll Asset into the video timeline at currentTime
  const handleInsertBRollAsset = (asset: BRollAsset) => {
    const start = Math.max(0, Number(currentTime.toFixed(2)));
    const end = Math.min(videoDuration, Number((start + 3.2).toFixed(2)));

    const item: OverlayItem = {
      id: `broll-overlay-${Date.now()}`,
      type: 'illustration',
      title: asset.title,
      content: asset.description,
      start,
      end,
      duration: Number((end - start).toFixed(2)),
      position: 'top-right',
      animation: 'slide-up',
      imageUrl: asset.imageUrl,
      scale: 1,
      category: asset.category,
      tags: asset.tags,
    };

    onAddOverlay(item);
    setActiveTab('list');
  };

  // Add custom professional title badge / lower third
  const handleAddBadge = () => {
    if (!badgeTitle.trim()) return;

    const start = Math.max(0, Number(currentTime.toFixed(2)));
    const end = Math.min(videoDuration, Number((start + 3.0).toFixed(2)));

    const item: OverlayItem = {
      id: `custom-badge-${Date.now()}`,
      type: 'badge',
      title: badgeTitle.trim().toUpperCase(),
      content: badgeSubtitle.trim() || badgeTitle.trim(),
      start,
      end,
      duration: Number((end - start).toFixed(2)),
      position: 'top-center',
      animation: 'slide-up',
      scale: 1,
    };

    onAddOverlay(item);
    setBadgeTitle('');
    setBadgeSubtitle('');
    setActiveTab('list');
  };

  // Add punch-in zoom effect
  const handleAddZoom = () => {
    const start = Math.max(0, Number(currentTime.toFixed(2)));
    const end = Math.min(videoDuration, Number((start + 1.8).toFixed(2)));

    const item: OverlayItem = {
      id: `zoom-${Date.now()}`,
      type: 'zoom',
      title: 'Punch-in Zoom (1.15x)',
      content: 'Nhấn mạnh khuôn mặt',
      start,
      end,
      duration: Number((end - start).toFixed(2)),
      position: 'center',
      animation: 'pop',
      zoomLevel: 1.15,
    };

    onAddOverlay(item);
    setActiveTab('list');
  };

  // Generate new AI B-Roll illustration and automatically categorize
  const handleGenerateIllustration = async () => {
    if (!illustPrompt.trim()) return;
    setIsGeneratingImg(true);
    try {
      await onGenerateIllustrationPrompt(
        illustPrompt,
        illustTitle || 'Ảnh B-Roll AI',
        illustTargetFolder === 'auto' ? undefined : illustTargetFolder
      );
      setIllustPrompt('');
      setIllustTitle('');
      setActiveTab('library');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // Start editing category & tags for an asset
  const handleStartEdit = (asset: BRollAsset) => {
    setEditingAssetId(asset.id);
    setEditCategory(asset.category);
    setEditTagsText(asset.tags.join(', '));
  };

  // Save edited category & tags
  const handleSaveEdit = (assetId: string) => {
    const tagsArray = editTagsText
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    onUpdateAssetCategory(assetId, editCategory, tagsArray);
    setEditingAssetId(null);
  };

  // Preset prompts with categorization pre-labeled
  const proImagePresets = [
    {
      title: 'Bản Đồ Cổ & Tư Liệu Quá Khứ',
      category: 'Historical',
      prompt: 'Macro shot of antique parchment map with vintage brass compass and magnifying glass, warm candle glow, museum archive',
    },
    {
      title: 'Mạch Vi Xử Lý AI Bán Dẫn',
      category: 'Technology',
      prompt: 'Futuristic glowing AI neural microchip with golden quantum circuit lines, macro photography, dark luxury tech aesthetic',
    },
    {
      title: 'Diễn Giả Podcast Chia Sẻ',
      category: 'People',
      prompt: 'Confident keynote speaker on modern tech conference stage, warm spotlight, engaged audience in soft blur',
    },
    {
      title: 'Biểu Đồ Tài Chính Tăng Trưởng',
      category: 'Business',
      prompt: 'Cinematic growth bar chart glowing on high-tech glass table, modern data analytics, 8k studio lighting',
    },
    {
      title: 'Phòng Thu Podcast Cao Cấp',
      category: 'Studio',
      prompt: 'Professional podcast broadcast microphone with shock mount, acoustic foam wall, atmospheric neon purple backlight',
    },
  ];

  // Helper to render category icon
  const getCategoryIcon = (categoryName: string) => {
    const cat = categoryName.toLowerCase();
    if (cat.includes('tech') || cat.includes('công')) return <Cpu className="w-3.5 h-3.5" />;
    if (cat.includes('people') || cat.includes('người')) return <Users className="w-3.5 h-3.5" />;
    if (cat.includes('hist') || cat.includes('sử') || cat.includes('cổ')) return <Landmark className="w-3.5 h-3.5" />;
    if (cat.includes('biz') || cat.includes('kinh') || cat.includes('tài')) return <TrendingUp className="w-3.5 h-3.5" />;
    if (cat.includes('studio') || cat.includes('quay')) return <Video className="w-3.5 h-3.5" />;
    if (cat.includes('nature') || cat.includes('nhiên') || cat.includes('đô')) return <Mountain className="w-3.5 h-3.5" />;
    return <Folder className="w-3.5 h-3.5" />;
  };

  // Helper for category badge color
  const getCategoryBadgeColor = (categoryName: string) => {
    const cat = categoryName.toLowerCase();
    if (cat.includes('tech') || cat.includes('công')) return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    if (cat.includes('people') || cat.includes('người')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (cat.includes('hist') || cat.includes('sử') || cat.includes('cổ')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    if (cat.includes('biz') || cat.includes('kinh') || cat.includes('tài')) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    if (cat.includes('studio') || cat.includes('quay')) return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30';
    if (cat.includes('nature') || cat.includes('nhiên') || cat.includes('đô')) return 'bg-lime-500/15 text-lime-300 border-lime-500/30';
    return 'bg-slate-700/50 text-slate-300 border-slate-600/40';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200">
      {/* Top Banner: Smart AI Auto-Insert Feature */}
      <div className="p-3 border-b border-slate-800 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-sky-950/50">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Camera className="w-4 h-4 text-sky-400" />
            Minh Họa B-Roll & Thư Mục Phân Loại AI
          </div>
          <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded-full border border-sky-500/30">
            Tự Động Gắn Thẻ
          </span>
        </div>

        <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
          Tự động phân loại ảnh B-Roll vào các thư mục <strong className="text-amber-300">Historical</strong>, <strong className="text-cyan-300">Technology</strong>, <strong className="text-emerald-300">People</strong> và gắn tags ngữ nghĩa theo phân tích nội dung.
        </p>

        <button
          onClick={onAutoGenerateOverlays}
          disabled={isAnalyzing}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Đang Phân Tích Kịch Bản & Gắn B-Roll Chuẩn Studio...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>Tự Động Quét Kịch Bản & Chèn B-Roll</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs bg-slate-950/40">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-2.5 font-bold text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'library'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Kho B-Roll ({brollAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 font-bold text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'list'
              ? 'text-sky-400 border-b-2 border-sky-400 bg-slate-800/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Đang Chèn ({overlays.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2.5 font-bold text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'ai'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tạo Ảnh AI</span>
        </button>

        <button
          onClick={() => setActiveTab('badge')}
          className={`flex-1 py-2.5 font-bold text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'badge'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>+ Thẻ Chữ</span>
        </button>
      </div>

      {/* Tab 1: Intelligent B-Roll Library with Folders, Tags & AI Content Analysis */}
      {activeTab === 'library' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Top Action Bar in Library */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                Thư Viện B-Roll & Phân Loại
              </div>
              <div className="text-[10px] text-slate-400">
                Tìm kiếm theo thư mục, thẻ tags hoặc phân tích nội dung AI
              </div>
            </div>

            {/* Auto Categorize All Button */}
            <button
              onClick={onAutoCategorizeAllBRolls}
              disabled={isCategorizing || brollAssets.length === 0}
              className="py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow flex items-center gap-1.5 transition disabled:opacity-50 flex-shrink-0"
              title="Dùng Gemini AI phân tích nội dung toàn bộ kho và tự động xếp vào thư mục & gán tags"
            >
              {isCategorizing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Đang Phân Loại AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-purple-200" />
                  <span>Phân Loại AI Tự Động</span>
                </>
              )}
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm B-roll theo từ khóa, tag hoặc nội dung..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Folder Pills Bar (Historical, Technology, People, Business, Studio, Nature) */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Folder className="w-3 h-3 text-slate-400" />
                Thư Mục Nội Dung ({brollAssets.length})
              </span>
              {selectedFolder !== 'All' && (
                <button
                  onClick={() => setSelectedFolder('All')}
                  className="text-emerald-400 hover:underline lowercase font-normal"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {/* 'All' Folder */}
              <button
                onClick={() => {
                  setSelectedFolder('All');
                  setSelectedTag(null);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                  selectedFolder === 'All'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>Tất cả</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {folderCounts.All || 0}
                </span>
              </button>

              {/* Specific Category Folders */}
              {BROLL_CATEGORIES.map(cat => {
                const count = folderCounts[cat.id] || 0;
                const isSelected = selectedFolder.toLowerCase() === cat.id.toLowerCase();

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedFolder(cat.id);
                      setSelectedTag(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-600 shadow-sm ring-1 ring-emerald-400/50'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {getCategoryIcon(cat.id)}
                    <span>{cat.id}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Semantic Tags Cloud Filter */}
          {availableTags.length > 0 && (
            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-sky-400" />
                  Thẻ Tags Ngữ Nghĩa ({availableTags.length}):
                </span>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-rose-400 hover:underline flex items-center gap-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                    Bỏ lọc tag
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {availableTags.map(tag => {
                  const isTagActive = selectedTag?.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isTagActive ? null : tag)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition ${
                        isTagActive
                          ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-sky-300'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active filter summary pill */}
          {(selectedFolder !== 'All' || selectedTag || searchQuery) && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                Tìm thấy <strong className="text-white font-bold">{filteredAssets.length}</strong> B-Roll
                {selectedFolder !== 'All' && <span> trong thư mục <strong className="text-emerald-400">{selectedFolder}</strong></span>}
                {selectedTag && <span> có tag <strong className="text-sky-400">#{selectedTag}</strong></span>}
              </span>
              <button
                onClick={() => {
                  setSelectedFolder('All');
                  setSelectedTag(null);
                  setSearchQuery('');
                }}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}

          {/* B-Roll Assets List */}
          <div className="space-y-2.5">
            {filteredAssets.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-xs flex flex-col items-center gap-2">
                <Folder className="w-8 h-8 text-slate-600" />
                <p>Không có B-Roll nào phù hợp với bộ lọc hiện tại.</p>
                <button
                  onClick={() => {
                    setSelectedFolder('All');
                    setSelectedTag(null);
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg font-bold text-[11px]"
                >
                  Xem toàn bộ kho B-roll
                </button>
              </div>
            ) : (
              filteredAssets.map(asset => {
                const isEditing = editingAssetId === asset.id;
                const isInfoExpanded = expandedInfoId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col gap-2 relative group"
                  >
                    {/* Top Row: Category Badge, AI Mood, Actions */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Folder / Category Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 uppercase tracking-wider ${getCategoryBadgeColor(
                            asset.category
                          )}`}
                        >
                          {getCategoryIcon(asset.category)}
                          <span>{asset.category}</span>
                        </span>

                        {/* AI Analyzed badge */}
                        {asset.aiAnalysis?.confidence && (
                          <span
                            className="text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono"
                            title={`AI Confidence: ${(asset.aiAnalysis.confidence * 100).toFixed(0)}%`}
                          >
                            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                            AI: {(asset.aiAnalysis.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {/* Top Right Tool Buttons */}
                      <div className="flex items-center gap-1">
                        {asset.aiAnalysis && (
                          <button
                            onClick={() => setExpandedInfoId(isInfoExpanded ? null : asset.id)}
                            className={`p-1 rounded text-slate-400 hover:text-sky-300 transition ${
                              isInfoExpanded ? 'bg-sky-500/20 text-sky-300' : 'hover:bg-slate-800'
                            }`}
                            title="Xem chi tiết phân tích nội dung AI"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => (isEditing ? setEditingAssetId(null) : handleStartEdit(asset))}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
                          title="Chỉnh sửa thư mục & thẻ tag"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {onDeleteBRollAsset && asset.source !== 'preset' && (
                          <button
                            onClick={() => onDeleteBRollAsset(asset.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Xóa B-roll này khỏi thư viện"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Category & Tag Editor */}
                    {isEditing && (
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-amber-500/40 space-y-2">
                        <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                          <Edit2 className="w-3 h-3" />
                          Chỉnh sửa thư mục & thẻ tag:
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Thư mục chính (Category):</label>
                          <select
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          >
                            {BROLL_CATEGORIES.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.id} ({c.label})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Thẻ tags (ngăn cách bằng dấu phẩy):</label>
                          <input
                            type="text"
                            value={editTagsText}
                            onChange={e => setEditTagsText(e.target.value)}
                            placeholder="historical, vintage, heritage, vietnam"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            onClick={() => setEditingAssetId(null)}
                            className="px-2 py-1 text-[10px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleSaveEdit(asset.id)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Lưu Thay Đổi
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content Body: Image Thumbnail + Details */}
                    <div className="flex items-start gap-3">
                      <img
                        src={asset.imageUrl}
                        alt={asset.title}
                        className="w-20 h-20 rounded-lg object-cover bg-slate-900 border border-slate-700 shadow flex-shrink-0 group-hover:scale-[1.02] transition-transform"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                          {asset.title}
                        </div>

                        <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {asset.description}
                        </div>

                        {/* Semantic Tag Chips */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(asset.tags || []).map(t => (
                            <span
                              key={t}
                              onClick={() => setSelectedTag(t)}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 hover:border-emerald-500/50 hover:text-emerald-300 cursor-pointer transition"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible AI Analysis Details */}
                    {isInfoExpanded && asset.aiAnalysis && (
                      <div className="mt-1 p-2 rounded-lg bg-slate-900/90 border border-purple-500/30 text-[10px] space-y-1">
                        <div className="text-purple-300 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          Phân Tích Nội Dung B-Roll Bằng AI:
                        </div>
                        {asset.aiAnalysis.summary && (
                          <div className="text-slate-300">
                            <strong>Tóm tắt:</strong> {asset.aiAnalysis.summary}
                          </div>
                        )}
                        {asset.aiAnalysis.mood && (
                          <div className="text-slate-400">
                            <strong>Sắc thái thị giác:</strong> {asset.aiAnalysis.mood}
                          </div>
                        )}
                        {asset.aiAnalysis.detectedObjects && asset.aiAnalysis.detectedObjects.length > 0 && (
                          <div className="text-slate-400">
                            <strong>Đối tượng nhận diện:</strong> {asset.aiAnalysis.detectedObjects.join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Action: Insert into Video Timeline at currentTime */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">
                        Vị trí hiện tại: <strong className="text-sky-300">{formatTime(currentTime)}</strong>
                      </span>

                      <button
                        onClick={() => handleInsertBRollAsset(asset)}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] shadow-sm flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chèn Vào Video</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Current Overlays in Video Timeline */}
      {activeTab === 'list' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {overlays.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-slate-600" />
              <p>Chưa có hình minh họa hoặc thẻ chú thích nào được chèn.</p>
              <p className="text-[11px] text-slate-500 max-w-[280px]">
                Chọn từ tab <strong className="text-emerald-400">"Kho B-Roll"</strong> hoặc bấm <strong className="text-sky-400">"Tự Động Quét Kịch Bản"</strong>!
              </p>
            </div>
          ) : (
            overlays.map(item => {
              const isActiveNow = currentTime >= item.start && currentTime <= item.end;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isActiveNow
                      ? 'bg-slate-950 border-sky-400/80 shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-800 text-sky-300 border border-slate-700">
                        {item.type === 'illustration' ? 'ẢNH B-ROLL' : item.type === 'badge' ? 'THẺ CHÚ THÍCH' : 'ZOOM'}
                      </span>

                      {item.category && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getCategoryBadgeColor(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      )}

                      <span className="font-bold text-xs text-white truncate max-w-[140px]">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSeek(item.start)}
                        className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-800 transition"
                        title="Tua đến đoạn này"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => onRemoveOverlay(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                        title="Xóa minh họa này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-900 border border-slate-700 shadow flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {item.content}
                    </div>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map(t => (
                        <span key={t} className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                    <span>Thời điểm: {formatTime(item.start, true)} - {formatTime(item.end, true)}</span>
                    <span className="text-sky-400 font-semibold">{item.duration.toFixed(1)}s</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: AI Photorealistic Illustration Generator with Automatic Categorization */}
      {activeTab === 'ai' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Tạo Ảnh B-Roll AI & Tự Động Phân Loại
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tạo hình ảnh B-roll chuẩn 8K bằng Gemini AI. Hệ thống sẽ tự động phân tích nội dung để xếp vào thư mục (ví dụ: <strong className="text-amber-300">Historical</strong>, <strong className="text-cyan-300">Technology</strong>, <strong className="text-emerald-300">People</strong>) và gắn tags ngữ nghĩa.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tiêu đề B-Roll:</label>
              <input
                type="text"
                placeholder="VD: Bản Đồ Hàng Hải Cổ Thời Trung Cổ"
                value={illustTitle}
                onChange={e => setIllustTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Thư mục dự kiến:</label>
              <select
                value={illustTargetFolder}
                onChange={e => setIllustTargetFolder(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value="auto">✨ Để AI Tự Động Phân Loại (Khuyên Dùng)</option>
                {BROLL_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    📁 {c.id} ({c.label})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Mô tả chi tiết ảnh (Prompt):</label>
              <textarea
                placeholder="VD: Antique parchment map with vintage brass compass and magnifying glass, warm candle glow, museum archive..."
                value={illustPrompt}
                onChange={e => setIllustPrompt(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Quick preset suggestions */}
            <div>
              <div className="text-[10px] font-semibold text-slate-400 mb-1.5">Gợi ý mẫu B-Roll theo danh mục:</div>
              <div className="space-y-1.5">
                {proImagePresets.map(p => (
                  <button
                    key={p.title}
                    onClick={() => {
                      setIllustTitle(p.title);
                      setIllustPrompt(p.prompt);
                      setIllustTargetFolder(p.category);
                    }}
                    className="w-full text-left p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition flex items-center justify-between gap-2"
                  >
                    <span className="font-bold text-white truncate">{p.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${getCategoryBadgeColor(
                        p.category
                      )}`}
                    >
                      {p.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateIllustration}
              disabled={isGeneratingImg || !illustPrompt.trim()}
              className="w-full py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isGeneratingImg ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Tạo Ảnh B-Roll AI & Phân Loại...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                  <span>Tạo Ảnh, Phân Loại & Lưu Vào Thư Viện</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Professional Title Badge / Lower-Third / Zoom */}
      {activeTab === 'badge' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-400" />
              Thêm Thẻ Tiêu Đề Lower-Third Hoặc Zoom
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tiêu đề chính (In hoa):</label>
              <input
                type="text"
                placeholder="VD: CHIẾN LƯỢC 3 BƯỚC CỐT LÕI"
                value={badgeTitle}
                onChange={e => setBadgeTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nội dung chi tiết / Thông số:</label>
              <input
                type="text"
                placeholder="VD: Tăng 85% Tỷ Lệ Tương Tác & Giữ Chân"
                value={badgeSubtitle}
                onChange={e => setBadgeSubtitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              onClick={handleAddBadge}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition"
            >
              Chèn Thẻ Chú Thích Tại {formatTime(currentTime)}
            </button>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleAddZoom}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                Chèn Hiệu Ứng Punch-in Zoom (1.15x) Tại {formatTime(currentTime)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
