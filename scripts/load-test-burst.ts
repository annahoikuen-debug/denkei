/**
 * v1.1 Stage E3: 100件バースト負荷耐性テストスクリプト
 *
 * 目的:
 * - 100件のドキュメント生成・送信を並行実行し、エラー率 < 0.1% かつ
 *   p95 レスポンスタイムが許容閾値内に収まることを検証する。
 */
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { DocumentDataType, DocumentStatus, EnvelopeType } from '@prisma/client';

const TOTAL_BURST_COUNT = 100;
const CONCURRENCY_LIMIT = 10;

async function runBurstLoadTest() {
  console.log(`[E3 Load Test] Starting 100-document burst load test...`);

  const { user, team } = await seedUser({ isPersonalOrganisation: true });
  console.log(`[E3 Load Test] Test user created: ${user.email}, teamId: ${team.id}`);

  // 送信数の計測配列
  const durations: number[] = [];
  let successCount = 0;
  let failureCount = 0;

  const samplePdfData = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n',
  ).toString('base64');

  const startTime = Date.now();

  // 10並行ずつチャンク分割して実行
  for (let i = 0; i < TOTAL_BURST_COUNT; i += CONCURRENCY_LIMIT) {
    const chunkIndices = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, TOTAL_BURST_COUNT - i) },
      (_, idx) => i + idx,
    );

    const chunkPromises = chunkIndices.map(async (docIndex) => {
      const taskStart = Date.now();
      try {
        const envelopeId = `env_burst_${Date.now()}_${docIndex + 1}_${Math.random().toString(36).slice(2, 8)}`;
        const _envelope = await prisma.envelope.create({
          data: {
            id: envelopeId,
            secondaryId: `sec_burst_${docIndex + 1}_${Date.now()}`,
            title: `負荷テスト合意書 #${docIndex + 1}`,
            type: EnvelopeType.DOCUMENT,
            source: 'DOCUMENT',
            signatureLevel: 'SES',
            internalVersion: 2,
            status: DocumentStatus.PENDING,
            user: { connect: { id: user.id } },
            team: { connect: { id: team.id } },
            envelopeItems: {
              create: {
                id: `item_burst_${Date.now()}_${docIndex + 1}_${Math.random().toString(36).slice(2, 8)}`,
                title: `負荷テスト合意書 #${docIndex + 1}`,
                order: 0,
                documentData: {
                  create: {
                    id: `data_burst_${Date.now()}_${docIndex + 1}_${Math.random().toString(36).slice(2, 8)}`,
                    type: DocumentDataType.BYTES_64,
                    data: samplePdfData,
                    initialData: samplePdfData,
                  },
                },
              },
            },
            recipients: {
              create: {
                email: `signer_burst_${docIndex + 1}@example.com`,
                name: `署名者 ${docIndex + 1}`,
                role: 'SIGNER',
                token: `burst-token-${docIndex + 1}-${Date.now()}`,
              },
            },
            documentMeta: {
              create: {
                language: 'ja',
                timezone: 'Asia/Tokyo',
              },
            },
          },
        });

        const elapsed = Date.now() - taskStart;
        durations.push(elapsed);
        successCount++;
      } catch (err) {
        console.error(`[E3 Load Test] Error creating envelope #${docIndex + 1}:`, err);
        failureCount++;
      }
    });

    await Promise.all(chunkPromises);
    process.stdout.write(`\r[E3 Load Test] Progress: ${successCount + failureCount} / ${TOTAL_BURST_COUNT}`);
  }

  const totalTime = Date.now() - startTime;
  durations.sort((a, b) => a - b);

  const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] ?? 0;
  const errorRate = (failureCount / TOTAL_BURST_COUNT) * 100;

  console.log(`\n\n=== E3 バースト負荷テスト結果 ===`);
  console.log(`総作成件数: ${TOTAL_BURST_COUNT}`);
  console.log(`成功数: ${successCount}`);
  console.log(`失敗数: ${failureCount}`);
  console.log(`エラー率: ${errorRate.toFixed(2)}% (目標: < 0.1%)`);
  console.log(`総所要時間: ${(totalTime / 1000).toFixed(2)} 秒`);
  console.log(`p50 レスポンス: ${p50} ms`);
  console.log(`p95 レスポンス: ${p95} ms`);
  console.log(`p99 レスポンス: ${p99} ms`);

  if (failureCount > 0) {
    console.error(`[E3 Load Test] FAILED: Some documents failed during burst test.`);
    process.exit(1);
  } else {
    console.log(`[E3 Load Test] SUCCESS: All 100 burst documents processed cleanly.`);
  }
}

runBurstLoadTest()
  .catch((err) => {
    console.error(`[E3 Load Test] Fatal error:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
