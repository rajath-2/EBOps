import { NextRequest, NextResponse } from 'next/server';
import { recallMemory, checkHindsightHealth } from '@/memory/client';
import { logger } from '@/lib/logger';

/**
 * GET /api/memory?bank=<bank>&query=<query>
 * Recalls memory from a specific Hindsight bank.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bank = searchParams.get('bank');
    const query = searchParams.get('query');

    if (!bank || !query) {
      return NextResponse.json({ error: 'Missing bank or query parameter' }, { status: 400 });
    }

    const content = await recallMemory(bank, query);
    
    return NextResponse.json({
      bank,
      query,
      content
    });
  } catch (err) {
    logger.error('[api/memory] Unhandled error in GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * HEAD /api/memory
 * Performs a health check on the Hindsight service.
 */
export async function HEAD() {
  try {
    const isHealthy = await checkHindsightHealth();
    
    if (isHealthy) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch (err) {
    logger.error('[api/memory] Unhandled error in HEAD:', err);
    return new NextResponse(null, { status: 500 });
  }
}
