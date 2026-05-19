import { NextRequest, NextResponse } from 'next/server';
import { generateHandoffBriefing } from '@/agent/handoff';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const HandoffRequestSchema = z.object({
  shift_start: z.string().datetime(),
  cve_ids: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shift_start, cve_ids } = HandoffRequestSchema.parse(body);
    const briefing = await generateHandoffBriefing(shift_start, cve_ids);
    return NextResponse.json(briefing);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.errors }, { status: 400 });
    }
    logger.error('[api/handoff] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
