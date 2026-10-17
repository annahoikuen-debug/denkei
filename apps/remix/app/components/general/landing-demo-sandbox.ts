import { useCallback, useState } from 'react';

export type DemoSigningStep = 'unopened' | 'ready' | 'stamped' | 'completed';

export type DemoSigningSessionState = {
  step: DemoSigningStep;
  sealName: string;
  sealColor: 'vermilion' | 'black' | 'navy';
  sealDataUrl: string;
  stampedAt: Date | null;
  elapsedSeconds: number;
};

export type UseDemoSigningSessionOptions = {
  initialSealName?: string;
  initialSealColor?: 'vermilion' | 'black' | 'navy';
  initialSealDataUrl?: string;
};

export const useDemoSigningSession = (options: UseDemoSigningSessionOptions = {}) => {
  const [step, setStep] = useState<DemoSigningStep>('ready');
  const [sealName, setSealName] = useState<string>(options.initialSealName || '佐藤');
  const [sealColor, setSealColor] = useState<'vermilion' | 'black' | 'navy'>(options.initialSealColor || 'vermilion');
  const [stampedAt, setStampedAt] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [startTime] = useState<number>(() => Date.now());

  const handleStamp = useCallback(() => {
    const now = Date.now();
    const elapsed = Math.max(1, Math.round((now - startTime) / 1000));
    setElapsedSeconds(elapsed > 30 ? 8 : elapsed); // 初回デモとしてリアルな秒数
    setStampedAt(new Date());
    setStep('stamped');
  }, [startTime]);

  const handleComplete = useCallback(() => {
    setStep('completed');
  }, []);

  const handleReset = useCallback(() => {
    setStep('ready');
    setStampedAt(null);
  }, []);

  return {
    step,
    sealName,
    setSealName,
    sealColor,
    setSealColor,
    stampedAt,
    elapsedSeconds,
    handleStamp,
    handleComplete,
    handleReset,
  };
};
