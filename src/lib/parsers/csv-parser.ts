import Papa from 'papaparse';

export interface ParsedRow {
  [key: string]: string;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  errors: string[];
}

export function parseCSV(fileContent: string): ParseResult {
  const result = Papa.parse<ParsedRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  });

  const headers = result.meta.fields || [];
  const rows = result.data;
  const errors = result.errors.map(
    (e) => `Row ${e.row ?? '?'}: ${e.message}`
  );

  return { headers, rows, errors };
}
