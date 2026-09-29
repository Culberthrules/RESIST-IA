import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/ai/prompt';
import {
  calculateOrganismSummaries,
  calculateResistanceRates,
  calculateResistanceTrends,
} from '@/lib/analytics/resistance';
import type { AISummaryResponse } from '@/lib/ai/types';
import type { ASTRecord } from '@/types/database';

const aiPayloadSchema = z.object({
  summary: z.string(),
  key_findings: z.array(z.string()),
  limitations: z.array(z.string()),
});

function formatResistanceRates(
  rates: ReturnType<typeof calculateResistanceRates>
): string {
  if (rates.length === 0) return 'No resistance rate data.';

  return rates
    .slice(0, 40)
    .map(
      (r) =>
        `- ${r.organism} / ${r.antimicrobial}: ${r.resistance_percentage}% R (n=${r.total_tested}, 95% CI ${r.confidence_interval_lower}–${r.confidence_interval_upper}%)`
    )
    .join('\n');
}

function formatOrganismSummaries(
  summaries: ReturnType<typeof calculateOrganismSummaries>
): string {
  if (summaries.length === 0) return 'No organism summaries.';

  return summaries
    .slice(0, 15)
    .map((s) => {
      const top = s.top_resistances
        .slice(0, 3)
        .map((t) => `${t.antimicrobial} ${t.resistance_percentage}% (n=${t.total_tested})`)
        .join('; ');
      return `- ${s.organism}: ${s.total_isolates} isolates. Top resistance: ${top || 'n/a'}`;
    })
    .join('\n');
}

function formatTrends(trends: ReturnType<typeof calculateResistanceTrends>): string {
  if (trends.length === 0) return 'No temporal trend data.';

  return trends
    .slice(-24)
    .map(
      (t) =>
        `- ${t.period} | ${t.organism} / ${t.antimicrobial}: ${t.resistance_percentage}% R (n=${t.total_tested})`
    )
    .join('\n');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI summary is not configured' }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const dateFrom = params.get('dateFrom') ?? 'all time';
  const dateTo = params.get('dateTo') ?? 'present';
  const organism = params.get('organism') ?? undefined;
  const antimicrobial = params.get('antimicrobial') ?? undefined;

  let query = supabase
    .from('ast_records')
    .select('*')
    .eq('review_status', 'validated');

  if (params.get('dateFrom')) {
    query = query.gte('sample_date', params.get('dateFrom')!);
  }
  if (params.get('dateTo')) {
    query = query.lte('sample_date', params.get('dateTo')!);
  }
  if (organism) {
    query = query.eq('organism', organism);
  }
  if (antimicrobial) {
    query = query.eq('antimicrobial', antimicrobial);
  }

  const [{ data: records }, { data: profile }] = await Promise.all([
    query,
    supabase.from('profiles').select('full_name, laboratories(name)').eq('id', user.id).single(),
  ]);

  const astRecords = (records ?? []) as ASTRecord[];
  if (astRecords.length === 0) {
    return NextResponse.json(
      { error: 'No validated records match the selected filters' },
      { status: 400 }
    );
  }

  const resistanceRates = calculateResistanceRates(astRecords);
  const organismSummaries = calculateOrganismSummaries(astRecords);
  const trends = calculateResistanceTrends(astRecords, organism, antimicrobial);

  const labName =
    (profile?.laboratories as { name?: string } | null)?.name ?? 'Laboratory';

  const userPrompt = USER_PROMPT_TEMPLATE.replace('{laboratory_name}', labName)
    .replace('{date_from}', dateFrom)
    .replace('{date_to}', dateTo)
    .replace('{total_records}', String(astRecords.length))
    .replace('{resistance_rates}', formatResistanceRates(resistanceRates))
    .replace('{organism_summaries}', formatOrganismSummaries(organismSummaries))
    .replace('{trends}', formatTrends(trends));

  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o';

  const completionResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nReturn JSON only with keys: summary (string), key_findings (string[]), limitations (string[]).`,
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!completionResponse.ok) {
    const detail = await completionResponse.text();
    return NextResponse.json(
      { error: `AI provider error: ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const completionJson = (await completionResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = completionJson.choices?.[0]?.message?.content;
  if (!rawContent) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
  }

  let parsedContent: z.infer<typeof aiPayloadSchema>;
  try {
    parsedContent = aiPayloadSchema.parse(JSON.parse(rawContent));
  } catch {
    return NextResponse.json({ error: 'AI response was not valid JSON' }, { status: 502 });
  }

  const response: AISummaryResponse = {
    ...parsedContent,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
