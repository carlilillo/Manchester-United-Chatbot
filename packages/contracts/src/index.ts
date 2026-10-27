import { z } from 'zod';

export const responseStyleSchema = z.enum(['formal', 'friendly', 'funny']);
export const feedbackSchema = z.enum(['like', 'dislike']).nullable();
export const memoryInputSchema = z.object({
  enabled: z.boolean(),
  responseStyle: responseStyleSchema,
  notes: z.string().trim().max(4000),
  version: z.number().int().nonnegative(),
});
export const memorySchema = memoryInputSchema.extend({ updatedAt: z.string().nullable() });
export const messageInputSchema = z.object({
  text: z.string().trim().min(1).max(8000),
  requestId: z.uuid(),
});
export const activitySchema = z.object({
  id: z.string(),
  kind: z.enum(['tool', 'subagent', 'progress']),
  title: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  detail: z.string().optional(),
  timestamp: z.string(),
});
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['human', 'ai']),
  content: z.string(),
  createdAt: z.string(),
  status: z.enum(['complete', 'streaming', 'failed', 'cancelled']).default('complete'),
  feedback: feedbackSchema.optional(),
  activity: z.array(activitySchema).optional(),
  sources: z.array(z.object({ url: z.url(), title: z.string() })).optional(),
  requestId: z.string().optional(),
});
export const chatSummarySchema = z.object({
  threadId: z.string(), title: z.string(), updatedAt: z.string(),
});
export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('started'), threadId: z.string(), messageId: z.string() }),
  z.object({ type: z.literal('delta'), messageId: z.string(), text: z.string() }),
  z.object({ type: z.literal('activity'), messageId: z.string(), activity: activitySchema }),
  z.object({ type: z.literal('completed'), message: chatMessageSchema }),
  z.object({ type: z.literal('error'), messageId: z.string(), error: z.string() }),
]);
export type MemoryInput = z.infer<typeof memoryInputSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatSummary = z.infer<typeof chatSummarySchema>;
export type Activity = z.infer<typeof activitySchema>;
export type StreamEvent = z.infer<typeof streamEventSchema>;
