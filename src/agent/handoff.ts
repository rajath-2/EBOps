import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { recallMemory, retainMemory } from '@/memory/client';
import { BANKS } from '@/memory/banks';
import { getModelName } from '@/cascade/router';
import { logger } from '@/lib/logger';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export interface HandoffBriefing {
  generated_at: string;
  shift_summary: string;
  cves_triaged: number;
  open_threads: string[];
  architectural_decisions_made: string[];
  recommended_first_action: string;
  full_narrative: string;
}

export async function generateHandoffBriefing(
  shiftStartTime: string,
  cveIds: string[]
): Promise<HandoffBriefing> {
  const query = `CVE response and decisions made since ${shiftStartTime}`;

  const [cveResponseMemory, incidentMemory] = await Promise.allSettled([
    recallMemory(BANKS.CVE_RESPONSES, query),
    recallMemory(BANKS.INCIDENTS, query),
  ]);

  const cveContext = cveResponseMemory.status === 'fulfilled' ? cveResponseMemory.value : '';
  const incidentContext = incidentMemory.status === 'fulfilled' ? incidentMemory.value : '';

  const model = groq(getModelName('strong'));

  try {
    const { text } = await generateText({
      model,
      prompt: `
        You are generating a shift handoff briefing for the incoming engineer.
        
        Shift started: ${shiftStartTime}
        CVEs handled this shift: ${cveIds.join(', ')}
        
        CVE RESPONSES FROM THIS SHIFT:
        ${cveContext || 'No CVE responses found for this shift.'}
        
        RELEVANT INCIDENT HISTORY:
        ${incidentContext || 'No relevant incidents.'}
        
        Write a concise, narrative handoff briefing that:
        1. Opens with "Since your last shift:" and a 2-sentence summary
        2. Lists each CVE handled with the architectural reasoning behind decisions
        3. Calls out any ADRs that constrained the response
        4. Lists open threads the incoming engineer must pick up
        5. Recommends the single most important first action
        
        Tone: direct, factual, engineer-to-engineer. No fluff.
      `.trim(),
    });

    const briefing: HandoffBriefing = {
      generated_at: new Date().toISOString(),
      shift_summary: text.split('\n')[0] ?? '',
      cves_triaged: cveIds.length,
      open_threads: [],
      architectural_decisions_made: [],
      recommended_first_action: '',
      full_narrative: text,
    };

    await retainMemory(
      BANKS.HANDOFFS,
      `Shift handoff ${briefing.generated_at}: ${briefing.shift_summary}`,
      { shift_start: shiftStartTime, cve_count: String(cveIds.length) }
    );

    return briefing;
  } catch (error) {
    logger.error('Handoff generation failed', { shiftStartTime, cveIds, error });
    throw error;
  }
}
