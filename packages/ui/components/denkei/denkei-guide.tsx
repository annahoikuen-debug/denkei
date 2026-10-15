import type React from 'react';

export type DenkeiAvatarProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'guide' | 'success' | 'alert' | 'secure';
  className?: string;
};

/**
 * 弁慶モチーフの守護キャラクター「デンケイ」SVGアバター
 * 3頭身のちびキャラ・武者兜（デジタルヘッドギア）・契約の巻物と鍵を装備
 */
export const DenkeiAvatar: React.FC<DenkeiAvatarProps> = ({ size = 'md', variant = 'guide', className = '' }) => {
  const sizePx = {
    sm: 36,
    md: 56,
    lg: 80,
    xl: 120,
  }[size];

  const primaryAccent = {
    guide: '#3B82F6', // Blue
    success: '#10B981', // Emerald
    alert: '#F59E0B', // Amber
    secure: '#6366F1', // Indigo
  }[variant];

  return (
    <div
      className={`relative inline-flex shrink-0 select-none items-center justify-center rounded-full shadow-sm ${className}`}
      style={{ width: sizePx, height: sizePx }}
      role="img"
      aria-label="デンケイ - 電子契約の守護キャラクター"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-sm"
      >
        {/* 背景円・光彩オーラ */}
        <circle cx="50" cy="50" r="48" fill={primaryAccent} fillOpacity="0.12" stroke={primaryAccent} strokeWidth="3" />

        {/* 弁慶の頭巾・兜 (ベース) */}
        <path d="M24 45C24 28 35 16 50 16C65 16 76 28 76 45C76 60 74 72 74 72H26C26 72 24 60 24 45Z" fill="#1E293B" />

        {/* 額のデジタル前立 (前立て/三日月＋キーマーク) */}
        <path d="M42 20C46 14 54 14 58 20L62 25H38L42 20Z" fill="#F59E0B" />
        <circle cx="50" cy="23" r="3.5" fill="#FEF3C7" />

        {/* 弁慶の白い鉢巻 */}
        <rect x="25" y="32" width="50" height="9" rx="4" fill="#F8FAFC" />
        <circle cx="50" cy="36.5" r="3" fill={primaryAccent} />

        {/* 顔 */}
        <rect x="30" y="38" width="40" height="34" rx="14" fill="#FED7AA" />

        {/* 頼もしい眉毛 */}
        <path d="M34 45L44 48" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M66 45L56 48" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />

        {/* つぶらで真剣な瞳 */}
        <circle cx="39" cy="53" r="4" fill="#0F172A" />
        <circle cx="40.5" cy="51.5" r="1.5" fill="#FFFFFF" />

        <circle cx="61" cy="53" r="4" fill="#0F172A" />
        <circle cx="62.5" cy="51.5" r="1.5" fill="#FFFFFF" />

        {/* ほっぺ（親しみやすさ） */}
        <circle cx="34" cy="58" r="3" fill="#FCA5A5" fillOpacity="0.7" />
        <circle cx="66" cy="58" r="3" fill="#FCA5A5" fillOpacity="0.7" />

        {/* 表情別の口元 */}
        {variant === 'success' ? (
          <path d="M44 59Q50 67 56 59" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" fill="#DC2626" />
        ) : variant === 'alert' ? (
          <circle cx="50" cy="62" r="3" fill="#991B1B" />
        ) : (
          <path d="M45 61Q50 65 55 61" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* 顎ひげ（弁慶らしさのチャームポイント） */}
        <path d="M47 69L50 72L53 69" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />

        {/* 手前の七つ道具: 電子契約の黄金鍵 / 認印 */}
        <g transform="translate(62, 58)">
          <circle cx="12" cy="12" r="11" fill="#FFFFFF" stroke={primaryAccent} strokeWidth="2.5" />
          {/* デジタル印鑑 / チェックマーク */}
          {variant === 'success' ? (
            <path
              d="M7 12L10.5 15.5L17 9"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path d="M10 8H14V14L16 16V18H8V16L10 14V8Z" fill={primaryAccent} />
          )}
        </g>
      </svg>
    </div>
  );
};

export type DenkeiCalloutProps = {
  title?: string;
  message: string | React.ReactNode;
  variant?: 'guide' | 'success' | 'alert' | 'secure';
  className?: string;
};

/**
 * デンケイの吹き出しガイダンスカード
 */
export const DenkeiCallout: React.FC<DenkeiCalloutProps> = ({
  title = 'デンケイの安心ガイド',
  message,
  variant = 'guide',
  className = '',
}) => {
  const borderColors = {
    guide: 'border-blue-200 bg-blue-50/70 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200',
    success:
      'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200',
    alert:
      'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200',
    secure:
      'border-indigo-200 bg-indigo-50/70 text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200',
  }[variant];

  return (
    <div
      className={`relative flex items-start gap-3 rounded-lg border p-3.5 transition-all ${borderColors} ${className}`}
    >
      <DenkeiAvatar size="md" variant={variant} />
      <div className="min-w-0 flex-1 text-sm">
        {title && <h5 className="mb-1 font-semibold text-xs uppercase tracking-wider opacity-90">{title}</h5>}
        <div className="text-xs leading-relaxed sm:text-sm">{message}</div>
      </div>
    </div>
  );
};
