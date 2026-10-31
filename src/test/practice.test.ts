import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('public/studio-suite.js', 'utf8');
const core = source.split('// PRACTICE_CORE_START')[1]?.split('// PRACTICE_CORE_END')[0];
if (!core) throw new Error('Practice core missing');
const { practicePrompt, practiceIdentity, gradePractice } = new Function(core + ';return {practicePrompt,practiceIdentity,gradePractice}')();

describe('REA practice evaluation', () => {
  const task = { question: 'Trace my code', coaching: 'Read callers first', phrases: 'private-answer-value', path: 'src/save.ts', quote: 'return stored;' };
  it('keeps local answer keys out of agent messages', () => {
    const prompt = practicePrompt(task);
    expect(prompt).toContain('Trace my code');
    expect(prompt).toContain('Read callers first');
    expect(prompt).not.toContain('private-answer-value');
    expect(prompt).not.toContain('return stored;');
    expect(prompt).not.toContain('src/save.ts');
  });
  it('requires verified evidence from the specified code file', () => {
    expect(gradePractice(task, 'private-answer-value', [{ verified: false, path: task.path, quote: task.quote }]).score).toBe(50);
    expect(gradePractice(task, 'private-answer-value', [{ verified: true, path: 'other.ts', quote: task.quote }]).score).toBe(50);
    expect(gradePractice(task, 'private-answer-value', [{ verified: true, path: task.path, quote: task.quote }]).score).toBe(100);
  });
  it('ties challenges to code contents, independent of file order', () => {
    const files = [{ path: 'a.ts', size: 20, hash: 'abc' }, { path: 'b.ts', size: 12, hash: 'def' }];
    expect(practiceIdentity(files)).toBe(practiceIdentity([...files].reverse()));
    expect(practiceIdentity(files)).not.toBe(practiceIdentity([{ ...files[0], hash: 'changed' }, files[1]]));
  });
});