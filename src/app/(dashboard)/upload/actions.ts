'use server';

import { createClient } from '@/lib/supabase/server';
import { parseCSV } from '@/lib/parsers/csv-parser';
import { parseXLSX } from '@/lib/parsers/xlsx-parser';
import {
  standardizeOrganism,
  standardizeAntimicrobial,
  standardizeSpecimen,
  standardizeSIR,
} from '@/lib/standardization/engine';
import { checkRowQuality, checkStandardizationQuality } from '@/lib/validation/quality-checks';
import type { ColumnMapping } from '@/lib/validation/schemas';
import type { ReferenceOrganism, ReferenceAntimicrobial, ReferenceSpecimen } from '@/types/database';

export interface UploadState {
  step: 'idle' | 'preview' | 'processing' | 'complete' | 'error';
  headers?: string[];
  previewRows?: Record<string, string>[];
  fileName?: string;
  fileSize?: number;
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  uploadId?: string;
  error?: string;
}

export async function previewFileAction(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get('file') as File | null;
  if (!file) {
    return { step: 'error', error: 'No file selected' };
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { step: 'error', error: 'File must be less than 10MB' };
  }

  try {
    let headers: string[];
    let rows: Record<string, string>[];

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const parsed = parseCSV(text);
      headers = parsed.headers;
      rows = parsed.rows;
      if (parsed.errors.length > 0 && rows.length === 0) {
        return { step: 'error', error: `Parse errors: ${parsed.errors.join('; ')}` };
      }
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const parsed = parseXLSX(buffer);
      headers = parsed.headers;
      rows = parsed.rows;
      if (parsed.errors.length > 0 && rows.length === 0) {
        return { step: 'error', error: `Parse errors: ${parsed.errors.join('; ')}` };
      }
    } else {
      return { step: 'error', error: 'Only CSV and Excel files are supported' };
    }

    if (rows.length === 0) {
      return { step: 'error', error: 'File is empty' };
    }

    return {
      step: 'preview',
      headers,
      previewRows: rows.slice(0, 5),
      fileName: file.name,
      fileSize: file.size,
      totalRows: rows.length,
    };
  } catch {
    return { step: 'error', error: 'Failed to parse file. Please check the format.' };
  }
}

export async function processUploadAction(
  formData: FormData
): Promise<UploadState> {
  const file = formData.get('file') as File | null;
  const mappingJson = formData.get('mapping') as string | null;

  if (!file || !mappingJson) {
    return { step: 'error', error: 'Missing file or column mapping' };
  }

  const mapping: ColumnMapping = JSON.parse(mappingJson);
  const supabase = await createClient();

  // Get user profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { step: 'error', error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('laboratory_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { step: 'error', error: 'User profile not found' };
  }

  // Parse file
  let rows: Record<string, string>[];
  if (file.name.endsWith('.csv')) {
    const text = await file.text();
    const parsed = parseCSV(text);
    rows = parsed.rows;
  } else {
    const buffer = await file.arrayBuffer();
    const parsed = parseXLSX(buffer);
    rows = parsed.rows;
  }

  // Fetch reference data
  const [orgRes, abxRes, specRes] = await Promise.all([
    supabase.from('reference_organisms').select('*'),
    supabase.from('reference_antimicrobials').select('*'),
    supabase.from('reference_specimens').select('*'),
  ]);

  const refOrganisms = (orgRes.data ?? []) as ReferenceOrganism[];
  const refAntimicrobials = (abxRes.data ?? []) as ReferenceAntimicrobial[];
  const refSpecimens = (specRes.data ?? []) as ReferenceSpecimen[];

  // Create upload record
  const { data: upload, error: uploadError } = await supabase
    .from('uploads')
    .insert({
      laboratory_id: profile.laboratory_id,
      uploaded_by: user.id,
      file_name: file.name,
      file_size: file.size,
      total_rows: rows.length,
      status: 'processing',
    })
    .select()
    .single();

  if (uploadError || !upload) {
    return { step: 'error', error: `Failed to create upload: ${uploadError?.message}` };
  }

  let validRows = 0;
  let errorRows = 0;

  const failUpload = async (message: string): Promise<UploadState> => {
    await supabase
      .from('uploads')
      .update({ status: 'failed' })
      .eq('id', upload.id);
    return { step: 'error', error: message };
  };

  // Process rows in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const astInserts = [];
    const qualityInserts = [];

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const rowIndex = i + j;

      const rawOrganism = row[mapping.organism]?.trim() || null;
      const rawAntimicrobial = row[mapping.antimicrobial]?.trim() || null;
      const rawSpecimen = mapping.specimen ? (row[mapping.specimen]?.trim() || null) : null;
      const rawResult = row[mapping.result]?.trim() || null;
      const sampleDate = mapping.sample_date ? (row[mapping.sample_date]?.trim() || null) : null;
      const ageGroup = mapping.patient_age_group ? (row[mapping.patient_age_group]?.trim() || null) : null;
      const ward = mapping.ward ? (row[mapping.ward]?.trim() || null) : null;

      // Standardize
      const orgMatch = rawOrganism ? standardizeOrganism(rawOrganism, refOrganisms) : null;
      const abxMatch = rawAntimicrobial ? standardizeAntimicrobial(rawAntimicrobial, refAntimicrobials) : null;
      const specMatch = rawSpecimen ? standardizeSpecimen(rawSpecimen, refSpecimens) : null;
      const sirResult = rawResult ? standardizeSIR(rawResult) : null;

      // Quality checks on raw data
      const rowQuality = checkRowQuality(row, mapping, rowIndex, rows);
      const stdQuality = checkStandardizationQuality(
        rowIndex,
        !!orgMatch,
        !!abxMatch,
        !!specMatch,
        rawOrganism,
        rawAntimicrobial,
        rawSpecimen
      );

      const allIssues = [...rowQuality, ...stdQuality];
      const hasErrors = allIssues.some((q) => q.severity === 'error');

      if (hasErrors) {
        errorRows++;
      } else {
        validRows++;
      }

      const astRecordId = crypto.randomUUID();

      astInserts.push({
        id: astRecordId,
        laboratory_id: profile.laboratory_id,
        upload_id: upload.id,
        raw_organism: rawOrganism,
        raw_antimicrobial: rawAntimicrobial,
        raw_specimen: rawSpecimen,
        raw_result: rawResult,
        organism: orgMatch?.canonical_name ?? rawOrganism,
        antimicrobial: abxMatch?.canonical_name ?? rawAntimicrobial,
        specimen: specMatch?.canonical_name ?? rawSpecimen,
        result: sirResult,
        organism_ref_id: orgMatch?.ref_id ?? null,
        antimicrobial_ref_id: abxMatch?.ref_id ?? null,
        specimen_ref_id: specMatch?.ref_id ?? null,
        sample_date: sampleDate ? parseDate(sampleDate) : null,
        patient_age_group: ageGroup,
        ward,
        row_number: rowIndex + 1,
        review_status: 'pending',
      });

      for (const issue of allIssues) {
        qualityInserts.push({
          laboratory_id: profile.laboratory_id,
          ast_record_id: astRecordId,
          upload_id: upload.id,
          ...issue,
        });
      }
    }

    if (astInserts.length > 0) {
      const { error: astInsertError } = await supabase.from('ast_records').insert(astInserts);
      if (astInsertError) {
        return failUpload(`Failed to save records: ${astInsertError.message}`);
      }
    }

    if (qualityInserts.length > 0) {
      const { error: qiInsertError } = await supabase.from('quality_issues').insert(qualityInserts);
      if (qiInsertError) {
        return failUpload(`Failed to save quality issues: ${qiInsertError.message}`);
      }
    }
  }

  // Update upload status
  await supabase
    .from('uploads')
    .update({
      status: 'completed',
      valid_rows: validRows,
      error_rows: errorRows,
    })
    .eq('id', upload.id);

  return {
    step: 'complete',
    uploadId: upload.id,
    totalRows: rows.length,
    validRows,
    errorRows,
    fileName: file.name,
  };
}

/**
 * Try to parse various date formats into ISO date string.
 */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  
  // Try ISO format directly
  const isoDate = new Date(raw);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split('T')[0];
  }

  // Try DD/MM/YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  return null;
}
