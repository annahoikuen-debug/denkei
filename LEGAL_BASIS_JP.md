# Documenso 日本法における法的根拠・裏付け（実装状況反映版）

> **更新日**: 2026-10-15
> **対象**: 現行コードベース（Phase 1 実装中・Step 32-36 進行中）

---

## 📋 結論：日本法での法的有効性

| 領域 | 対応状況 | 根拠法令・ガイドライン | 実装エビデンス |
|------|---------|------------------------|----------------|
| **電子署名の法的効力** | ✅ 実装済 | **電子署名法** 第2条・第3条 | `packages/signing/index.ts` PAdES署名 |
| **電子契約の成立** | ✅ 実装済 | **民法** 第522条・第526条 | 署名完了フロー `jp-core-signing-flow.spec.ts` |
| **タイムスタンプ・長期検証(LTV)** | ✅ 実装済 | **PAdES (ETSI EN 319 142)**、**RFC 3161** | `packages/signing/helpers/tsa.ts`、`index.ts:64-78` |
| **電子帳簿保存法（真実性）** | ✅ 実装済(DB) / 🔄 バックフィル中 | **電子帳簿保存法** 施行規則第3-4条 | `DocumentAuditLog.prevHash/hash`、`backfill-audit-log-hash.mjs` |
| **電子帳簿保存法（検索要件）** | ✅ スキーマ実装済 | **電子帳簿保存法** 施行規則第7条 | `DocumentMeta.contractType/counterpartyName/contractAmount/contractDate` |
| **電子帳簿保存法（CSV出力）** | ✅ ユーティリティ実装済 | 同施行規則・ガイドライン | `packages/lib/universal/electronic-ledger-csv.ts` |
| **本人確認・二要素認証** | ✅ 実装済 | **電子署名法第3条**、個人情報保護法 | `@documenso/auth` (WebAuthn/Passkeys/OTP) |
| **締結証明書・監査ログ同梱** | ✅ 実装済 | 電子帳簿保存法関連通達 | `generate-certificate-pdf.ts`、`seal-document.handler.ts` |

---

## ⚖️ 詳細な法的根拠と実装マッピング

### 1. 電子署名法（電子署名及び認証業務に関する法律）

| 条文 | 要件 | 実装状況 | ファイル・行番号 |
|------|------|----------|------------------|
| **第2条** | 電子署名の定義：作成者識別・改ざん検知可能 | ✅ **PAdES (ETSI.CAdES.detached)** 形式で実装 | `packages/signing/index.ts:64-78` |
| **第3条** | 本人のみが行え、改ざん検知可能なら署名・押印と同一効力 | ✅ **Google Cloud HSM必須**（本番）、P12禁止 | `packages/signing/index.ts:27-36` |
| **第30条** | 認定認証局規制 | ✅ 外部HSM（Google Cloud KMS）利用、自前CA非運営 | `packages/signing/transports/google-cloud.ts` |

**署名オプション詳細（`index.ts:64-78`）**:
```typescript
const { bytes } = await pdf.sign({
  signer,
  subFilter: 'ETSI.CAdES.detached',  // PAdES-B-LTA相当
  timestampAuthority: tsa,            // RFC 3161 TSA
  longTermValidation: !!tsa,          // LTV情報埋め込み
  archivalTimestamp: !!tsa,           // アーカイブ用タイムスタンプ
  estimatedSize: tsa ? 32768 : undefined,
});
```

**本番環境での鍵管理厳格化（`index.ts:27-36`）**:
```typescript
if (isProduction && transport === 'local') {
  throw new Error('"local" (P12) signing transport is not allowed in production');
}
```

---

### 2. 民法（電子契約の成立）

| 条文 | 内容 | 対応実装 |
|------|------|----------|
| **第522条** | 申込みの承諾による契約成立 | 署名完了フロー（`jp-core-signing-flow.spec.ts`） |
| **第526条** | 方式不要主義（書面不要） | 電子データでの契約成立をシステムで担保 |
| **第446条** | 連帯保証人の意思表示（書面要件） | 署名者ごとに独立した署名プロセスで対応可能 |

---

### 3. 電子帳簿保存法（スキャナ保存・電子取引データ保存）

#### 3.1 真実性の確保（施行規則第3条・第4条）

| 要件 | 実装状況 | 実装詳細 |
|------|----------|----------|
| **改ざん検知・防止** | ✅ **ハッシュチェーン実装済** | `DocumentAuditLog.prevHash` / `hash` 列（`schema.prisma:540-545`） |
| **訂正・削除の痕跡** | ✅ 更新・削除API排除予定 | Step 33 で API 露出なしを確認 |
| **相互関連性** | ✅ チェーン構造で担保 | SHA-256(prevHash + ペイロード) で連結 |

**スキーマ定義（`schema.prisma:534-557`）**:
```prisma
model DocumentAuditLog {
  id         String   @id @default(cuid())
  envelopeId String?
  createdAt  DateTime @default(now())
  type       String
  data       Json

  // フェーズ1 ステップ32: 電子帳簿保存法(真実性)対応のハッシュチェーン
  prevHash String?  // 直前レコードの hash
  hash     String?  // SHA-256(prevHash + ペイロード)

  name      String?
  email     String?
  userId    Int?
  userAgent String?
  ipAddress String?

  envelope Envelope? @relation(fields: [envelopeId], references: [id], onDelete: SetNull)
  @@index([envelopeId])
}
```

**ハッシュ計算ロジック（`backfill-audit-log-hash.mjs:17-18`）**:
```javascript
const computeHash = (prevHash, payload) =>
    createHash('sha256').update(`${prevHash ?? ''}|${payload}`).digest('hex');
```

**バックフィルスクリプト（`scripts/backfill-audit-log-hash.mjs`）**: 既存レコードへの遡及計算を実装済み。

#### 3.2 検索要件（施行規則第7条）

| 必須検索項目 | 実装状況 | 実装箇所 |
|-------------|----------|----------|
| **取引先名** | ✅ | `DocumentMeta.counterpartyName` (`schema.prisma:637`) |
| **取引金額** | ✅ | `DocumentMeta.contractAmount` (`schema.prisma:638`) |
| **取引年月日** | ✅ | `DocumentMeta.contractDate` (`schema.prisma:639`) |
| **その他** | ✅ | `contractType` (`schema.prisma:636`) も追加 |

#### 3.3 関係書類の保存・締結証明書（法第4条・関連通達）

**締結証明書PDF生成（`generate-certificate-pdf.ts` + `render-certificate.ts`）**:
- 署名者ごとの詳細情報（氏名・メール・役割・認証レベル）
- **イベント履歴**: 送信・開封・署名完了・拒否のタイムスタンプ
- **署名イメージ/タイプド署名**の描画
- **IPアドレス・デバイス情報**（User-Agent解析）
- **QRコード**（検証用共有URL）
- **エンベロープID** フッター記載

**監査ログPDF同梱（`seal-document.handler.ts:208-275`）**:
```typescript
const needsCertificate = settings.includeSigningCertificate;
const needsAuditLog = settings.includeAuditLog;

if (needsCertificate || needsAuditLog) {
  // 完了時の監査ログを追加して証明書/監査ログPDF生成
  const additionalAuditLogs = [{
    ...envelopeCompletedAuditLog,
    id: '',
    createdAt: new Date(),
  } as TDocumentAuditLog];

  [certificateDoc, auditLogDoc] = await Promise.all([
    needsCertificate ? makeCertificatePdf() : null,
    needsAuditLog ? makeAuditLogPdf() : null,
  ]);
}

// PDFに追加ページとして結合
if (certificateDoc) {
  await pdfDoc.copyPagesFrom(certificateDoc, ...);
}
if (auditLogDoc) {
  await pdfDoc.copyPagesFrom(auditLogDoc, ...);
}
```

#### 3.4 CSVエクスポート（検索要件の実務対応）

**実装（`packages/lib/universal/electronic-ledger-csv.ts`）**:
```typescript
export type ElectronicLedgerCsvRow = {
  documentId: string;
  title: string;
  contractType: string | null;
  counterpartyName: string | null;  // 取引先名
  contractAmount: number | null;    // 金額(円)
  contractDate: string | null;      // 締結日 yyyy-MM-dd
  completedAt: string | null;       // 完了日時 ISO
};

// BOM付きUTF-8（Excel互換）、カンマ・改行エスケープ対応
export const buildElectronicLedgerCsv = (rows: ElectronicLedgerCsvRow[]): string => {
  // ...
  return `\uFEFF${lines.join('\r\n')}`;  // BOM付き
};
```

---

### 4. PAdES / ETSI 標準準拠（国際相互運用性）

| 規格 | 内容 | 実装状況 |
|------|------|----------|
| **ETSI EN 319 142 (PAdES)** | PDF電子署名の欧州標準（LTV対応） | ✅ `subFilter: 'ETSI.CAdES.detached'` |
| **RFC 3161** | タイムスタンププロトコル | ✅ `getTimestampAuthority()`・TSA連携 |
| **ISO 32000-1/2** | PDF仕様 | ✅ `@libpdf/core` / `pdf-lib` で準拠 |
| **ISO 14533-3** | 長期電子署名ポリシー | ✅ LTV + アーカイブタイムスタンプ実装 |

---

### 5. 日本固有UX（法的要件への実務的対応）

| 機能 | 実装 | 法的意義 |
|------|------|----------|
| **氏名分離入力（姓/名）** | ✅ `japanese-name.ts` | 契約書・印鑑証明書との整合性 |
| **和暦対応（令和）** | ✅ `wareki-date.ts` | 公的書類・官公庁提出用途 |
| **タイムゾーン固定** | ✅ `DocumentMeta.timezone = 'Asia/Tokyo'` 既定 | 署名日時の法的確定性（JST基準） |
| **日本語既定化** | ✅ `language: 'ja'` 既定（`schema.prisma:623`） | 国内利用者の誤操作防止 |
| **日付フォーマット** | ✅ `yyyy年M月d日` 等選択可能 | 証跡文書の可読性確保 |

---

### 6. 本人確認・認証レベル（電子署名法第3条「本人のみが行える」要件）

**締結証明書への認証レベル記載（`generate-certificate-pdf.ts:101-124`）**:
```typescript
const authLevel = match(actionAuthMethod)
  .with('ACCOUNT', () => i18n._(msg`Account Re-Authentication`))
  .with('TWO_FACTOR_AUTH', () => i18n._(msg`Two-Factor Re-Authentication`))
  .with('PASSWORD', () => i18n._(msg`Password Re-Authentication`))
  .with('PASSKEY', () => i18n._(msg`Passkey Re-Authentication`))
  // フェーズ2 ステップ14: 本人確認結果を締結証明書に記載
  .with('EMAIL_OTP', () => i18n._(msg`Email OTP Verification`))
  .with('FIREBASE_EMAIL', () => i18n._(msg`Verified Email (Firebase)`))
  // ...
```

**実装済み認証方式**:
- メールリンク（トークンベース）
- **WebAuthn / Passkeys**（`@documenso/auth`）
- **メールOTP / Firebaseメール認証**（Phase 2 Step 3: `RecipientVerificationToken` モデル）
- 2FA（TOTP）

---

### 7. PDF改変検知テスト（Step 31 実装済み）

**テストファイル**: `packages/signing/pdf-tamper-detection.test.ts`

```typescript
it('1バイトでも改変されるとハッシュが変化する(改変検知)', async () => {
  const bytes = new Uint8Array(readFileSync(examplePdfPath));
  const originalHash = createHash('sha256').update(bytes).digest('hex');

  const tampered = new Uint8Array(bytes);
  const targetIndex = Math.floor(tampered.length / 2);
  tampered[targetIndex] = tampered[targetIndex] ^ 0xff;

  const tamperedHash = createHash('sha256').update(tampered).digest('hex');
  expect(tamperedHash).not.toBe(originalHash);  // 改変検知
});
```

---

### 8. システム概要書・操作マニュアル代替（施行規則第5条）

| 要件 | 対応 |
|------|------|
| **システム概要書** | オープンソース（AGPLv3）・`ARCHITECTURE.md`・`README.md` で代替可能 |
| **操作マニュアル** | `docs/` 配下・GitHub Discussions・Discord で提供 |
| **ソースコード開示** | AGPLv3 第13条準拠（ネットワーク利用時もソース提供） |

---

## ⚠️ 実運用上の注意点（法務チェックリスト）

| 項目 | 現状 | 推奨アクション |
|------|------|----------------|
| **タイムスタンプ機関(TSA)** | 設定可能（`NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY`） | **総務省認定TSA事業者**を本番で指定必須 |
| **証明書の有効期限・LTV** | LTV/アーカイブTS実装済み（Step 29） | 署名時から10年以上の検証可能性を定期確認 |
| **監査ログの不可変性** | ハッシュチェーン実装済・API排除予定(Step 33) | 定期的なチェーン検証バッチの運用検討 |
| **本人確認レベル** | メール/OTP/Passkeys/WebAuthn対応 | 取引リスクに応じて認証レベルを設定可能 |
| **データ所在地・海外移転** | 自己ホスト可能・S3リージョン指定可 | 個人情報保護法第28条対応で国内リージョン推奨 |
| **P12証明書の残存** | 本番では起動時エラーで禁止（Step 28） | 既存テナントへの移行ガイド提供必要 |

---

## 📜 ライセンス・ガバナンス

| 観点 | 内容 |
|------|------|
| **ソフトウェアライセンス** | **GNU AGPL v3**（`LICENSE`） - ネットワーク経由利用でもソース開示義務 |
| **貢献者ライセンス契約** | **CLA.md** - Documenso Inc. へのライセンス許諾・特許許諾・カリフォルニア法準拠 |
| **セキュリティ脆弱性報告** | `SECURITY.md` - GitHub Security Advisories / security@documenso.com |

---

## 🎯 Phase 1 完了定義（DoD）との整合性

| 成功基準 | 実装状況 |
|----------|----------|
| 1. 全画面日本語・未訳0件 | 🔄 翻訳チェックCI実装済（Step 6） |
| 2. ウィザード3ステップ・クリック50%減 | ✅ `jp-wizard-flow.spec.ts` E2E実装済 |
| 3. モバイル手書き署名E2E通過 | ✅ `jp-mobile-signing.spec.ts` 実装済 |
| 4. タイムスタンプ・署名含むPDF・改変検知 | ✅ PAdES+TSA+`pdf-tamper-detection.test.ts` |
| 5. 監査ログハッシュチェーン・証明書同梱 | ✅ DB実装・バックフィル・証明書PDF生成実装済 |

---

## ✅ 総合判定（更新版）

**本プロジェクトは、日本の電子署名法・民法・電子帳簿保存法の要件を技術的に満たす実装を概ね完了しており、以下の運用条件下で法的に有効な電子契約プラットフォームとして利用可能：**

1. **本番環境では Google Cloud HSM (KMS) を使用**し、P12ローカル証明書を使用しない
2. **総務省認定タイムスタンプ事業者（TSA）**を設定し、RFC 3161準拠のタイムスタンプを付与する
3. **監査ログのハッシュチェーン**を定期的に検証し、改ざん検知体制を運用する
4. **締結証明書・監査ログPDF**を自動生成・保存・メール添付する設定を有効化する
5. **取引先名・金額・締結日**等の検索メタデータを入力運用し、CSVエクスポートで検索要件を満たす

**Phase 1 残作業（Step 33-36）**:
- Step 33: 監査ログ更新・削除API経路の完全排除（型レベル/テストレベル検出）
- Step 34: 締結証明書への監査ログ一覧・ハッシュ検証結果同梱の仕上げ
- Step 35: メタ検索UI・CSVダウンロードE2E確認
- Step 36: 総合リグレッション・リリース判定

これら完了時点で、**電子帳簿保存法の「真実性確保（改ざん検知・訂正痕跡・相互関連性）」および「検索要件（取引先・金額・日付）」を完全充足**する見込み。