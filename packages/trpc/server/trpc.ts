import { assertNotEmbedSession } from '@documenso/auth/server/lib/session/embed-session-restrictions';
import { AppError, genericErrorCodeToTrpcErrorCodeMap } from '@documenso/lib/errors/app-error';
import { getApiTokenByToken } from '@documenso/lib/server-only/public-api/get-api-token-by-token';
import { assertRateLimit } from '@documenso/lib/server-only/rate-limit/rate-limit-middleware';
import { apiTrpcRateLimit } from '@documenso/lib/server-only/rate-limit/rate-limits';
import { assertUserNotDisabled } from '@documenso/lib/server-only/user/assert-user-not-disabled';
import type { TrpcApiLog } from '@documenso/lib/types/api-logs';
import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { getIpAddress } from '@documenso/lib/universal/get-ip-address';
import { alphaid } from '@documenso/lib/universal/id';
import { isAdmin } from '@documenso/lib/utils/is-admin';
import { logger } from '@documenso/lib/utils/logger';
import { initTRPC, TRPCError } from '@trpc/server';
import type { AnyZodObject } from 'zod';
import { dataTransformer } from '../utils/data-transformer';
import type { TrpcContext } from './context';

// Can't import type from trpc-to-openapi because it breaks build, not sure why.
export type TrpcRouteMeta = {
  openapi?: {
    enabled?: boolean;
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    path: `/${string}`;
    summary?: string;
    description?: string;
    protect?: boolean;
    tags?: string[];
    // eslint-disable-next-line @typescript-eslint/ban-types
    contentTypes?: ('application/json' | 'application/x-www-form-urlencoded' | (string & {}))[];
    deprecated?: boolean;
    requestHeaders?: AnyZodObject;
    responseHeaders?: AnyZodObject;
    successDescription?: string;
    errorResponses?: number[] | Record<number, string>;
  };
  /**
   * Embed sessions exist only to let a recipient sign inside an iframe and are
   * rejected by `authenticatedProcedure` (and downgraded to anonymous by
   * `maybeAuthenticatedProcedure`) unless the route opts in here.
   */
  allowEmbedSession?: boolean;
} & Record<string, unknown>;

const t = initTRPC
  .meta<TrpcRouteMeta>()
  .context<TrpcContext>()
  .create({
    transformer: dataTransformer,
    errorFormatter(opts) {
      const { shape, error, ctx } = opts;

      const originalError = error.cause;

      let data: Record<string, unknown> = shape.data;

      // Default unknown errors to 400, since if you're throwing an AppError it is expected
      // that you already know what you're doing.
      if (originalError instanceof AppError) {
        // 構造化ログ出力：エラーコード、ステータスコード、メッセージをログに記録
        logger.warn(
          {
            code: originalError.code,
            statusCode: originalError.statusCode,
            message: originalError.message,
            userMessage: originalError.userMessage,
          },
          'TRPC エラーが発生しました',
        );

        if (originalError.headers && ctx) {
          for (const [headerKey, headerValue] of Object.entries(originalError.headers)) {
            ctx.res.headers.append(headerKey, headerValue);
          }
        }

        data = {
          ...data,
          appError: AppError.toJSON(originalError),
          code: originalError.code,
          httpStatus: originalError.statusCode ?? genericErrorCodeToTrpcErrorCodeMap[originalError.code]?.status ?? 400,
        };
      } else if (originalError instanceof Error) {
        // 予期しないエラー（AppError 以外）は error レベルでログ出力
        logger.error(
          {
            name: originalError.name,
            message: originalError.message,
            stack: originalError.stack,
          },
          '予期しない TRPC エラーが発生しました',
        );
      }

      return {
        ...shape,
        data,
      };
    },
  });

/**
 * Middlewares
 */
export const authenticatedMiddleware = t.middleware(async ({ ctx, next, path, meta }) => {
  // Auth-independent log bindings. `auth` is set per-branch below since it
  // depends on which auth path was taken; `ctx.metadata.auth` here is still
  // `null` (the resolved value is set in the `next()` call below).
  const baseLogAttributes: TrpcApiLog = {
    path,
    auth: null,
    source: ctx.metadata.source,
    trpcMiddleware: 'authenticated',
    unverifiedTeamId: ctx.teamId,
  };

  const authorizationHeader = ctx.req.headers.get('authorization');

  const isApiV2 = Boolean(meta?.openapi?.path);

  // Taken from `authenticatedMiddleware` in `@documenso/api/v1/middleware/authenticated.ts`.
  if (authorizationHeader && isApiV2) {
    // Support for both "Authorization: Bearer api_xxx" and "Authorization: api_xxx"
    const [token] = (authorizationHeader || '').split('Bearer ').filter((s) => s.length > 0);

    if (!token) {
      throw new Error('Token was not provided for authenticated middleware');
    }

    const apiToken = await getApiTokenByToken({ token });

    // Reject API requests from a disabled account. The token may still be
    // present in the DB (e.g. before `disableUser` runs) so we enforce here.
    assertUserNotDisabled(apiToken.user);

    const trpcApiV2Logger = ctx.logger.child({
      ...baseLogAttributes,
      auth: 'api',
      userId: apiToken.user.id,
      apiTokenId: apiToken.id,
    } satisfies TrpcApiLog);

    trpcApiV2Logger.info({
      position: 'trpcProcedure',
    });

    return await next({
      ctx: {
        ...ctx,
        logger: trpcApiV2Logger,
        user: apiToken.user,
        teamId: apiToken.teamId,
        session: null,
        metadata: {
          ...ctx.metadata,
          auditUser: apiToken.team
            ? {
                id: null,
                email: null,
                name: apiToken.team.name,
              }
            : {
                id: apiToken.user.id,
                email: apiToken.user.email,
                name: apiToken.user.name,
              },
          auth: 'api',
        } satisfies ApiRequestMetadata,
      },
    });
  }

  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid session or API token.',
    });
  }

  // Reject session requests from a disabled account. The session may still be
  // valid (sessions aren't invalidated by `disableUser`), so we gate every
  // authenticated TRPC call here.
  assertUserNotDisabled(ctx.user);

  if (!meta?.allowEmbedSession) {
    assertNotEmbedSession(ctx.session);
  }

  // Recreate the logger with a sub request ID to differentiate between batched
  // requests, as well as identifying attributes so every subsequent log line
  // (including errors) inherits them.
  const trpcSessionLogger = ctx.logger.child({
    ...baseLogAttributes,
    auth: 'session',
    nonBatchedRequestId: alphaid(),
    userId: ctx.user.id,
    apiTokenId: null,
  } satisfies TrpcApiLog);

  trpcSessionLogger.info({
    position: 'trpcProcedure',
  });

  return await next({
    ctx: {
      ...ctx,
      teamId: ctx.teamId || -1,
      logger: trpcSessionLogger,
      user: ctx.user,
      session: ctx.session,
      metadata: {
        ...ctx.metadata,
        auditUser: {
          id: ctx.user.id,
          name: ctx.user.name,
          email: ctx.user.email,
        },
        auth: 'session',
      } satisfies ApiRequestMetadata,
    },
  });
});

export const maybeAuthenticatedMiddleware = t.middleware(async ({ ctx, next, path, meta }) => {
  const baseLogAttributes: TrpcApiLog = {
    path,
    auth: null,
    source: ctx.metadata.source,
    trpcMiddleware: 'maybeAuthenticated',
    unverifiedTeamId: ctx.teamId,
  };

  const authorizationHeader = ctx.req.headers.get('authorization');

  const isApiV2 = Boolean(meta?.openapi?.path);

  // Taken from `authenticatedMiddleware` in `@documenso/api/v1/middleware/authenticated.ts`.
  if (authorizationHeader && isApiV2) {
    // Support for both "Authorization: Bearer api_xxx" and "Authorization: api_xxx"
    const [token] = (authorizationHeader || '').split('Bearer ').filter((s) => s.length > 0);

    if (!token) {
      throw new Error('Token was not provided for authenticated middleware');
    }

    const apiToken = await getApiTokenByToken({ token });

    // Reject API requests from a disabled account. Presenting an API token is
    // an explicit attempt to act under that account, so we don't downgrade to
    // anonymous here — we reject.
    assertUserNotDisabled(apiToken.user);

    // Attach identifying attributes to the logger so every subsequent log line
    // within this request (including errors) inherits them.
    const trpcApiV2Logger = ctx.logger.child({
      ...baseLogAttributes,
      auth: 'api',
      userId: apiToken.user.id,
      apiTokenId: apiToken.id,
    } satisfies TrpcApiLog);

    trpcApiV2Logger.info({
      position: 'trpcProcedure',
    });

    return await next({
      ctx: {
        ...ctx,
        logger: trpcApiV2Logger,
        user: apiToken.user,
        teamId: apiToken.teamId,
        session: null,
        metadata: {
          ...ctx.metadata,
          auditUser: apiToken.team
            ? {
                id: null,
                email: null,
                name: apiToken.team.name,
              }
            : {
                id: apiToken.user.id,
                email: apiToken.user.email,
                name: apiToken.user.name,
              },
          auth: 'api',
        } satisfies ApiRequestMetadata,
      },
    });
  }

  // Treat a disabled session as anonymous. Most routes wired through
  // `maybeAuthenticatedProcedure` are signer/invite flows that key off an
  // input token rather than `ctx.user`, so downgrading lets those keep
  // working while routes that genuinely need an account naturally fall
  // through to their own auth checks. Embed sessions get the same treatment
  // unless the route has opted in via `allowEmbedSession`.
  const isEmbedSessionAllowed = !ctx.session?.isEmbed || Boolean(meta?.allowEmbedSession);

  const sessionUser = ctx.user && !ctx.user.disabled && isEmbedSessionAllowed ? ctx.user : null;
  const sessionRecord = sessionUser ? ctx.session : null;

  // Resolve `auth` once so it stays in sync between the logger bindings and
  // the outgoing metadata.
  const auth = sessionRecord ? 'session' : null;

  // Recreate the logger with a sub request ID to differentiate between batched
  // requests, as well as identifying attributes so every subsequent log line
  // (including errors) inherits them.
  const trpcSessionLogger = ctx.logger.child({
    ...baseLogAttributes,
    auth,
    nonBatchedRequestId: alphaid(),
    userId: sessionUser?.id,
    apiTokenId: null,
  } satisfies TrpcApiLog);

  trpcSessionLogger.info({
    position: 'trpcProcedure',
  });

  return await next({
    ctx: {
      ...ctx,
      logger: trpcSessionLogger,
      user: sessionUser,
      session: sessionRecord,
      metadata: {
        ...ctx.metadata,
        auditUser: sessionUser
          ? {
              id: sessionUser.id,
              name: sessionUser.name,
              email: sessionUser.email,
            }
          : undefined,
        auth,
      } satisfies ApiRequestMetadata,
    },
  });
});

export const adminMiddleware = t.middleware(async ({ ctx, next, path }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action.',
    });
  }

  // Disabled admins shouldn't be able to do anything either.
  assertUserNotDisabled(ctx.user);

  assertNotEmbedSession(ctx.session);

  const isUserAdmin = isAdmin(ctx.user);

  if (!isUserAdmin) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authorized to perform this action.',
    });
  }

  // Recreate the logger with a sub request ID to differentiate between batched
  // requests, as well as identifying attributes so every subsequent log line
  // (including errors) inherits them.
  const trpcSessionLogger = ctx.logger.child({
    nonBatchedRequestId: alphaid(),
    unverifiedTeamId: ctx.teamId,
    path,
    auth: 'session',
    source: ctx.metadata.source,
    userId: ctx.user.id,
    apiTokenId: null,
    trpcMiddleware: 'admin',
  } satisfies TrpcApiLog);

  trpcSessionLogger.info({
    position: 'trpcProcedure',
  });

  return await next({
    ctx: {
      ...ctx,
      logger: trpcSessionLogger,
      user: ctx.user,
      session: ctx.session,
      metadata: {
        ...ctx.metadata,
        auditUser: {
          id: ctx.user.id,
          name: ctx.user.name,
          email: ctx.user.email,
        },
        auth: 'session',
      } satisfies ApiRequestMetadata,
    },
  });
});

export const procedureMiddleware = t.middleware(async ({ ctx, next, path }) => {
  // Recreate the logger with a sub request ID to differentiate between batched
  // requests, as well as identifying attributes so every subsequent log line
  // (including errors) inherits them.
  const trpcSessionLogger = ctx.logger.child({
    nonBatchedRequestId: alphaid(),
    unverifiedTeamId: ctx.teamId,
    path,
    auth: ctx.metadata.auth,
    source: ctx.metadata.source,
    userId: ctx.user?.id,
    apiTokenId: null,
    trpcMiddleware: 'procedure',
  } satisfies TrpcApiLog);

  trpcSessionLogger.info({
    position: 'trpcProcedure',
  });

  return await next({
    ctx: {
      ...ctx,
      logger: trpcSessionLogger,
    },
  });
});

/**
 * リクエストログミドルウェア (TASK-08)
 *
 * 全 TRPC プロシージャに対してリクエストの開始・終了時刻を記録し、
 * レイテンシ (durationMs) を構造化ログとして出力します。
 * これによりログ収集システム (Datadog, CloudWatch 等) で
 * リクエスト数、エラー率、レイテンシのメトリクス化が可能になります。
 */
export const requestLogMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const startTime = Date.now();

  const result = await next();

  const durationMs = Date.now() - startTime;

  ctx.logger.info({
    path,
    type,
    durationMs,
    position: 'trpcRequest',
  });

  return result;
});

/**
 * レート制限ミドルウェア (TASK-03)
 *
 * トリPC 全プロシージャに対して IP ベースのレート制限を適用します。
 * `apiTrpcRateLimit` (1分間 100 リクエスト) を使用し、
 * 制限超過時は `assertRateLimit` で AppError をスローします。
 */
export const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  let ip: string;

  try {
    ip = getIpAddress(ctx.req);
  } catch {
    ip = 'unknown';
  }

  const result = await apiTrpcRateLimit.check({ ip });

  // 制限ヘッダーをレスポンスに設定 (Hono context を経由しないため、AppError ヘッダー経由で通知)
  if (result.isLimited) {
    assertRateLimit(result);
  }

  return await next({
    ctx: {
      ...ctx,
      logger: ctx.logger.child({
        rateLimitRemaining: result.remaining,
        rateLimitReset: result.reset.toISOString(),
      }),
    },
  });
});

/**
 * Routers and Procedures
 */
export const router = t.router;
// procedureMiddleware の後に rateLimitMiddleware を適用
// requestLogMiddleware は常に最初に適用し、ベースの TrpcContext に対してログ出力を行う
// バリデーションは各プロシージャの input (ZodSchema) で自動適用される
export const procedure = t.procedure.use(requestLogMiddleware).use(procedureMiddleware).use(rateLimitMiddleware);
export const authenticatedProcedure = t.procedure
  .use(requestLogMiddleware)
  .use(authenticatedMiddleware)
  .use(rateLimitMiddleware);
// While this is functionally the same as `procedure`, it's useful for indicating purpose
export const maybeAuthenticatedProcedure = t.procedure
  .use(requestLogMiddleware)
  .use(maybeAuthenticatedMiddleware)
  .use(rateLimitMiddleware);
export const adminProcedure = t.procedure.use(requestLogMiddleware).use(adminMiddleware).use(rateLimitMiddleware);
