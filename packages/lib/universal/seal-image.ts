/**
 * フェーズ1 ステップ25: 印影(会社印)画像の円形クロップ処理
 *
 * 透過 PNG アップロード画像を円形にマスクするための
 * クライアント/サーバー共通ユーティリティ。
 */

/**
 * 正方形の画像データ URL を円形マスクしたデータ URL に変換する。
 * ブラウザ環境(canvas)を利用するためクライアントサイドでの使用を想定。
 *
 * @param imageDataUrl 透過 PNG のデータ URL
 * @param size 出力サイズ(px)。既定は 256
 */
export const cropImageToCircle = async (imageDataUrl: string, size = 256): Promise<string> => {
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('印影画像の読み込みに失敗しました'));
    img.src = imageDataUrl;
  });

  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('canvas context を取得できませんでした');
  }

  // 円形クリップ
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // 画像を中央フィット(正方形化: 短辺基準)
  const minSide = Math.min(img.width, img.height);
  const sx = (img.width - minSide) / 2;
  const sy = (img.height - minSide) / 2;

  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

  return canvas.toDataURL('image/png');
};

/**
 * 印影レンダリング用の CSS スタイル(border-radius で円形化)を返す。
 * サーバーサイド PDF 描画でも使用できる形式。
 */
export const sealBorderStyle = {
  borderRadius: '50%',
  objectFit: 'contain' as const,
};

export type SealType = 'circle' | 'square' | 'representative';

export type SealOptions = {
  type?: SealType;
  /** 代表印の内円タイトル (例: '代表取締役印') */
  innerTitle?: string;
};

/**
 * 日本の電子印影(丸印・認印・会社角印・会社代表印)の PNG データURLを生成する。
 *
 * @param text 印影に表示する文字(例: "佐藤", "株式会社デンケイ")
 * @param size 出力解像度(px)。既定は 256
 * @param color 捺印色(朱色)。既定は '#dc2626'
 * @param options 印影種別オプション (type: 'circle' | 'square' | 'representative')
 * @returns 'data:image/png;base64,...'
 */
export const generateElectronicSealDataUrl = (
  text: string,
  size = 256,
  color = '#dc2626',
  options?: SealOptions,
): string => {
  if (typeof document === 'undefined') {
    return '';
  }

  const sealType = options?.type || 'circle';

  if (sealType === 'square') {
    return generateCompanySquareSealDataUrl(text, size, color);
  }

  if (sealType === 'representative') {
    return generateCompanyRepresentativeSealDataUrl(text, options?.innerTitle, size, color);
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = size / 2 - 8;
  const outerWidth = Math.max(4, Math.round(size * 0.035));

  // Outer circle
  ctx.strokeStyle = color;
  ctx.lineWidth = outerWidth;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring for authentic Japanese Hanko look
  ctx.lineWidth = Math.max(1.5, Math.round(size * 0.012));
  ctx.beginPath();
  ctx.arc(center, center, radius - Math.round(size * 0.04), 0, Math.PI * 2);
  ctx.stroke();

  const trimmed = text.trim();
  if (!trimmed) {
    return canvas.toDataURL('image/png');
  }

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontFamilies = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

  if (trimmed.length === 1) {
    ctx.font = `bold ${Math.round(size * 0.52)}px ${fontFamilies}`;
    ctx.fillText(trimmed, center, center);
  } else if (trimmed.length === 2) {
    // 2文字 (例: 佐藤): 上下に縦配置
    const fontSize = Math.round(size * 0.38);
    ctx.font = `bold ${fontSize}px ${fontFamilies}`;
    ctx.fillText(trimmed[0], center, center - size * 0.2);
    ctx.fillText(trimmed[1], center, center + size * 0.2);
  } else if (trimmed.length === 3) {
    // 3文字 (例: 佐々木): 上中下に縦配置
    const fontSize = Math.round(size * 0.28);
    ctx.font = `bold ${fontSize}px ${fontFamilies}`;
    ctx.fillText(trimmed[0], center, center - size * 0.26);
    ctx.fillText(trimmed[1], center, center);
    ctx.fillText(trimmed[2], center, center + size * 0.26);
  } else if (trimmed.length === 4) {
    // 4文字 (例: 山田太郎): 伝統的な2列配置 (右列: 姓, 左列: 名)
    const fontSize = Math.round(size * 0.32);
    ctx.font = `bold ${fontSize}px ${fontFamilies}`;
    const colRight = center + size * 0.2;
    const colLeft = center - size * 0.2;
    const rowTop = center - size * 0.2;
    const rowBottom = center + size * 0.2;
    ctx.fillText(trimmed[0], colRight, rowTop);
    ctx.fillText(trimmed[1], colRight, rowBottom);
    ctx.fillText(trimmed[2], colLeft, rowTop);
    ctx.fillText(trimmed[3], colLeft, rowBottom);
  } else {
    // 5文字以上
    const fontSize = Math.max(16, Math.round(size * 0.22));
    ctx.font = `bold ${fontSize}px ${fontFamilies}`;
    ctx.fillText(trimmed, center, center);
  }

  return canvas.toDataURL('image/png');
};

/**
 * 会社角印（社印・四角印）のデータURLを生成する。
 * 日本の商慣習に即した二重枠＋縦書きレイアウト。
 */
export const generateCompanySquareSealDataUrl = (companyName: string, size = 256, color = '#dc2626'): string => {
  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.clearRect(0, 0, size, size);

  // 枠線の余白と二重枠
  const padding = 10;
  const innerGap = 6;
  const outerWidth = Math.max(4, Math.round(size * 0.035));
  const innerWidth = Math.max(1.5, Math.round(size * 0.012));

  ctx.strokeStyle = color;

  // 外枠（正方形）
  ctx.lineWidth = outerWidth;
  ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);

  // 内枠（正方形）
  ctx.lineWidth = innerWidth;
  const innerOffset = padding + outerWidth / 2 + innerGap;
  const innerSize = size - innerOffset * 2;
  ctx.strokeRect(innerOffset, innerOffset, innerSize, innerSize);

  let raw = companyName.trim() || '当社';
  // 「之印」または「印」を自動付与して角印の格式を高める
  if (!raw.endsWith('印') && !raw.endsWith('之印')) {
    raw = `${raw}之印`;
  }

  const fontFamilies = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 縦書き列分割（文字数に応じて2〜3列）
  const chars = Array.from(raw);
  const cols = chars.length > 6 ? 3 : 2;
  const charsPerCol = Math.ceil(chars.length / cols);
  const colWidth = innerSize / cols;
  const rowHeight = innerSize / charsPerCol;
  const fontSize = Math.min(rowHeight * 0.8, colWidth * 0.85);

  ctx.font = `bold ${Math.round(fontSize)}px ${fontFamilies}`;

  // 日本の伝統的な角印配置: 右列から左列へ
  for (let i = 0; i < chars.length; i++) {
    const colIdx = Math.floor(i / charsPerCol); // 0: 右列, 1: 中/左列...
    const rowIdx = i % charsPerCol;

    const x = innerOffset + innerSize - (colIdx + 0.5) * colWidth;
    const y = innerOffset + (rowIdx + 0.5) * rowHeight;
    ctx.fillText(chars[i], x, y);
  }

  return canvas.toDataURL('image/png');
};

/**
 * 会社代表印・実印（二重丸構造）のデータURLを生成する。
 * 外周に会社名、内円に役職名（代表取締役印）を配置。
 */
export const generateCompanyRepresentativeSealDataUrl = (
  companyName: string,
  innerTitle = '代表取締役印',
  size = 256,
  color = '#dc2626',
): string => {
  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const outerRadius = size / 2 - 8;
  const innerRadius = size * 0.28;
  const fontFamilies = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

  ctx.strokeStyle = color;

  // 外円
  ctx.lineWidth = Math.max(3.5, Math.round(size * 0.03));
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 内円
  ctx.lineWidth = Math.max(2, Math.round(size * 0.015));
  ctx.beginPath();
  ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. 内円の文字（例: 代表取締役印）
  const innerChars = Array.from((innerTitle || '代表取締役印').trim());
  if (innerChars.length <= 6) {
    // 2列で縦書き
    const half = Math.ceil(innerChars.length / 2);
    const colRightChars = innerChars.slice(0, half);
    const colLeftChars = innerChars.slice(half);

    const innerFontSize = Math.round(innerRadius * 0.42);
    ctx.font = `bold ${innerFontSize}px ${fontFamilies}`;

    colRightChars.forEach((ch, idx) => {
      const y = center - innerRadius * 0.45 + (idx / Math.max(1, half - 1)) * innerRadius * 0.9;
      ctx.fillText(ch, center + innerRadius * 0.38, y);
    });

    colLeftChars.forEach((ch, idx) => {
      const y = center - innerRadius * 0.45 + (idx / Math.max(1, colLeftChars.length - 1)) * innerRadius * 0.9;
      ctx.fillText(ch, center - innerRadius * 0.38, y);
    });
  } else {
    ctx.font = `bold ${Math.round(innerRadius * 0.35)}px ${fontFamilies}`;
    ctx.fillText(innerChars.join(''), center, center);
  }

  // 2. 外周の円弧テキスト（会社名）
  const companyChars = Array.from((companyName || '株式会社〇〇').trim());
  const charCount = companyChars.length;
  const textRadius = (outerRadius + innerRadius) / 2;
  const arcFontSize = Math.min(18, Math.round(size * 0.08));
  ctx.font = `bold ${arcFontSize}px ${fontFamilies}`;

  // 時計回りに上部から配置
  const startAngle = -Math.PI / 2 - 0.2;
  const totalAngle = Math.PI * 1.7;
  const step = totalAngle / Math.max(1, charCount);

  companyChars.forEach((ch, idx) => {
    const angle = startAngle + idx * step;
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    ctx.translate(0, -textRadius);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
};
