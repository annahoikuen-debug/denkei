/**
 * HTML をサニタイズして XSS ベクトルを除去する。
 *
 * 外部依存関係なしで動作し、ブラウザ／SSR の両環境で安全に動作する。
 * ブロックリストではなく「許可リスト方式」を採用する: 許可されたタグと属性のみを
 * 解析して再構築し、それ以外はすべて除去する。再構築時に属性値をいったんデコード
 * してから再エスケープするため、ネストしたタグ構築による再合成や、エンティティを
 * 使った属性値からの脱出（breakout）も成立しない。
 *
 * 許容する要素: b, strong, i, em, u, br, p, span, div, h1-h6, ul, ol, li, a
 * 中身ごと除去する要素: script, style, iframe, object, embed, applet, noscript,
 *                       template, svg, math, button, select, textarea
 * 許容する属性: href, title, target, rel, class, style, dir, lang
 *               （href は http / https / mailto / tel と相対 URL のみ許可）
 */
const AMPERSAND = String.fromCharCode(38);

const ENTITY_AMP = `${AMPERSAND}amp;`;
const ENTITY_QUOT = `${AMPERSAND}quot;`;
const ENTITY_LT = `${AMPERSAND}lt;`;
const ENTITY_GT = `${AMPERSAND}gt;`;

const ALLOWED_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'br',
  'p',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
]);

const ALLOWED_ATTRIBUTES = new Set(['href', 'title', 'target', 'rel', 'class', 'style', 'dir', 'lang']);

const ALLOWED_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

const STRIP_WITH_CONTENT_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'applet',
  'noscript',
  'template',
  'svg',
  'math',
  'button',
  'select',
  'textarea',
];

const MAX_PASSES = 5;

const NAMED_ENTITIES: Record<string, string> = {
  amp: AMPERSAND,
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  colon: ':',
  semicolon: ';',
  sol: '/',
  bsol: '\\',
  period: '.',
  tab: '\t',
  newline: '\n',
  lpar: '(',
  rpar: ')',
  equals: '=',
  quest: '?',
};

/**
 * 属性値を一度だけデコードするためのエンティティデコード。
 * 数値参照（106 / x6a 形式）と、スキーム偽装に悪用されやすい一部の名前付き参照を扱う。
 */
const decodeEntities = (value: string): string =>
  value
    .replace(/&#x([0-9a-fA-F]+);?/g, (match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&#(\d+);?/g, (match, dec: string) => {
      const codePoint = Number.parseInt(dec, 10);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(new RegExp(`${AMPERSAND}([a-zA-Z][a-zA-Z0-9]*);`, 'g'), (match, name: string) =>
      Object.hasOwn(NAMED_ENTITIES, name.toLowerCase()) ? NAMED_ENTITIES[name.toLowerCase()] : match,
    );

/**
 * デコード済みの URL 値が安全かどうかを判定する。
 * タブ・改行・制御文字を除去してから判定する（tab 挿入によるスキーム偽装対策）。
 */
const isSafeUrl = (decodedValue: string): boolean => {
  // URL パーサが除去するタブ・改行等の空白文字を取り除いてから判定する
  const normalized = decodedValue.replace(/\s/g, '').toLowerCase();

  if (normalized === '') {
    return true;
  }

  if (normalized.startsWith('#') || normalized.startsWith('/')) {
    return true;
  }

  if (ALLOWED_URL_PROTOCOLS.some((protocol) => normalized.startsWith(protocol))) {
    return true;
  }

  // 許可リスト外のスキーム（コロンを含む URL）はすべて拒否する
  return !normalized.includes(':');
};

const TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

const ATTRIBUTE_PATTERN = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const escapeAttributeValue = (value: string): string =>
  value.replace(/[&"<>]/g, (char) => {
    if (char === AMPERSAND) {
      return ENTITY_AMP;
    }

    if (char === '"') {
      return ENTITY_QUOT;
    }

    if (char === '<') {
      return ENTITY_LT;
    }

    return ENTITY_GT;
  });

const rebuildOpeningTag = (tagName: string, attributesRaw: string): string => {
  if (tagName === 'br') {
    return '<br>';
  }

  const attributes: string[] = [];
  let hasHref = false;
  let hasTarget = false;
  let hasRel = false;

  for (const match of attributesRaw.matchAll(ATTRIBUTE_PATTERN)) {
    const attributeName = match[1].toLowerCase();

    if (!ALLOWED_ATTRIBUTES.has(attributeName)) {
      continue;
    }

    const value = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');

    if (attributeName === 'href' && !isSafeUrl(value)) {
      continue;
    }

    if (attributeName === 'href') {
      hasHref = true;
    }

    if (attributeName === 'target') {
      hasTarget = true;
    }

    if (attributeName === 'rel') {
      hasRel = true;
    }

    attributes.push(`${attributeName}="${escapeAttributeValue(value)}"`);
  }

  if (hasHref && hasTarget && !hasRel) {
    attributes.push('rel="noopener noreferrer"');
  }

  return attributes.length > 0 ? `<${tagName} ${attributes.join(' ')}>` : `<${tagName}>`;
};

const removeComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, '');

const removeDangerousTagBlocks = (html: string): string => {
  let result = html;

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const blockPattern = new RegExp(
      `<(${STRIP_WITH_CONTENT_TAGS.join('|')})(?:\\s[^>]*)?>[\\s\\S]*?<\\/\\1\\s*>`,
      'gi',
    );
    const next = result.replace(blockPattern, '');

    if (next === result) {
      break;
    }

    result = next;
  }

  return result;
};

const sanitizeOnce = (html: string): string =>
  html.replace(TAG_PATTERN, (match, tagNameRaw: string, attributesRaw: string, _selfClosing: string) => {
    const tagName = tagNameRaw.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    if (match.startsWith('</')) {
      return `</${tagName}>`;
    }

    return rebuildOpeningTag(tagName, attributesRaw);
  });

export const sanitizeBannerContent = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let result = html.trim();

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let next = removeComments(result);
    next = removeDangerousTagBlocks(next);
    next = sanitizeOnce(next).trim();

    if (next === result) {
      break;
    }

    result = next;
  }

  return result;
};
