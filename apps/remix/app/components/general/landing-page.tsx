import { generateElectronicSealDataUrl } from '@documenso/lib/universal/seal-image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@documenso/ui/primitives/accordion';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Lock,
  Receipt,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stamp,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

export function LandingPage() {
  const [sealName, setSealName] = useState('佐藤');
  const [sealColor, setSealColor] = useState<'vermilion' | 'black' | 'navy'>('vermilion');
  const [isAnnual, setIsAnnual] = useState(false);

  const sealDataUrl = useMemo(() => {
    return generateElectronicSealDataUrl(sealName.trim() || '印', {
      color: sealColor,
      width: 256,
      height: 256,
    });
  }, [sealName, sealColor]);

  const standardPrice = isAnnual ? '2,480' : '2,980';
  const businessPrice = isAnnual ? '3,980' : '4,980';

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-red-500/20 selection:text-red-900 dark:selection:text-red-100">
      {/* ===== グローバルヘッダー ===== */}
      <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-x-3">
            <Link to="/" className="flex items-center gap-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-md shadow-red-600/20">
                <Stamp className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-lg leading-tight tracking-tight">
                  デンケイ <span className="ml-0.5 font-extrabold text-red-600 text-sm">電子契約</span>
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  中小企業特化・月額2,980円（100件）
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-x-6 font-medium text-muted-foreground text-sm md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              3大特徴
            </a>
            <a href="#comparison" className="transition-colors hover:text-foreground">
              他社比較
            </a>
            <a href="#templates" className="transition-colors hover:text-foreground">
              標準雛形
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              料金プラン
            </a>
            <a href="#compliance" className="transition-colors hover:text-foreground">
              電帳法適合
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              よくある質問
            </a>
          </nav>

          <div className="flex items-center gap-x-3">
            <Link to="/signin">
              <Button variant="ghost" size="sm" className="font-medium">
                ログイン
              </Button>
            </Link>
            <Link to="/signup">
              <Button
                size="sm"
                className="bg-red-600 font-semibold text-white shadow-md shadow-red-600/20 hover:bg-red-700"
              >
                無料ではじめる
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== ヒーローセクション ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-500/5 via-amber-500/5 to-transparent pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.red.100),transparent)] opacity-60 dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.red.950/30),transparent)]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* 左カラム: コピー & CTA */}
            <div className="flex flex-col items-start text-left lg:col-span-7">
              <div className="mb-6 inline-flex items-center gap-x-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 font-semibold text-red-700 text-xs dark:text-red-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>タイムスタンプ不要・国税庁公認の事務処理規程で電帳法完全適合</span>
              </div>

              <h1 className="font-extrabold text-3xl text-foreground leading-[1.15] tracking-tight sm:text-5xl lg:text-5xl">
                中小企業のための、
                <br />
                一番
                <span className="text-red-600 underline decoration-2 decoration-red-500/40 decoration-wavy">
                  割り切れる
                </span>
                電子契約。
              </h1>

              <p className="mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg">
                大手の高額従量課金（1件220円〜）や外部タイムスタンプ更新料に悩まされる必要はありません。
                <strong className="font-semibold text-foreground">月額2,980円で月100件まで定額</strong>。
                受信者はアプリ登録不要・スマホ親指10秒で本物の認印（赤丸電子印影）を押印。
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="h-12 bg-red-600 px-8 font-bold text-base text-white shadow-red-600/25 shadow-xl transition-all hover:scale-[1.02] hover:bg-red-700 active:scale-[0.98]"
                  >
                    無料ではじめる（月3件まで0円）
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button variant="outline" size="lg" className="h-12 px-6 font-medium">
                    料金プラン（月2,980円〜）
                  </Button>
                </a>
              </div>

              {/* 信頼バッジ */}
              <div className="mt-10 grid w-full grid-cols-2 gap-4 border-border/60 border-t pt-6 sm:grid-cols-4">
                <div className="flex items-center gap-x-2 font-medium text-muted-foreground text-xs">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>電帳法第3条・第4条適合</span>
                </div>
                <div className="flex items-center gap-x-2 font-medium text-muted-foreground text-xs">
                  <Smartphone className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>スマホ10秒親指押印</span>
                </div>
                <div className="flex items-center gap-x-2 font-medium text-muted-foreground text-xs">
                  <Receipt className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>インボイス適格請求書</span>
                </div>
                <div className="flex items-center gap-x-2 font-medium text-muted-foreground text-xs">
                  <Lock className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>改ざん防止WORMログ</span>
                </div>
              </div>
            </div>

            {/* 右カラム: 電子認印リアルタイム体験インタラクティブカード */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between border-border/60 border-b pb-4">
                  <div className="flex items-center gap-x-2">
                    <span className="flex h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <span className="font-bold text-foreground text-sm">電子認印（赤丸印）リアルタイム生成</span>
                  </div>
                  <Badge variant="outline" className="border-red-500/30 font-mono text-[10px] text-red-600">
                    LIVE PREVIEW
                  </Badge>
                </div>

                {/* お試し入力コントロール */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor="seal-surname-input"
                      className="mb-1 block font-medium text-muted-foreground text-xs"
                    >
                      苗字を入力して押印を体験してください（1〜4文字）
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="seal-surname-input"
                        type="text"
                        maxLength={5}
                        value={sealName}
                        onChange={(e) => setSealName(e.target.value)}
                        placeholder="例: 佐藤"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 font-medium text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <div className="flex gap-1">
                        {(
                          [
                            { key: 'vermilion', label: '朱肉', colorClass: 'bg-red-600' },
                            { key: 'black', label: '黒', colorClass: 'bg-neutral-800' },
                            { key: 'navy', label: '藍', colorClass: 'bg-indigo-900' },
                          ] as const
                        ).map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setSealColor(c.key)}
                            className={`h-9 rounded border px-2 text-xs transition-all ${
                              sealColor === c.key
                                ? 'border-primary font-bold ring-2 ring-primary/20'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${c.colorClass} mr-1`} />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 仮想契約書モックアップ */}
                <div className="relative mt-5 overflow-hidden rounded-lg border border-border bg-neutral-50/50 p-4 dark:bg-neutral-900/40">
                  <div className="flex items-start justify-between border-neutral-200 border-b pb-2 dark:border-neutral-800">
                    <div>
                      <div className="font-bold text-[11px] text-foreground">業務委託基本契約書</div>
                      <div className="text-[9px] text-muted-foreground">
                        甲：株式会社デンケイ 乙：{sealName || '貴社'}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="h-5 border-emerald-500/20 bg-emerald-500/10 text-[9px] text-emerald-600"
                    >
                      締結完了
                    </Badge>
                  </div>

                  <div className="mt-3 line-clamp-3 text-[10px] text-muted-foreground leading-relaxed">
                    甲及び乙は、本契約書に定める条件に従い、業務の委託及び受託に関する基本合意を成立させるものとし、
                    本電磁的記録により電子署名（認印）をもって相互に合意を確認した。
                  </div>

                  {/* 押印エリア */}
                  <div className="mt-4 flex items-center justify-between border-neutral-200 border-t border-dashed pt-3 dark:border-neutral-800">
                    <div className="space-y-0.5 text-[9px] text-muted-foreground">
                      <div>署名日時: 2026-10-16 11:00 (JST)</div>
                      <div className="font-mono">証跡: SHA-256 c3a89e...8f2b</div>
                      <div className="flex items-center gap-1 font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> 電帳法 事務処理規程適合
                      </div>
                    </div>

                    {/* 印影プレビュー */}
                    <div className="flex flex-col items-center">
                      <div className="group relative rounded-full p-1 transition-transform duration-200 hover:scale-105">
                        <img
                          src={sealDataUrl}
                          alt={`${sealName}の電子印影`}
                          className="h-16 w-16 select-none drop-shadow-md"
                        />
                      </div>
                      <span className="mt-0.5 font-medium text-[8px] text-muted-foreground">電子認印（丸印）</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/40 p-2.5 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-primary" />
                    受信者はスマホ片手・10秒でこの印影を押印可能
                  </span>
                  <Link to="/signup" className="flex items-center gap-0.5 font-semibold text-red-600 hover:underline">
                    試す <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 比較セクション（大手クラウドサイン vs デンケイ） ===== */}
      <section id="comparison" className="border-border/50 border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold text-red-600 text-xs uppercase tracking-widest">WHY DENKEI</h2>
            <p className="mt-2 font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl">
              なぜ、中小企業に高額な大手電子契約は不要なのか？
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              大企業のコンプライアンス用に作られた重厚なシステムを、そのまま中小企業が使う必要はありません。
              日常の99%の契約（業務委託・NDA・雇用契約）に特化し、無駄なコストを徹底的にカットしました。
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <div className="min-w-[640px] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-border border-b bg-muted/50">
                    <th className="w-1/4 p-4 font-bold text-foreground text-sm sm:p-5">比較項目</th>
                    <th className="w-1/3 p-4 font-semibold text-muted-foreground text-sm sm:p-5">
                      一般的な大手電子契約
                    </th>
                    <th className="w-5/12 bg-red-500/10 p-4 font-bold text-red-600 text-sm sm:p-5">
                      <div className="flex items-center gap-2">
                        <Stamp className="h-4 w-4" />
                        <span>デンケイ (Denkei)</span>
                        <Badge className="bg-red-600 text-[10px] text-white">中小企業特化</Badge>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">月額料金 & 件数</td>
                    <td className="p-4 text-muted-foreground">
                      基本料 11,000円〜 <br />
                      <span className="font-medium text-red-500 text-xs">＋ 1件ごとに220円（従量課金）</span>
                    </td>
                    <td className="bg-red-500/5 p-4 font-bold text-foreground">
                      <span className="text-lg text-red-600">月額 2,980円</span>（税込）
                      <div className="font-normal text-muted-foreground text-xs">
                        月100件まで定額込み（1件あたり29.8円・追加請求なし）
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-4 font-semibold text-foreground">タイムスタンプ費用</td>
                    <td className="p-4 text-muted-foreground">
                      毎件数十円〜のTSA費用が強制加算 <br />
                      （10年ごとのLTV更新料も発生）
                    </td>
                    <td className="bg-red-500/5 p-4 font-bold text-foreground">
                      <span className="font-bold text-emerald-600">完全 0 円</span>
                      <div className="font-normal text-muted-foreground text-xs">
                        国税庁認定の「事務処理規程」を自社名で自動作成。電帳法完全適合。
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-4 font-semibold text-foreground">押印・サイン体験</td>
                    <td className="p-4 text-muted-foreground">
                      欧米風の筆記体サインが標準 <br />
                      日本の取引先から「ハンコじゃないのか」と戸惑われる
                    </td>
                    <td className="bg-red-500/5 p-4 font-bold text-foreground">
                      <span className="font-bold text-red-600">日本伝統の「認印（赤丸印）」自動生成</span>
                      <div className="font-normal text-muted-foreground text-xs">
                        受信者の苗字から朱肉丸印をリアルタイム描画。誰でも安心。
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-4 font-semibold text-foreground">スマホ署名</td>
                    <td className="p-4 text-muted-foreground">
                      PCブラウザ前提の複雑なUI <br />
                      スマホだと文字が小さく拡大縮小が必要
                    </td>
                    <td className="bg-red-500/5 p-4 font-bold text-foreground">
                      <span className="font-bold text-emerald-600">スマホ片手親指で10秒締結</span>
                      <div className="font-normal text-muted-foreground text-xs">
                        画面下部の大型親指バーで、現場や移動中でもタップだけで完結。
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-4 font-semibold text-foreground">電帳法への対応</td>
                    <td className="p-4 text-muted-foreground">
                      「電帳法対応」をうたうが、社内規程の策定はユーザー任せ（税理士・弁護士相談要）
                    </td>
                    <td className="bg-red-500/5 p-4 font-bold text-foreground">
                      <span className="font-bold text-red-600">国税庁準拠の規程を1クリック出力</span>
                      <div className="font-normal text-muted-foreground text-xs">
                        自社名入りの事務処理規程（Word/PDF/MD）を管理画面から即ダウンロード。
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-4 font-semibold text-foreground">初期搭載テンプレート</td>
                    <td className="p-4 text-muted-foreground">
                      空の状態で納品。PDFの座標指定やフィールド配置を自力で行う必要あり
                    </td>
                    <td className="bg-red-500/5 p-4 font-bold text-foreground">
                      <span className="font-bold text-foreground">日本の3大契約書を最初からシード</span>
                      <div className="font-normal text-muted-foreground text-xs">
                        業務委託・NDA・雇用契約書が最初から入っており、変数入力で即送信。
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3大特徴セクション ===== */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold text-red-600 text-xs uppercase tracking-widest">KEY FEATURES</h2>
            <p className="mt-2 font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl">
              無駄を削ぎ落とし、実務のスピードを10倍にする3つの特長
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* 特長1 */}
            <Card className="border-border/80 bg-gradient-to-b from-card to-background shadow-md transition-shadow hover:shadow-xl">
              <CardContent className="p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-xl">
                  スマホ親指10秒押印 ＆<br />
                  日本伝統の認印（電子印影）
                </h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  契約相手にアカウント作成やログインは求めません。
                  届いたメールのリンクを開くだけで、苗字の朱肉丸印が自動生成。
                  下部に配置された大型アクションボタンにより、外出先・現場でも親指ひとつで10秒で契約締結できます。
                </p>
                <div className="mt-6 flex items-center gap-2 font-semibold text-red-600 text-xs">
                  <Check className="h-4 w-4" /> 苗字別縦書き自動レイアウト
                </div>
              </CardContent>
            </Card>

            {/* 特長2 */}
            <Card className="border-border/80 bg-gradient-to-b from-card to-background shadow-md transition-shadow hover:shadow-xl">
              <CardContent className="p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Scale className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-xl">
                  国税庁公認の「電帳法規程」を
                  <br />
                  ワンクリック自動作成
                </h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  「タイムスタンプがないと税務調査で否認されるのでは？」という不安は不要です。
                  国税庁が定める「電子取引の取引情報に係る電磁的記録の保存等取扱規程」に完全準拠した社内規程を、
                  貴社名入りで即座に出力。税理士への説明もこれで完璧です。
                </p>
                <div className="mt-6 flex items-center gap-2 font-semibold text-emerald-600 text-xs">
                  <Check className="h-4 w-4" /> 電帳法第3条・第4条に適合
                </div>
              </CardContent>
            </Card>

            {/* 特長3 */}
            <Card className="border-border/80 bg-gradient-to-b from-card to-background shadow-md transition-shadow hover:shadow-xl">
              <CardContent className="p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-xl">
                  3大契約書を最初から搭載
                  <br />
                  変数入力で誰でも1分送信
                </h3>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  業務委託契約書、秘密保持契約書（NDA）、雇用契約書の3大定番雛形をあらかじめセットアップ済み。
                  相手先名や金額を入力するだけで、契約書PDFが自動生成されて相手に送信されます。
                  WordやPDFの面倒な準備作業から解放されます。
                </p>
                <div className="mt-6 flex items-center gap-2 font-semibold text-amber-600 text-xs">
                  <Check className="h-4 w-4" /> 弁護士監修レベルの定型条文
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== 標準雛形セクション ===== */}
      <section id="templates" className="border-border/50 border-t bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold text-red-600 text-xs uppercase tracking-widest">STANDARD TEMPLATES</h2>
            <p className="mt-2 font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl">
              アカウント作成直後から使える、日本の3大定型契約書
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              ゼロから書類を作る必要はありません。必要な項目（会社名・報酬・期間）を入力するだけで即時送信できます。
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* 雛形1: 業務委託 */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-red-500/50">
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="outline" className="border-red-500/20 text-red-600">
                  フリーランス / B2B外注
                </Badge>
                <FileCheck2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-foreground text-lg">業務委託基本契約書</h3>
              <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                フリーランスや制作会社への業務委託、開発・デザイン・コンサルティング等の受託業務に標準対応。
                知的財産権の帰属、再委託、損害賠償上限、支払条件を定めた堅牢な条文構成。
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 border-border/50 border-t pt-3">
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">委託料自動計算</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">和暦・西暦対応</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">署名順序ロック</span>
              </div>
            </div>

            {/* 雛形2: NDA */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-red-500/50">
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="outline" className="border-amber-500/20 text-amber-600">
                  商談前・提携検討
                </Badge>
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-foreground text-lg">秘密保持契約書 (NDA)</h3>
              <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                新規事業の立ち上げ、共同開発、営業秘密の開示前に必須となる秘密保持契約。
                双方開示（双務契約）形式で、秘密情報の範囲指定、目的外使用禁止、返還破棄義務を網羅。
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 border-border/50 border-t pt-3">
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">有効期間設定</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">双務開示対応</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">損害賠償条項</span>
              </div>
            </div>

            {/* 雛形3: 雇用契約 */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-red-500/50">
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-600">
                  正社員 / パート・アルバイト
                </Badge>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-foreground text-lg">雇用契約書 / 労働条件通知書</h3>
              <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                正社員・契約社員・パート採用時に労働基準法で義務付けられている労働条件通知書を兼ねた雇用契約書。
                就業場所、業務内容、賃金計算、所定労働時間、休日休暇、退職規程を明記。
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 border-border/50 border-t pt-3">
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  労基法法定要件準拠
                </span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">時給/月給切替</span>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">電磁的交付対応</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 電帳法コンプライアンスセクション ===== */}
      <section id="compliance" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card p-8 shadow-xl sm:p-12">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="mb-4 inline-flex items-center gap-x-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 text-xs dark:text-emerald-400">
                  <Scale className="h-3.5 w-3.5" />
                  <span>電子帳簿保存法（電帳法）完全適合</span>
                </div>

                <h2 className="font-extrabold text-2xl text-foreground tracking-tight sm:text-3xl">
                  なぜ、タイムスタンプなしでも税務署・税理士に認められるのか？
                </h2>

                <p className="mt-4 text-muted-foreground text-sm leading-relaxed sm:text-base">
                  電子帳簿保存法（電子取引データ保存）における「真実性の確保」には、法律上4つの選択肢が認められています。
                  そのうちの第4号が
                  <strong className="text-foreground">
                    「正当な理由がない訂正及び削除の防止に関する事務処理規程の備え付け」
                  </strong>
                  です。
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <span className="font-bold text-foreground text-sm">国税庁標準の規程フォーマットを標準同梱</span>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        デンケイの管理画面から、貴社の社名・管理責任者名が入った事務処理規程を1クリックで即時ダウンロード可能。
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <span className="font-bold text-foreground text-sm">
                        PostgreSQL WORMトリガーによる改ざん不可保護
                      </span>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        締結完了後の契約ログはデータベースレベルで更新・削除（UPDATE/DELETE）が物理的に拒絶されます。
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <span className="font-bold text-foreground text-sm">SHA-256 監査ログハッシュチェーン</span>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        直前の操作ハッシュを次レコードに連鎖記録。文書と監査証跡の同一性を数学的に証明。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <Link to="/signup">
                    <Button className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700">
                      電帳法対応キット付きで無料開始
                    </Button>
                  </Link>
                </div>
              </div>

              {/* 右側: 規程プレビューカード */}
              <div className="lg:col-span-5">
                <div className="rounded-xl border border-border bg-neutral-900 p-6 font-mono text-neutral-100 text-xs shadow-2xl">
                  <div className="flex items-center justify-between border-neutral-800 border-b pb-3 text-neutral-400">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      事務処理規程.md (国税庁準拠)
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-400">
                      第3条・第4条適合
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-[11px] text-neutral-300">
                    <div className="font-bold text-emerald-400">
                      # 電子取引の取引情報に係る電磁的記録の保存等取扱規程
                    </div>
                    <div className="text-neutral-500">第1条（目的）本規程は、電子帳簿保存法に基づき...</div>
                    <div className="text-neutral-400">第4条（訂正及び削除の原則禁止）</div>
                    <div className="rounded border border-neutral-700/80 bg-neutral-800/80 p-2.5 text-[10px] leading-relaxed">
                      電子取引データは、原則として訂正及び削除を行わないものとする。
                      デンケイシステム上のWORM監査ログとSHA-256ハッシュチェーンにより、 改ざんの不存在を担保する。
                    </div>
                    <div className="flex items-center justify-between pt-2 text-neutral-500">
                      <span>策定会社: [貴社名が自動挿入]</span>
                      <span className="text-emerald-400">✓ 規程DL対応</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 料金プランセクション ===== */}
      <section id="pricing" className="border-border/50 border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold text-red-600 text-xs uppercase tracking-widest">SIMPLE PRICING</h2>
            <p className="mt-2 font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl">
              追加請求の心配がない、明朗な定額使い切りプラン
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              送信ごとの従量課金やタイムスタンプ更新料はありません。クレジットカード登録不要のフリープランから始められます。
            </p>

            {/* 年払い/月払いトグル */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={`text-sm ${!isAnnual ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                月々払い
              </span>
              <button
                type="button"
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isAnnual ? 'bg-red-600' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span
                className={`flex items-center gap-1.5 text-sm ${isAnnual ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
              >
                年一括払い
                <Badge className="bg-red-600 px-1.5 py-0 text-[10px] text-white">2ヶ月分実質無料</Badge>
              </span>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
            {/* 1. フリープラン */}
            <Card className="flex flex-col border-border/80 bg-card shadow-md">
              <CardContent className="flex flex-1 flex-col p-8">
                <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider">FREE PLAN</div>
                <h3 className="mt-2 font-bold text-2xl text-foreground">フリープラン</h3>
                <p className="mt-1 text-muted-foreground text-xs">まずは試したい個人・小規模事業者向け</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-extrabold text-4xl text-foreground">¥0</span>
                  <span className="text-muted-foreground text-xs">/ 月</span>
                </div>
                <div className="mt-1 text-muted-foreground text-xs">永久無料・クレジットカード登録不要</div>

                <ul className="mt-8 flex-1 space-y-3 text-foreground text-sm">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>
                      <strong>月3件</strong>まで送信可能
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>電子認印（朱肉丸印）自動生成</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>スマホ10秒親指押印</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>メールOTP二要素認証</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-muted-foreground">
                    <X className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                    <span>電帳法事務処理規程キット</span>
                  </li>
                </ul>

                <Link to="/signup" className="mt-8 block">
                  <Button variant="outline" className="w-full font-semibold">
                    無料で今すぐ登録
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* 2. スタンダードプラン（主力） */}
            <Card className="relative z-10 flex scale-105 flex-col border-2 border-red-600 bg-card shadow-2xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-red-600 px-4 py-1 font-bold text-white text-xs shadow-md shadow-red-600/30">
                  一番人気・中小企業標準
                </Badge>
              </div>

              <CardContent className="flex flex-1 flex-col p-8">
                <div className="font-bold text-red-600 text-xs uppercase tracking-wider">STANDARD PLAN</div>
                <h3 className="mt-2 font-bold text-2xl text-foreground">スタンダード</h3>
                <p className="mt-1 text-muted-foreground text-xs">日常の契約業務をこれ1つで網羅する定額プラン</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-extrabold text-4xl text-red-600">¥{standardPrice}</span>
                  <span className="text-muted-foreground text-xs">（税込） / 月</span>
                </div>
                <div className="mt-1 text-muted-foreground text-xs">
                  {isAnnual ? '年払い一括（実質2ヶ月OFF）' : '月々更新・縛りなし'}
                </div>

                <ul className="mt-8 flex-1 space-y-3 text-foreground text-sm">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <span>
                      <strong>月100件</strong>まで送信定額（1件約29.8円）
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <span>
                      <strong>電帳法 事務処理規程キット</strong>（1クリック出力）
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <span>
                      <strong>3大定型契約雛形</strong>（業務委託・NDA・雇用）
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <span>
                      <strong>適格請求書（インボイス T番号）</strong>自動発行
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <span>電子認印（朱肉丸印）＆スマホ10秒親指押印</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <span>WORM暗号化＆SHA-256監査ログハッシュ</span>
                  </li>
                </ul>

                <Link to="/signup" className="mt-8 block">
                  <Button className="h-11 w-full bg-red-600 font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-700">
                    スタンダードで始める
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* 3. ビジネスプラン */}
            <Card className="flex flex-col border-border/80 bg-card shadow-md">
              <CardContent className="flex flex-1 flex-col p-8">
                <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider">BUSINESS PLAN</div>
                <h3 className="mt-2 font-bold text-2xl text-foreground">ビジネス</h3>
                <p className="mt-1 text-muted-foreground text-xs">大量送信・チーム複数名での運用向け</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-extrabold text-4xl text-foreground">¥{businessPrice}</span>
                  <span className="text-muted-foreground text-xs">（税込） / 月</span>
                </div>
                <div className="mt-1 text-muted-foreground text-xs">
                  {isAnnual ? '年払い一括（実質2ヶ月OFF）' : '月々更新・縛りなし'}
                </div>

                <ul className="mt-8 flex-1 space-y-3 text-foreground text-sm">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>
                      <strong>件数無制限</strong>（送信し放題）
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>
                      <strong>CSV一括送信</strong>（数十社へ一斉締結）
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>チームメンバー複数アカウント管理</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>スタンダードの全機能込み</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>優先サポート窓口</span>
                  </li>
                </ul>

                <Link to="/signup" className="mt-8 block">
                  <Button variant="outline" className="w-full font-semibold">
                    ビジネスで始める
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== よくあるご質問 (FAQ) ===== */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-semibold text-red-600 text-xs uppercase tracking-widest">FAQ</h2>
            <p className="mt-2 font-extrabold text-3xl text-foreground tracking-tight sm:text-4xl">よくあるご質問</p>
          </div>

          <div className="mt-12">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="rounded-xl border border-border/80 bg-card px-6">
                <AccordionTrigger className="py-5 text-left font-bold text-base hover:no-underline">
                  Q. タイムスタンプがなくても、電子帳簿保存法に違反しませんか？
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground text-sm leading-relaxed">
                  はい、完全に合法です。国税庁の「電子帳簿保存法一問一答（スキャナ保存・電子取引関係）」において、
                  真実性の確保要件として「正当な理由がない訂正及び削除の防止に関する事務処理規程を定め、これに沿った運用を行うこと」が明確に認められています。
                  デンケイでは管理画面からワンクリックで国税庁準拠の社内規程（貴社名入り）をダウンロードして備え付けることができるため、外部タイムスタンプ費用を一切払わずに適法運用が可能です。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="rounded-xl border border-border/80 bg-card px-6">
                <AccordionTrigger className="py-5 text-left font-bold text-base hover:no-underline">
                  Q. 契約相手（受信者）はお金がかかりますか？アカウント登録は必要ですか？
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground text-sm leading-relaxed">
                  契約相手の費用は一切不要（完全無料）です。また、相手方がデンケイのアカウントを作成したりログインしたりする必要もありません。
                  届いたメールのリンクをクリックするだけで、スマホやPCのブラウザから直ちに契約内容を確認し、10秒で電子認印を押印して締結を完了できます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="rounded-xl border border-border/80 bg-card px-6">
                <AccordionTrigger className="py-5 text-left font-bold text-base hover:no-underline">
                  Q. スタンダードプランの月100件を超えた場合はどうなりますか？
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground text-sm leading-relaxed">
                  勝手に追加課金されて想定外の請求が発生することは一切ありません。
                  100件に達した場合は送信が一時的に制限される安全設計となっております。
                  翌月にリセットされるか、必要に応じて件数無制限の「ビジネスプラン（月額4,980円）」へワンクリックでアップグレードできます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="rounded-xl border border-border/80 bg-card px-6">
                <AccordionTrigger className="py-5 text-left font-bold text-base hover:no-underline">
                  Q. 画面で押印される「認印（赤丸印）」は法的に有効ですか？
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground text-sm leading-relaxed">
                  はい、法的に有効です。日本の民法522条第2項（契約の成立要件）により、契約は書面や実印の有無にかかわらず、当事者の意思表示の合致によって成立します。
                  デンケイの認印システムは、受信者の苗字をもとに高解像度ベクターで日本の伝統的丸印を自動描画すると同時に、
                  押印日時・IPアドレス・メール認証コード・SHA-256ハッシュをデータベース（WORM監査ログ）に不可逆連鎖記録するため、
                  「いつ、誰が合意したか」を確実に証拠化できます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="rounded-xl border border-border/80 bg-card px-6">
                <AccordionTrigger className="py-5 text-left font-bold text-base hover:no-underline">
                  Q. インボイス制度（適格請求書）に対応していますか？
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground text-sm leading-relaxed">
                  はい、完全対応しています。ご契約プランのお支払いごとに、管理画面の「請求履歴」から
                  適格請求書発行事業者登録番号（T+13桁）および10%消費税額の内訳が明記された「適格請求書」をワンクリックでプレビュー・PDF印刷していただけます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="rounded-xl border border-border/80 bg-card px-6">
                <AccordionTrigger className="py-5 text-left font-bold text-base hover:no-underline">
                  Q. フリープランから自動的に有料プランに課金されることはありますか？
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground text-sm leading-relaxed">
                  一切ありません。フリープランの登録時にはクレジットカードの入力自体が不要です。
                  有料プラン（月額2,980円〜）をご利用になりたい場合のみ、管理画面から自発的にお手続きいただく安心設計です。
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* ===== 最終CTAセクション ===== */}
      <section className="border-border/50 border-t bg-gradient-to-t from-red-500/10 via-background to-background py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-red-600 p-3 text-white shadow-red-600/30 shadow-xl">
            <Stamp className="h-8 w-8" />
          </div>

          <h2 className="font-extrabold text-3xl text-foreground tracking-tight sm:text-5xl">
            今日から、契約書の印刷・製本・郵送・印紙代を
            <br className="hidden sm:inline" />
            すべて<span className="text-red-600">ゼロ</span>に。
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            月額2,980円で100件まで契約し放題。電帳法対応キットも認印機能もすべて込み。
            <br />
            まずはクレジットカード不要の無料プランで、10秒押印を体験してください。
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/signup">
              <Button
                size="lg"
                className="h-14 bg-red-600 px-10 font-bold text-lg text-white shadow-2xl shadow-red-600/30 transition-all hover:scale-105 hover:bg-red-700"
              >
                無料ではじめる（月3件まで0円・クレカ不要）
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-muted-foreground text-xs">登録は1分で完了。いつでも退会・ダウングレード可能です。</p>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer className="border-border/60 border-t bg-muted/40 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-red-600 font-bold text-white text-xs">
                印
              </div>
              <span className="font-bold text-foreground text-sm">
                デンケイ{' '}
                <span className="font-normal text-muted-foreground text-xs">| 中小企業特化型 電子契約サービス</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground text-xs">
              <a href="#features" className="hover:text-foreground">
                特徴
              </a>
              <a href="#comparison" className="hover:text-foreground">
                他社比較
              </a>
              <a href="#pricing" className="hover:text-foreground">
                料金プラン
              </a>
              <a href="#compliance" className="hover:text-foreground">
                電帳法適合
              </a>
              <a href="#faq" className="hover:text-foreground">
                FAQ
              </a>
              <Link to="/articles/signature-disclosure" className="hover:text-foreground">
                電子署名に関する開示情報
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-border/40 border-t pt-8 text-muted-foreground text-xs sm:flex-row">
            <div>© 2026 デンケイ (Denkei). All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span>電子帳簿保存法 第3条・第4条準拠</span>
              <span>インボイス制度（適格請求書）対応</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
