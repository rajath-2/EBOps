import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { retainMemory } from '@/memory/client';
import { BANKS } from '@/memory/banks';
import { ClassificationSchema, type Classification } from '@/memory/types';
import { getModelName } from '@/cascade/router';
import { ClassificationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function classifyCVE(
  cve: { cve_id: string; description: string; cvss_score: number; cvss_vector: string }
): Promise<Classification> {
  const model = groq(getModelName('cheap'));

  try {
    const { object } = await generateObject({
      model,
      schema: ClassificationSchema,
      prompt: `
        You are a security triage classifier. Analyze this CVE and classify it.
        CVE ID: ${cve.cve_id}
        CVSS Score: ${cve.cvss_score}
        CVSS Vector: ${cve.cvss_vector}
        Description: ${cve.description}

        Classify the CVE.
        Be concise in reasoning — 1-2 sentences max.
      `.trim(),
    }) as { object: Classification };

    // Corrected logic: Trigger Stage 2 if: CVSS >= 7.0 OR (attack_surface == 'network' AND attack_complexity == 'low')
    object.requires_deep_analysis = cve.cvss_score >= 7.0 || 
      (object.attack_surface === 'network' && object.attack_complexity === 'low');

    // Always retain triage decision in Hindsight
    await retainMemory(
      BANKS.CVE_RESPONSES,
      `Triage decision for ${cve.cve_id}: ${object.severity} severity. Reasoning: ${object.reasoning}`,
      { cve_id: cve.cve_id, stage: 'triage' }
    );

    return object;
  } catch (error) {
    logger.error('CVE Classification failed', { cve_id: cve.cve_id, error });
    throw new ClassificationError(`Failed to classify CVE ${cve.cve_id}`, { cause: error });
  }
}
