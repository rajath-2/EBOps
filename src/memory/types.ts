import { z } from 'zod';

// ─── Input schemas ────────────────────────────────────────────────────────────

export const ADRSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  status: z.enum(['accepted', 'superseded', 'deprecated']),
  context: z.string(),
  decision: z.string(),
  consequences: z.string(),
  services_affected: z.array(z.string()),
  tags: z.array(z.string()),
});

export const IncidentSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  severity: z.enum(['P1', 'P2', 'P3']),
  cve_id: z.string().optional(),
  services_affected: z.array(z.string()),
  blast_radius_reasoning: z.string(),
  resolution: z.string(),
  adr_references: z.array(z.string()),
  lessons_learned: z.string(),
  duration_minutes: z.number(),
});

export const CVEEventSchema = z.object({
  cve_id: z.string(),
  description: z.string(),
  cvss_score: z.number(),
  cvss_vector: z.string(),
  published: z.string(),
  affected_packages: z.array(z.string()),
});

// ─── Agent output schemas ─────────────────────────────────────────────────────

export const ClassificationSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  attack_surface: z.enum(['network', 'local', 'physical']),
  attack_complexity: z.enum(['low', 'high']),
  affected_package_families: z.array(z.string()),
  requires_deep_analysis: z.boolean(),
  reasoning: z.string(),
});

export const CVEResponseSchema = z.object({
  affected_services: z.array(z.object({
    name: z.string(),
    reason: z.string(),
    adr_reference: z.string().optional(),
    incident_reference: z.string().optional(),
  })),
  blast_radius_summary: z.string(),
  remediation_steps: z.array(z.object({
    step: z.number(),
    action: z.string(),
    owner: z.string(),
    estimated_effort: z.string(),
    architectural_constraint: z.string().optional(),
  })),
  similar_past_incident: z.object({
    incident_id: z.string(),
    similarity_reason: z.string(),
    what_was_different: z.string(),
  }).optional(),
  open_threads: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
});

// ─── Exported types ───────────────────────────────────────────────────────────

export type ADR = z.infer<typeof ADRSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type CVEEvent = z.infer<typeof CVEEventSchema>;
export type Classification = z.infer<typeof ClassificationSchema>;
export type CVEResponse = z.infer<typeof CVEResponseSchema>;
