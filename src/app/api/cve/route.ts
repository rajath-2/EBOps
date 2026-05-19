import { NextRequest, NextResponse } from 'next/server';
import { classifyCVE } from '@/agent/classifier';
import { generateCVEResponse } from '@/agent/responder';
import { CVEEventSchema } from '@/memory/types';
import { ClassificationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cve = CVEEventSchema.parse(body);

    const classification = await classifyCVE(cve);

    let response = null;
    if (classification.requires_deep_analysis) {
      response = await generateCVEResponse(cve, classification);
    }

    return NextResponse.json({
      cve_id: cve.cve_id,
      classification,
      response,
      routed_to_strong_model: classification.requires_deep_analysis,
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid CVE payload', details: err.errors }, { status: 400 });
    }
    if (err instanceof ClassificationError) {
      logger.error('Classification error:', err);
      return NextResponse.json({ error: err.message, details: err.context }, { status: 422 });
    }
    logger.error('[api/cve] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
