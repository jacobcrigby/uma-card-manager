// SPDX-License-Identifier: MIT
// File I/O helpers — port of py/util.py's load_json, save_json, get_file_hash.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';

export async function loadJson<T>(filePath: string): Promise<T> {
  const text = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(text) as T;
}

export async function saveJson(filePath: string, data: unknown): Promise<void> {
  const text = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, text, 'utf-8');
}

export async function getFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return '';
  }
}

export async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}
