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
