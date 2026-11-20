import { z } from 'zod';

import { isHttpUrl } from '../utils/is-http-url';

/**
 * Note this allows empty strings.
 */
export const ZUrlSchema = z.string().refine((value) => value === undefined || value === '' || isHttpUrl(value), {
  message: 'Please enter a valid URL, make sure you include http:// or https:// part of the url.',
});

/**
 * 共通バリデーションスキーマ群。
 *
 * trpc をはじめとする API 全体で一貫した入力検証を行うため、
 * 汎用的なプリミティブスキーマをここに集約する (TASK-02)。
 */
export const ZUuidSchema = z.string().uuid();

export const ZEmailSchema = z.string().email();

export const ZPositiveIntSchema = z.number().int().positive();

export const ZNonEmptyStringSchema = z.string().min(1);
