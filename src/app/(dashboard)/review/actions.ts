'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type ReviewDecision = 'validated' | 'excluded';

async function getReviewerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('laboratory_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new Error('User profile not found');
  }

  return { supabase, user, profile };
}

async function applyReviewDecision(
  recordIds: string[],
  decision: ReviewDecision,
  notes?: string
): Promise<{ error?: string; updated?: number }> {
  if (recordIds.length === 0) {
    return { error: 'No records selected' };
  }

  try {
    const { supabase, user, profile } = await getReviewerContext();
    const reviewedAt = new Date().toISOString();

    const { data: records, error: fetchError } = await supabase
      .from('ast_records')
      .select('id')
      .in('id', recordIds)
      .eq('review_status', 'pending');

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (!records?.length) {
      return { error: 'No pending records found for the selection' };
    }

    const ids = records.map((r) => r.id);

    const { error: updateError } = await supabase
      .from('ast_records')
      .update({
        review_status: decision,
        reviewed_by: user.id,
        reviewed_at: reviewedAt,
      })
      .in('id', ids);

    if (updateError) {
      return { error: updateError.message };
    }

    const { error: auditError } = await supabase.from('review_decisions').insert(
      ids.map((id) => ({
        laboratory_id: profile.laboratory_id,
        ast_record_id: id,
        reviewer_id: user.id,
        decision,
        notes: notes ?? null,
      }))
    );

    if (auditError) {
      return { error: auditError.message };
    }

    revalidatePath('/review');
    revalidatePath('/dashboard');
    return { updated: ids.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Review update failed' };
  }
}

export async function validateRecordsAction(
  recordIds: string[]
): Promise<{ error?: string; updated?: number }> {
  return applyReviewDecision(recordIds, 'validated');
}

export async function excludeRecordsAction(
  recordIds: string[]
): Promise<{ error?: string; updated?: number }> {
  return applyReviewDecision(recordIds, 'excluded');
}

/**
 * Validate pending rows that have no error-severity quality issues.
 */
export async function validateCleanPendingAction(
  uploadId?: string
): Promise<{ error?: string; updated?: number }> {
  try {
    const { supabase } = await getReviewerContext();

    let query = supabase
      .from('ast_records')
      .select('id, quality_issues(severity)')
      .eq('review_status', 'pending');

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }

    const { data: records, error } = await query;
    if (error) {
      return { error: error.message };
    }

    const cleanIds =
      records
        ?.filter((record) => {
          const issues = record.quality_issues as { severity: string }[] | null;
          if (!issues?.length) return true;
          return !issues.some((issue) => issue.severity === 'error');
        })
        .map((record) => record.id) ?? [];

    return validateRecordsAction(cleanIds);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Bulk validation failed' };
  }
}
