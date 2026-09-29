import type { IssueSeverity, QualityIssueType } from '@/types/database';

const issueLabels: Record<QualityIssueType, string> = {
  missing_organism: 'Missing organism',
  missing_antimicrobial: 'Missing antimicrobial',
  missing_specimen: 'Missing specimen',
  missing_result: 'Missing result',
  missing_date: 'Missing date',
  invalid_result: 'Invalid result',
  possible_duplicate: 'Possible duplicate',
  unknown_organism: 'Unknown organism',
  unknown_antimicrobial: 'Unknown antimicrobial',
  unknown_specimen: 'Unknown specimen',
};

const severityStyles: Record<IssueSeverity, string> = {
  error: 'bg-danger-500/15 text-danger-400 border-danger-500/25',
  warning: 'bg-warning-500/15 text-warning-400 border-warning-500/25',
  info: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
};

interface QualityBadgeProps {
  issueType: QualityIssueType;
  severity: IssueSeverity;
  title?: string;
}

export function QualityBadge({ issueType, severity, title }: QualityBadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border ${severityStyles[severity]}`}
    >
      {issueLabels[issueType]}
    </span>
  );
}
