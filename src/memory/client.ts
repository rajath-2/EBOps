import { HindsightClient, recallResponseToPromptString } from '@vectorize-io/hindsight-client';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

let _client: HindsightClient | null = null;

const LOCAL_DB_PATH = path.join(process.cwd(), 'src/data/hindsight_local_db.json');

function readLocalDb(): Record<string, Array<{ content: string; metadata?: Record<string, string> }>> {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
    }
  } catch (err) {
    logger.error('Failed to read local DB:', err);
  }
  return {};
}

function writeLocalDb(db: any) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to write local DB:', err);
  }
}

export function getHindsightClient(): HindsightClient {
  if (!_client) {
    const baseUrl = process.env.HINDSIGHT_BASE_URL;
    const apiKey = process.env.HINDSIGHT_API_KEY;

    if (!baseUrl || !apiKey || apiKey.trim() === '' || apiKey.includes('your_')) {
      throw new Error('HINDSIGHT_BASE_URL and HINDSIGHT_API_KEY must be set to use real cloud memory.');
    }

    _client = new HindsightClient({ baseUrl, apiKey });
  }
  return _client;
}

export async function checkHindsightHealth(): Promise<boolean> {
  try {
    const apiKey = process.env.HINDSIGHT_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_')) {
      return true; // Local memory is always healthy
    }
    getHindsightClient();
    return true;
  } catch (err) {
    logger.warn('Hindsight cloud offline, using local fallback.');
    return true; // Local memory is active and healthy
  }
}

export async function retainMemory(
  bank: string,
  content: string,
  metadata?: Record<string, string>
): Promise<void> {
  // Always save to the local JSON database to guarantee offline persistence
  try {
    const db = readLocalDb();
    if (!db[bank]) db[bank] = [];
    if (!db[bank].some((item: any) => item.content === content)) {
      db[bank].push({ content, metadata });
      writeLocalDb(db);
      logger.info(`Memory retained locally in bank=${bank}`);
    }
  } catch (err) {
    logger.error('Failed to retain memory locally:', err);
  }

  // Forward to cloud if configured
  const apiKey = process.env.HINDSIGHT_API_KEY;
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_')) {
    try {
      const client = getHindsightClient();
      await client.retain(bank, content, metadata);
      logger.info(`Memory retained in cloud bank=${bank}`);
    } catch (err) {
      logger.error(`[hindsight] cloud retain failed for bank=${bank}:`, err);
    }
  }
}

export async function recallMemory(
  bank: string,
  query: string
): Promise<string> {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  const useRealCloud = apiKey && apiKey.trim() !== '' && !apiKey.includes('your_');

  if (useRealCloud) {
    try {
      const client = getHindsightClient();
      const result = await client.recall(bank, query);
      logger.info(`Memory recalled from cloud bank=${bank}`);
      
      // Limit to top 3 matching facts to respect Groq free-tier TPM limits (12,000 tokens)
      if (result && result.results && result.results.length > 3) {
        result.results = result.results.slice(0, 3);
      }
      
      return recallResponseToPromptString(result);
    } catch (err) {
      logger.warn(`[hindsight] cloud recall failed for bank=${bank}, falling back to local:`, err);
    }
  }

  // Fallback to local memory matching
  try {
    logger.info(`Memory recalled from local bank=${bank} (query: "${query}")`);
    const db = readLocalDb();
    const entries = db[bank] || [];
    
    if (entries.length === 0) {
      return '';
    }

    // Smart keyword matching
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scoredEntries = entries.map(entry => {
      let score = 0;
      const contentLower = entry.content.toLowerCase();
      
      // Match query terms in content and metadata
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          score += 1;
        }
        if (entry.metadata) {
          for (const val of Object.values(entry.metadata)) {
            if (val.toLowerCase().includes(term)) {
              score += 3;
            }
          }
        }
      }
      return { entry, score };
    });

    // Filter, sort, and slice matches
    const matches = scoredEntries
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.entry);

    if (matches.length === 0) {
      // Safe fallback: return first 2 entries if no specific keywords match
      return entries.slice(0, 2).map(e => e.content).join('\n\n');
    }

    return matches.slice(0, 3).map(e => e.content).join('\n\n');
  } catch (err) {
    logger.error(`[hindsight] local recall failed:`, err);
    return '';
  }
}
