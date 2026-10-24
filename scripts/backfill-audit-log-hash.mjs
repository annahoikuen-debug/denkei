#!/usr/bin/env node
/**
 * フェーズ1 ステップ32: 監査ログハッシュチェーンのバックフィル(遡及計算)スクリプト
 *
 * DocumentAuditLog の既存レコード(prevHash/hash が NULL)に対して、
 * エンベロープごとに作成日時順でハッシュチェーンを計算して埋める。
 *
 * C-2 修正: DocumentAuditLog は WORM(UPDATE/DELETE 物理遮断)テーブルのため、
 * 既定では UPDATE が DB トリガーで拒否される。
 *
 * 既存レコード(WORM 適用前に作成された行)への遡及計算は電子帳簿保存法の
 * 「訂正・削除防止」要件の適用前データへの初期投入であり、
 * DBA による明示的なオプトイン(--allow-trigger-toggle)でのみ
 * トリガーを一時無効化して実行する(実行後に必ず再有効化する)。
 *
 * usage:
 *   DATABASE_URL=... node scripts/backfill-audit-log-hash.mjs
 *   DATABASE_URL=... node scripts/backfill-audit-log-hash.mjs --allow-trigger-toggle
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALLOW_TRIGGER_TOGGLE = process.argv.includes('--allow-trigger-toggle');

const computeHash = (prevHash, payload) =>
  createHash('sha256')
    .update(`${prevHash ?? ''}|${payload}`)
    .digest('hex');

async function setWormTriggerEnabled(enabled) {
  const statement = enabled
    ? 'ALTER TABLE "DocumentAuditLog" ENABLE TRIGGER trg_prevent_audit_log_update;'
    : 'ALTER TABLE "DocumentAuditLog" DISABLE TRIGGER trg_prevent_audit_log_update;';

  await prisma.$executeRawUnsafe(statement);
}

async function main() {
  const pendingLogs = await prisma.documentAuditLog.count({
    where: { hash: null },
  });

  if (pendingLogs === 0) {
    console.log('[backfill-audit-log-hash] nothing to backfill (0 rows with NULL hash)');

    return;
  }

  if (!ALLOW_TRIGGER_TOGGLE) {
    // WORM トリガーにより UPDATE は必ず失敗する。事故防止のため先に中止する。
    console.error(
      `[backfill-audit-log-hash] DocumentAuditLog is a WORM table (${pendingLogs} rows need backfill).\n` +
        'Backfilling legacy rows requires temporarily disabling the WORM trigger.\n' +
        'Run with --allow-trigger-toggle to opt in (the trigger is re-enabled afterwards).',
    );

    process.exit(1);
  }

  await setWormTriggerEnabled(false);

  let updated = 0;

  try {
    const envelopes = await prisma.envelope.findMany({
      select: { id: true },
    });

    for (const { id: envelopeId } of envelopes) {
      const logs = await prisma.documentAuditLog.findMany({
        where: { envelopeId, hash: null },
        orderBy: { createdAt: 'asc' },
      });

      if (logs.length === 0) {
        continue;
      }

      // チェーンの起点: 既に hash を持つ直前レコードがあればその hash を使う
      const lastSealed = await prisma.documentAuditLog.findFirst({
        where: { envelopeId, hash: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { hash: true },
      });

      let prevHash = lastSealed?.hash ?? '';

      for (const log of logs) {
        const payload = JSON.stringify({
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          type: log.type,
          data: log.data ?? null,
        });

        const hash = computeHash(prevHash, payload);

        await prisma.documentAuditLog.update({
          where: { id: log.id },
          data: { prevHash, hash },
        });

        prevHash = hash;
        updated++;
      }
    }

    console.log(`[backfill-audit-log-hash] updated ${updated} audit log entries`);
  } finally {
    // 例外時も必ず WORM トリガーを再有効化する
    await setWormTriggerEnabled(true);

    const enabled = await prisma.$queryRawUnsafe(
      `SELECT tgenabled FROM pg_trigger WHERE tgname = 'trg_prevent_audit_log_update' LIMIT 1;`,
    );

    if (Array.isArray(enabled) && enabled.length > 0 && !enabled[0].tgenabled) {
      console.error('[backfill-audit-log-hash] WARNING: WORM trigger could not be re-enabled!');

      process.exitCode = 1;
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
