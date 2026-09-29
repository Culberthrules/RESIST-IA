// ============================================================
// Database types matching our Supabase schema
// ============================================================

export type UserRole = 'admin' | 'reviewer' | 'technician';
export type ReviewStatus = 'pending' | 'validated' | 'excluded';
export type UploadStatus = 'processing' | 'completed' | 'failed';
export type SIRResult = 'S' | 'I' | 'R';
export type GramType = 'positive' | 'negative' | 'other';
export type IssueSeverity = 'error' | 'warning' | 'info';

export type QualityIssueType =
  | 'missing_organism'
  | 'missing_antimicrobial'
  | 'missing_specimen'
  | 'missing_result'
  | 'missing_date'
  | 'invalid_result'
  | 'possible_duplicate'
  | 'unknown_organism'
  | 'unknown_antimicrobial'
  | 'unknown_specimen';

// ============================================================
// Table Row Types
// ============================================================

export interface Laboratory {
  id: string;
  name: string;
  code: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  laboratory_id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  laboratory_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  status: UploadStatus;
  created_at: string;
  updated_at: string;
}

export interface ASTRecord {
  id: string;
  laboratory_id: string;
  upload_id: string;
  raw_organism: string | null;
  raw_antimicrobial: string | null;
  raw_specimen: string | null;
  raw_result: string | null;
  organism: string | null;
  antimicrobial: string | null;
  specimen: string | null;
  result: SIRResult | null;
  organism_ref_id: string | null;
  antimicrobial_ref_id: string | null;
  specimen_ref_id: string | null;
  sample_date: string | null;
  patient_age_group: string | null;
  ward: string | null;
  row_number: number;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface QualityIssue {
  id: string;
  laboratory_id: string;
  ast_record_id: string;
  upload_id: string;
  issue_type: QualityIssueType;
  severity: IssueSeverity;
  message: string;
  field_name: string | null;
  field_value: string | null;
  created_at: string;
}

export interface ReviewDecision {
  id: string;
  laboratory_id: string;
  ast_record_id: string;
  reviewer_id: string;
  decision: 'validated' | 'excluded';
  notes: string | null;
  created_at: string;
}

export interface ReferenceOrganism {
  id: string;
  canonical_name: string;
  aliases: string[];
  gram_type: GramType | null;
  created_at: string;
}

export interface ReferenceAntimicrobial {
  id: string;
  canonical_name: string;
  aliases: string[];
  class: string | null;
  created_at: string;
}

export interface ReferenceSpecimen {
  id: string;
  canonical_name: string;
  aliases: string[];
  created_at: string;
}

// ============================================================
// Composite / View Types
// ============================================================

export interface ASTRecordWithIssues extends ASTRecord {
  quality_issues: QualityIssue[];
}

export interface UploadWithCounts extends Upload {
  pending_count: number;
  validated_count: number;
  excluded_count: number;
}

// ============================================================
// Analytics Types
// ============================================================

export interface ResistanceRate {
  organism: string;
  antimicrobial: string;
  total_tested: number;
  resistant_count: number;
  intermediate_count: number;
  susceptible_count: number;
  resistance_percentage: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
}

export interface ResistanceTrend {
  period: string;
  organism: string;
  antimicrobial: string;
  resistance_percentage: number;
  total_tested: number;
}

export interface OrganismSummary {
  organism: string;
  total_isolates: number;
  specimen_distribution: Record<string, number>;
  top_resistances: Array<{
    antimicrobial: string;
    resistance_percentage: number;
    total_tested: number;
  }>;
}

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  organism?: string;
  antimicrobial?: string;
  specimen?: string;
  ward?: string;
}

// ============================================================
// AI Summary Types
// ============================================================

export interface AISummaryRequest {
  resistance_rates: ResistanceRate[];
  organism_summaries: OrganismSummary[];
  trends: ResistanceTrend[];
  laboratory_name: string;
  date_range: { from: string; to: string };
  total_validated_records: number;
}

export interface AISummaryResponse {
  summary: string;
  key_findings: string[];
  limitations: string[];
  generated_at: string;
}
