import { z } from 'zod';

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name is required'),
  laboratoryCode: z.string().min(2, 'Laboratory code is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================================
// AST Record Schemas
// ============================================================

export const sirResultSchema = z.enum(['S', 'I', 'R']);

export const rawASTRowSchema = z.object({
  organism: z.string().optional().nullable(),
  antimicrobial: z.string().optional().nullable(),
  specimen: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  sample_date: z.string().optional().nullable(),
  patient_age_group: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
});

export const validatedASTRowSchema = z.object({
  organism: z.string().min(1, 'Organism is required'),
  antimicrobial: z.string().min(1, 'Antimicrobial is required'),
  specimen: z.string().min(1, 'Specimen type is required'),
  result: sirResultSchema,
  sample_date: z.string().optional().nullable(),
  patient_age_group: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
});

// ============================================================
// Upload Schema
// ============================================================

export const uploadSchema = z.object({
  file: z.instanceof(File)
    .refine((f) => f.size <= 10 * 1024 * 1024, 'File must be less than 10MB')
    .refine(
      (f) => [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ].includes(f.type) || f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'),
      'Only CSV and Excel files are accepted'
    ),
});

// ============================================================
// Column Mapping Schema
// ============================================================

export const columnMappingSchema = z.object({
  organism: z.string().min(1, 'Organism column is required'),
  antimicrobial: z.string().min(1, 'Antimicrobial column is required'),
  specimen: z.string().optional(),
  result: z.string().min(1, 'Result column is required'),
  sample_date: z.string().optional(),
  patient_age_group: z.string().optional(),
  ward: z.string().optional(),
});

// ============================================================
// Filter Schemas
// ============================================================

export const dashboardFilterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  organism: z.string().optional(),
  antimicrobial: z.string().optional(),
  specimen: z.string().optional(),
  ward: z.string().optional(),
});

// ============================================================
// Review Schema
// ============================================================

export const reviewDecisionSchema = z.object({
  recordIds: z.array(z.string().uuid()).min(1, 'At least one record must be selected'),
  decision: z.enum(['validated', 'excluded']),
});

// ============================================================
// AI Summary Schema
// ============================================================

export const aiSummaryRequestSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  organism: z.string().optional(),
  antimicrobial: z.string().optional(),
});

// ============================================================
// Type exports
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RawASTRow = z.infer<typeof rawASTRowSchema>;
export type ValidatedASTRow = z.infer<typeof validatedASTRowSchema>;
export type ColumnMapping = z.infer<typeof columnMappingSchema>;
export type DashboardFilterInput = z.infer<typeof dashboardFilterSchema>;
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
export type AISummaryRequestInput = z.infer<typeof aiSummaryRequestSchema>;
