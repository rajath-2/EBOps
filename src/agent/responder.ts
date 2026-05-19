import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { recallMemory, retainMemory } from '@/memory/client';
import { BANKS } from '@/memory/banks';
import { CVEResponseSchema, type CVEResponse, type Classification } from '@/memory/types';
import { getModelName } from '@/cascade/router';
import { logger } from '@/lib/logger';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function generateCVEResponse(
  cve: { cve_id: string; description: string; cvss_score: number },
  classification: Classification
): Promise<CVEResponse> {
  const query = `${cve.description} ${classification.affected_package_families.join(' ')}`;
  
  const [adrContext, incidentContext] = await Promise.allSettled([
    recallMemory(BANKS.ADR, query),
    recallMemory(BANKS.INCIDENTS, query),
  ]);

  const adrMemory = adrContext.status === 'fulfilled' ? adrContext.value : '';
  const incidentMemory = incidentContext.status === 'fulfilled' ? incidentContext.value : '';

  const model = groq(getModelName('strong'));

  try {
    const { object } = await generateObject({
      model,
      schema: CVEResponseSchema,
      prompt: `
        You are a senior security engineer with full architectural context.
        
        CVE: ${cve.cve_id} (CVSS: ${cve.cvss_score})
        Description: ${cve.description}
        Classification: ${JSON.stringify(classification)}
        
        ARCHITECTURE MEMORY (ADRs):
        ${adrMemory || 'No relevant ADRs found.'}
        
        INCIDENT HISTORY:
        ${incidentMemory || 'No similar past incidents found.'}
        
        Based on the architectural context above:
        1. Identify which specific services are affected and WHY (cite ADR/incident IDs)
        2. Assess blast radius
        3. Draft remediation steps that respect architectural constraints from ADRs
        4. Note any similar past incidents and what was different
        5. List open threads for the next shift
        
        If no ADR or incident context is found for a claim, say so explicitly — 
        do not hallucinate architectural details.
      `.trim(),
    }) as { object: CVEResponse };

    await retainMemory(
      BANKS.CVE_RESPONSES,
      `CVE Response for ${cve.cve_id}: ${object.blast_radius_summary}. Affected: ${object.affected_services.map(s => s.name).join(', ')}`,
      { cve_id: cve.cve_id, confidence: object.confidence, stage: 'analysis' }
    );

    return object;
  } catch (error) {
    logger.error('CVE Response generation failed', { cve_id: cve.cve_id, error });
    throw error;
  }
}
