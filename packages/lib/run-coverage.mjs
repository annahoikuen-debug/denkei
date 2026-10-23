import { writeFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import { createVitest } from 'vitest/node';

const chunks = [];
const stream = new Writable({
  write(chunk, enc, cb) {
    chunks.push(chunk.toString());
    cb();
  },
});

try {
  const vitest = await createVitest('test', {
    watch: false,
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['constants/date-formats.ts'],
      all: false,
      reporter: ['text', 'json-summary'],
      reportOnFailure: true,
    },
    pool: 'forks',
    stdout: stream,
    stderr: stream,
  });

  await vitest.start(['constants/date-formats.test.ts']);
} catch (e) {
  chunks.push('ERROR: ' + e.message + '\n' + e.stack);
}

writeFileSync('coverage-capture.log', chunks.join(''));
console.log('done');
