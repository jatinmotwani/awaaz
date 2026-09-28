import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { prompts, relations, sections } from '../src/content/prompts.js';
import { towns } from '../src/content/towns.js';
import { words } from '../src/content/words.js';

const DEVANAGARI = /[ऀ-ॿ]/;

describe('content', () => {
  it('has exactly 50 words with unique ids', () => {
    assert.equal(words.length, 50);
    assert.equal(new Set(words.map((w) => w.id)).size, 50);
  });

  it('shows every prompt in Roman Sindhi, Devanagari and English', () => {
    for (const p of prompts) {
      assert.ok(p.roman && p.en, p.id);
      assert.match(p.deva, DEVANAGARI, `${p.id} should have Devanagari`);
      assert.doesNotMatch(p.roman, DEVANAGARI, `${p.id} roman line should be Latin`);
    }
  });

  it('keeps prompt ids unique and stable-looking', () => {
    const ids = prompts.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
  });

  it('covers the five themes plus a blessing', () => {
    assert.deepEqual(sections.map((s) => s.id), ['vatan', 'safar', 'loliyun', 'rasoi', 'lafz', 'aasees']);
    for (const s of sections) assert.ok(s.maxSeconds > 0 && s.maxSeconds <= 60);
    assert.equal(sections.find((s) => s.id === 'lafz').groups.flatMap((g) => g.ids).length, 50);
  });

  it('knows every relation the database allows', () => {
    assert.deepEqual(Object.keys(relations).sort(), ['dada', 'dadi', 'nana', 'nani', 'other']);
  });

  it('places every town inside Sindh with a unique slug', () => {
    assert.equal(new Set(towns.map((t) => t.slug)).size, towns.length);
    for (const t of towns) {
      assert.ok(t.lat > 23.6 && t.lat < 28.7, `${t.name} latitude`);
      assert.ok(t.lon > 66.6 && t.lon < 71.2, `${t.name} longitude`);
      assert.match(t.slug, /^[a-z0-9-]+$/);
    }
  });
});
