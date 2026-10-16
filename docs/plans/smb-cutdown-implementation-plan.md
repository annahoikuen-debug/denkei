# 中小企業特化・低価格・タイムスタンプなし割り切り型「デンケイ」詳細実装計画書

> **策定日**: 2026-10-16  
> **対象リポジトリ**: `e:/Denkei/denkei`  
> **方針**: 大手（クラウドサイン等）と正面衝突せず、「日常の低リスク定型契約（業務委託・NDA・雇用・発注請書）」に特化。タイムスタンプを廃止（初期OFF）して変動原価を極小化し、月額定額使い放題・電帳法事務処理規程同梱・スマホ10秒サインで中小企業市場を総取りする。

---

## 1. プロダクト方針と割り切りの基本設計

### 1.1 ターゲットと利用シーンの割り切り

| 項目 | 本計画での方針（採用） | 捨てるもの（非対象・サポート外） |
| :--- | :--- | :--- |
| **主な顧客** | 従業員50名以下の町工場、飲食店、ITベンチャー、個人事業主・フリーランス | 大手企業・上場企業・官公庁（法務部が認定TSAを必須とする先） |
| **対象契約書** | 業務委託契約、秘密保持契約(NDA)、雇用契約書・労働条件通知書、発注請書、受領書 | 不動産売買、数千万円以上の大型取引、係争可能性が高い契約 |
| **相手方（受信者）** | 個人、フリーランス、アルバイト、中小企業の経営者（スマホで即閲覧・サイン） | 「認定タイムスタンプがないと社内規定で受領できない」と主張する大手法務 |

### 1.2 コスト構造とプライシング

* **変動原価の極小化（1契約あたり約0.2円〜0.5円）**:
  * 認定TSA費用: **0円**（非付与、自前サーバー時刻記録＋ハッシュチェーン）
  * SMS認証費: **0円**（SMS廃止、メールOTP＋Firebaseメール認証に統一）
  * メール配信（Resend / SES）: 約0.1円
  * ストレージ（Cloudflare R2 / S3）: 約0.05円
  * 署名暗号化処理（共有鍵）: 約0.05円
* **料金プラン（税別）**:
  * **フリープラン（FREE）**: 0円 / 月3件まで（期限なし・クレカ登録不要）
  * **スタンダードプラン（STANDARD）**: **月額 2,980円 / 送信無制限（または月100件）**
  * **ビジネスプラン（BUSINESS）**: **月額 4,980円 / テンプレート共有＋社内承認フロー＋CSV一括**
* **粗利率**: 95%以上を維持

### 1.3 法的裏付け（タイムスタンプなしでの電帳法・電子署名法対応）

1. **電帳法（電子取引データ保存）**:
   * 国税庁規則に定められた「訂正・削除の履歴が残るシステム（ハッシュチェーン）」＋「**訂正削除の防止に関する事務処理規程の備え付け**」で100%合法的に充足。
   * **キラーアセット**: 国税庁サンプルに完全準拠した「事務処理規程テンプレート（Word/PDF）」をアプリ内から1クリックで無料ダウンロードできる導線を常設。
2. **電子署名法・民法**:
   * 民法第522条（方式不要主義）により契約は完全有効。
   * メールOTPまたはFirebase認証による本人確認ログ、IPアドレス、User-Agent、および監査ログハッシュチェーンを締結証明書に記録し、合意の証憑とする。

---

## 2. アーキテクチャ再編：過剰機能の削ぎ落とし

```mermaid
graph TD
    subgraph SaaS Minimal Architecture
        Web["Remix / Vite Web App<br/>(スマホ最適化ウィザード)"]
        API["tRPC API Engine"]
        DB[("PostgreSQL<br/>(データ + ローカルキュー)")]
        Storage[("Cloudflare R2 / S3<br/>(WORM オブジェクト)")]
        Signer["PAdES Signer<br/>(Local P12 / 共有KMS)"]
        Audit["ハッシュチェーン監査ログ<br/>(WORM Trigger)"]
    end

    Web --> API
    API --> DB
    API --> Storage
    API --> Signer
    API --> Audit

    subgraph 削減・除外された過剰機能
        X1["× 認定TSA(打刻費)"]
        X2["× SMS配信基盤"]
        X3["× 複雑な組織/チーム階層UI"]
        X4["× 外部ジョブ基盤 (Inngest/BullMQ)"]
        X5["× Enterprise Embedding / API v1"]
    end
```

---

## 3. 全体ロードマップ（全5ステージ・20ステップ）

期間目安: 3〜4週間（1〜2名体制想定）

```
Stage A: タイムスタンプ完全オプトイン化 & 署名軽量化 (ステップ1〜4)
Stage B: 電帳法キット同梱 & 日本語テンプレート雛形 (ステップ5〜8)
Stage C: スマホ最適化 & 3ステップ送信フロー (ステップ9〜12)
Stage D: 月額定額Stripe課金 & インボイス領収書 (ステップ13〜16)
Stage E: 過剰機能の削除・単一コンテナ化・総合検証 (ステップ17〜20)
```

---

## 4. 詳細実装ステップ

### Stage A: タイムスタンプ完全オプトイン化 & 署名軽量化（ステップ1〜4）

#### ステップ1: TSA処理のデフォルト無効化（オプトイン化）
* **目的**: 外部TSA未設定でもエラーにならず、サーバー時刻＋PAdES署名＋ハッシュチェーンのみで高速署名を完結させる。
* **対象ファイル**:
  * [packages/signing/index.ts](file:///e:/Denkei/denkei/packages/signing/index.ts)
  * [packages/signing/helpers/tsa.ts](file:///e:/Denkei/denkei/packages/signing/helpers/tsa.ts)
* **変更内容**:
  * `getTimestampAuthority()` が `null` の場合、TSA打刻処理を完全にスキップし、フォールバック警告なしで正常署名とする。
  * `estimatedSize` を TSA なし時の軽量サイズ（12KB）に最適化し、PDF生成速度を30%向上。
* **検証**: `npm test packages/signing` でTSA未設定時の署名ユニットテストがグリーン。

#### ステップ2: 署名トランスポートのSMB最適化
* **目的**: 高価な個別HSMなしでも安全に本番稼働できるようにする。
* **対象ファイル**:
  * [packages/signing/index.ts](file:///e:/Denkei/denkei/packages/signing/index.ts#L27-L37)
  * [packages/signing/transports/local.ts](file:///e:/Denkei/denkei/packages/signing/transports/local.ts)
* **変更内容**:
  * 本番環境での `local` (P12) を許可するフラグ `NEXT_PRIVATE_SIGNING_ALLOW_LOCAL_IN_PRODUCTION` の扱いを柔軟化。
  * 共有KMS（全テナント共通の安価な事業者署名鍵）またはサーバー内保護P12での署名を標準サポート。
* **検証**: 環境変数切り替えによる署名成功テスト。

#### ステップ3: 締結証明書PDFの文面改訂（タイムスタンプなし対応）
* **目的**: 締結証明書において「認定タイムスタンプ」ではなく「システム検証時刻および改ざん防止ハッシュチェーン」が記録されている旨を分かりやすく明記。
* **対象ファイル**:
  * [packages/lib/server-only/generate-certificate-pdf.ts](file:///e:/Denkei/denkei/packages/lib/server-only/generate-certificate-pdf.ts)
  * [packages/lib/server-only/render-certificate.ts](file:///e:/Denkei/denkei/packages/lib/server-only/render-certificate.ts)
* **変更内容**:
  * タイムスタンプ未付与時でも「締結日時（JST）」「ハッシュ値（SHA-256）」「監査ログハッシュチェーンID」を整然と出力。
  * 「電子帳簿保存法（電子取引データ保存）における訂正削除防止措置準拠」の注記を追加。
* **検証**: 生成された締結証明書PDFのレイアウト崩れ・文面アサーションテスト。

#### ステップ4: SMS認証コードの完全クリーンアップ
* **目的**: 中小企業が誤って従量課金の高いSMS機能を使わないようUIとAPIから完全撤去。
* **対象ファイル**:
  * [packages/lib/types/document-auth.ts](file:///e:/Denkei/denkei/packages/lib/types/document-auth.ts)
  * [packages/lib/server-only/otp/](file:///e:/Denkei/denkei/packages/lib/server-only/otp/)
* **変更内容**:
  * 本人確認オプションを「メールOTP（無料）」と「Firebaseメール認証（無料）」のみに固定。
  * Twilio等の外部SMSプロバイダ依存コードを排除。
* **検証**: 認証方式選択ダイアログでSMSが存在しないことのE2E確認。

---

### Stage B: 電帳法キット同梱 & 日本語テンプレート雛形（ステップ5〜8）

#### ステップ5: 「電帳法 事務処理規程」ダウンロード機能の実装
* **目的**: ユーザーが社内に備え付けるための国税庁準拠Word/PDFテンプレートを1クリックで取得可能にする。
* **対象ファイル**:
  * `assets/compliance/denchoho-rules-template.docx` (新規アセット)
  * `apps/remix/app/routes/_authenticated+/t.$teamUrl+/settings+/compliance.tsx` (新規設定画面)
  * `packages/lib/universal/compliance-kit.ts`
* **変更内容**:
  * 設定メニューまたはオンボーディングに「電帳法対策（事務処理規程ダウンロード）」タブを新設。
  * 自社名と日付を入れるだけで即座に税務署対応できる規程ひな形を配布。
* **検証**: ダウンロードエンドポイントの疎通テスト。

#### ステップ6: 中小企業向け3大日本語契約雛形の同梱（Seed追加）
* **目的**: ユーザーが自分でPDFを用意しなくても、登録直後にすぐ送信できるようにする。
* **対象ファイル**:
  * `packages/prisma/seed/data/jp-templates.ts` (新規)
  * `packages/prisma/seed/index.ts`
* **同梱する契約書**:
  1. **秘密保持契約書（NDA）**: 汎用的な双務契約
  2. **業務委託基本契約書**: フリーランス・小規模外注向け
  3. **雇用条件通知書兼合意書**: パート・アルバイト・正社員入社用
* **検証**: `npm run prisma:db:seed` 実行後、テンプレート一覧に3件が初期配置され、即座に変数を差し込んで送信できること。

#### ステップ7: テンプレート差し込み変数のUI統合
* **目的**: 契約書内の「甲社名」「乙社名」「報酬金額」「契約期間」などをフォーム入力で自動反映。
* **対象ファイル**:
  * [packages/lib/server-only/template/merge.ts](file:///e:/Denkei/denkei/packages/lib/server-only/template/merge.ts)
  * `apps/remix/app/routes/_authenticated+/t.$teamUrl+/templates+/$templateId+/use.tsx`
* **変更内容**:
  * テンプレートから「新規作成」をクリックした際、定義された変数（`{{取引先名}}`等）の入力フォームを自動生成。
  * 入力されたテキストをPDFフィールドに自動バインドしてエンベロープ作成。
* **検証**: 変数入力→送信→生成PDFに値が印字されているE2Eテスト。

#### ステップ8: 電帳法検索用メタデータの簡易入力
* **目的**: 税務調査時に必要な「取引先名・取引金額・取引年月日」を送信時に自動入力。
* **対象ファイル**:
  * [apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/recipients.tsx](file:///e:/Denkei/denkei/apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/recipients.tsx)
  * [packages/lib/universal/electronic-ledger-csv.ts](file:///e:/Denkei/denkei/packages/lib/universal/electronic-ledger-csv.ts)
* **変更内容**:
  * テンプレート変数の「取引先名」「金額」「契約日」から `DocumentMeta` の電帳法フィールドへ自動マッピング。手動二重入力を撲滅。
* **検証**: CSVエクスポートした際に値が正確に出力されることのユニットテスト。

---

### Stage C: スマホ最適化 & 3ステップ送信フロー（ステップ9〜12）

#### ステップ9: 受信者（相手方）のモバイル親指署名フローの極限簡素化
* **目的**: ITリテラシーの低い取引先やアルバイトでも、説明なしで10秒で署名完了できること。
* **対象ファイル**:
  * `apps/remix/app/routes/_unauthenticated+/sign+$token/`
  * `packages/ui/primitives/signature-pad-dialog.tsx`
* **変更内容**:
  * 画面上部の英語や専門用語を全廃。「ここをタップして名前を書いてください」のみ表示。
  * 手書きサイン（タッチ描画）と「キーボード入力印（名字の電子印影）」をワンタップ切り替え。
* **検証**: モバイルViewportでのE2E自動テスト（`packages/app-tests/e2e/jp-mobile-signing.spec.ts`）。

#### ステップ10: 送信ウィザードの3ステップ化固定
* **目的**: 送信側の迷いをゼロにする。
* **対象ファイル**:
  * `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/`
* **変更内容**:
  * ステップ1: 「契約書を選ぶ（またはPDFアップロード）」
  * ステップ2: 「相手の名前とメールアドレスを入力」
  * ステップ3: 「内容確認して送信ボタンを押す」
  * 詳細設定（署名順、リマインダー間隔、高度な認証など）はすべて「アコーディオン（詳細設定）」に隠し、デフォルト推奨値で通過させる。
* **検証**: ウィザードE2E（`packages/app-tests/e2e/jp-wizard-flow.spec.ts`）通過。

#### ステップ11: メール通知テンプレートの中小企業向け日本語リライト
* **目的**: 迷惑メールと誤認されたり、怪しまれて開かれない事故を防ぐ。
* **対象ファイル**:
  * [packages/email/templates/otp-verification.tsx](file:///e:/Denkei/denkei/packages/email/templates/otp-verification.tsx)
  * `packages/email/templates/send-document.tsx`
* **変更内容**:
  * 送信元表示名、件名、本文を徹底的に親しみやすい日本語に推敲。
  * 「〇〇様から大切な契約書類が届いています。スマートフォンから約1分でご確認・サインいただけます」等の安心感を伝える文面に統一。
* **検証**: メール送信プレビュー画面での確認。

#### ステップ12: メールOTP認証の1画面完結UI
* **目的**: パスワード不要の6桁ワンタイムパスワード入力をスムーズにする。
* **対象ファイル**:
  * `apps/remix/app/routes/_unauthenticated+/verify+/`
* **変更内容**:
  * 6つの入力ボックス自動フォーカス、クリップボードからのペースト一発認識。
* **検証**: OTP入力コンポーネントのテスト。

---

### Stage D: 月額定額Stripe課金 & インボイス領収書（ステップ13〜16）

#### ステップ13: プラン定義の2,980円定額モデルへの改定
* **目的**: 中小企業が最も意思決定しやすいプライシングにコードを更新。
* **対象ファイル**:
  * [packages/lib/constants/plans.ts](file:///e:/Denkei/denkei/packages/lib/constants/plans.ts)
* **変更内容**:
  ```typescript
  export const PLANS = {
    FREE: {
      id: 'FREE',
      label: '無料プラン',
      monthlyPriceJpy: 0,
      monthlyDocumentLimit: 3,
      features: { firebaseEmailAuth: false, templateSharing: false, approvalFlow: false }
    },
    STANDARD: {
      id: 'STANDARD',
      label: '中小応援スタンダード',
      monthlyPriceJpy: 2980,
      monthlyDocumentLimit: 100, // または null(無制限)
      features: { firebaseEmailAuth: true, templateSharing: true, approvalFlow: false }
    },
    BUSINESS: {
      id: 'BUSINESS',
      label: 'ビジネス',
      monthlyPriceJpy: 4980,
      monthlyDocumentLimit: null,
      features: { firebaseEmailAuth: true, templateSharing: true, approvalFlow: true }
    }
  };
  ```
* **検証**: `packages/lib/constants/plans.test.ts` での判定テスト。

#### ステップ14: 送信制限ゲートとアップグレード導線
* **目的**: 無料枠（3件）到達時に、自然な形で2,980円プランへ誘導する。
* **対象ファイル**:
  * `packages/lib/server-only/envelope/create-envelope.ts`
  * `apps/remix/app/components/dialogs/plan-limit-upgrade-dialog.tsx`
* **変更内容**:
  * 当月の送信件数をカウントし、上限到達時は日本語のアップグレードモーダルを表示。
* **検証**: プラン制限E2E（`packages/app-tests/e2e/jp-plan-gates.spec.ts`）。

#### ステップ15: Stripeサブスクリプション決済の結合
* **目的**: クレジットカード決済で即座にアップグレード可能にする。
* **対象ファイル**:
  * [packages/lib/server-only/stripe/](file:///e:/Denkei/denkei/packages/lib/server-only/stripe/)
* **変更内容**:
  * 日本円（JPY）決済、Stripe Checkout セッション作成、webhookでの即時プラン反映。
* **検証**: Stripeテストモードでの決済完了イベント受領テスト。

#### ステップ16: インボイス制度対応の領収書・請求書PDF自動発行
* **目的**: 中小企業が経費精算・税務申告でそのまま使える領収書を発行。
* **対象ファイル**:
  * `packages/lib/server-only/stripe/generate-invoice-pdf.ts`
* **変更内容**:
  * 適格請求書発行事業者登録番号（T番号）、税率ごとの消費税額、宛名を記載したPDF領収書の自動生成・ダウンロード。
* **検証**: 領収書PDF生成ユニットテスト。

---

### Stage E: 過剰機能の削除・単一コンテナ化・総合検証（ステップ17〜20）

#### ステップ17: 未使用Enterprise機能・組織階層UIの非表示化
* **目的**: コードの保守コストと画面の煩雑さを排除する。
* **対象ファイル**:
  * `apps/remix/app/routes/_authenticated+/` 配下のナビゲーション
  * `packages/ee/`
* **変更内容**:
  * 組織グループ・チーム階層・複雑な権限マトリクスをUIから撤去し、「管理者 / 一般メンバー」のシンプルなユーザー管理に一本化。
* **検証**: サイドバーおよび設定画面の視覚回帰・リンクチェック。

#### ステップ18: 単一コンテナ（All-in-One Docker）構成の整理
* **目的**: 運用コストを最小化し、Railway/Render/さくらのVPSなどで月数千円で稼働可能にする。
* **対象ファイル**:
  * [docker/Dockerfile](file:///e:/Denkei/denkei/docker/Dockerfile)
  * [railway.toml](file:///e:/Denkei/denkei/railway.toml)
  * [render.yaml](file:///e:/Denkei/denkei/render.yaml)
* **変更内容**:
  * Remix アプリケーション本体＋ローカルDBジョブワーカーを単一コンテナで起動する軽量構成。
  * Redisや複雑なメッセージブローカーを不要とし、PostgreSQL + S3(R2) の2点のみで稼働。
* **検証**: Dockerローカルビルドおよびヘルスチェック通過確認。

#### ステップ19: 監査ログWORM保護（改ざん防止トリガー）の確認
* **目的**: タイムスタンプがなくても電帳法要件を堅持するため、DBレベルでのUPDATE/DELETEを物理的に遮断。
* **対象ファイル**:
  * `packages/prisma/migrations/`
  * [packages/lib/server-only/document-audit-log-hash.ts](file:///e:/Denkei/denkei/packages/lib/server-only/document-audit-log-hash.ts)
* **変更内容**:
  * `DocumentAuditLog` テーブルに対して、PostgreSQLのトリガーでUPDATE/DELETEを例外エラーにするSQLを適用。
* **検証**: UPDATE文発行時に例外が発生することのマイグレーションテスト。

#### ステップ20: 総合E2Eリグレッション検証 & リリース判定
* **目的**: すべての変更が既存の重要テストを破壊していないことを確認。
* **検証項目**:
  1. 無料サインアップ → テンプレート選択 → 変数入力 → 送信
  2. モバイル受信者画面でメールOTP受領 → 10秒署名完了
  3. 締結証明書・監査ログ付きPDFダウンロード（電帳法注記確認）
  4. 事務処理規程Wordファイルのダウンロード疎通確認
  5. 4件目送信時のアップグレード導線表示
  6. 全体テスト実行（`npm run test`）グリーン確認

---

## 5. リグレッション防止・テストマトリクス

| テスト種類 | 対象 | 主な実行ファイル | 判定基準 |
| :--- | :--- | :--- | :--- |
| **ユニット (Vitest)** | プラン判定・電帳法CSV・署名・変数マージ | `packages/lib/**/*.test.ts` | 100% Pass |
| **E2E (Playwright)** | 日本語ウィザード送信 | `jp-wizard-flow.spec.ts` | 正常完了 |
| **E2E (Playwright)** | モバイル署名・手書き印 | `jp-mobile-signing.spec.ts` | 正常完了 |
| **E2E (Playwright)** | メールOTP認証 | `jp-otp-auth.spec.ts` | 正常完了 |
| **E2E (Playwright)** | プランゲート・制限 | `jp-plan-gates.spec.ts` | 正常完了 |
| **ビルド検査** | 型整合性・構文チェック | `tsc --noEmit` / `biome check` | エラー0件 |

---

## 6. リリース判定基準（Definition of Done）

1. **タイムスタンプ完全オプトイン**: TSA未指定環境で署名処理が何のエラーも出さず完了すること。
2. **電帳法対策キット**: 事務処理規程Wordが管理画面から正しくダウンロードできること。
3. **雛形同梱**: 初期状態で3つの日本語契約書（NDA、業務委託、雇用契約）がテンプレートとして使用可能なこと。
4. **月額2,980円の課金フロー**: Stripe決済テストを通過し、インボイス対応領収書PDFが出力されること。
5. **固定費・運用負荷の極小化**: 単一PostgreSQL＋単一コンテナ＋Cloudflare R2で安定稼働し、電話サポートなしで運用できるヘルプ導線が完備されていること。
