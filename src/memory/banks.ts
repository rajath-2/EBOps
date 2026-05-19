export const BANKS = {
  ADR: 'architecture-decisions',
  INCIDENTS: 'past-incidents',
  CVE_RESPONSES: 'cve-responses',
  HANDOFFS: 'shift-handoffs',
} as const;

export type BankName = typeof BANKS[keyof typeof BANKS];
