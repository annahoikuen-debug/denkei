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
 * 簡易 PO パーサ: msgid / msgstr のペアを抽出する。
 * 複数行文字列("", "..." の連結)にも対応。
 */
const parsePo = (content) => {
    const entries = [];
    let current = null;
    let currentField = null; // 'msgid' | 'msgstr' | null

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (line.startsWith('msgid ')) {
            if (current) {
                entries.push(current);
            }
            current = { msgid: '', msgstr: '' };
            currentField = 'msgid';
            current.msgid += extractString(line.slice('msgid '.length));
            continue;
        }

        if (line.startsWith('msgstr ')) {
            currentField = 'msgstr';
            current.msgstr += extractString(line.slice('msgstr '.length));
            continue;
        }

        if (line.startsWith('"') && current && currentField) {
            current[currentField] += extractString(line);
            continue;
        }

        // 空行 or コメントでエントリ終了
        if (line === '' || line.startsWith('#')) {
            if (current && currentField === 'msgstr') {
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

// msgid が空のヘッダーエントリは除外
const untranslated = entries.filter((e) => e.msgid !== '' && e.msgstr.trim() === '');

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

console.error('\n[check-translations] 未訳を解消するか、意図的に未訳とする場合はこのスクリプトの除外リストを更新してください。');
process.exit(1);
