import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ReviewTable } from '@/components/review/ReviewTable';
import type { ASTRecordWithIssues } from '@/types/database';

interface ReviewPageProps {
  searchParams: Promise<{ upload?: string }>;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { upload: uploadId } = await searchParams;
  const supabase = await createClient();

  let recordsQuery = supabase
    .from('ast_records')
    .select('*, quality_issues(*)')
    .eq('review_status', 'pending')
    .order('row_number', { ascending: true })
    .limit(500);

  if (uploadId) {
    recordsQuery = recordsQuery.eq('upload_id', uploadId);
  }

  const [{ data: records }, { data: uploads }] = await Promise.all([
    recordsQuery,
    supabase
      .from('uploads')
      .select('id, file_name, created_at, total_rows, valid_rows, error_rows')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const pendingRecords = (records ?? []) as ASTRecordWithIssues[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Review Queue</h1>
        <p className="text-sm text-surface-400 mt-1">
          Validate or exclude uploaded AST records before they appear on the dashboard
        </p>
      </div>

      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-surface-400">Filter by upload:</span>
        <Link
          href="/review"
          className={`text-xs px-3 py-1.5 rounded-lg ${
            !uploadId ? 'bg-primary-500/20 text-primary-300' : 'text-surface-400 hover:text-surface-200'
          }`}
        >
          All uploads
        </Link>
        {(uploads ?? []).map((upload) => (
          <Link
            key={upload.id}
            href={`/review?upload=${upload.id}`}
            className={`text-xs px-3 py-1.5 rounded-lg truncate max-w-[220px] ${
              uploadId === upload.id
                ? 'bg-primary-500/20 text-primary-300'
                : 'text-surface-400 hover:text-surface-200'
            }`}
            title={upload.file_name}
          >
            {upload.file_name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-surface-100">{pendingRecords.length}</p>
          <p className="text-xs text-surface-500">Pending in view</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-warning-400">
            {pendingRecords.filter((r) => r.quality_issues?.some((i) => i.severity === 'error')).length}
          </p>
          <p className="text-xs text-surface-500">With blocking errors</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-accent-400">
            {
              pendingRecords.filter(
                (r) => !r.quality_issues?.length || !r.quality_issues.some((i) => i.severity === 'error')
              ).length
            }
          </p>
          <p className="text-xs text-surface-500">Eligible for quick validate</p>
        </div>
      </div>

      <ReviewTable records={pendingRecords} uploadId={uploadId} />
    </div>
  );
}
