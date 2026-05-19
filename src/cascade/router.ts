import { CascadeAgent } from '@cascadeflow/core';

export const cascadeAgent = new CascadeAgent({
  models: [
    {
      name: process.env.CASCADE_CHEAP_MODEL ?? 'llama3-8b-8192',
      provider: 'groq',
      cost: 0.0000008,
    },
    {
      name: process.env.CASCADE_STRONG_MODEL ?? 'qwen-qwq-32b',
      provider: 'groq',
      cost: 0.00000029,
    },
  ],
  cascade: {
    maxBudget: parseFloat(process.env.CASCADE_BUDGET_USD ?? '0.10'),
    verbose: true,
  },
});

export type ModelTier = 'cheap' | 'strong';

/**
 * Returns the model name for the given tier.
 * Import this in agent files — do not read process.env directly.
 */
export function getModelName(tier: ModelTier): string {
  return tier === 'cheap'
    ? (process.env.CASCADE_CHEAP_MODEL ?? 'llama3-8b-8192')
    : (process.env.CASCADE_STRONG_MODEL ?? 'qwen-qwq-32b');
}
