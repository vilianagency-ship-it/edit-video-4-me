export interface ProAssetItem {
  id: string;
  category: 'business' | 'tech' | 'creator' | 'productivity' | 'chart';
  title: string;
  subtitle: string;
  type: 'illustration' | 'badge';
  imageUrl: string;
  accentColor: string;
}

export const PRO_VISUAL_ASSETS: ProAssetItem[] = [
  {
    id: 'pro-chart-growth',
    category: 'chart',
    title: 'Biểu Đồ Tăng Trưởng Doanh Số',
    subtitle: 'Tăng 85% tỷ lệ giữ chân người xem',
    type: 'illustration',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    accentColor: '#38BDF8',
  },
  {
    id: 'pro-tech-ai',
    category: 'tech',
    title: 'Công Nghệ AI & Tự Động Hóa',
    subtitle: 'Xử lý video thông minh bằng Machine Learning',
    type: 'illustration',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    accentColor: '#818CF8',
  },
  {
    id: 'pro-creator-studio',
    category: 'creator',
    title: 'Phòng Thu Chuyên Nghiệp',
    subtitle: 'Chuẩn âm thanh & hình ảnh 4K HDR',
    type: 'illustration',
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80',
    accentColor: '#F59E0B',
  },
  {
    id: 'pro-rocket-scale',
    category: 'business',
    title: 'Bứt Phá Tốc Độ Cao',
    subtitle: 'Rút ngắn 80% thời gian biên tập video',
    type: 'illustration',
    imageUrl: 'https://images.unsplash.com/photo-1517976487504-59a1a04d26dd?w=600&auto=format&fit=crop&q=80',
    accentColor: '#EC4899',
  },
  {
    id: 'pro-productivity-workspace',
    category: 'productivity',
    title: 'Quy Trình Tối Ưu',
    subtitle: 'Hệ thống hóa quy trình sản xuất nội dung',
    type: 'illustration',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    accentColor: '#10B981',
  },
  {
    id: 'pro-strategy-brain',
    category: 'tech',
    title: 'Tư Duy Chiến Lược Kịch Bản',
    subtitle: 'Cấu trúc Hook - Body - Call to Action',
    type: 'illustration',
    imageUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&auto=format&fit=crop&q=80',
    accentColor: '#A855F7',
  },
];
