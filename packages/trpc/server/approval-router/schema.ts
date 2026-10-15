import { z } from 'zod';

export const ZApproveEnvelopeRequestSchema = z.object({
  envelopeId: z.string().min(1),
  recipientId: z.number().int().positive(),
});

export type TApproveEnvelopeRequest = z.infer<typeof ZApproveEnvelopeRequestSchema>;

export const ZRejectEnvelopeRequestSchema = z.object({
  envelopeId: z.string().min(1),
  recipientId: z.number().int().positive(),
  reason: z.string().trim().min(1, '差し戻し理由は必須です').max(500),
});

export type TRejectEnvelopeRequest = z.infer<typeof ZRejectEnvelopeRequestSchema>;

export const ZApprovalActionResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(['APPROVED', 'REJECTED']),
});

export type TApprovalActionResponse = z.infer<typeof ZApprovalActionResponseSchema>;

export const ZFindPendingApprovalsRequestSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().max(100).default(10),
});

export type TFindPendingApprovalsRequest = z.infer<typeof ZFindPendingApprovalsRequestSchema>;

export const ZPendingApprovalItemSchema = z.object({
  envelopeId: z.string(),
  title: z.string(),
  createdAt: z.date(),
  recipientId: z.number(),
  recipientEmail: z.string(),
  senderName: z.string(),
  senderEmail: z.string(),
});

export type TPendingApprovalItem = z.infer<typeof ZPendingApprovalItemSchema>;

export const ZFindPendingApprovalsResponseSchema = z.object({
  data: z.array(ZPendingApprovalItemSchema),
  count: z.number(),
  totalPages: z.number(),
});

export type TFindPendingApprovalsResponse = z.infer<typeof ZFindPendingApprovalsResponseSchema>;
