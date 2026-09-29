import type { QualityIssueType, IssueSeverity } from '@/types/database';
import type { ParsedRow } from '@/lib/parsers/csv-parser';
import type { ColumnMapping } from '@/lib/validation/schemas';

// ============================================================
// Quality Issue Descriptor
// ============================================================

export interface QualityIssueDescriptor {
  issue_type: QualityIssueType;
  severity: IssueSeverity;
  message: string;
  field_name: string | null;
  field_value: string | null;
}

// ============================================================
// Check a single row for quality issues
// ============================================================

export function checkRowQuality(
  row: ParsedRow,
  mapping: ColumnMapping,
  rowIndex: number,
  allRows: ParsedRow[]
): QualityIssueDescriptor[] {
  const issues: QualityIssueDescriptor[] = [];

  const organism = row[mapping.organism]?.trim() || '';
  const antimicrobial = row[mapping.antimicrobial]?.trim() || '';
  const specimen = mapping.specimen ? (row[mapping.specimen]?.trim() || '') : '';
  const result = row[mapping.result]?.trim() || '';
  const sampleDate = mapping.sample_date ? (row[mapping.sample_date]?.trim() || '') : '';

  // Missing required fields
  if (!organism) {
    issues.push({
      issue_type: 'missing_organism',
      severity: 'error',
      message: `Row ${rowIndex + 1}: Missing organism name`,
      field_name: 'organism',
      field_value: null,
    });
  }

  if (!antimicrobial) {
    issues.push({
      issue_type: 'missing_antimicrobial',
      severity: 'error',
      message: `Row ${rowIndex + 1}: Missing antimicrobial name`,
      field_name: 'antimicrobial',
      field_value: null,
    });
  }

  if (!specimen && mapping.specimen) {
    issues.push({
      issue_type: 'missing_specimen',
      severity: 'warning',
      message: `Row ${rowIndex + 1}: Missing specimen type`,
      field_name: 'specimen',
      field_value: null,
    });
  }

  if (!result) {
    issues.push({
      issue_type: 'missing_result',
      severity: 'error',
      message: `Row ${rowIndex + 1}: Missing susceptibility result (S/I/R)`,
      field_name: 'result',
      field_value: null,
    });
  }

  if (!sampleDate && mapping.sample_date) {
    issues.push({
      issue_type: 'missing_date',
      severity: 'warning',
      message: `Row ${rowIndex + 1}: Missing sample date`,
      field_name: 'sample_date',
      field_value: null,
    });
  }

  // Invalid SIR result
  if (result) {
    const normalized = result.toUpperCase().trim();
    const validValues = ['S', 'I', 'R', 'SENSIBLE', 'SENSITIVE', 'SUSCEPTIBLE',
      'INTERMEDIATE', 'INTERMÉDIAIRE', 'RESISTANT', 'RÉSISTANT'];
    if (!validValues.includes(normalized)) {
      issues.push({
        issue_type: 'invalid_result',
        severity: 'error',
        message: `Row ${rowIndex + 1}: Invalid result "${result}" — expected S, I, or R`,
        field_name: 'result',
        field_value: result,
      });
    }
  }

  // Duplicate detection
  if (organism && antimicrobial) {
    const isDuplicate = allRows.some((otherRow, otherIndex) => {
      if (otherIndex >= rowIndex) return false;
      const otherOrganism = otherRow[mapping.organism]?.trim() || '';
      const otherAntimicrobial = otherRow[mapping.antimicrobial]?.trim() || '';
      const otherSpecimen = mapping.specimen ? (otherRow[mapping.specimen]?.trim() || '') : '';
      const otherDate = mapping.sample_date ? (otherRow[mapping.sample_date]?.trim() || '') : '';

      return (
        otherOrganism.toLowerCase() === organism.toLowerCase() &&
        otherAntimicrobial.toLowerCase() === antimicrobial.toLowerCase() &&
        otherSpecimen.toLowerCase() === specimen.toLowerCase() &&
        otherDate === sampleDate
      );
    });

    if (isDuplicate) {
      issues.push({
        issue_type: 'possible_duplicate',
        severity: 'warning',
        message: `Row ${rowIndex + 1}: Possible duplicate — same organism, antimicrobial, specimen, and date found in an earlier row`,
        field_name: null,
        field_value: null,
      });
    }
  }

  return issues;
}

// ============================================================
// Check standardization results for unknown names
// ============================================================

export function checkStandardizationQuality(
  rowIndex: number,
  organismMatched: boolean,
  antimicrobialMatched: boolean,
  specimenMatched: boolean,
  rawOrganism: string | null,
  rawAntimicrobial: string | null,
  rawSpecimen: string | null
): QualityIssueDescriptor[] {
  const issues: QualityIssueDescriptor[] = [];

  if (rawOrganism && !organismMatched) {
    issues.push({
      issue_type: 'unknown_organism',
      severity: 'warning',
      message: `Row ${rowIndex + 1}: Organism "${rawOrganism}" could not be matched to a known reference`,
      field_name: 'organism',
      field_value: rawOrganism,
    });
  }

  if (rawAntimicrobial && !antimicrobialMatched) {
    issues.push({
      issue_type: 'unknown_antimicrobial',
      severity: 'warning',
      message: `Row ${rowIndex + 1}: Antimicrobial "${rawAntimicrobial}" could not be matched to a known reference`,
      field_name: 'antimicrobial',
      field_value: rawAntimicrobial,
    });
  }

  if (rawSpecimen && !specimenMatched) {
    issues.push({
      issue_type: 'unknown_specimen',
      severity: 'info',
      message: `Row ${rowIndex + 1}: Specimen "${rawSpecimen}" could not be matched to a known reference`,
      field_name: 'specimen',
      field_value: rawSpecimen,
    });
  }

  return issues;
}
