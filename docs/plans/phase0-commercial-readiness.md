# Phase0 商業準備実装計画書（早期改善版）

## 1. 背景・目的

デンケイは「日本語・日本法対応の深さ」で差別化できる電子契約プラットフォームだが、商業的に成立させるには以下の課題がある：

1. 「国税庁公認」という表現は事実と異なり、国税庁がソフトを公認する制度は存在しない。法的リスクがあり信用を損なう。
2. テスト成果物（test-artifacts/, test-results/）や作業痕跡（errors.txt 等）がリポジトリに混入し、品質管理上の欠陥。
3. Windows（CRLF）環境での Biome/Vitest 失敗を理由に、CI で lint・型チェック・単体テストを毎コミット実行していない。商用品質の証拠がない。
4. 収益モデルが「月額2,980円定額」だけで、1社あたり年商8.4万円に頭打ち。高単価口（年間サポート契約・HSM署名・代理店販売）が未整備。

本計画書は「直せる所」を早期に直すための実装計画であり、Phase1（本格商用化）への橋渡し位置づけとする。

## 2. 実装範囲（Phase0）

| カテゴリ | 内容 | 期限 |
|---------|------|------|
| リポジトリ衛生 | .gitignore へのテスト成果物・作業痕跡の追加、errors.txt 削除 | 即日 |
| 法的・信頼リスク | 「国税庁公認」表現の全修正（README/USER_MANUAL/計画ドキュメント） | 即日 |
| CI・品質保証 | .github/workflows/ci.yml への lint/typecheck/test 追加、package.json "ci" スクリプト拡張 | 今週中 |
| 収益構造文書化 | 年間サポート契約・HSM署名従量課金・代理店販売の方針をREADMEに追記 | 今週中 |

## 3. タスク詳細

### T-01: .gitignore にテスト成果物・作業痕跡を追加

**対象ファイル**: `.gitignore`

**変更内容**:
```
# test artifacts
test-artifacts/
test-results/
*.log

# operational work artifacts
errors.txt
OPERATOR_TODO.md
```

**完了条件**: `git status` で test-artifacts/, test-results/, errors.txt が untracked にならないこと。

### T-02: README.md の「国税庁公認」表現を修正

**対象ファイル**: `README.md`

**変更箇所**:
- L27: `国税庁公認の事務処理規程つき` → `電帳法第4号の要件に基づく事務処理規程つき`
- L45: `国税庁公認・事務処理規程キット` → `電帳法第4条準拠・事務処理規程キット`

**注意**: 「公認」という語は削除。「電帳法第4条/第4号準拠」に変更し、国税庁がソフト自体を認証している印象を与えない。

**完了条件**: README.md 内に「国税庁公認」の文字列が存在しないこと。

### T-03: USER_MANUAL.md の同様表現を修正

**対象ファイル**: `USER_MANUAL.md`

**変更箇所**: L32 の `国税庁公認・事務処理規程キット` → `電帳法第4条準拠・事務処理規程キット`

**完了条件**: USER_MANUAL.md 内に「国税庁公認」の文字列が存在しないこと。

### T-04: docs/plans/smb-growth-hands-off-implementation-plan.md の同様表現を修正

**対象ファイル**: `docs/plans/smb-growth-hands-off-implementation-plan.md`

**変更箇所**: L122, L208 の「国税庁公認」→「電帳法第4条準拠」

**完了条件**: ファイル内に「国税庁公認」の文字列が存在しないこと。

### T-05: CI workflow に lint・型チェック・単体テストを追加

**対象ファイル**: `.github/workflows/ci.yml`

**変更内容**:
- `build_app` ジョブに以下のステップを追加:
  - `npm run lint` (biome check)
  - `npx tsc --noEmit -p apps/remix/tsconfig.json` (型チェック)
  - `npm run test:unit` (vitest、パッケージ単位)
- `npm run ci` スクリプトを `turbo run build ... && turbo run test:e2e` から `turbo run lint && turbo run typecheck && turbo run test:unit && turbo run test:e2e` に拡張（並列化可）

**完了条件**: main への push/PR で biome check, tsc --noEmit, vitest が毎回実行され、失敗時にマージブロックされること。

### T-06: package.json "ci" スクリプト拡張

**対象ファイル**: `package.json`

**変更内容**:
```
"ci": "turbo run lint --continue-on-error && turbo run typecheck --continue-on-error && turbo run test:unit --continue-on-error && turbo run test:e2e",
```

各ワークスペースに `lint`, `typecheck`, `test:unit` スクリプトが存在しない場合は追加する。

**完了条件**: `npm run ci` がローカルで実行可能になり、品質ゲートとなること。

### T-07: 収益構造の文書化（年間サポート契約・高単価口）

**対象ファイル**: `README.md`

**変更内容**:
- 「主要機能」または新セクション「商用プランと収益モデル」を追加
- 3プラン（FREE/STANDARD/BUSINESS）に加え、以下を追記:
  - 年間サポート契約（HSM署名、インシデントSLA、マイグレーション代行）: 顧客単価 10〜30万円/年
  - 電子証明書・HSM署名の従量課金
  - 代理店/パートナー販売経路（税理士・社労士・IT請負業者）

**完了条件**: README に「月額2,980円だけではない」収益口が明記されていること。

## 4. スケジュール

| 日付 | タスク | 担当 |
|------|--------|------|
| Day 1 | T-01, T-02, T-03, T-04 | 即実施 |
| Day 2-3 | T-05, T-06 (CI設定・動作確認) | 即実施 |
| Day 4-5 | T-07 (収益構造文書化) | 即実施 |
| Day 7 | 動作確認・プルリクエスト・マージ | 即実施 |

## 5. 完了条件（Phase0 完了と判定する基準）

- [ ] `.gitignore` に `test-artifacts/`, `test-results/`, `errors.txt` が追加済み
- [ ] 全ドキュメントから「国税庁公認」表現が消滅
- [ ] CI で `npm run lint` (biome), `tsc --noEmit`, `vitest` が毎コミット実行され、main マージ前に通過必須
- [ ] README に高単価収益口（年間サポート契約・HSM署名・代理店販売）が記載済み
- [ ] `npm run ci` がローカルでエラーなく完走すること

## 6. リスクと対策

| リスク | 対策 |
|--------|------|
| Windows で Biome/Vitest が失敗する | CI は ubuntu-latest で実行。ローカルは WSL または GitHub Codespaces を推奨 |
| CI 時間が長くなる | lint/typecheck/test を並列ジョブ化し、キャッシュを効かせる |
| 「国税庁公認」削除でLPの訴求力が下がる | 「電帳法第4条準拠」「国税庁告示に基づく規程テンプレート」に言い換え、法的正確性を訴求 |

---

作成日: 2026-11-19
ステータス: 実装準備完了