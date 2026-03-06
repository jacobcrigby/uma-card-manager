import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadJson, saveJson, getFileHash, getFileMtime } from '../services/io.js';

// Generate unique temp paths to avoid inter-test collisions.
let tmpFiles: string[] = [];
function tmpPath(name: string): string {
  const p = path.join(os.tmpdir(), `uma-test-${Date.now()}-${name}`);
  tmpFiles.push(p);
  return p;
}

afterEach(async () => {
  for (const f of tmpFiles) {
    await fs.rm(f, { recursive: true, force: true });
  }
  tmpFiles = [];
});

// ── loadJson ──────────────────────────────────────────────────────────────────

describe('loadJson', () => {
  it('parses a valid JSON file', async () => {
    const p = tmpPath('load.json');
    await fs.writeFile(p, JSON.stringify({ hello: 'world' }), 'utf-8');
    const result = await loadJson<{ hello: string }>(p);
    expect(result).toEqual({ hello: 'world' });
  });

  it('parses a JSON array', async () => {
    const p = tmpPath('arr.json');
    await fs.writeFile(p, JSON.stringify([1, 2, 3]), 'utf-8');
    expect(await loadJson<number[]>(p)).toEqual([1, 2, 3]);
  });

  it('rejects when the file does not exist', async () => {
    await expect(loadJson('/tmp/does-not-exist-uma.json')).rejects.toThrow();
  });

  it('rejects on invalid JSON', async () => {
    const p = tmpPath('bad.json');
    await fs.writeFile(p, '{not valid json}', 'utf-8');
    await expect(loadJson(p)).rejects.toThrow();
  });
});

// ── saveJson ──────────────────────────────────────────────────────────────────

describe('saveJson', () => {
  it('creates the file and writes JSON', async () => {
    const p = tmpPath('out.json');
    await saveJson(p, { a: 1 });
    const raw = await fs.readFile(p, 'utf-8');
    expect(JSON.parse(raw)).toEqual({ a: 1 });
  });

  it('uses 2-space indentation', async () => {
    const p = tmpPath('pretty.json');
    await saveJson(p, { a: 1 });
    const raw = await fs.readFile(p, 'utf-8');
    expect(raw).toContain('\n  ');
  });

  it('ends with a trailing newline', async () => {
    const p = tmpPath('nl.json');
    await saveJson(p, { a: 1 });
    const raw = await fs.readFile(p, 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
  });

  it('round-trips data correctly', async () => {
    const p = tmpPath('rt.json');
    const data = { name: 'test', value: 42, arr: [1, 2, 3] };
    await saveJson(p, data);
    expect(await loadJson(p)).toEqual(data);
  });

  it('preserves unicode characters', async () => {
    const p = tmpPath('unicode.json');
    await saveJson(p, { name: 'スペシャルウィーク' });
    const raw = await fs.readFile(p, 'utf-8');
    expect(raw).toContain('スペシャルウィーク');
  });
});

// ── getFileHash ───────────────────────────────────────────────────────────────

describe('getFileHash', () => {
  it('returns a 64-character hex string for an existing file', async () => {
    const p = tmpPath('hash.json');
    await fs.writeFile(p, 'hello', 'utf-8');
    const h = await getFileHash(p);
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for the same content', async () => {
    const p = tmpPath('det.json');
    await fs.writeFile(p, 'hello', 'utf-8');
    expect(await getFileHash(p)).toBe(await getFileHash(p));
  });

  it('returns an empty string for a missing file', async () => {
    expect(await getFileHash('/tmp/nonexistent-uma-file.json')).toBe('');
  });

  it('changes when file content changes', async () => {
    const p = tmpPath('change.json');
    await fs.writeFile(p, 'hello', 'utf-8');
    const h1 = await getFileHash(p);
    await fs.writeFile(p, 'world', 'utf-8');
    const h2 = await getFileHash(p);
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for different content', async () => {
    const p1 = tmpPath('h1.json');
    const p2 = tmpPath('h2.json');
    await fs.writeFile(p1, 'aaa', 'utf-8');
    await fs.writeFile(p2, 'bbb', 'utf-8');
    expect(await getFileHash(p1)).not.toBe(await getFileHash(p2));
  });
});

// ── getFileMtime ──────────────────────────────────────────────────────────────

describe('getFileMtime', () => {
  it('returns a positive number for an existing file', async () => {
    const p = tmpPath('mtime.json');
    await fs.writeFile(p, '{}', 'utf-8');
    const mtime = await getFileMtime(p);
    expect(mtime).toBeGreaterThan(0);
  });

  it('returns 0 for a missing file', async () => {
    expect(await getFileMtime('/tmp/nonexistent-uma-file.json')).toBe(0);
  });
});
