#!/usr/bin/env node
/**
 * フェーズ1 ステップ6: ja 翻訳漏れ(msgstr 空欄)検知スクリプト
 *
 * usage:
 *   node scripts/check-translations.mjs            # 未訳一覧を出力し、未訳があれば exit 1
 *   node scripts/check-translations.mjs --list     # 未訳一覧の出力のみ(exit code 0)
 *
 * 対象: packages/lib/translations/ja/web.po
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LIST_ONLY = process.argv.includes('--list');

const PO_PATH = path.join(__dirname, '../packages/lib/translations/ja/web.po');

const poContent = fs.readFileSync(PO_PATH, 'utf8');

/**
 * 簡易 PO パーサ: msgid / msgstr / msgid_plural / msgstr[N] のペアを抽出する。
 * 複数行文字列("", "..." の連結)にも対応。
 */
const parsePo = (content) => {
  const entries = [];
  let current = null;
  let currentField = null; // 'msgid' | 'msgid_plural' | 'msgstr' | 'msgstr[N]' | null

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith('msgid ')) {
      if (current) {
        entries.push(current);
      }
      current = { msgid: '', msgstr: '', plurals: [] };
      currentField = 'msgid';
      current.msgid += extractString(line.slice('msgid '.length));
      continue;
    }

    if (line.startsWith('msgid_plural ')) {
      if (current) {
        current.msgid_plural = extractString(line.slice('msgid_plural '.length));
        currentField = 'msgid_plural';
      }
      continue;
    }

    if (line.startsWith('msgstr ')) {
      currentField = 'msgstr';
      current.msgstr += extractString(line.slice('msgstr '.length));
      continue;
    }

    const msgstrPluralMatch = line.match(/^msgstr\[(\d+)\]\s*(.*)$/);
    if (msgstrPluralMatch && current) {
      const index = parseInt(msgstrPluralMatch[1], 10);
      currentField = `msgstr[${index}]`;
      current.plurals[index] = extractString(msgstrPluralMatch[2]);
      continue;
    }

    if (line.startsWith('"') && current && currentField) {
      const str = extractString(line);
      if (currentField === 'msgid') {
        current.msgid += str;
      } else if (currentField === 'msgid_plural') {
        current.msgid_plural = (current.msgid_plural ?? '') + str;
      } else if (currentField === 'msgstr') {
        current.msgstr += str;
      } else if (currentField.startsWith('msgstr[')) {
        const index = parseInt(currentField.slice('msgstr['.length, -1), 10);
        current.plurals[index] = (current.plurals[index] ?? '') + str;
      }
      continue;
    }

    // 空行 or コメントでエントリ終了
    if (line === '' || line.startsWith('#')) {
      if (current && (currentField === 'msgstr' || currentField?.startsWith('msgstr['))) {
        entries.push(current);
        current = null;
        currentField = null;
      }
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
};

const extractString = (token) => {
  const match = token.match(/"((?:[^"\\]|\\.)*)"/);

  if (!match) {
    return '';
  }

  return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
};

const entries = parsePo(poContent);

// msgid が空のヘッダーエントリは除外。複数形の場合は全 plural インデックスが埋まっているか検査。
const untranslated = entries.filter((e) => {
  if (e.msgid === '') {
    return false;
  }

  if (e.msgid_plural !== undefined) {
    return e.plurals.length === 0 || e.plurals.some((str) => !str || str.trim() === '');
  }

  return e.msgstr.trim() === '';
});

if (untranslated.length === 0) {
  console.log('[check-translations] ja 翻訳漏れは 0 件です ✅');
  process.exit(0);
}

console.log(`[check-translations] ja 未訳エントリが ${untranslated.length} 件あります:`);

for (const entry of untranslated) {
  console.log(`  - msgid: ${JSON.stringify(entry.msgid)}`);
}

if (LIST_ONLY) {
  process.exit(0);
}

console.error(
  '\n[check-translations] 未訳を解消するか、意図的に未訳とする場合はこのスクリプトの除外リストを更新してください。',
);
process.exit(1);
