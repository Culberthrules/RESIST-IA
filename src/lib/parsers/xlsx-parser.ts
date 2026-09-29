import * as XLSX from 'xlsx';
import type { ParseResult, ParsedRow } from './csv-parser';

export function parseXLSX(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  
  if (!firstSheetName) {
    return { headers: [], rows: [], errors: ['No sheets found in workbook'] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
    defval: '',
    raw: false,
  });

  if (jsonData.length === 0) {
    return { headers: [], rows: [], errors: ['Sheet is empty'] };
  }

  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map((row) => {
    const cleanRow: ParsedRow = {};
    for (const key of headers) {
      cleanRow[key.trim()] = String(row[key] ?? '').trim();
    }
    return cleanRow;
  });

  return { headers, rows, errors: [] };
}
