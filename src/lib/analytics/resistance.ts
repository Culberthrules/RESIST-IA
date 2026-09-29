import type { ASTRecord, ResistanceRate, ResistanceTrend, OrganismSummary } from '@/types/database';

// ============================================================
// Pure TypeScript Resistance Calculations
// No LLM involvement — all numbers are deterministic
// ============================================================

/**
 * Wilson score interval for binomial proportions.
 * More reliable than Wald interval for small sample sizes.
 */
function wilsonInterval(
  successes: number,
  total: number,
  z: number = 1.96 // 95% CI
): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 0 };

  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);

  return {
    lower: Math.max(0, ((centre - margin) / denominator) * 100),
    upper: Math.min(100, ((centre + margin) / denominator) * 100),
  };
}

/**
 * Calculate resistance rates grouped by organism and antimicrobial.
 * Only uses validated records with valid SIR results.
 */
export function calculateResistanceRates(
  records: ASTRecord[]
): ResistanceRate[] {
  // Filter to validated records with valid results
  const validRecords = records.filter(
    (r) => r.review_status === 'validated' && r.result && r.organism && r.antimicrobial
  );

  // Group by organism + antimicrobial
  const groups = new Map<string, ASTRecord[]>();
  for (const record of validRecords) {
    const key = `${record.organism}|||${record.antimicrobial}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }

  const rates: ResistanceRate[] = [];

  for (const [key, groupRecords] of groups) {
    const [organism, antimicrobial] = key.split('|||');
    const total = groupRecords.length;
    const resistant = groupRecords.filter((r) => r.result === 'R').length;
    const intermediate = groupRecords.filter((r) => r.result === 'I').length;
    const susceptible = groupRecords.filter((r) => r.result === 'S').length;
    const ci = wilsonInterval(resistant, total);

    rates.push({
      organism,
      antimicrobial,
      total_tested: total,
      resistant_count: resistant,
      intermediate_count: intermediate,
      susceptible_count: susceptible,
      resistance_percentage: total > 0 ? Math.round((resistant / total) * 10000) / 100 : 0,
      confidence_interval_lower: Math.round(ci.lower * 100) / 100,
      confidence_interval_upper: Math.round(ci.upper * 100) / 100,
    });
  }

  // Sort by resistance percentage descending
  rates.sort((a, b) => b.resistance_percentage - a.resistance_percentage);

  return rates;
}

/**
 * Calculate resistance trends over time.
 * Groups by month (YYYY-MM) for each organism-antimicrobial pair.
 */
export function calculateResistanceTrends(
  records: ASTRecord[],
  organism?: string,
  antimicrobial?: string
): ResistanceTrend[] {
  let validRecords = records.filter(
    (r) =>
      r.review_status === 'validated' &&
      r.result &&
      r.organism &&
      r.antimicrobial &&
      r.sample_date
  );

  if (organism) {
    validRecords = validRecords.filter((r) => r.organism === organism);
  }
  if (antimicrobial) {
    validRecords = validRecords.filter((r) => r.antimicrobial === antimicrobial);
  }

  // Group by period + organism + antimicrobial
  const groups = new Map<string, ASTRecord[]>();
  for (const record of validRecords) {
    const period = record.sample_date!.substring(0, 7); // YYYY-MM
    const key = `${period}|||${record.organism}|||${record.antimicrobial}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }

  const trends: ResistanceTrend[] = [];

  for (const [key, groupRecords] of groups) {
    const [period, org, abx] = key.split('|||');
    const total = groupRecords.length;
    const resistant = groupRecords.filter((r) => r.result === 'R').length;

    trends.push({
      period,
      organism: org,
      antimicrobial: abx,
      resistance_percentage: total > 0 ? Math.round((resistant / total) * 10000) / 100 : 0,
      total_tested: total,
    });
  }

  // Sort chronologically
  trends.sort((a, b) => a.period.localeCompare(b.period));

  return trends;
}

/**
 * Generate organism summaries with specimen distribution and top resistances.
 */
export function calculateOrganismSummaries(
  records: ASTRecord[]
): OrganismSummary[] {
  const validRecords = records.filter(
    (r) => r.review_status === 'validated' && r.organism
  );

  // Group by organism
  const orgGroups = new Map<string, ASTRecord[]>();
  for (const record of validRecords) {
    const org = record.organism!;
    if (!orgGroups.has(org)) {
      orgGroups.set(org, []);
    }
    orgGroups.get(org)!.push(record);
  }

  const summaries: OrganismSummary[] = [];

  for (const [organism, orgRecords] of orgGroups) {
    // Specimen distribution
    const specimenDist: Record<string, number> = {};
    for (const r of orgRecords) {
      const spec = r.specimen || 'Unknown';
      specimenDist[spec] = (specimenDist[spec] || 0) + 1;
    }

    // Top resistances
    const abxGroups = new Map<string, ASTRecord[]>();
    for (const r of orgRecords) {
      if (r.antimicrobial && r.result) {
        if (!abxGroups.has(r.antimicrobial)) {
          abxGroups.set(r.antimicrobial, []);
        }
        abxGroups.get(r.antimicrobial)!.push(r);
      }
    }

    const topResistances: OrganismSummary['top_resistances'] = [];
    for (const [abx, abxRecords] of abxGroups) {
      const total = abxRecords.length;
      const resistant = abxRecords.filter((r) => r.result === 'R').length;
      topResistances.push({
        antimicrobial: abx,
        resistance_percentage: total > 0 ? Math.round((resistant / total) * 10000) / 100 : 0,
        total_tested: total,
      });
    }

    topResistances.sort((a, b) => b.resistance_percentage - a.resistance_percentage);

    summaries.push({
      organism,
      total_isolates: orgRecords.length,
      specimen_distribution: specimenDist,
      top_resistances: topResistances.slice(0, 10),
    });
  }

  summaries.sort((a, b) => b.total_isolates - a.total_isolates);

  return summaries;
}
