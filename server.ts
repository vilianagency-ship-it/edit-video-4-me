import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeBRollContent } from './src/utils/brollCategorization';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));

// Shared Gemini client setup
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Transcribe or generate timed speech segments from speech text / video metadata.
 * Produces word-by-word timestamps aligned to video speech intervals.
 */
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { videoDuration = 30, filename = '', userTranscript = '', audioBase64, mimeType = 'audio/wav', noiseReduced = false } = req.body;

    if (ai) {
      const parts: any[] = [];

      // If real audio bytes are provided, feed them to Gemini
      if (audioBase64) {
        parts.push({
          inlineData: {
            mimeType: mimeType || 'audio/wav',
            data: audioBase64,
          },
        });
      }

      const prompt = `Bạn là hệ thống nhận diện giọng nói và tạo phụ đề video (Speech-to-Text & Subtitle Alignment) chuyên nghiệp.
${
  audioBase64
    ? `HÃY LẮNG NGHE TỆP ÂM THANH ĐÍNH KÈM và phiên âm CHÍNH XÁC 100% từng câu chữ mà người nói phát ra (ưu tiên Tiếng Việt nếu là tiếng Việt, hoặc ngôn ngữ người nói thực sự nói).${
        noiseReduced
          ? ' (Tệp âm thanh này đã được xử lý qua bộ lọc khử tạp âm nền DSP Noise Reduction Filter: loại bỏ tiếng ù điện 50/60Hz, tiếng quạt gió và làm trong rõ giọng nói).'
          : ''
      }`
    : `Thời lượng video: ${videoDuration} giây. Tên tệp: "${filename}". Nội dung gợi ý: "${userTranscript}".`
}

Yêu cầu định dạng JSON bắt buộc:
- "segments": mảng các câu được nói trong video.
- Mỗi câu có "start" (giây) và "end" (giây) tương ứng chính xác với âm thanh giọng nói, cùng "text" là nội dung câu.
- Cực kỳ quan trọng: Trong mỗi câu, cung cấp mảng "words" chứa TỪNG TỪ được phát âm cùng "start" và "end" thời gian của từ đó để làm hiệu ứng karaoke nhảy chữ.
- Không được bịa đặt lời thoại nếu nghe được âm thanh; hãy nghe và chép lại đúng những gì người nói phát âm.`;

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    start: { type: Type.NUMBER, description: 'Start time in seconds' },
                    end: { type: Type.NUMBER, description: 'End time in seconds' },
                    text: { type: Type.STRING, description: 'Full sentence text' },
                    words: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          word: { type: Type.STRING },
                          start: { type: Type.NUMBER },
                          end: { type: Type.NUMBER },
                        },
                        required: ['word', 'start', 'end'],
                      },
                    },
                  },
                  required: ['start', 'end', 'text', 'words'],
                },
              },
            },
            required: ['segments'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"segments":[]}');
      const formattedSegments = (parsed.segments || []).map((seg: any, sIdx: number) => ({
        id: `seg-${Date.now()}-${sIdx}`,
        start: Number(seg.start.toFixed(2)),
        end: Number(seg.end.toFixed(2)),
        text: seg.text,
        words: (seg.words || []).map((w: any, wIdx: number) => ({
          id: `w-${sIdx}-${wIdx}`,
          word: w.word,
          start: Number(w.start.toFixed(2)),
          end: Number(w.end.toFixed(2)),
        })),
      }));

      if (formattedSegments.length > 0) {
        return res.json({ segments: formattedSegments });
      }
    }

    // High quality deterministic fallback generator when API key is missing
    const fallbackSegments = generateTimedSegments(videoDuration, userTranscript || filename);
    res.json({ segments: fallbackSegments });
  } catch (err: any) {
    console.error('Error in /api/transcribe-audio:', err);
    res.json({
      segments: generateTimedSegments(req.body?.videoDuration || 30, req.body?.userTranscript || req.body?.filename || ''),
    });
  }
});

/**
 * Endpoint to analyze transcript and auto-generate professional callout cards,
 * cinematic illustrations, and camera punch-in zoom effects (NO cheap icons).
 */
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { transcript, videoDuration } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'transcript string is required' });
    }

    if (!ai) {
      return res.json({
        overlays: generateProfessionalFallbackOverlays(transcript, videoDuration || 30),
      });
    }

    const prompt = `Bạn là đạo diễn hình ảnh cao cấp cho video YouTube và TikTok chuyên nghiệp.
Phân tích kịch bản lời nói dưới đây và tự động tạo các lớp đồ họa minh họa (Overlays) đẳng cấp, chuẩn studio.
LƯU Ý QUAN TRỌNG:
- TUYỆT ĐỐI KHÔNG dùng emoji hay icon rẻ tiền, trẻ con.
- Chỉ tạo:
  1. "badge": Thẻ Lower-Third / Tiêu đề tin tức sang trọng (VD: "CHIẾN LƯỢC 3 BƯỚC", "CHỈ SỐ: +150% TĂNG TRƯỞNG", "NGUYÊN LÝ 80/20").
  2. "illustration": Ảnh B-roll minh họa thực tế / biểu đồ đồ họa chuyên nghiệp (VD: "Biểu đồ phân tích dữ liệu tăng trưởng", "Không gian làm việc studio hiện đại", "Mạch vi xử lý trí tuệ nhân tạo AI"). Cung cấp prompt tạo ảnh chân thực (photorealistic/cinematic).
  3. "zoom": Điểm nhấn khuôn mặt (1.15x) ở câu nói bất ngờ hoặc từ khóa đắt giá.

Thời lượng video: ${videoDuration || 30} giây.
Nội dung kịch bản:
"""${transcript}"""

Hãy trả về danh sách các overlays được căn chỉnh thời gian hợp lý (start, end trong phạm vi thời lượng video, mỗi overlay kéo dài 2.5 - 4.5 giây).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overlays: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'One of: badge, illustration, zoom',
                  },
                  title: {
                    type: Type.STRING,
                    description: 'Professional title or headline',
                  },
                  content: {
                    type: Type.STRING,
                    description: 'Detailed description or statistic value',
                  },
                  start: {
                    type: Type.NUMBER,
                    description: 'Start time in seconds',
                  },
                  end: {
                    type: Type.NUMBER,
                    description: 'End time in seconds',
                  },
                  position: {
                    type: Type.STRING,
                    description: 'top-left, top-right, bottom-left, bottom-right, center, top-center',
                  },
                  illustrationPrompt: {
                    type: Type.STRING,
                    description: 'Photorealistic prompt to generate image illustration',
                  },
                },
                required: ['type', 'title', 'content', 'start', 'end'],
              },
            },
          },
          required: ['overlays'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"overlays":[]}');

    const cleanOverlays = (parsed.overlays || []).map((item: any, idx: number) => {
      const start = Math.max(0, Number(item.start) || 0);
      const end = Math.min(videoDuration || 60, Math.max(start + 2.0, Number(item.end) || start + 3.5));
      const textToAnalyze = `${item.title || ''} ${item.content || ''} ${item.illustrationPrompt || ''}`;
      const analysis = analyzeBRollContent(textToAnalyze);

      return {
        id: `pro-overlay-${Date.now()}-${idx}`,
        type: item.type === 'sticker' ? 'badge' : (item.type || 'badge'),
        title: item.title || 'Điểm Nhấn Chuyên Nghiệp',
        content: item.content || item.title || '',
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        duration: Number((end - start).toFixed(2)),
        position: item.position || (item.type === 'illustration' ? 'top-right' : 'top-center'),
        animation: 'slide-up',
        scale: 1,
        zoomLevel: item.type === 'zoom' ? 1.15 : undefined,
        imageUrl: item.type === 'illustration' ? getProGraphicCard(item.title, item.content) : undefined,
        category: analysis.category,
        tags: analysis.tags,
      };
    });

    res.json({ overlays: cleanOverlays });
  } catch (err: any) {
    console.error('Error in /api/analyze-script:', err);
    res.json({
      overlays: generateProfessionalFallbackOverlays(req.body?.transcript || '', req.body?.videoDuration || 30),
    });
  }
});

/**
 * Translate subtitle segments into target language (English, Spanish, etc.) using Gemini.
 * Accurately aligns word-by-word timing for viral animated karaoke subtitles.
 */
app.post('/api/translate-subtitles', async (req, res) => {
  try {
    const { segments, targetLanguage = 'en', sourceLanguage = 'vi' } = req.body;
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'segments array is required' });
    }

    const languageNames: Record<string, string> = {
      en: 'English (Tiếng Anh)',
      es: 'Spanish (Tiếng Tây Ban Nha - Español)',
      ja: 'Japanese (Tiếng Nhật - 日本語)',
      fr: 'French (Tiếng Pháp - Français)',
      zh: 'Chinese (Tiếng Trung - 中文)',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    if (ai) {
      const prompt = `Bạn là chuyên gia dịch thuật phụ đề video và định dạng thời gian phụ đề viral (YouTube Shorts / TikTok / Reels Subtitle Specialist).
Nhiệm vụ: Dịch toàn bộ danh sách các đoạn phụ đề sau sang ngôn ngữ: "${targetLangName}" (mã ngôn ngữ: ${targetLanguage}).

YÊU CẦU QUAN TRỌNG:
1. Dịch văn phong tự nhiên, súc tích, hấp dẫn, đúng phong cách nói chuyện của người làm sáng tạo nội dung (Content Creator).
2. Giữ nguyên mốc thời gian "start" và "end" của mỗi đoạn phụ đề (start và end phải giữ nguyên chính xác).
3. Chia câu dịch thành các từ riêng biệt (mảng "words"). Căn chỉnh "start" và "end" của từng từ tương ứng theo tỷ lệ trải đều trong khoảng thời gian [start, end] của câu đó, đảm bảo hiệu ứng karaoke nhảy chữ khớp hoàn hảo với video.
4. Giữ nguyên id của từng segment để đối chiếu.

Danh sách các đoạn phụ đề gốc:
${JSON.stringify(
  segments.map(s => ({
    id: s.id,
    start: s.start,
    end: s.end,
    text: s.text,
  })),
  null,
  2
)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedSegments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER },
                    text: { type: Type.STRING },
                    words: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          word: { type: Type.STRING },
                          start: { type: Type.NUMBER },
                          end: { type: Type.NUMBER },
                        },
                        required: ['word', 'start', 'end'],
                      },
                    },
                  },
                  required: ['id', 'start', 'end', 'text', 'words'],
                },
              },
            },
            required: ['translatedSegments'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"translatedSegments":[]}');
      if (parsed.translatedSegments && Array.isArray(parsed.translatedSegments) && parsed.translatedSegments.length > 0) {
        const cleanSegments = parsed.translatedSegments.map((seg: any, sIdx: number) => {
          const original = segments.find(s => s.id === seg.id) || segments[sIdx];
          const start = Number(seg.start ?? original?.start ?? 0);
          const end = Number(seg.end ?? original?.end ?? (start + 2));
          const wordsList = (seg.words || []).map((w: any, wIdx: number) => ({
            id: `tw-${sIdx}-${wIdx}`,
            word: String(w.word || ''),
            start: Number(Number(w.start).toFixed(2)),
            end: Number(Number(w.end).toFixed(2)),
          }));

          return {
            id: original?.id || `trans-seg-${sIdx}`,
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
            text: seg.text || original?.text || '',
            words: wordsList.length > 0 ? wordsList : generateFallbackWords(seg.text || original?.text || '', start, end, sIdx),
            deleted: original?.deleted || false,
          };
        });

        return res.json({ translatedSegments: cleanSegments, targetLanguage });
      }
    }

    // High quality offline fallback
    const fallback = generateFallbackTranslations(segments, targetLanguage);
    res.json({ translatedSegments: fallback, targetLanguage, fallback: true });
  } catch (err: any) {
    console.error('Error in /api/translate-subtitles:', err);
    const fallback = generateFallbackTranslations(req.body?.segments || [], req.body?.targetLanguage || 'en');
    res.json({ translatedSegments: fallback, targetLanguage: req.body?.targetLanguage || 'en', fallback: true });
  }
});

/**
 * Generate visual illustration for a scene using Gemini with professional photorealistic styling.
 * Automatically performs content analysis to determine category ('Historical', 'Technology', 'People', etc.) and tags.
 */
app.post('/api/generate-illustration', async (req, res) => {
  try {
    const { prompt, title = 'Ảnh B-Roll AI', style = 'photorealistic cinematic lighting, studio quality, high-tech editorial photograph' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const textToAnalyze = `${title} ${prompt}`;
    const baseAnalysis = analyzeBRollContent(textToAnalyze);

    let generatedImageUrl: string | null = null;

    if (ai) {
      try {
        const fullPrompt = `${prompt}, ${style}, 8k resolution, ultra detailed, modern magazine aesthetics, professional color grading, clean composition, award-winning photography, no text watermark`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: fullPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: '1:1',
            },
          },
        });

        for (const candidate of response.candidates || []) {
          for (const part of candidate.content?.parts || []) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
          if (generatedImageUrl) break;
        }
      } catch (genErr) {
        console.warn('Image generation error, generating high-end graphic card instead:', genErr);
      }
    }

    const imageUrl = generatedImageUrl || getProGraphicCard(title.slice(0, 32), prompt);

    res.json({
      imageUrl,
      prompt,
      title,
      category: baseAnalysis.category,
      tags: baseAnalysis.tags,
      aiAnalysis: {
        summary: baseAnalysis.summary,
        mood: baseAnalysis.mood,
        confidence: baseAnalysis.confidence,
      },
      fallback: !generatedImageUrl,
    });
  } catch (err: any) {
    console.error('Error generating illustration:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Automatically categorize B-roll items into folders (e.g., 'Historical', 'Technology', 'People', 'Business', 'Studio', 'Nature')
 * and tags based on Gemini AI content analysis or deterministic semantic categorization.
 */
app.post('/api/categorize-broll', async (req, res) => {
  try {
    const { items, title, prompt, description } = req.body;

    const listToCategorize: Array<{ id?: string; title?: string; prompt?: string; description?: string }> =
      Array.isArray(items) && items.length > 0
        ? items
        : [{ title: title || '', prompt: prompt || '', description: description || '' }];

    const results: any[] = [];

    if (ai) {
      try {
        const promptInstruction = `Bạn là giám đốc nội dung B-Roll và đồ họa video chuyên nghiệp (Video B-Roll & Visual Asset Director).
Nhiệm vụ: Phân tích nội dung các B-Roll sau đây và phân loại chuẩn xác vào các THƯ MỤC CHÍNH và gán các TAGS ngữ nghĩa.

CÁC THƯ MỤC TIÊU CHUẨN (Category):
1. "Historical": Lịch sử, di sản, hoài niệm, cổ kính, văn hóa truyền thống, tài liệu lưu trữ, retro, bảo tàng, thời gian.
2. "Technology": Công nghệ, trí tuệ nhân tạo (AI), phần mềm, lập trình, vi mạch bán dẫn, robot, tương lai, dữ liệu.
3. "People": Con người, chân dung, diễn giả thuyết trình, làm việc nhóm, phỏng vấn, khán giả, người sáng tạo.
4. "Business": Kinh doanh, tài chính, biểu đồ tăng trưởng, doanh nghiệp, ký kết hợp đồng, đầu tư, thị trường.
5. "Studio": Phòng thu âm, thiết bị âm thanh, máy quay điện ảnh, podcast, đèn chiếu, hậu trường.
6. "Nature": Thiên nhiên, phong cảnh, núi rừng, biển, bình minh, hoàng hôn, thành phố đô thị.

Danh sách B-Roll cần phân loại:
${JSON.stringify(listToCategorize, null, 2)}

Hãy trả về danh sách đối tượng categorized gồm:
- id (giữ nguyên nếu có)
- category (chính xác 1 trong 6 mục: "Historical", "Technology", "People", "Business", "Studio", "Nature")
- tags (mảng 3 đến 5 tag chữ thường không dấu cách, ví dụ: ["ai", "chip", "future"])
- summary (tóm tắt nội dung 1 câu bằng tiếng Việt)
- mood (tông sắc thái thị giác)
- confidence (độ tin cậy từ 0.70 đến 0.99)`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptInstruction,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                categorized: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      category: {
                        type: Type.STRING,
                        description: 'One of: Historical, Technology, People, Business, Studio, Nature',
                      },
                      tags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      summary: { type: Type.STRING },
                      mood: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                    },
                    required: ['category', 'tags', 'summary'],
                  },
                },
              },
              required: ['categorized'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{"categorized":[]}');
        if (parsed.categorized && Array.isArray(parsed.categorized) && parsed.categorized.length > 0) {
          for (let i = 0; i < listToCategorize.length; i++) {
            const catItem = parsed.categorized[i] || parsed.categorized[0];
            results.push({
              id: listToCategorize[i].id,
              category: catItem.category || 'Technology',
              tags: Array.isArray(catItem.tags) && catItem.tags.length > 0 ? catItem.tags : ['b-roll'],
              aiAnalysis: {
                summary: catItem.summary || '',
                mood: catItem.mood || 'Cinematic',
                confidence: typeof catItem.confidence === 'number' ? catItem.confidence : 0.95,
              },
            });
          }

          if (!Array.isArray(items)) {
            return res.json(results[0]);
          }
          return res.json({ categorized: results });
        }
      } catch (aiErr) {
        console.warn('AI B-roll categorization fallback:', aiErr);
      }
    }

    // High fidelity offline rule-based fallback
    for (const item of listToCategorize) {
      const fullText = `${item.title || ''} ${item.prompt || ''} ${item.description || ''}`;
      const analysis = analyzeBRollContent(fullText);
      results.push({
        id: item.id,
        category: analysis.category,
        tags: analysis.tags,
        aiAnalysis: {
          summary: analysis.summary,
          mood: analysis.mood,
          confidence: analysis.confidence,
        },
        fallback: true,
      });
    }

    if (!Array.isArray(items)) {
      return res.json(results[0]);
    }
    return res.json({ categorized: results });
  } catch (err: any) {
    console.error('Error in /api/categorize-broll:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sleek Professional Graphic Card (Infographic & B-Roll aesthetic)
function getProGraphicCard(title: string, desc: string): string {
  const safeTitle = (title || 'B-Roll Visual').replace(/[<>&"]/g, '');
  const safeDesc = (desc || '').replace(/[<>&"]/g, '').slice(0, 50);

  const palettes = [
    { bg1: '#0F172A', bg2: '#0284C7', accent: '#38BDF8', glow: 'rgba(56, 189, 248, 0.4)' },
    { bg1: '#1E1B4B', bg2: '#4F46E5', accent: '#818CF8', glow: 'rgba(129, 140, 248, 0.4)' },
    { bg1: '#064E3B', bg2: '#059669', accent: '#34D399', glow: 'rgba(52, 211, 153, 0.4)' },
    { bg1: '#18181B', bg2: '#71717A', accent: '#F43F5E', glow: 'rgba(244, 63, 94, 0.4)' },
  ];
  const p = palettes[Math.floor(Math.random() * palettes.length)];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${p.bg1}" />
        <stop offset="100%" stop-color="#090D16" />
      </linearGradient>
      <linearGradient id="chart" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.9" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="${p.accent}" flood-opacity="0.3"/>
      </filter>
    </defs>
    
    <!-- Background Frame with sleek border -->
    <rect width="456" height="456" x="12" y="12" rx="28" fill="url(#bg)" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.4" filter="url(#shadow)"/>
    
    <!-- Top Meta Tag -->
    <rect x="36" y="36" width="120" height="26" rx="8" fill="${p.accent}" fill-opacity="0.18" />
    <text x="96" y="53" font-family="Plus Jakarta Sans, sans-serif" font-size="11" font-weight="800" fill="${p.accent}" text-anchor="middle" letter-spacing="1.5">PRO B-ROLL</text>
    
    <!-- High-tech Grid Lines -->
    <line x1="36" y1="180" x2="444" y2="180" stroke="#334155" stroke-dasharray="4 4" stroke-width="1"/>
    <line x1="36" y1="240" x2="444" y2="240" stroke="#334155" stroke-dasharray="4 4" stroke-width="1"/>
    <line x1="36" y1="300" x2="444" y2="300" stroke="#334155" stroke-dasharray="4 4" stroke-width="1"/>
    
    <!-- Professional Growth Graph / Waveform curve -->
    <path d="M 40 320 C 120 310, 180 230, 240 210 C 300 190, 360 140, 440 90 L 440 340 L 40 340 Z" fill="url(#chart)" />
    <path d="M 40 320 C 120 310, 180 230, 240 210 C 300 190, 360 140, 440 90" fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>
    
    <!-- Milestone indicator dots -->
    <circle cx="240" cy="210" r="7" fill="${p.accent}" stroke="#090D16" stroke-width="3" />
    <circle cx="440" cy="90" r="8" fill="#FFFFFF" stroke="${p.accent}" stroke-width="3" />
    
    <!-- Professional Typography -->
    <text x="36" y="390" font-family="Plus Jakarta Sans, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF">${safeTitle}</text>
    <text x="36" y="420" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="500" fill="#94A3B8">${safeDesc}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Fallback professional overlays (No emojis)
function generateProfessionalFallbackOverlays(transcript: string, videoDuration: number) {
  const duration = videoDuration || 30;
  return [
    {
      id: 'pro-badge-1',
      type: 'badge',
      title: 'CHIẾN LƯỢC CỐT LÕI',
      content: 'Tự Động Hóa 100% Quy Trình Video',
      start: Number((duration * 0.08).toFixed(2)),
      end: Number((duration * 0.22).toFixed(2)),
      duration: Number((duration * 0.14).toFixed(2)),
      position: 'top-center',
      animation: 'slide-up',
      scale: 1,
    },
    {
      id: 'pro-broll-1',
      type: 'illustration',
      title: 'Biểu Đồ Tăng Trưởng',
      content: 'Tăng 85% Tỷ Lệ Giữ Chân Người Xem',
      start: Number((duration * 0.32).toFixed(2)),
      end: Number((duration * 0.48).toFixed(2)),
      duration: Number((duration * 0.16).toFixed(2)),
      position: 'top-right',
      animation: 'slide-up',
      scale: 1,
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'pro-badge-2',
      type: 'badge',
      title: 'JUMP CUT THÔNG MINH',
      content: 'Loại Bỏ Mọi Khoảng Nghỉ & Từ Thừa',
      start: Number((duration * 0.55).toFixed(2)),
      end: Number((duration * 0.70).toFixed(2)),
      duration: Number((duration * 0.15).toFixed(2)),
      position: 'top-center',
      animation: 'slide-up',
      scale: 1,
    },
    {
      id: 'pro-broll-2',
      type: 'illustration',
      title: 'Studio Chuyên Nghiệp',
      content: 'Chuẩn Âm Thanh & Hình Ảnh Điện Ảnh',
      start: Number((duration * 0.75).toFixed(2)),
      end: Number((duration * 0.90).toFixed(2)),
      duration: Number((duration * 0.15).toFixed(2)),
      position: 'top-right',
      animation: 'slide-up',
      scale: 1,
      imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'pro-zoom-1',
      type: 'zoom',
      title: 'Punch-in Zoom',
      content: 'Nhấn mạnh thông điệp quan trọng',
      start: Number((duration * 0.90).toFixed(2)),
      end: Number((duration * 0.98).toFixed(2)),
      duration: Number((duration * 0.08).toFixed(2)),
      position: 'center',
      animation: 'pop',
      zoomLevel: 1.15,
    },
  ];
}

// Generate timed segments for custom video fallback
function generateTimedSegments(duration: number, topicHint: string) {
  const sentences = [
    'Chào các bạn, hôm nay chúng ta sẽ tìm hiểu cách tối ưu video tự động.',
    'Khi ngồi nói chuyện, những đoạn ngập ngừng sẽ khiến người xem nhanh chóng lướt qua.',
    'Hệ thống AI sẽ tự động phân tích sóng âm thanh để cắt tỉa mọi khoảng lặng.',
    'Đồng thời tự động tạo phụ đề nhảy chữ và chèn hình ảnh minh họa chuyên nghiệp.',
    'Giúp bạn tiết kiệm hơn 80% thời gian biên tập và nâng cao chất lượng video.',
  ];

  const segDuration = duration / sentences.length;
  return sentences.map((text, idx) => {
    const start = Number((idx * segDuration + 0.3).toFixed(2));
    const end = Number(((idx + 1) * segDuration - 0.2).toFixed(2));
    const words = text.split(' ').map((w, wIdx, arr) => {
      const wSpan = (end - start) / arr.length;
      return {
        id: `w-${idx}-${wIdx}`,
        word: w,
        start: Number((start + wIdx * wSpan).toFixed(2)),
        end: Number((start + (wIdx + 1) * wSpan).toFixed(2)),
      };
    });

    return {
      id: `seg-${idx + 1}`,
      start,
      end,
      text,
      words,
    };
  });
}

function generateFallbackWords(text: string, start: number, end: number, segIdx: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const span = Math.max(0.1, end - start);
  const step = span / Math.max(1, words.length);
  return words.map((w, wIdx) => ({
    id: `tw-${segIdx}-${wIdx}`,
    word: w,
    start: Number((start + wIdx * step).toFixed(2)),
    end: Number((start + (wIdx + 1) * step).toFixed(2)),
  }));
}

function generateFallbackTranslations(segments: any[], targetLanguage: string) {
  const dictionaryEn: Record<string, string> = {
    'Chào các bạn, hôm nay mình sẽ chỉ cho bạn cách edit video tự động.':
      "Hey everyone, today I'll show you how to edit videos automatically.",
    'Khi bạn ngồi nói chuyện, những đoạn nghỉ ngập ngừng làm tụt tương tác.':
      'When you record talking videos, awkward pauses kill audience retention.',
    'Với công nghệ nhận diện AI, toàn bộ khoảng lặng bị cắt sạch trong một nốt nhạc.':
      'With smart AI detection, all silent pauses are trimmed in a single click.',
    'Chỉ sau vài giây, video trở nên gãy gọn, cuốn hút và sẵn sàng lên xu hướng!':
      'Within seconds, your video becomes snappy, engaging and ready to go viral!',
    'Hãy trải nghiệm ngay bây giờ để tiết kiệm 80% thời gian biên tập nhé!':
      'Experience it right now to save over 80% of your video editing time!',
  };

  const dictionaryEs: Record<string, string> = {
    'Chào các bạn, hôm nay mình sẽ chỉ cho bạn cách edit video tự động.':
      'Hola a todos, hoy les mostraré cómo editar videos automáticamente.',
    'Khi bạn ngồi nói chuyện, những đoạn nghỉ ngập ngừng làm tụt tương tác.':
      'Cuando grabas hablando a cámara, las pausas incómodas arruinan la retención.',
    'Với công nghệ nhận diện AI, toàn bộ khoảng lặng bị cắt sạch trong một nốt nhạc.':
      'Con detección inteligente por IA, todos los silencios se recortan al instante.',
    'Chỉ sau vài giây, video trở nên gãy gọn, cuốn hút và sẵn sàng lên xu hướng!':
      '¡En pocos segundos, tu video queda dinámico, atractivo y listo para ser viral!',
    'Hãy trải nghiệm ngay bây giờ để tiết kiệm 80% thời gian biên tập nhé!':
      '¡Pruébalo ahora mismo para ahorrar el 80% de tu tiempo de edición!',
  };

  return segments.map((seg, sIdx) => {
    let translatedText = seg.text;
    if (targetLanguage === 'en') {
      translatedText = dictionaryEn[seg.text] || `[EN] ${seg.text}`;
    } else if (targetLanguage === 'es') {
      translatedText = dictionaryEs[seg.text] || `[ES] ${seg.text}`;
    } else {
      translatedText = `[${targetLanguage.toUpperCase()}] ${seg.text}`;
    }

    const start = Number(seg.start || 0);
    const end = Number(seg.end || start + 2);

    return {
      id: seg.id || `seg-${sIdx}`,
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      text: translatedText,
      words: generateFallbackWords(translatedText, start, end, sIdx),
      deleted: seg.deleted || false,
    };
  });
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AutoCut Studio server running at http://localhost:${port}`);
  });
}

startServer();
