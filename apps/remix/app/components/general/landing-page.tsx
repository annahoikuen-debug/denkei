import { buildCounterpartyPrintHtml } from '@documenso/lib/universal/counterparty-guide';
import { generateElectronicSealDataUrl } from '@documenso/lib/universal/seal-image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@documenso/ui/primitives/accordion';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import {
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  HardHat,
  HeartHandshake,
  Laptop,
  Lock,
  Printer,
  Receipt,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stamp,
  TrendingDown,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ComplianceDiagnosticCard } from './compliance-diagnostic-card';
import { LandingDemoViewer } from './landing-demo-viewer';

export function LandingPage() {
  const [searchParams] = useSearchParams();
  const refSource = searchParams.get('ref');

  const [sealName, setSealName] = useState('佐藤');
  const [sealColor, setSealColor] = useState<'vermilion' | 'black' | 'navy'>('vermilion');
  const [isAnnual, setIsAnnual] = useState(false);
  const [monthlyContracts, setMonthlyContracts] = useState<number>(30);
  const [includeRegisteredMail, setIncludeRegisteredMail] = useState<boolean>(false);

  const sealColorHex = sealColor === 'black' ? '#1f2937' : sealColor === 'navy' ? '#1e3a8a' : '#dc2626';

  const sealDataUrl = useMemo(() => {
    return generateElectronicSealDataUrl(sealName.trim() || '印', 256, sealColorHex);
  }, [sealName, sealColorHex]);

  // コスト削減シミュレーション計算
  // 試算条件:
  // - 印紙代平均: 400円
  // - 製本・印刷代: 200円
  // - 普通郵便代: 110円 (定形郵便50g以内)
  // - 特定記録郵便（オプション）: +210円
  // - 契約書1通あたりの事務処理時間: 12分
  const stampDutyAvg = 400; // 印紙代平均
  const bindingCost = 200; // 製本代・印刷代
  const standardPostage = 110; // 普通郵便代
  const registeredMailFee = 210; // 特定記録郵便代 (オプション)

  const paperCostPerContract =
    stampDutyAvg + bindingCost + standardPostage + (includeRegisteredMail ? registeredMailFee : 0);

  const annualPaperCost = monthlyContracts * paperCostPerContract * 12;

  const denkeiAnnualCost = useMemo(() => {
    if (monthlyContracts <= 3) {
      return 0;
    }
    if (monthlyContracts <= 100) {
      return 2980 * 12; // 35,760
    }
    return 4980 * 12; // 59,760
  }, [monthlyContracts]);

  const annualSavings = Math.max(0, annualPaperCost - denkeiAnnualCost);

  // 1通あたり12分の短縮 (12分 = 0.2時間)
  const minutesPerContract = 12;
  const annualHoursSaved = Math.round(monthlyContracts * (minutesPerContract / 60) * 12);

  const denkeiComment = useMemo(() => {
    if (monthlyContracts <= 5) {
      return `月数件でも、年約${Math.round(annualSavings / 10000)}万円の経費と約${annualHoursSaved}時間の作業が丸ごと浮くでござる！`;
    }
    if (monthlyContracts <= 20) {
      return `年間で【約${Math.round(annualSavings / 10000)}万円】の経費と【約${annualHoursSaved}時間】の作業から解放されるでござる！`;
    }
    if (monthlyContracts <= 50) {
      return `なんと年間【約${Math.round(annualSavings / 10000)}万円】もの現金を純粋節約！ 浮いた約${annualHoursSaved}時間を本業の商談に集中できるでござる！`;
    }
    return `驚異の年間【約${Math.round(annualSavings / 10000)}万円】削減＆【約${annualHoursSaved}時間】の時短！ 経営効率が一変するでござる！`;
  }, [monthlyContracts, annualSavings, annualHoursSaved]);

  const standardPrice = isAnnual ? '2,480' : '2,980';
  const businessPrice = isAnnual ? '3,980' : '4,980';

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-red-500/20 selection:text-red-900 dark:selection:text-red-100">
      {/* ===== グローバルヘッダー ===== */}
      <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-x-3">
            {/* デンケイアバターブランドマーク */}
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-500/20 transition-transform group-hover:scale-105">
              <img src="/images/denkei-mascot-circle.webp" alt="デンケイ" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-foreground text-xl leading-tight tracking-tight sm:text-2xl">
                  デンケイ
                </span>
                <span className="rounded bg-red-600 px-1.5 py-0.5 font-black text-[10px] text-white uppercase tracking-wider">
                  電子契約
                </span>
              </div>
              <span className="font-medium text-muted-foreground text-xs">中小企業特化・月額2,980円（100件定額）</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-x-8 font-semibold text-base text-muted-foreground md:flex">
            <a href="#mascot" className="transition-colors hover:text-foreground">
              デンケイ
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              六つ道具
            </a>
            <a href="#compliance-check" className="font-bold transition-colors hover:text-red-600">
              電帳法診断
            </a>
            <a href="#simulator" className="transition-colors hover:text-foreground">
              コスト試算
            </a>
            <a href="#use-cases" className="transition-colors hover:text-foreground">
              活用事例
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              料金プラン
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-x-4">
            <Link to="/signin">
              <Button variant="ghost" size="lg" className="font-bold text-base">
                ログイン
              </Button>
            </Link>
            <Link to="/signup">
              <Button
                size="lg"
                className="h-11 bg-red-600 px-5 font-bold text-base text-white shadow-lg shadow-red-600/25 hover:bg-red-700"
              >
                無料ではじめる
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== ヒーローセクション（超大型見出し・低認知負荷） ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-500/5 via-amber-500/5 to-transparent pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
          {/* 締結完了メール経由の特別バナー */}
          {refSource === 'completed_email' && (
            <div className="fade-in mb-6 inline-flex animate-in items-center gap-2 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 px-5 py-2 font-black text-emerald-800 text-sm shadow dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>締結完了お疲れ様でした！貴社も月3件まで0円で電子契約をはじめられます</span>
            </div>
          )}

          {/* キャッチバッジ */}
          <div className="mb-6 inline-flex items-center gap-x-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 font-bold text-red-700 text-sm shadow-sm sm:text-base dark:text-red-400">
            <Sparkles className="h-4 w-4" />
            <span>外部タイムスタンプ不要・国税庁公認の事務処理規程つき</span>
          </div>

          {/* 超大型メインコピー */}
          <h1 className="max-w-5xl font-black text-4xl text-foreground leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl">
            中小企業のための、
            <br />
            一番
            <span className="text-red-600 underline decoration-4 decoration-red-500/40 decoration-wavy">
              割り切れる
            </span>
            電子契約。
          </h1>

          {/* ぱっと目に入る3大要約（大見出し） */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 font-bold text-base text-foreground sm:gap-6 sm:text-xl">
            <span className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
              <Check className="h-5 w-5 flex-shrink-0 text-red-600" /> 月額 2,980円（100件定額）
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
              <Check className="h-5 w-5 flex-shrink-0 text-primary" /> 相手方はスマホ10秒押印
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
              <Check className="h-5 w-5 flex-shrink-0 text-emerald-600" /> 電帳法 事務処理規程キット同梱
            </span>
          </div>

          {/* 大型CTAボタン */}
          <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-14 w-full bg-red-600 px-10 font-extrabold text-lg text-white shadow-2xl shadow-red-600/30 transition-all hover:scale-105 hover:bg-red-700 active:scale-95 sm:h-16 sm:w-auto sm:px-14 sm:text-xl"
              >
                無料ではじめる（月3件まで0円）
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </div>

          <p className="mt-3 font-medium text-muted-foreground text-xs sm:text-sm">
            ※ クレジットカード登録不要・1分で登録完了
          </p>

          {/* ===== ヒーロー内 インタラクティブ・ショーケース（マスコット ＆ 認印体験） ===== */}
          <div className="mt-14 grid w-full grid-cols-1 items-stretch gap-8 text-left lg:grid-cols-12">
            {/* 左側：デンケイ カード */}
            <div
              id="mascot"
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-red-500/30 bg-card p-6 shadow-2xl sm:p-8 lg:col-span-7"
            >
              {/* 装飾の背景グラデーション */}
              <div className="pointer-events-none absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

              {/* 吹き出し風メッセージ */}
              <div className="relative z-10 mb-4 inline-flex items-start gap-3 rounded-2xl border border-red-500/40 bg-background/95 p-4 shadow-lg backdrop-blur-sm">
                <img
                  src="/images/denkei-mascot-circle.webp"
                  alt="デンケイ アイコン"
                  className="h-10 w-10 flex-shrink-0 rounded-full border border-red-500/30"
                />
                <div className="text-xs sm:text-sm">
                  <div className="mb-0.5 font-black text-red-600">デンケイ</div>
                  <p className="font-bold text-foreground leading-snug">
                    「紙とハンコの面倒、ぜんぶ拙者にお任せあれ！
                    相手方はスマホ10秒で押印。外部タイムスタンプ不要で電帳法も鉄壁ガードでござる！」
                  </p>
                </div>
              </div>

              {/* マスコットビジュアル */}
              <div className="relative overflow-hidden rounded-2xl border border-border bg-neutral-900/10 shadow-inner">
                <img
                  src="/images/denkei-mascot.webp"
                  alt="デンケイ"
                  className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-[11px] text-red-400 tracking-wider">DENKEI GUARDIAN</div>
                      <div className="font-black text-lg sm:text-xl">デンケイの「六つ道具」</div>
                    </div>
                    <span className="rounded-full bg-red-600 px-3 py-1 font-black text-xs shadow-md">
                      電帳法・鉄壁防御
                    </span>
                  </div>
                </div>
              </div>

              {/* デンケイの守護タグ */}
              <div className="mt-4 flex flex-wrap gap-2 font-bold text-xs">
                <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-600">
                  ⚡ 相手方はアプリ不要・10秒押印
                </span>
                <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-600">
                  📜 国税庁公認の事務処理規程つき
                </span>
                <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-red-600">
                  🛡️ WORM監査ログ＆ハッシュ改ざん防止
                </span>
              </div>
            </div>

            {/* 右側：【1分間 リアル署名デモ】スマホ10秒押印を体験 */}
            <div className="flex flex-col justify-between rounded-3xl border-2 border-border bg-card p-6 shadow-xl sm:p-8 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between border-border/80 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 animate-ping rounded-full bg-red-500" />
                    <span className="font-extrabold text-foreground text-lg">【1分間体験】リアル署名デモ</span>
                  </div>
                  <Badge className="bg-red-600 font-bold text-white text-xs">登録不要・即体験</Badge>
                </div>

                {/* 名字入力 ＆ リアル契約書ビューア */}
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label htmlFor="seal-input" className="block font-bold text-muted-foreground text-xs">
                        あなたの苗字を入力して押印枠をタップ
                      </label>
                      <span className="font-semibold text-[11px] text-red-600">スマホ対応</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="seal-input"
                        type="text"
                        maxLength={5}
                        value={sealName}
                        onChange={(e) => setSealName(e.target.value)}
                        placeholder="例: 佐藤"
                        className="flex h-10 flex-1 rounded-xl border-2 border-input bg-background px-3 font-black text-base shadow-inner focus:border-red-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSealColor(
                            sealColor === 'vermilion' ? 'black' : sealColor === 'black' ? 'navy' : 'vermilion',
                          )
                        }
                        className="rounded-xl border border-border bg-muted/30 px-3 font-bold text-muted-foreground text-xs hover:bg-muted"
                      >
                        {sealColor === 'vermilion' ? '🔴 朱肉' : sealColor === 'black' ? '⚫ 格式黒' : '🔵 藍色'}
                      </button>
                    </div>
                  </div>

                  {/* リアル署名デモ スマホフレーム */}
                  <div className="pt-1">
                    <LandingDemoViewer sealName={sealName} sealColor={sealColor} sealDataUrl={sealDataUrl} />
                  </div>
                </div>
              </div>

              {/* 名前を引き継いで無料体験へ */}
              <div className="mt-5 space-y-2">
                <Link to={`/signup?name=${encodeURIComponent(sealName.trim() || '佐藤')}`} className="block">
                  <Button className="h-12 w-full bg-red-600 font-extrabold text-base text-white shadow-md hover:bg-red-700">
                    この認印で本番の契約書を送る（無料）
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-center text-[11px] text-muted-foreground">
                  ※ 会員登録後、入力した名字で本番の認印をすぐに作成できます
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== デンケイの「六つ道具」セクション（見出し特大 ＋ 詳細アコーディオン） ===== */}
      <section id="features" className="border-border/60 border-t py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 font-black text-red-600 text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>6 DIGITAL TOOLS OF DENKEI</span>
            </div>
            <h2 className="font-black text-3xl text-foreground tracking-tight sm:text-5xl">
              デンケイの「六つ道具」で、
              <br />
              中小企業の契約・電帳法を鉄壁ガード
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-medium text-base text-muted-foreground sm:text-lg">
              文字を詰め込まず、要点だけを明快に。詳細はタップして展開できます。
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {/* 道具1 */}
            <AccordionItem
              value="tool-1"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-red-600 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 sm:h-14 sm:w-14">
                  <Stamp className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-red-600 text-xs uppercase tracking-wider">第一の道具</span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">スマホ10秒 電子認印（赤丸印）</h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    欧米風サインではなく、見慣れた伝統の「朱肉丸印」で誰でも即日押印。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-red-600 text-sm hover:no-underline sm:text-base">
                    押印方式と相手方負担ゼロの仕組みを見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-3 border-border border-t pt-5 text-foreground text-sm">
                <p className="font-bold text-base">相手方にアカウント登録やアプリ導入は一切不要</p>
                <p className="text-muted-foreground leading-relaxed">
                  契約相手には専用のURL付きメールが届きます。スマホで開いてワンタップするだけで、苗字に合わせた本物の朱肉認印が自動押印されます。
                  PC・スマホ・タブレットの全端末に対応し、相手方に1円も負担をかけません。
                </p>
                <div className="space-y-1 rounded-xl bg-muted p-3.5 font-mono text-xs">
                  <div>✓ 名字入力に応じたベクター印影自動生成エンジン搭載</div>
                  <div>✓ 民法第522条第2項（契約の成立要件）に基づく完全な合意証跡</div>
                  <div>✓ 外出先や現場でも親指ひとつで完了するモバイル特化UI</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 道具2 */}
            <AccordionItem
              value="tool-2"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-emerald-600 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 sm:h-14 sm:w-14">
                  <Scale className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-emerald-600 text-xs uppercase tracking-wider">第二の道具</span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    国税庁公認・事務処理規程キット
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    1件ごとの高額タイムスタンプ不要。電帳法第4条に完全適合。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-emerald-600 text-sm hover:no-underline sm:text-base">
                    電帳法の法的根拠と税理士・税務署対応を見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-3 border-border border-t pt-5 text-foreground text-sm">
                <p className="font-bold text-base">国税庁「電子取引関係 事務処理規程（第4号）」に完全準拠</p>
                <p className="text-muted-foreground leading-relaxed">
                  電子帳簿保存法において、外部タイムスタンプは必須ではありません。
                  国税庁が公認する「正当な理由がない訂正及び削除の防止に関する事務処理規程」を備え付けることで完全に法要件を満たします。
                  デンケイは管理画面から貴社名入りの規程をワンクリックでダウンロードして備え付けることができます。
                </p>
                <div className="space-y-1 rounded-xl bg-muted p-3.5 font-mono text-xs">
                  <div>✓ 貴社名入り国税庁公認規程を1クリックで出力（A4印刷/PDF保存）</div>
                  <div>✓ 取引年月日・取引先・取引金額による電帳法CSV一括検索出力</div>
                  <div>✓ 税理士や税務署への説明資料がこれ1枚で即座に完結</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 道具3 */}
            <AccordionItem
              value="tool-3"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-primary sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
                  <Lock className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-primary text-xs uppercase tracking-wider">第三の道具</span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    改ざん防止 WORM監査ログ＆SHA-256ハッシュ
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    契約締結後の削除・改ざんをシステムレベルで物理的に遮断。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-primary text-sm hover:no-underline sm:text-base">
                    データベース改ざん防止技術の詳細を見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-3 border-border border-t pt-5 text-foreground text-sm">
                <p className="font-bold text-base">管理者でも書き換え不可能なブロックチェーン同等の堅牢性</p>
                <p className="text-muted-foreground leading-relaxed">
                  データベース層にWORM（Write Once Read
                  Many）トリガーを実装し、監査ログの改変・物理削除をシステムが拒否します。
                  さらに、直前の操作履歴と連鎖するSHA-256ハッシュチェーンにより、いかなる不正な改ざんも即座に検知されます。
                </p>
                <div className="space-y-1 rounded-xl bg-muted p-3.5 font-mono text-xs">
                  <div>✓ PostgreSQL WORM物理削除不可トリガー常時稼働</div>
                  <div>✓ 操作ごとに直前ハッシュと連鎖するSHA-256改ざん防止台帳</div>
                  <div>✓ PAdES電子署名付きPDF生成（Acrobat等の閲覧ソフトで署名有効性を確認可能）</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 道具4 */}
            <AccordionItem
              value="tool-4"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-amber-600 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 sm:h-14 sm:w-14">
                  <Smartphone className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-amber-600 text-xs uppercase tracking-wider">第四の道具</span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    メールワンタイム認証（OTP二要素認証）
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    誤送信やなりすましを二重に防ぐ、安心の本人確認機能。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-amber-600 text-sm hover:no-underline sm:text-base">
                    二要素認証の流れとセキュリティを見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-3 border-border border-t pt-5 text-foreground text-sm">
                <p className="font-bold text-base">相手方のメールボックス到達を確実に検証</p>
                <p className="text-muted-foreground leading-relaxed">
                  署名時に相手方のメールアドレスへ6桁のワンタイムパスコードを発行。
                  契約者本人しか閲覧できないメールアカウント経由で認証を行うことで、なりすましリスクを劇的に低減します。
                </p>
                <div className="space-y-1 rounded-xl bg-muted p-3.5 font-mono text-xs">
                  <div>✓ 10分間有効な暗号学的ランダム6桁コード生成</div>
                  <div>✓ 連続誤入力時の自動ロックによる総当たり攻撃防止</div>
                  <div>✓ IPアドレス・ブラウザUA情報・認証時刻の監査ログ完全記録</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 道具5 */}
            <AccordionItem
              value="tool-5"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-cyan-600 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 sm:h-14 sm:w-14">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-cyan-600 text-xs uppercase tracking-wider">第五の道具</span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    インボイス適格請求書（T番号対応）
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    毎月の利用料も、T番号入りの適格請求書を管理画面からワンクリック出力。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-cyan-600 text-sm hover:no-underline sm:text-base">
                    インボイス制度対応と経理処理の簡略化を見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-3 border-border border-t pt-5 text-foreground text-sm">
                <p className="font-bold text-base">税理士にそのまま渡せる完全準拠の領収書・請求書</p>
                <p className="text-muted-foreground leading-relaxed">
                  適格請求書発行事業者の登録番号（T+13桁）、10%消費税額、適用税率を正確に記載した帳票をいつでもダウンロード可能。
                  仕入税額控除の適用要件を完全に満たし、経理の手間をゼロにします。
                </p>
                <div className="space-y-1 rounded-xl bg-muted p-3.5 font-mono text-xs">
                  <div>✓ 国税庁登録T番号自動印字</div>
                  <div>✓ 10%消費税計算および税率別内訳の完全表示</div>
                  <div>✓ 過去の全請求書・領収書を年度ごとにいつでも再発行可能</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 道具6 */}
            <AccordionItem
              value="tool-6"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-red-600 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 sm:h-14 sm:w-14">
                  <Receipt className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-red-600 text-xs uppercase tracking-wider">第六の道具</span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    従量課金の恐怖ゼロ・月額2,980円定額（100件）
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    大手の「1件220円課金」は一切なし。1件あたり実質29.8円で使い切り定額。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-red-600 text-sm hover:no-underline sm:text-base">
                    詳しいコスト比較表を見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 border-border border-t pt-5 text-foreground text-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border text-left">
                    <thead className="bg-muted font-bold text-xs uppercase">
                      <tr>
                        <th className="border border-border p-3">項目</th>
                        <th className="border border-border p-3 text-muted-foreground">大手クラウドサイン等</th>
                        <th className="border border-border bg-red-500/10 p-3 font-extrabold text-red-600">
                          デンケイ (Denkei)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      <tr>
                        <td className="border border-border p-3 font-bold">月額基本料金</td>
                        <td className="border border-border p-3 text-muted-foreground">
                          基本料 11,000円〜 ＋ 1件220円
                        </td>
                        <td className="border border-border bg-red-500/5 p-3 font-bold text-red-600">
                          月額 2,980円 (100件込み)
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3 font-bold">月100件送信時</td>
                        <td className="border border-border p-3 text-muted-foreground">合計 約 33,000円 / 月</td>
                        <td className="border border-border bg-red-500/5 p-3 font-bold text-red-600">
                          定額 2,980円（約91%コスト削減）
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3 font-bold">外部タイムスタンプ</td>
                        <td className="border border-border p-3 text-muted-foreground">
                          月額費用または従量に内包・別途課金
                        </td>
                        <td className="border border-border bg-red-500/5 p-3 font-bold text-emerald-600">
                          不要（国税庁事務処理規程で完全適合）
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3 font-bold">契約の縛り</td>
                        <td className="border border-border p-3 text-muted-foreground">
                          年契約・途中解約違約金あり多数
                        </td>
                        <td className="border border-border bg-red-500/5 p-3 font-bold text-foreground">
                          月々更新・いつでも解約可能
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ===== 【30秒診断】電帳法・税務署対応 適合チェック診断 ===== */}
      <section id="compliance-check" className="border-border/60 border-t bg-muted/20 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 font-black text-red-600 text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>30-SECOND COMPLIANCE DIAGNOSTIC</span>
            </div>
            <h2 className="font-black text-3xl text-foreground tracking-tight sm:text-5xl">
              タイムスタンプ不要で本当に適法？
              <br />
              30秒でわかる税務署対応 適合チェック
            </h2>
            <p className="mt-3 font-medium text-base text-muted-foreground sm:text-lg">
              国税庁公認の「事務処理規程」の法的位置づけと、貴社の適法状態を3問で診断します。
            </p>
          </div>

          <ComplianceDiagnosticCard />
        </div>
      </section>

      {/* ===== 【1分診断】年間コスト削減シミュレーター ===== */}
      <section
        id="simulator"
        className="border-border/60 border-t bg-gradient-to-b from-transparent via-red-500/5 to-transparent py-16 sm:py-24"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 font-black text-red-600 text-xs">
              <Calculator className="h-4 w-4" />
              <span>1-MINUTE COST SAVINGS CALCULATOR</span>
            </div>
            <h2 className="font-black text-3xl text-foreground tracking-tight sm:text-5xl">
              紙の契約書からデンケイに切り替えると、
              <br className="hidden sm:inline" />
              年間いくら浮く？
            </h2>
            <p className="mt-3 font-medium text-base text-muted-foreground sm:text-lg">
              貴社の月間契約書件数を選ぶだけで、削減できるコストと時間が瞬時にわかります。
            </p>
          </div>

          <div className="space-y-8 rounded-3xl border-2 border-border/80 bg-card p-6 shadow-2xl sm:p-10">
            {/* 件数セレクター ＆ オプション */}
            <div>
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <label htmlFor="contracts-slider" className="font-black text-foreground text-lg sm:text-xl">
                  月間の契約書・合意書 送信件数
                </label>
                <span className="font-black text-2xl text-red-600 sm:text-3xl">月 {monthlyContracts} 件</span>
              </div>

              {/* プリセットボタングループ */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[10, 30, 50, 100].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMonthlyContracts(count)}
                    className={`rounded-xl border-2 px-4 py-3 font-black text-sm transition-all sm:text-base ${
                      monthlyContracts === count
                        ? 'scale-102 border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/25'
                        : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                    }`}
                  >
                    月 {count} 件{' '}
                    {count === 30 && <span className="block font-normal text-[10px]">（平均的中小企業）</span>}
                  </button>
                ))}
              </div>

              {/* スライダー */}
              <input
                id="contracts-slider"
                type="range"
                min={3}
                max={100}
                step={1}
                value={monthlyContracts}
                onChange={(e) => setMonthlyContracts(Number(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-red-600"
              />
              <div className="mt-2 flex justify-between font-bold text-muted-foreground text-xs">
                <span>月3件（無料枠）</span>
                <span>月50件</span>
                <span>月100件（上限目安）</span>
              </div>

              {/* 特定記録郵便オプション */}
              <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center">
                <label className="flex cursor-pointer select-none items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeRegisteredMail}
                    onChange={(e) => setIncludeRegisteredMail(e.target.checked)}
                    className="h-5 w-5 cursor-pointer rounded border-2 border-red-500 text-red-600 accent-red-600"
                  />
                  <div>
                    <span className="font-bold text-foreground text-sm sm:text-base">
                      特定記録郵便（+210円/通）を付ける
                    </span>
                    <span className="block text-muted-foreground text-xs">
                      契約書の紛失防止・配達記録・追跡番号が必要な場合の加算
                    </span>
                  </div>
                </label>
                <Badge
                  variant={includeRegisteredMail ? 'default' : 'secondary'}
                  className="self-start font-bold text-xs sm:self-auto"
                >
                  {includeRegisteredMail ? '1通あたり 920円' : '1通あたり 710円（基本）'}
                </Badge>
              </div>
            </div>

            {/* 結果表示ハイライトカード */}
            <div className="grid grid-cols-1 gap-6 border-border border-t pt-6 md:grid-cols-2">
              {/* 年間削減コスト */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-6 sm:p-8">
                <div>
                  <div className="mb-2 flex items-center gap-2 font-black text-red-600 text-xs uppercase tracking-wider">
                    <TrendingDown className="h-4 w-4" />
                    <span>年間コスト削減額（見込み）</span>
                  </div>
                  <div className="font-black text-4xl text-red-600 tracking-tight sm:text-6xl">
                    ¥{annualSavings.toLocaleString()}
                  </div>
                  <div className="mt-2 font-medium text-muted-foreground text-xs sm:text-sm">
                    従来の紙費用 約 ¥{annualPaperCost.toLocaleString()} → デンケイなら ¥
                    {denkeiAnnualCost.toLocaleString()}
                  </div>
                </div>
                <div className="mt-4 border-red-500/20 border-t pt-3 font-bold text-red-700 text-xs dark:text-red-400">
                  ※ 印紙代（平均400円）＋ 製本印刷代（200円）＋ 定形郵送代（110円
                  {includeRegisteredMail ? ' ＋ 特定記録210円' : ''}）
                </div>
              </div>

              {/* 年間削減時間 */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8">
                <div>
                  <div className="mb-2 flex items-center gap-2 font-black text-emerald-600 text-xs uppercase tracking-wider">
                    <Clock className="h-4 w-4" />
                    <span>年間削減できる作業時間</span>
                  </div>
                  <div className="font-black text-4xl text-emerald-600 tracking-tight sm:text-6xl">
                    約 {annualHoursSaved} 時間
                  </div>
                  <div className="mt-2 font-medium text-muted-foreground text-xs sm:text-sm">
                    印刷・割印・製本・封入・郵便局窓口の往復作業を丸ごと削減
                  </div>
                </div>
                <div className="mt-4 border-emerald-500/20 border-t pt-3 font-bold text-emerald-700 text-xs dark:text-emerald-400">
                  ※ 契約書1通あたり約12分の事務処理時間短縮で試算
                </div>
              </div>
            </div>

            {/* デンケイのアドバイス吹き出し */}
            <div className="relative flex items-start gap-4 rounded-2xl border-2 border-red-500/30 bg-background/90 p-5 shadow-lg">
              <img
                src="/images/denkei-mascot-circle.webp"
                alt="デンケイ"
                className="h-12 w-12 flex-shrink-0 rounded-full border border-red-500/30"
              />
              <div className="flex-1">
                <div className="mb-1 font-black text-red-600 text-xs">デンケイの診断結果</div>
                <p className="font-bold text-foreground text-sm leading-snug sm:text-base">「{denkeiComment}」</p>
              </div>
            </div>

            {/* 試算の内訳詳細アコーディオン */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="sim-breakdown" className="rounded-xl border bg-muted/20 px-4">
                <AccordionTrigger className="font-bold text-muted-foreground text-xs hover:no-underline sm:text-sm">
                  試算の根拠と内訳・大手他社との比較を見る
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-2 pb-4 text-muted-foreground text-xs leading-relaxed sm:text-sm">
                  <div>
                    <span className="font-bold text-foreground">従来の紙契約書にかかる1通あたり想定コスト内訳：</span>
                    収入印紙代平均 400円 ＋ 製本代・印刷用紙トナー代 200円 ＋ 定形郵便基本料
                    110円（特定記録郵便オプション選択時は +210円加算） ＝ <strong>約710円〜920円 / 通</strong>
                  </div>
                  <div>
                    <span className="font-bold text-foreground">作業時間短縮の根拠：</span>
                    契約書2部印刷、製本テープ貼り付け、割印・押印、返信用封筒同封、宛名ラベル印刷、ポスト投函にかかる一連の事務時間（
                    <strong>1通あたり平均12分</strong>）を電子化によってゼロに短縮。
                  </div>
                  <div>
                    <span className="font-bold text-foreground">大手電子契約サービスとの年間費用の差：</span>
                    大手では基本料（月11,000円）＋従量送信料（1件220円）が発生するため、月30件の場合で年間約21.1万円、月100件で年間約39.6万円かかります。
                    デンケイならスタンダード月額2,980円（年間35,760円）の完全定額で、約83%〜91%のコスト削減となります。
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* シミュレーター内CTA */}
            <div className="pt-2 text-center">
              <Link to={`/signup?name=${encodeURIComponent(sealName.trim() || '佐藤')}`}>
                <Button
                  size="lg"
                  className="h-14 w-full bg-red-600 px-10 font-extrabold text-lg text-white shadow-red-600/25 shadow-xl hover:bg-red-700 sm:w-auto"
                >
                  この削減効果を無料で試す（月3件まで0円）
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 業種別 業務改善活用事例（見出し大 ＋ 詳細アコーディオン） ===== */}
      <section id="use-cases" className="border-border/60 border-t bg-muted/20 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 font-black text-red-600 text-xs">
              <Sparkles className="h-4 w-4" />
              <span>BUSINESS IMPROVEMENT CASES</span>
            </div>
            <h2 className="font-black text-3xl text-foreground tracking-tight sm:text-5xl">
              どんな業務が改善する？
              <br />
              業種別 業務改善の活用事例
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-medium text-base text-muted-foreground sm:text-lg">
              紙・印紙・郵送に追われる「契約まわりの事務」がどう変わるのか。
              具体的な課題と導入後のフロー、削減効果を各業界の事例で解説します。
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {/* 事例1: 介護・障害福祉 */}
            <AccordionItem
              value="case-welfare"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-emerald-600 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 sm:h-14 sm:w-14">
                  <HeartHandshake className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-emerald-600 text-xs uppercase tracking-wider">
                    事例 1｜介護・障害福祉事業所
                  </span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    遠方のご家族との入居・利用契約を、
                    <br className="sm:hidden" />
                    「押印待ち」ゼロで当日締結
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    特養・グループホーム・障害福祉事業所の契約書を郵送なしの電子締結に。入居日程が前倒しになり、監査対応も格段に楽に。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-emerald-600 text-sm hover:no-underline sm:text-base">
                    課題・導入後のフロー・削減効果の詳細を見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-5 border-border border-t pt-5 text-foreground text-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
                      Before｜紙と郵送に追われる現場
                    </div>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground leading-relaxed">
                      <li>
                        ・入居契約・サービス提供契約・重要事項説明書を遠方のご家族に郵送 → 押印 → 返送の往復で2〜3週間
                      </li>
                      <li>・押印待ちの間に入居日がずれ、ベッドが空いたままの機会損失が発生</li>
                      <li>・福祉用具事業者・医療機関・自治体との委託契約・協定書も紙で、事務室の保存棚がパンク</li>
                      <li>・指導監査・実地指導のたびに、過去の契約書を保管庫から探し出す作業が発生</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="font-bold text-emerald-600 text-xs uppercase tracking-wider">
                      After｜デンケイ導入後のフロー
                    </div>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground leading-relaxed">
                      <li>・ご家族にURL付きメールを送信。会員登録不要でスマホ10秒、朱肉丸印の電子認印を押印</li>
                      <li>・郵送往復がなくなり、最短当日〜2日で締結完了。入居日程が前倒しに</li>
                      <li>・契約書はWORM監査ログ付きで電子保存。取引年月日・相手方・金額のCSV検索で指導監査に即提示</li>
                      <li>・メールOTP二要素認証でなりすましを二重ブロック。高齢のご家族でも安心の本人確認</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">年間コスト削減</div>
                    <div className="mt-1 font-black text-2xl text-emerald-600">約8.5万円</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">製本・印刷・郵送 代</div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">年間作業時間削減</div>
                    <div className="mt-1 font-black text-2xl text-emerald-600">約24時間</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">押印・製本・封入作業がゼロに</div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">締結リードタイム</div>
                    <div className="mt-1 font-black text-2xl text-emerald-600">最短当日</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">従来は2〜3週間</div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  ※
                  月10件の契約・協定書を電子化した場合の試算例（紙1通あたり約710円・事務時間約12分）。実印・印鑑証明書が求められる契約を除く、サービス提供契約・協定書・同意書などの締結を想定しています。
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* 事例2: 建設・設備業 */}
            <AccordionItem
              value="case-construction"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-amber-600 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 sm:h-14 sm:w-14">
                  <HardHat className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-amber-600 text-xs uppercase tracking-wider">
                    事例 2｜建設・設備メンテナンス業
                  </span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    請負契約の収入印紙と協力会社の
                    <br className="sm:hidden" />
                    押印待ちを解消、着工を前倒し
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    工事請負契約・安全協定書を現場からスマホで送信。印紙代ゼロ・郵送ゼロで協力会社との締結が翌朝に完了。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-amber-600 text-sm hover:no-underline sm:text-base">
                    課題・導入後のフロー・削減効果の詳細を見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-5 border-border border-t pt-5 text-foreground text-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
                      Before｜印紙代と押印回覧の負担
                    </div>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground leading-relaxed">
                      <li>
                        ・請負金額に応じた収入印紙（100万円超: 1,000円 / 500万円超: 2,000円 など）を毎回購入・貼付
                      </li>
                      <li>・元請 → 自社 → 協力会社の押印が郵送で回り、着工が1週間以上遅れる</li>
                      <li>・現場監督が事務所に戻ってから印刷・押印・郵送。残業と移動時間の原因に</li>
                      <li>・安全協定書・発注書など案件ごとの書類が月数十通、管理が分散</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="font-bold text-amber-600 text-xs uppercase tracking-wider">
                      After｜デンケイ導入後のフロー
                    </div>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground leading-relaxed">
                      <li>・現場からタブレット・スマホで送信。協力会社は届いたメールから翌朝には締結完了</li>
                      <li>・電子データで作成した契約書は印紙税の課税対象外 → 収入印紙がゼロに</li>
                      <li>・押印時刻・IPアドレス付きの監査ログが自動保存。事故・トラブル時に即証跡提示</li>
                      <li>・締結済みPDFが自動で双方に保存され、協定書の紛失・版の混在を防止</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-amber-500/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">年間コスト削減</div>
                    <div className="mt-1 font-black text-2xl text-amber-600">約23.6万円</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">印紙・製本・郵送 代</div>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">年間作業時間削減</div>
                    <div className="mt-1 font-black text-2xl text-amber-600">約36時間</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">現場監督の事務残業が減る</div>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">締結リードタイム</div>
                    <div className="mt-1 font-black text-2xl text-amber-600">翌朝</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">従来は約1週間</div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  ※
                  月15件の請負契約・協定書を電子化した場合の試算例（1通あたり印紙平均1,000円＋製本印刷代200円＋郵送代110円・事務時間約12分）。
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* 事例3: IT・Web制作 */}
            <AccordionItem
              value="case-it"
              className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-sm transition-colors data-[state=open]:border-primary sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
                  <Laptop className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-primary text-xs uppercase tracking-wider">
                    事例 3｜IT・Web制作／受託開発
                  </span>
                  <h3 className="mt-1 font-black text-foreground text-xl sm:text-2xl">
                    NDA・業務委託契約を商談中に即送信、
                    <br className="sm:hidden" />
                    「押印待ち」で発注を止めない
                  </h3>
                  <p className="mt-1 font-medium text-base text-muted-foreground sm:text-lg">
                    紙の印刷・郵送なしで契約書を3分送信。クライアントはスマホ10秒で即日押印し、キックオフが当日から始まる。
                  </p>
                  <AccordionTrigger className="mt-2 pt-2 font-bold text-primary text-sm hover:no-underline sm:text-base">
                    課題・導入後のフロー・削減効果の詳細を見る
                  </AccordionTrigger>
                </div>
              </div>

              <AccordionContent className="mt-4 space-y-5 border-border border-t pt-5 text-foreground text-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
                      Before｜契約事務が営業の足を引っ張る
                    </div>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground leading-relaxed">
                      <li>
                        ・商談後、NDA・業務委託契約書を印刷 → 押印 → 郵送。クライアントの押印待ちでキックオフが止まる
                      </li>
                      <li>・フリーランス・外注先ごとの個別契約書の締結漏れや、改訂版の混在が発生</li>
                      <li>・契約書が担当者のPC・紙ファイルに散在し、条件確認のたびに時間がかかる</li>
                      <li>・月20件超の契約事務が特定の管理担当者に集中</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="font-bold text-primary text-xs uppercase tracking-wider">
                      After｜デンケイ導入後のフロー
                    </div>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground leading-relaxed">
                      <li>・商談中にその場でメール送信 → クライアントはスマホ10秒で押印し、キックオフが当日〜翌日に</li>
                      <li>・NDA・業務委託契約書をその場で作成・送信し、押印までオンラインで完結</li>
                      <li>・全員の押印完了と同時に最終PDFが自動配布。押印時刻・認証ログで「いつ・誰が」の齟齬を防止</li>
                      <li>・契約書がクラウドに一元保存。条件確認も検索で数秒、担当者依存から脱却</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-primary/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">年間コスト削減</div>
                    <div className="mt-1 font-black text-2xl text-primary">約12.2万円</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">印刷・郵送・印紙 代</div>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">年間作業時間削減</div>
                    <div className="mt-1 font-black text-2xl text-primary">約48時間</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">営業担当が商談に集中</div>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-background p-4 text-center">
                    <div className="font-bold text-muted-foreground text-xs">締結リードタイム</div>
                    <div className="mt-1 font-black text-2xl text-primary">最短当日</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">従来は約7日</div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  ※
                  月20件のNDA・業務委託契約を電子化した場合の試算例（1通あたり印紙平均200円＋製本印刷代200円＋郵送代110円・事務時間約12分）。
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ===== 料金プラン（大数字・明朗・比較アコーディオン） ===== */}
      <section id="pricing" className="border-border/60 border-t py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="font-bold text-red-600 text-xs uppercase tracking-widest">PRICING</h2>
            <p className="mt-2 font-black text-3xl text-foreground tracking-tight sm:text-5xl">
              追加請求なし。シンプルな定額プラン。
            </p>

            {/* 年払い/月払いトグル */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className={`text-sm ${!isAnnual ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                月々払い
              </span>
              <button
                type="button"
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-red-600' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span
                className={`flex items-center gap-1.5 text-sm ${isAnnual ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
              >
                年一括払い <Badge className="bg-red-600 text-[10px] text-white">2ヶ月実質無料</Badge>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
            {/* フリー */}
            <Card className="flex flex-col rounded-2xl border-2 border-border bg-card p-6 sm:p-8">
              <CardContent className="flex flex-1 flex-col p-0">
                <span className="font-bold text-muted-foreground text-xs">FREE</span>
                <h3 className="mt-1 font-black text-2xl text-foreground">フリープラン</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-black text-5xl text-foreground">¥0</span>
                </div>
                <div className="mt-1 text-muted-foreground text-xs">クレカ登録不要・期限なし</div>

                <div className="mt-6 flex-1 space-y-2 font-bold text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> 月3件まで送信無料
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> 電子認印（赤丸印）
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> メールOTP二要素認証
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-muted-foreground" /> 相手方はアプリ・会員登録不要
                  </div>
                </div>

                <Link to="/signup" className="mt-8 block">
                  <Button variant="outline" size="lg" className="h-12 w-full font-bold text-base">
                    無料で今すぐ試す
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* スタンダード（一番人気・デンケイのおすすめ） */}
            <Card className="relative z-10 flex scale-105 flex-col rounded-2xl border-3 border-red-600 bg-card p-6 shadow-2xl sm:p-8">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="flex items-center gap-1.5 bg-red-600 px-4 py-1 font-extrabold text-white text-xs shadow-md">
                  <img src="/images/denkei-mascot-circle.webp" alt="デンケイ" className="h-3.5 w-3.5 rounded-full" />
                  <span>デンケイのおすすめ・中小企業標準</span>
                </Badge>
              </div>

              <CardContent className="flex flex-1 flex-col p-0">
                <span className="font-bold text-red-600 text-xs">STANDARD</span>
                <h3 className="mt-1 font-black text-2xl text-foreground">中小応援スタンダード</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-black text-5xl text-red-600">¥{standardPrice}</span>
                  <span className="font-bold text-muted-foreground text-xs">（税込）/ 月</span>
                </div>
                <div className="mt-1 font-semibold text-red-600 text-xs">
                  {isAnnual ? '年額一括 ¥29,760（実質2ヶ月無料・月100件/月）' : '月100件まで定額込み（月額2,980円）'}
                </div>

                <div className="mt-6 flex-1 space-y-2.5 font-bold text-sm">
                  <div className="flex items-center gap-2 text-red-600">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />{' '}
                    {isAnnual ? '月100件まで送信可能（年払いは2ヶ月実質無料）' : '月100件まで送信可能'}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-red-600" /> 電帳法 事務処理規程キット
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-red-600" /> 会社角印・代表取締役丸印
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-red-600" /> 自社ブランドメール設定
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-red-600" /> 年間適格請求書（1クリックT番号PDF）
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-red-600" /> 改ざん防止WORM監査ログ
                  </div>
                </div>

                <Link to="/signup" className="mt-8 block">
                  <Button
                    size="lg"
                    className="h-14 w-full bg-red-600 font-black text-lg text-white shadow-lg shadow-red-600/30 hover:bg-red-700"
                  >
                    スタンダードで始める
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* ビジネス */}
            <Card className="flex flex-col rounded-2xl border-2 border-border bg-card p-6 sm:p-8">
              <CardContent className="flex flex-1 flex-col p-0">
                <span className="font-bold text-muted-foreground text-xs">BUSINESS</span>
                <h3 className="mt-1 font-black text-2xl text-foreground">ビジネス</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-black text-5xl text-foreground">¥{businessPrice}</span>
                  <span className="font-bold text-muted-foreground text-xs">（税込）/ 月</span>
                </div>
                <div className="mt-1 font-semibold text-foreground/80 text-xs">
                  {isAnnual ? '年額一括 ¥49,800（実質2ヶ月無料・無制限）' : '大量送信・チーム運用'}
                </div>

                <div className="mt-6 flex-1 space-y-2 font-bold text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-emerald-600" /> 送信件数 無制限（使い放題）
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> 送信前 承認フロー機能
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> CSV一括送信（数十社へ一斉締結）
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> 複数チームメンバー管理
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> スタンダードの全機能
                  </div>
                </div>

                <Link to="/signup" className="mt-8 block">
                  <Button variant="outline" size="lg" className="h-12 w-full font-bold text-base">
                    ビジネスで始める
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== よくあるご質問（大文字アコーディオン） ===== */}
      <section id="faq" className="border-border/60 border-t bg-muted/20 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="font-bold text-red-600 text-xs uppercase tracking-widest">FAQ</h2>
            <p className="mt-2 font-black text-3xl text-foreground tracking-tight sm:text-5xl">よくあるご質問</p>
            <div className="mt-3 flex items-center justify-center gap-2 font-bold text-muted-foreground text-xs sm:text-sm">
              <img src="/images/denkei-mascot-circle.webp" alt="デンケイ" className="h-5 w-5 rounded-full" />
              <span>疑問があれば、拙者にお尋ねあれ！</span>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="faq-1" className="rounded-2xl border-2 border-border/80 bg-card px-6">
              <AccordionTrigger className="py-5 text-left font-black text-lg hover:no-underline sm:text-xl">
                Q. 外部タイムスタンプなしで電帳法に違反しませんか？
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-base text-muted-foreground leading-relaxed">
                違反しません。国税庁が定める「電子取引関係
                事務処理規程（第4号）」を備え付けることで法令に完全に適合します。
                デンケイでは貴社名入りの規程をワンクリックでダウンロードできます。
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="rounded-2xl border-2 border-border/80 bg-card px-6">
              <AccordionTrigger className="py-5 text-left font-black text-lg hover:no-underline sm:text-xl">
                Q. 契約相手はお金がかかりますか？ 登録は必要ですか？
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-base text-muted-foreground leading-relaxed">
                完全無料です。相手方は会員登録もアプリのインストールも不要で、届いたメールを開くだけでスマホから10秒で認印を押印できます。
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="rounded-2xl border-2 border-border/80 bg-card px-6">
              <AccordionTrigger className="py-5 text-left font-black text-lg hover:no-underline sm:text-xl">
                Q. 月100件を超えた場合はどうなりますか？
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-base text-muted-foreground leading-relaxed">
                勝手に追加課金されることはありません。制限がかかる安全設計ですので、必要に応じて無制限プラン（月額4,980円）にいつでもアップグレードできます。
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="rounded-2xl border-2 border-border/80 bg-card px-6">
              <AccordionTrigger className="py-5 text-left font-black text-lg hover:no-underline sm:text-xl">
                Q. インボイス制度（適格請求書）に対応していますか？
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-base text-muted-foreground leading-relaxed">
                対応しています。管理画面から登録番号（T+13桁）および10%消費税額が記載された適格請求書をいつでも出力・印刷いただけます。
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="rounded-2xl border-2 border-border/80 bg-card px-6">
              <AccordionTrigger className="py-5 text-left font-black text-lg hover:no-underline sm:text-xl">
                Q. 取引先（相手方）にどう説明すればスムーズに承諾してもらえますか？
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-5 text-base text-muted-foreground leading-relaxed">
                <p>
                  デンケイでは、取引先へのご案内にそのまま使える「取引先向け案内書面（A4・1枚）」および「コピペ用メール文面」を無料提供しています。
                </p>
                <div className="rounded-xl bg-muted p-3.5 font-mono text-foreground text-xs">
                  <div>✓ 相手方の費用負担は完全無料（0円）である旨を明記</div>
                  <div>✓ アプリや会員登録不要、スマホで届いたメールから10秒押印できる旨を明記</div>
                  <div>✓ 電子署名法および電帳法に100%適合し法的効力がある旨を解説</div>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-500/40 font-bold text-red-600 text-xs hover:bg-red-50/10 hover:text-red-700 dark:hover:bg-red-500/10"
                    onClick={() => {
                      const printHtml = buildCounterpartyPrintHtml({
                        companyName: '貴社名',
                        serviceName: 'デンケイ（Denkei）',
                      });
                      const printWin = window.open('', '_blank');
                      if (printWin) {
                        printWin.document.write(printHtml);
                        printWin.document.close();
                        printWin.focus();
                      }
                    }}
                  >
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    取引先向け案内書サンプル（A4・1枚）をプレビュー・印刷
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-6" className="rounded-2xl border-2 border-border/80 bg-card px-6">
              <AccordionTrigger className="py-5 text-left font-black text-amber-600 text-lg hover:no-underline sm:text-xl">
                Q. 【トラブル解決】メールが届かない・スマホで押印枠がタップできない場合は？
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-5 text-base text-muted-foreground leading-relaxed">
                <p>
                  <strong>メールが届かない場合:</strong>{' '}
                  迷惑メールフォルダ・プロモーションフォルダをご確認ください。キャリアメール（docomo, au,
                  SoftBank等）をお使いの場合は、PCメール受信拒否設定を解除するか、Gmail等のWebメールへの再送をお試しください。
                </p>
                <p>
                  <strong>スマホで押印枠が反応しない場合:</strong>{' '}
                  LINE等のSNSアプリ内ブラウザではなく、スマートフォンの標準ブラウザ（iPhoneなら Safari、Androidなら
                  Google Chrome）でURLを開いてください。
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ===== 最終CTA ===== */}
      <section className="border-border/60 border-t bg-gradient-to-t from-red-500/10 via-background to-background py-20 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* デンケイの掛け声バッジ */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 font-bold text-red-600 text-sm">
            <img src="/images/denkei-mascot-circle.webp" alt="デンケイ" className="h-5 w-5 rounded-full" />
            <span>「月3件まで0円でござる！ まずは1分でお試しあれ！」</span>
          </div>

          <h2 className="font-black text-3xl text-foreground tracking-tight sm:text-5xl">
            今日から、契約書の印刷・郵送・印紙代を
            <br />
            すべて<span className="text-red-600">ゼロ</span>に。
          </h2>

          <div className="mt-8 flex justify-center">
            <Link to={`/signup?name=${encodeURIComponent(sealName.trim() || '佐藤')}`}>
              <Button
                size="lg"
                className="h-16 bg-red-600 px-12 font-black text-white text-xl shadow-2xl shadow-red-600/30 transition-all hover:scale-105 hover:bg-red-700"
              >
                無料ではじめる（月3件まで0円）
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </div>

          <p className="mt-4 font-medium text-muted-foreground text-sm">クレジットカード不要・1分で登録完了</p>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer className="border-border/60 border-t bg-muted/40 py-10 text-center text-muted-foreground text-xs">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <img src="/images/denkei-mascot-circle.webp" alt="デンケイ" className="h-6 w-6 rounded-full" />
            <span>デンケイ</span>
            <span className="font-normal text-muted-foreground">| 中小企業特化型 電子契約サービス</span>
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <div>© 2026 デンケイ (Denkei). 電子帳簿保存法第3条・第4条準拠 / インボイス制度対応</div>
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              利用規約
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
