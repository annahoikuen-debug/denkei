import { splitJapaneseName } from '@documenso/lib/universal/japanese-name';
import { generateElectronicSealDataUrl } from '@documenso/lib/universal/seal-image';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { CheckIcon, SparklesIcon, TypeIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/utils';

export type SignaturePadTypeProps = {
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange: (_value: string) => void;
};

const JAPANESE_CHAR_REGEX = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/;

const SEAL_COLORS = [
  { id: 'vermilion', name: '朱色', hex: '#dc2626' },
  { id: 'black', name: '黒', hex: '#1f2937' },
  { id: 'navy', name: '藍色', hex: '#1e3a8a' },
] as const;

export const SignaturePadType = ({ className, value, defaultValue = '', onChange }: SignaturePadTypeProps) => {
  const isJapaneseName = JAPANESE_CHAR_REGEX.test(defaultValue);
  const initialSurname = defaultValue ? splitJapaneseName(defaultValue).sei || defaultValue.trim().slice(0, 4) : '田中';

  const [mode, setMode] = useState<'seal' | 'text'>(isJapaneseName ? 'seal' : 'text');
  const [sealName, setSealName] = useState(initialSurname);
  const [sealColor, setSealColor] = useState<string>('#dc2626');
  const [sealPreviewUrl, setSealPreviewUrl] = useState<string>('');
  const [typedText, setTypedText] = useState(defaultValue);

  const $isInitialized = useRef(false);

  // Update seal data URL whenever sealName or sealColor changes
  useEffect(() => {
    if (mode === 'seal') {
      const dataUrl = generateElectronicSealDataUrl(sealName || '印', 256, sealColor);
      setSealPreviewUrl(dataUrl);
      onChange(dataUrl);
    }
  }, [mode, sealName, sealColor, onChange]);

  // Initial setup
  useEffect(() => {
    if (!$isInitialized.current) {
      $isInitialized.current = true;
      if (mode === 'seal') {
        const dataUrl = generateElectronicSealDataUrl(sealName || '印', 256, sealColor);
        setSealPreviewUrl(dataUrl);
        onChange(dataUrl);
      } else if (defaultValue) {
        onChange(defaultValue);
      }
    }
  }, [mode, sealName, sealColor, defaultValue, onChange]);

  const handleModeChange = (newMode: 'seal' | 'text') => {
    setMode(newMode);
    if (newMode === 'seal') {
      const dataUrl = generateElectronicSealDataUrl(sealName || '印', 256, sealColor);
      setSealPreviewUrl(dataUrl);
      onChange(dataUrl);
    } else {
      onChange(typedText || defaultValue);
    }
  };

  return (
    <div className={cn('flex h-full w-full flex-col justify-between p-3 sm:p-4', className)}>
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-center gap-2 pb-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'seal' ? 'default' : 'outline'}
          className={cn('h-8 font-medium text-xs', {
            'bg-primary text-primary-foreground': mode === 'seal',
          })}
          onClick={() => handleModeChange('seal')}
        >
          <SparklesIcon className="mr-1.5 h-3.5 w-3.5" />
          <Trans>電子印影（認印・赤丸印）</Trans>
        </Button>

        <Button
          type="button"
          size="sm"
          variant={mode === 'text' ? 'default' : 'outline'}
          className={cn('h-8 font-medium text-xs', {
            'bg-primary text-primary-foreground': mode === 'text',
          })}
          onClick={() => handleModeChange('text')}
        >
          <TypeIcon className="mr-1.5 h-3.5 w-3.5" />
          <Trans>手書き風テキスト</Trans>
        </Button>
      </div>

      {/* Mode Content */}
      {mode === 'seal' ? (
        <div className="flex flex-1 flex-col items-center justify-center space-y-3">
          {/* Real-time Seal Preview Canvas / Image */}
          <div className="relative flex h-28 w-28 items-center justify-center rounded-xl border border-border/80 bg-background/80 p-2 shadow-inner">
            {sealPreviewUrl ? (
              <img
                src={sealPreviewUrl}
                alt="電子印影プレビュー"
                className="h-24 w-24 select-none object-contain transition-transform hover:scale-105"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-2 border-red-500 border-dashed" />
            )}
          </div>

          {/* Name & Color Controls */}
          <div className="flex w-full max-w-xs flex-col items-center gap-2">
            <div className="flex w-full items-center gap-2">
              <input
                data-testid="signature-pad-type-input"
                type="text"
                maxLength={6}
                value={sealName}
                onChange={(e) => setSealName(e.target.value.trim())}
                placeholder="苗字を入力 (例: 田中)"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-center font-semibold text-foreground text-sm tracking-wide shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Seal Color Picker */}
            <div className="flex items-center gap-2 pt-1 text-muted-foreground text-xs">
              <span>捺印色:</span>
              <div className="flex items-center gap-1.5">
                {SEAL_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border border-border transition-transform',
                      {
                        'scale-110 ring-2 ring-primary ring-offset-1': sealColor === c.hex,
                      },
                    )}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setSealColor(c.hex)}
                  >
                    {sealColor === c.hex && <CheckIcon className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <input
            data-testid="signature-pad-type-input"
            placeholder="お名前を入力してください"
            className="w-full bg-transparent px-4 text-center font-signature text-5xl text-foreground placeholder:text-2xl focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-7xl sm:placeholder:text-4xl"
            value={typedText}
            onChange={(event) => {
              const val = event.target.value.trimStart();
              setTypedText(val);
              onChange(val);
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
