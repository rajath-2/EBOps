import 'dotenv/config';
import { retainMemory } from './client';
import { BANKS } from './banks';
import { adrs } from '@/data/adrs';
import { incidents } from '@/data/incidents';
import { logger } from '@/lib/logger';

export async function seedMemoryBanks(): Promise<void> {
  logger.info('[seed] Starting memory bank seeding...');

  try {
    // Seed ADRs
    for (const adr of adrs) {
      const content = `
        ADR ${adr.id}: ${adr.title}
        Date: ${adr.date} | Status: ${adr.status}
        Context: ${adr.context}
        Decision: ${adr.decision}
        Consequences: ${adr.consequences}
        Services affected: ${adr.services_affected.join(', ')}
      `.trim();

      await retainMemory(BANKS.ADR, content, {
        adr_id: adr.id,
        status: adr.status,
        services: adr.services_affected.join(','),
        tags: adr.tags.join(','),
      });
      logger.info(`[seed] Retained ${adr.id}`);
    }

    // Seed past incidents
    for (const incident of incidents) {
      const content = `
        Incident ${incident.id}: ${incident.title}
        Date: ${incident.date} | Severity: ${incident.severity}
        CVE: ${incident.cve_id ?? 'N/A'}
        Services affected: ${incident.services_affected.join(', ')}
        Blast radius reasoning: ${incident.blast_radius_reasoning}
        Resolution: ${incident.resolution}
        ADRs referenced: ${incident.adr_references.join(', ')}
        Lessons learned: ${incident.lessons_learned}
      `.trim();

      await retainMemory(BANKS.INCIDENTS, content, {
        incident_id: incident.id,
        severity: incident.severity,
        cve_id: incident.cve_id ?? '',
        services: incident.services_affected.join(','),
        adr_refs: incident.adr_references.join(','),
      });
      logger.info(`[seed] Retained ${incident.id}`);
    }

    logger.info('[seed] Done. Memory banks are ready.');
  } catch (error) {
    logger.error('[seed] Fatal error during seeding:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedMemoryBanks().catch((err) => {
    logger.error('[seed] Uncaught error:', err);
    process.exit(1);
  });
}
