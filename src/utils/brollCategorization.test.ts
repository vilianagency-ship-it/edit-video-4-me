import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBRollContent, filterBRollAssets } from './brollCategorization';
import { BRollAsset } from '../types/editor';

test('analyzeBRollContent correctly categorizes Historical B-roll content', () => {
  const text = 'Bản đồ da cừu cổ kính và di sản cung đình triều Nguyễn thời xưa vintage antique archive';
  const result = analyzeBRollContent(text);

  assert.equal(result.category, 'Historical');
  assert.ok(result.tags.includes('historical') || result.tags.includes('vintage') || result.tags.includes('heritage'));
  assert.ok(result.confidence >= 0.85);
  assert.ok(result.summary.length > 0);
});

test('analyzeBRollContent correctly categorizes Technology B-roll content', () => {
  const text = 'Mạch vi xử lý trí tuệ nhân tạo AI bán dẫn 3nm và điện toán đám mây quantum chip';
  const result = analyzeBRollContent(text);

  assert.equal(result.category, 'Technology');
  assert.ok(result.tags.includes('technology') || result.tags.includes('ai') || result.tags.includes('chip'));
  assert.ok(result.confidence >= 0.85);
});

test('analyzeBRollContent correctly categorizes People & Speakers B-roll content', () => {
  const text = 'Chân dung diễn giả thuyết trình chia sẻ trước khán giả và hội nghị phỏng vấn khách mời';
  const result = analyzeBRollContent(text);

  assert.equal(result.category, 'People');
  assert.ok(result.tags.includes('people') || result.tags.includes('speaker') || result.tags.includes('portrait'));
});

test('analyzeBRollContent correctly categorizes Business & Finance B-roll content', () => {
  const text = 'Biểu đồ tăng trưởng doanh số doanh nghiệp và ký kết hợp đồng tài chính đầu tư';
  const result = analyzeBRollContent(text);

  assert.equal(result.category, 'Business');
  assert.ok(result.tags.includes('business') || result.tags.includes('growth') || result.tags.includes('finance'));
});

test('analyzeBRollContent correctly categorizes Studio and Nature content', () => {
  const studioText = 'Phòng thu podcast micro chuyên dụng và máy quay điện ảnh 8k studio';
  const studioResult = analyzeBRollContent(studioText);
  assert.equal(studioResult.category, 'Studio');

  const natureText = 'Bình minh trên đỉnh núi cao mây mù và toàn cảnh thành phố skyline phong cảnh';
  const natureResult = analyzeBRollContent(natureText);
  assert.equal(natureResult.category, 'Nature');
});

test('filterBRollAssets filters correctly by folder, tags, and search query', () => {
  const sampleAssets: BRollAsset[] = [
    {
      id: '1',
      title: 'Bản Đồ Cổ Lịch Sử',
      description: 'Di sản thế kỷ 18',
      imageUrl: 'http://example.com/1.jpg',
      category: 'Historical',
      tags: ['historical', 'vintage', 'map'],
      source: 'preset',
      createdAt: 1000,
    },
    {
      id: '2',
      title: 'Vi Mạch AI Bán Dẫn',
      description: 'Chip xử lý lượng tử',
      imageUrl: 'http://example.com/2.jpg',
      category: 'Technology',
      tags: ['technology', 'ai', 'chip'],
      source: 'ai-generated',
      createdAt: 2000,
    },
    {
      id: '3',
      title: 'Diễn Giả Trên Sân Khấu',
      description: 'Chuyên gia thuyết trình',
      imageUrl: 'http://example.com/3.jpg',
      category: 'People',
      tags: ['people', 'speaker', 'presentation'],
      source: 'preset',
      createdAt: 3000,
    },
  ];

  // Test folder filter
  const histOnly = filterBRollAssets(sampleAssets, 'Historical', null, '');
  assert.equal(histOnly.length, 1);
  assert.equal(histOnly[0].id, '1');

  const allFolder = filterBRollAssets(sampleAssets, 'All', null, '');
  assert.equal(allFolder.length, 3);

  // Test tag filter
  const aiTagOnly = filterBRollAssets(sampleAssets, 'All', '#ai', '');
  assert.equal(aiTagOnly.length, 1);
  assert.equal(aiTagOnly[0].id, '2');

  // Test search query
  const searchResult = filterBRollAssets(sampleAssets, 'All', null, 'thuyết trình');
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, '3');
});
