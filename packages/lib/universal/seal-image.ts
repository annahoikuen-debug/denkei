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

/**
 * 日本の電子印影(丸印・認印)の PNG データURLを生成する。
 *
 * @param text 印影に表示する文字(例: "佐藤", "田中", "山田")
 * @param size 出力解像度(px)。既定は 256
 * @param color 捺印色(朱色)。既定は '#dc2626'
 * @returns 'data:image/png;base64,...'
 */
export const generateElectronicSealDataUrl = (text: string, size = 256, color = '#dc2626'): string => {
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
