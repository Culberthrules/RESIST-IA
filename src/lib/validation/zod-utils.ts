import type { ZodError } from 'zod';

export function firstZodIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input';
}
