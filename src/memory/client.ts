import { HindsightClient, recallResponseToPromptString } from '@vectorize-io/hindsight-client';
import { logger } from '@/lib/logger';

let _client: HindsightClient | null = null;

export function getHindsightClient(): HindsightClient {
  if (!_client) {
    const baseUrl = process.env.HINDSIGHT_BASE_URL;
    const apiKey = process.env.HINDSIGHT_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error('HINDSIGHT_BASE_URL and HINDSIGHT_API_KEY must be set');
    }

    _client = new HindsightClient({ baseUrl, apiKey });
  }
  return _client;
}

export async function checkHindsightHealth(): Promise<boolean> {
  try {
    getHindsightClient();
    return true;
  } catch (err) {
    logger.error('Hindsight health check failed:', err);
    return false;
  }
}

export async function retainMemory(
  bank: string,
  content: string,
  metadata?: Record<string, string>
): Promise<void> {
  try {
    const client = getHindsightClient();
    await client.retain(bank, content, metadata);
    logger.info(`Memory retained in bank=${bank}`);
  } catch (err) {
    logger.error(`[hindsight] retain failed for bank=${bank}:`, err);
  }
}

export async function recallMemory(
  bank: string,
  query: string
): Promise<string> {
  try {
    const client = getHindsightClient();
    const result = await client.recall(bank, query);
    logger.info(`Memory recalled from bank=${bank}`);
    return recallResponseToPromptString(result);
  } catch (err) {
    logger.error(`[hindsight] recall failed for bank=${bank}:`, err);
    return '';
  }
}
