/**
 * Prompts registry.
 * Central index for all prompts and their configurations.
 */

import { parseFoodPrompt } from './parse-food';
import { parseSetPrompt } from './parse-set';
import { generatePlanTrainingPrompt } from './generate-plan-training';

export type PromptConfig = {
  system: string;
  tool: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  };
};

export const PROMPTS = {
  'parse-food': parseFoodPrompt,
  'parse-set': parseSetPrompt,
  'generate-plan-training': generatePlanTrainingPrompt,
  // TODO: add remaining prompts
} as const;

export function getPrompt(taskKey: string): PromptConfig | null {
  return (PROMPTS as Record<string, PromptConfig | undefined>)[taskKey] ?? null;
}

export function getAllPromptKeys(): string[] {
  return Object.keys(PROMPTS);
}
