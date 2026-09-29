import type { ReferenceOrganism, ReferenceAntimicrobial, ReferenceSpecimen } from '@/types/database';

// ============================================================
// Fuzzy Matching Engine
// ============================================================

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Compute similarity score between 0 and 1.
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.\-_]/g, '');
}

// ============================================================
// Match Result
// ============================================================

export interface MatchResult {
  canonical_name: string;
  ref_id: string;
  confidence: number;
  matched_alias: string | null;
}

// ============================================================
// Standardize Organism
// ============================================================

const SIMILARITY_THRESHOLD = 0.75;

export function standardizeOrganism(
  raw: string,
  references: ReferenceOrganism[]
): MatchResult | null {
  if (!raw || raw.trim().length === 0) return null;
  
  const normalizedRaw = normalize(raw);

  // 1. Exact match on canonical name
  for (const ref of references) {
    if (normalize(ref.canonical_name) === normalizedRaw) {
      return {
        canonical_name: ref.canonical_name,
        ref_id: ref.id,
        confidence: 1.0,
        matched_alias: null,
      };
    }
  }

  // 2. Exact match on aliases
  for (const ref of references) {
    for (const alias of ref.aliases) {
      if (normalize(alias) === normalizedRaw) {
        return {
          canonical_name: ref.canonical_name,
          ref_id: ref.id,
          confidence: 1.0,
          matched_alias: alias,
        };
      }
    }
  }

  // 3. Fuzzy match on canonical name + aliases
  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const ref of references) {
    const nameScore = similarity(normalizedRaw, normalize(ref.canonical_name));
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = {
        canonical_name: ref.canonical_name,
        ref_id: ref.id,
        confidence: nameScore,
        matched_alias: null,
      };
    }

    for (const alias of ref.aliases) {
      const aliasScore = similarity(normalizedRaw, normalize(alias));
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestMatch = {
          canonical_name: ref.canonical_name,
          ref_id: ref.id,
          confidence: aliasScore,
          matched_alias: alias,
        };
      }
    }
  }

  if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
    return bestMatch;
  }

  return null;
}

// ============================================================
// Standardize Antimicrobial
// ============================================================

export function standardizeAntimicrobial(
  raw: string,
  references: ReferenceAntimicrobial[]
): MatchResult | null {
  if (!raw || raw.trim().length === 0) return null;
  
  const normalizedRaw = normalize(raw);

  for (const ref of references) {
    if (normalize(ref.canonical_name) === normalizedRaw) {
      return {
        canonical_name: ref.canonical_name,
        ref_id: ref.id,
        confidence: 1.0,
        matched_alias: null,
      };
    }
  }

  for (const ref of references) {
    for (const alias of ref.aliases) {
      if (normalize(alias) === normalizedRaw) {
        return {
          canonical_name: ref.canonical_name,
          ref_id: ref.id,
          confidence: 1.0,
          matched_alias: alias,
        };
      }
    }
  }

  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const ref of references) {
    const nameScore = similarity(normalizedRaw, normalize(ref.canonical_name));
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = {
        canonical_name: ref.canonical_name,
        ref_id: ref.id,
        confidence: nameScore,
        matched_alias: null,
      };
    }

    for (const alias of ref.aliases) {
      const aliasScore = similarity(normalizedRaw, normalize(alias));
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestMatch = {
          canonical_name: ref.canonical_name,
          ref_id: ref.id,
          confidence: aliasScore,
          matched_alias: alias,
        };
      }
    }
  }

  if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
    return bestMatch;
  }

  return null;
}

// ============================================================
// Standardize Specimen
// ============================================================

export function standardizeSpecimen(
  raw: string,
  references: ReferenceSpecimen[]
): MatchResult | null {
  if (!raw || raw.trim().length === 0) return null;
  
  const normalizedRaw = normalize(raw);

  for (const ref of references) {
    if (normalize(ref.canonical_name) === normalizedRaw) {
      return {
        canonical_name: ref.canonical_name,
        ref_id: ref.id,
        confidence: 1.0,
        matched_alias: null,
      };
    }
  }

  for (const ref of references) {
    for (const alias of ref.aliases) {
      if (normalize(alias) === normalizedRaw) {
        return {
          canonical_name: ref.canonical_name,
          ref_id: ref.id,
          confidence: 1.0,
          matched_alias: alias,
        };
      }
    }
  }

  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const ref of references) {
    const nameScore = similarity(normalizedRaw, normalize(ref.canonical_name));
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = {
        canonical_name: ref.canonical_name,
        ref_id: ref.id,
        confidence: nameScore,
        matched_alias: null,
      };
    }

    for (const alias of ref.aliases) {
      const aliasScore = similarity(normalizedRaw, normalize(alias));
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestMatch = {
          canonical_name: ref.canonical_name,
          ref_id: ref.id,
          confidence: aliasScore,
          matched_alias: alias,
        };
      }
    }
  }

  if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
    return bestMatch;
  }

  return null;
}

// ============================================================
// Standardize SIR Result
// ============================================================

const SIR_ALIASES: Record<string, 'S' | 'I' | 'R'> = {
  's': 'S', 'sensible': 'S', 'sensitive': 'S', 'susceptible': 'S',
  'i': 'I', 'intermediate': 'I', 'intermédiaire': 'I',
  'r': 'R', 'resistant': 'R', 'résistant': 'R',
};

export function standardizeSIR(raw: string): 'S' | 'I' | 'R' | null {
  if (!raw || raw.trim().length === 0) return null;
  const normalized = raw.toLowerCase().trim();
  return SIR_ALIASES[normalized] ?? null;
}
