# フェーズ2 ステップ24: リマインダー既存機能のギャップ分析

## 既存機能のコードリーディング結果

### 既存ジョブ構成

| ジョブ | パス | 役割 |
| --- | --- | --- |
| `send-signing-reminders-sweep` | `packages/lib/jobs/definitions/internal/send-signing-reminders-sweep.ts` | 定時(sweep)で `nextReminderAt` が到来した recipient を抽出し `process-signing-reminder` を起動 |
| `process-signing-reminder` | `packages/lib/jobs/definitions/internal/process-signing-reminder.ts` | 個別 recipient へリマインダーメール送信(`reminderCount` / `lastReminderSentAt` / `nextReminderAt` を更新) |

### 既存データモデル

- `Recipient.nextReminderAt` / `lastReminderSentAt` / `reminderCount` が存在(インデックス済み: `@@index([nextReminderAt])`)
- リマインダー設定間隔は `DocumentMeta.reminderSettings`(Json: `ZEnvelopeReminderSettingsSchema`)で管理

### 既存 UI / 設定

- 組織・チーム設定にリマインダー設定画面が存在(`settings.reminders.tsx` ルート、`Reminder preferences updated` の翻訳あり)
- 送信(ウィザード)画面からの個別設定は未提供

### EE 制限

- リマインダー機能自体は Free プランでも動作(EE 制限なし)を確認

## ギャップ一覧(フェーズ2 で対応)

| # | ギャップ | 対応ステップ |
| --- | --- | --- |
| 1 | 送信画面(ウィザード)から「間隔/回数/ON・OFF」を設定できない | ステップ25: ウィザードステップ3 に設定 UI 追加 |
| 2 | 既定値「3日間隔・最大3回」が明示的に UI に現れない | ステップ25: 既定値を UI に表示 |
| 3 | リマインダー文面の ja 対応(既存テンプレートは en 前提の構造) | ステップ26: i18n カタログ経由で ja 化(フェーズ1で完訳済みの機構を活用) |
| 4 | 送信者への控え(copy)オプションがない | ステップ26: owner 宛コピーを追加 |
| 5 | 有効期限(7/14/30日/無期限)の送信画面 UI がない | ステップ27: ウィザードに期限選択を追加 |
| 6 | 期限切れ時の送信者通知は `send-owner-recipient-expired-email` で既存 → ja 文言はカタログ頼み | ステップ27: ja カタログ確認+既存ジョブ連携の E2E |
| 7 | リマインダー ON/OFF をテナント設定(TeamGlobalSettings)で制御する分岐 | ステップ32: 通知設定の ON/OFF |

## 結論

既存基盤(sweep + process ジョブ、`nextReminderAt` ベース)はそのまま利用可能。
フェーズ2では「UI(送信画面)+ja 文面+owner copy+期限 UI」を追加する形で対応する。
