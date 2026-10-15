#!/usr/bin/env node
/**
 * フェーズ1 ステップ32: 監査ログハッシュチェーンのバックフィル(遡及計算)スクリプト
 *
 * DocumentAuditLog の既存レコード(prevHash/hash が NULL)に対して、
 * エンベロープごとに作成日時順でハッシュチェーンを計算して埋める。
 *
 * usage:
 *   DATABASE_URL=... node --experimental-strip-types scripts/backfill-audit-log-hash.ts
 *   (prisma 依存のため packages/prisma の tsx 等で実行するか、JS にトランスパイルして実行)
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const computeHash = (prevHash, payload) =>
    createHash('sha256').update(`${prevHash ?? ''}|${payload}`).digest('hex');

async function main() {
    const envelopes = await prisma.envelope.findMany({
        select: { id: true },
    });

    let updated = 0;

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
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
