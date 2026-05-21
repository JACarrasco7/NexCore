/**
 * Router to select model and prompt for each task.
 */

export const TASK_MODEL_MAP = {
  // Haiku tasks (cheap, fast)
  'classify-message': 'haiku',
  'parse-food': 'haiku',
  'parse-set': 'haiku',
  'normalize-exercise': 'haiku',
  'tag-exercise': 'haiku',
  'summarize-checkin': 'haiku',
  'tag-notification': 'haiku',

  // Sonnet tasks (powerful)
  'generate-plan-training': 'sonnet',
  'generate-plan-nutrition': 'sonnet',
  'analyze-progress': 'sonnet',
  'coach-assistant': 'sonnet',
  'rewrite-feedback': 'sonnet',
} as const;

export type TaskKey = keyof typeof TASK_MODEL_MAP;

export function getModel(taskKey: string): 'haiku' | 'sonnet' {
  const model = TASK_MODEL_MAP[taskKey as TaskKey];
  if (!model) {
    console.warn(`[AI Router] Unknown task key: ${taskKey}, defaulting to haiku`);
    return 'haiku';
  }
  return model;
}

export function isHaikuTask(taskKey: string): boolean {
  return getModel(taskKey) === 'haiku';
}

export function isSonnetTask(taskKey: string): boolean {
  return getModel(taskKey) === 'sonnet';
}
