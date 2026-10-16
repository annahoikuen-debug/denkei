import { env } from '../../utils/env';
import type { JobDefinition, TriggerJobOptions } from './_internal/job';
import type { BaseJobProvider as JobClientProvider } from './base';
import { InngestJobProvider } from './inngest';
import { LocalJobProvider } from './local';

export class JobClient<T extends ReadonlyArray<JobDefinition> = []> {
  private _provider: JobClientProvider;

  public constructor(definitions: T) {
    const providerType = env('NEXT_PRIVATE_JOBS_PROVIDER');

    if (providerType === 'inngest') {
      this._provider = InngestJobProvider.getInstance();
    } else if (providerType === 'bullmq') {
      // Lazy load to avoid loading BullMQ dependencies when using local provider
      const { BullMQJobProvider } = require('./bullmq');
      this._provider = BullMQJobProvider.getInstance();
    } else {
      this._provider = LocalJobProvider.getInstance();
    }

    definitions.forEach((definition) => {
      this._provider.defineJob(definition);
    });
  }

  public async triggerJob(options: TriggerJobOptions<T>) {
    return this._provider.triggerJob(options);
  }

  public getApiHandler() {
    return this._provider.getApiHandler();
  }

  /**
   * Start the cron scheduler for any registered cron jobs.
   *
   * Call this once at application startup after the instance is ready to
   * process requests. No-op for providers that handle cron externally
   * (e.g. Inngest).
   */
  public startCron() {
    this._provider.startCron();
  }
}
