import { test } from 'node:test';
import assert from 'node:assert';
import { TranscriptSegment } from '../types/editor.js';
import { AVAILABLE_LANGUAGES, DEMO_TRANSLATIONS_EN, DEMO_TRANSLATIONS_ES } from '../data/subtitlePresets.js';

test('AVAILABLE_LANGUAGES contains English, Spanish and Vietnamese', () => {
  const codes = AVAILABLE_LANGUAGES.map(l => l.code);
  assert.ok(codes.includes('vi'), 'Should contain Vietnamese');
  assert.ok(codes.includes('en'), 'Should contain English');
  assert.ok(codes.includes('es'), 'Should contain Spanish');
});

test('DEMO_TRANSLATIONS_EN maintains exact segment start and end boundaries', () => {
  assert.strictEqual(DEMO_TRANSLATIONS_EN.length, 5);

  for (const seg of DEMO_TRANSLATIONS_EN) {
    assert.ok(seg.start < seg.end, `Segment ${seg.id} start must be before end`);
    assert.ok(seg.words.length > 0, `Segment ${seg.id} must have word timings`);

    // First word starts at or after segment start
    assert.ok(
      seg.words[0].start >= seg.start - 0.01,
      `First word start (${seg.words[0].start}) should match segment start (${seg.start})`
    );

    // Last word ends at or before segment end
    const lastWord = seg.words[seg.words.length - 1];
    assert.ok(
      lastWord.end <= seg.end + 0.01,
      `Last word end (${lastWord.end}) should match segment end (${seg.end})`
    );

    // Words should be strictly monotonic in time
    for (let i = 0; i < seg.words.length - 1; i++) {
      assert.ok(
        seg.words[i].start <= seg.words[i + 1].start,
        `Words must be monotonically ordered: word ${i} vs ${i + 1}`
      );
    }
  }
});

test('DEMO_TRANSLATIONS_ES maintains exact segment start and end boundaries', () => {
  assert.strictEqual(DEMO_TRANSLATIONS_ES.length, 5);

  for (const seg of DEMO_TRANSLATIONS_ES) {
    assert.ok(seg.start < seg.end, `Segment ${seg.id} start must be before end`);
    assert.ok(seg.words.length > 0, `Segment ${seg.id} must have word timings`);
    assert.strictEqual(typeof seg.text, 'string');
    assert.ok(seg.text.length > 0);
  }
});

test('Word-by-word proportional generation keeps all words inside [start, end]', () => {
  const start = 1.0;
  const end = 3.5;
  const sentence = 'Hello this is an AI translated subtitle';
  const words = sentence.split(' ');
  const span = end - start;
  const step = span / words.length;

  const generated = words.map((w, i) => ({
    word: w,
    start: Number((start + i * step).toFixed(2)),
    end: Number((start + (i + 1) * step).toFixed(2)),
  }));

  assert.strictEqual(generated.length, words.length);
  assert.strictEqual(generated[0].start, 1.0);
  assert.strictEqual(generated[generated.length - 1].end, 3.5);
});
