# フェーズ1 3ステップ送信ウィザード仕様(ステップ13)

| 項目 | 内容 |
| --- | --- |
| 対象 | 「①アップロード → ②宛先 → ③フィールド配置・送信」の3ステップウィザード |
| ルート | `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+` 配下 |
| 旧フロー | 既存の `documents.$id.edit` は並行運用(feature flag 相当で残置) |
| 状態 | **骨子実装済み**(2026-10-15)。後述の「8. 既知の TODO」参照 |

## 1. 画面遷移

```
/t/:teamUrl/new            → ステップ1: PDFアップロード(new+/_index.tsx)
/t/:teamUrl/new/recipients → ステップ2: 宛先入力(new+/recipients.tsx)
/t/:teamUrl/new/fields     → ステップ3: フィールド配置(簡易モード)・確認・送信(new+/fields.tsx)
```

実装状況:

| ルート | 状態 | 備考 |
| --- | --- | --- |
| `new+/_index.tsx` | ✅ 実装済み | `WizardProgress` コンポーネントを export(他ステップから再利用)。「次へ」でステップ2へ遷移 |
| `new+/recipients.tsx` | ✅ 実装済み | Zod バリデーション + ja エラー表示。氏名を「姓 名」順に結合し query でステップ3へ引き渡し |
| `new+/fields.tsx` | ✅ 実装済み | 確認サマリ + 「詳細モードで編集」リンク + 「送信」ボタン(testid のみ、tRPC 連携は TODO) |

- 各ステップはエンベロープ ID(Draft)をクエリパラメータ `?envelopeId=` で持ち回る想定(結合は TODO)。
- 中断時も Draft が残るため、ドキュメント一覧の「続ける」から再開できる(ステップ18)。

## 2. 状態遷移

| ステップ | 状態 | 遷移条件 |
| --- | --- | --- |
| 1 | アップロード済み(EnvelopeItem 作成) | PDF 1件以上のアップロード+プレビュー表示 |
| 2 | 宛先確定 | 姓/名/メール入力(1名以上)、署名順選択(先方→自社 / 自社→先方 / 同時) |
| 3 | フィールド配置・送信 | 簡易モード既定(署名+日付を自動配置)。詳細モードへ切替可 |

## 3. ステップ2 仕様(実装済み)

- 入力項目: 姓(sei)/ 名(mei)/ メールアドレス + 署名順ラジオボタン
- 氏名は [`japanese-name.ts`](../../packages/lib/universal/japanese-name.ts) の `joinJapaneseName` で「姓 名」順に結合
- 署名順: `counterparty-first`(先方→自社)/ `company-first`(自社→先方)/ `parallel`(同時)
- Zod スキーマ(`ZRecipientFormSchema`)でバリデーションし、フィールド単位の ja エラーメッセージを表示

**testid 一覧:**

| testid | 要素 |
| --- | --- |
| `wizard-progress` | ステップ進行表示(ol) |
| `wizard-step1-next` | ステップ1「次へ」ボタン |
| `wizard-sei` / `wizard-mei` / `wizard-email` | 姓 / 名 / メール入力 |
| `wizard-order-counterparty-first` / `wizard-order-company-first` / `wizard-order-parallel` | 署名順ラジオ |
| `wizard-step2-next` | ステップ2「次へ」ボタン |
| `wizard-summary` | ステップ3 確認サマリ |
| `wizard-summary-name` | サマリ内の宛先氏名(「田中 太郎」形式で表示されることを E2E で検証) |
| `wizard-advanced-mode` | 「詳細モードで編集」リンク |
| `wizard-send` | 「送信」ボタン |

## 4. ステップ3 仕様(簡易モード)

- 既定: 署名者1名につき SIGNATURE + DATE を各ページへ自動配置(**自動配置ロジックは TODO**、現状はサマリ表示のみ)
- 「詳細モードへ切替」でドキュメント一覧へリンク(既存 `documents.$id.edit` エディタへの直接リンクは TODO)
- 確認サマリ: 宛先・自動配置フィールドを表示 → 「送信」で tRPC distribute を呼び出し(**tRPC 連携は TODO**)

## 5. 中断/再開(未実装: ステップ18)

- どのステップでも Draft として自動保存(既存 autosave 機構を利用)— **TODO**
- 一覧画面(Draft フィルタ)に「続ける」ボタンを表示 — **TODO**

## 6. クリック数目標

現行 10 クリック → ウィザード 5 クリック以内:
1. アップロード(ドロップ 1 操作)
2. 「次へ」
3. 宛先入力後「次へ」
4. 簡易モード確認後「送信」
5. 確認ダイアログ「確定」

## 7. E2E

- [`jp-wizard-flow.spec.ts`](../../packages/app-tests/e2e/jp-wizard-flow.spec.ts): 実装済み
  - ステップ1→2→3 の遷移と ja 文言表示
  - 不正メール入力時の ja エラー表示(「有効なメールアドレスを入力してください」)
  - サマリに「姓 名」結合氏名が表示されること
- 未カバー(実装後に追加): アップロード結合、送信完了、下書き再開

## 8. 既知の TODO(現状との差分)

1. **エンベロープ結合**: ステップ1 で既存のエンベロープ作成機構(`create-envelope` / `trpc.envelope.editor.*`)と接続し、`?envelopeId=` で Draft を持ち回る。現在はスタブ画面。
2. **PDF アップロード UI**: 既存 `packages/lib/universal/upload/` のアップロード機構を組み込み、プレビュー表示を追加。
3. **宛先の tRPC 保存**: ステップ2 の入力を Recipient として保存(署名順を `signingOrder` に反映)。
4. **簡易モード自動配置**: SIGNATURE + DATE の自動配置ロジック(`packages/lib/server-only/envelope-editor.ts` 連携)。
5. **送信 tRPC 連携**: 「送信」で distribute(`send-signing-email` ジョブ発火)を呼び出す。
6. **下書き保存・再開**: Draft 自動保存と一覧の「続ける」ボタン(ステップ18)。
7. **電帳法メタ入力**(オプション): DocumentMeta に追加済みの `contractType` / `counterpartyName` / `contractAmount` / `contractDate` をステップ2 またはステップ3 のサマリに入力欄を設ける。
8. **E2E 拡張**: 上記 1〜6 実装後に「アップロード→送信完了→下書き再開」の E2E を追加。
