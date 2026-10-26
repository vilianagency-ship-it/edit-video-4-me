import { BRollAsset } from '../types/editor';

export type StandardBRollCategory = 'Technology' | 'People' | 'Historical' | 'Business' | 'Studio' | 'Nature';

export const BROLL_CATEGORIES: { id: StandardBRollCategory; label: string; icon: string; description: string; color: string }[] = [
  {
    id: 'Technology',
    label: 'Công Nghệ & AI',
    icon: 'Cpu',
    description: 'Vi mạch, AI, lập trình, dữ liệu đám mây, robot',
    color: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/40 text-cyan-300',
  },
  {
    id: 'People',
    label: 'Con Người & Diễn Giả',
    icon: 'Users',
    description: 'Chân dung, diễn giả, làm việc nhóm, phỏng vấn, khán giả',
    color: 'from-emerald-500/20 to-teal-500/20 border-teal-500/40 text-teal-300',
  },
  {
    id: 'Historical',
    label: 'Lịch Sử & Hoài Niệm',
    icon: 'Landmark',
    description: 'Di sản, cổ kính, tài liệu xưa, máy ảnh cơ, thời gian',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
  },
  {
    id: 'Business',
    label: 'Kinh Doanh & Tài Chính',
    icon: 'TrendingUp',
    description: 'Biểu đồ tăng trưởng, doanh nghiệp, tài chính, hợp tác',
    color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-300',
  },
  {
    id: 'Studio',
    label: 'Studio & Sáng Tạo',
    icon: 'Video',
    description: 'Phòng thu, micro, máy quay điện ảnh, podcast',
    color: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/40 text-fuchsia-300',
  },
  {
    id: 'Nature',
    label: 'Thiên Nhiên & Đô Thị',
    icon: 'Mountain',
    description: 'Phong cảnh, hoàng hôn, thành phố, nhịp sống đô thị',
    color: 'from-lime-500/20 to-green-500/20 border-lime-500/40 text-lime-300',
  },
];

interface AnalysisResult {
  category: StandardBRollCategory;
  tags: string[];
  summary: string;
  mood: string;
  confidence: number;
}

/**
 * Intelligent content analysis for B-roll visuals based on title, prompt, description, and keywords.
 * Maps content to categories like 'Historical', 'Technology', 'People', etc., with semantic tags.
 */
export function analyzeBRollContent(textInput: string): AnalysisResult {
  const text = (textInput || '').toLowerCase();

  // Keyword score maps for each category
  const scores: Record<StandardBRollCategory, number> = {
    Technology: 0,
    People: 0,
    Historical: 0,
    Business: 0,
    Studio: 0,
    Nature: 0,
  };

  const detectedTags: Set<string> = new Set();

  // Historical indicators
  const historicalKeywords = [
    'lịch sử', 'lich su', 'cổ kính', 'co kinh', 'di sản', 'di san', 'thời xưa', 'quá khứ', 'hoài niệm',
    'cổ điển', 'tài liệu', 'cố đô', 'huế', 'hội an', 'văn hiến', 'bảo tàng', 'xưa', 'vintage',
    'historical', 'history', 'ancient', 'heritage', 'retro', 'antique', 'parchment', 'old', 'archive',
    'nostalgia', 'century', 'traditional', 'monument', 'renaissance', 'dynasty', 'relic', 'chronicle'
  ];
  for (const kw of historicalKeywords) {
    if (text.includes(kw)) {
      scores.Historical += 2.5;
      detectedTags.add(kw.replace(/\s+/g, '-'));
    }
  }

  // Technology indicators
  const techKeywords = [
    'công nghệ', 'cong nghe', 'ai', 'trí tuệ nhân tạo', 'vi mạch', 'chip', 'bán dẫn', 'máy tính',
    'lập trình', 'code', 'phần mềm', 'robot', 'tự động', 'số hóa', 'thuật toán', 'quantum', 'vũ trụ',
    'technology', 'tech', 'neural', 'cyber', 'cyberpunk', 'microchip', 'hardware', 'software',
    'futuristic', 'digital', 'algorithm', 'blockchain', 'data', 'cloud', 'server', 'hologram'
  ];
  for (const kw of techKeywords) {
    if (text.includes(kw)) {
      scores.Technology += 2.5;
      detectedTags.add(kw.replace(/\s+/g, '-'));
    }
  }

  // People indicators
  const peopleKeywords = [
    'con người', 'con nguoi', 'người', 'chân dung', 'diễn giả', 'khuôn mặt', 'khách mời', 'phỏng vấn',
    'đội ngũ', 'nhóm', 'khán giả', 'bạn trẻ', 'chuyên gia', 'lãnh đạo', 'người sáng tạo', 'creator',
    'people', 'person', 'portrait', 'speaker', 'face', 'interview', 'team', 'teamwork', 'crowd',
    'audience', 'human', 'community', 'collaborator', 'founder', 'host', 'presenter'
  ];
  for (const kw of peopleKeywords) {
    if (text.includes(kw)) {
      scores.People += 2.5;
      detectedTags.add(kw.replace(/\s+/g, '-'));
    }
  }

  // Business indicators
  const businessKeywords = [
    'kinh doanh', 'doanh nghiệp', 'doanh số', 'tài chính', 'biểu đồ', 'tăng trưởng', 'tiền tệ',
    'đầu tư', 'chứng khoán', 'văn phòng', 'hợp đồng', 'bắt tay', 'chiến lược', 'startup', 'doanh thu',
    'business', 'finance', 'revenue', 'growth', 'chart', 'metrics', 'corporate', 'office',
    'investment', 'partnership', 'deal', 'economy', 'sales', 'analytics', 'profit'
  ];
  for (const kw of businessKeywords) {
    if (text.includes(kw)) {
      scores.Business += 2.5;
      detectedTags.add(kw.replace(/\s+/g, '-'));
    }
  }

  // Studio indicators
  const studioKeywords = [
    'studio', 'phòng thu', 'micro', 'thu âm', 'máy quay', 'ánh sáng', 'điện ảnh', 'podcast',
    'hậu trường', 'đèn led', 'thiết bị', 'quay phim', 'camera', 'microphone', 'broadcast',
    'production', 'lens', 'cinematography', 'recording', 'acoustic'
  ];
  for (const kw of studioKeywords) {
    if (text.includes(kw)) {
      scores.Studio += 2.5;
      detectedTags.add(kw.replace(/\s+/g, '-'));
    }
  }

  // Nature indicators
  const natureKeywords = [
    'thiên nhiên', 'phong cảnh', 'núi', 'rừng', 'biển', 'bình minh', 'hoàng hôn', 'thành phố',
    'đô thị', 'bầu trời', 'cây xanh', 'nature', 'landscape', 'mountain', 'sunrise', 'sunset',
    'city', 'skyline', 'urban', 'ocean', 'forest', 'horizon'
  ];
  for (const kw of natureKeywords) {
    if (text.includes(kw)) {
      scores.Nature += 2.5;
      detectedTags.add(kw.replace(/\s+/g, '-'));
    }
  }

  // Determine top category
  let topCategory: StandardBRollCategory = 'Technology';
  let maxScore = -1;

  for (const [cat, score] of Object.entries(scores) as [StandardBRollCategory, number][]) {
    if (score > maxScore) {
      maxScore = score;
      topCategory = cat;
    }
  }

  // Default fallback if no keywords matched
  if (maxScore <= 0) {
    if (text.includes('ảnh') || text.includes('b-roll') || text.includes('video')) {
      topCategory = 'Technology';
    }
  }

  // Ensure category tag is always first in tags list
  const categoryTag = topCategory.toLowerCase();
  const rawList = [categoryTag, ...Array.from(detectedTags)];
  const uniqueSet = new Set<string>();
  for (const t of rawList) {
    if (t) uniqueSet.add(t);
  }

  // Default tags by category if too few detected
  const defaultCategoryTags: Record<StandardBRollCategory, string[]> = {
    Technology: ['technology', 'ai', 'digital', 'innovation'],
    People: ['people', 'portrait', 'creator', 'collaboration'],
    Historical: ['historical', 'heritage', 'vintage', 'culture'],
    Business: ['business', 'growth', 'finance', 'corporate'],
    Studio: ['studio', 'production', 'creator', 'broadcast'],
    Nature: ['nature', 'landscape', 'environment', 'scenery'],
  };

  for (const dt of defaultCategoryTags[topCategory]) {
    uniqueSet.add(dt);
  }

  const finalTags = Array.from(uniqueSet).slice(0, 6);

  const moodMap: Record<StandardBRollCategory, string> = {
    Technology: 'Futuristic & High-Tech',
    People: 'Empowering & Authentic',
    Historical: 'Timeless & Atmospheric',
    Business: 'Professional & Authoritative',
    Studio: 'Cinematic & Broadcast Quality',
    Nature: 'Epic & Serene',
  };

  const confidence = maxScore >= 5 ? 0.96 : maxScore >= 2.5 ? 0.88 : 0.75;

  return {
    category: topCategory,
    tags: finalTags,
    summary: `Nội dung hình ảnh B-roll thuộc chủ đề ${topCategory} với phong cách ${moodMap[topCategory]}`,
    mood: moodMap[topCategory],
    confidence,
  };
}

/**
 * Filter B-roll assets by selected folder and/or tag and/or search term.
 */
export function filterBRollAssets(
  assets: BRollAsset[],
  folder: string,
  selectedTag: string | null,
  searchQuery: string
): BRollAsset[] {
  let filtered = [...assets];

  // Folder filter ('All' matches all)
  if (folder && folder !== 'All') {
    filtered = filtered.filter(a => a.category.toLowerCase() === folder.toLowerCase());
  }

  // Tag filter
  if (selectedTag) {
    const cleanTag = selectedTag.toLowerCase().replace(/^#/, '');
    filtered = filtered.filter(a =>
      a.tags.some(t => t.toLowerCase() === cleanTag)
    );
  }

  // Text search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      a =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        a.tags.some(t => t.toLowerCase().includes(query)) ||
        (a.aiPrompt && a.aiPrompt.toLowerCase().includes(query))
    );
  }

  return filtered;
}
