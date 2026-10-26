import { TransitionType, TransitionConfig, VideoClipSegment } from '../types/editor';

export interface TransitionPreset {
  id: TransitionType;
  name: string;
  category: string;
  description: string;
  iconName: string;
}

export const TRANSITION_PRESETS: TransitionPreset[] = [
  {
    id: 'dissolve',
    name: 'Cross Dissolve',
    category: 'Mượt mà',
    description: 'Hòa trộn mượt mà giữa 2 đoạn nói, loại bỏ cảm giác giật hình.',
    iconName: 'Blend',
  },
  {
    id: 'fade-black',
    name: 'Dip to Black',
    category: 'Điện ảnh',
    description: 'Chớp đen nhẹ nhàng như chuyển cảnh phim điện ảnh.',
    iconName: 'Moon',
  },
  {
    id: 'fade-white',
    name: 'Flash to White',
    category: 'Năng động',
    description: 'Chớp sáng trắng tạo cú hích thị giác kích thích tương tác.',
    iconName: 'Sun',
  },
  {
    id: 'slide-left',
    name: 'Slide Left Push',
    category: 'Trượt đẩy',
    description: 'Trượt đẩy khung hình sang trái chuyển tiếp câu nói tiếp theo.',
    iconName: 'ArrowLeft',
  },
  {
    id: 'slide-right',
    name: 'Slide Right Push',
    category: 'Trượt đẩy',
    description: 'Trượt đẩy khung hình sang phải hiện đại phong cách TikTok.',
    iconName: 'ArrowRight',
  },
  {
    id: 'zoom-in',
    name: 'Dynamic Zoom',
    category: 'Tập trung',
    description: 'Phóng to nhẹ nhàng chuyển nhịp mượt mà giữa các ý.',
    iconName: 'ZoomIn',
  },
  {
    id: 'blur',
    name: 'Motion Blur',
    category: 'Mờ ảo',
    description: 'Hiệu ứng nhòe chuyển động mềm mại giữa 2 góc máy.',
    iconName: 'Eye',
  },
  {
    id: 'cut',
    name: 'Jump Cut Snappy',
    category: 'Cơ bản',
    description: 'Cắt dứt khoát không hiệu ứng, giữ nhịp nói siêu nhanh.',
    iconName: 'Scissors',
  },
];

export interface ActiveTransitionState {
  isActive: boolean;
  progress: number; // 0 to 1 (0 = start of transition, 0.5 = cut boundary, 1 = end of transition)
  type: TransitionType;
  clipIndex: number; // index of outgoing clip
}

/**
 * Calculate if a transition effect should currently be rendered at the given timeline time.
 */
export function getTransitionState(
  timelineTime: number,
  clips: VideoClipSegment[],
  config: TransitionConfig
): ActiveTransitionState {
  if (!config || config.type === 'cut' || clips.length < 2) {
    return { isActive: false, progress: 0, type: 'cut', clipIndex: -1 };
  }

  const halfDuration = Math.max(0.05, config.duration / 2);

  for (let i = 0; i < clips.length - 1; i++) {
    const boundaryTime = clips[i].timelineEnd;
    const windowStart = boundaryTime - halfDuration;
    const windowEnd = boundaryTime + halfDuration;

    if (timelineTime >= windowStart && timelineTime <= windowEnd) {
      const progress = Math.min(1, Math.max(0, (timelineTime - windowStart) / (windowEnd - windowStart)));
      return {
        isActive: true,
        progress,
        type: config.type,
        clipIndex: i,
      };
    }
  }

  return { isActive: false, progress: 0, type: config.type, clipIndex: -1 };
}
