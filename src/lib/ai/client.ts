import Anthropic from '@anthropic-ai/sdk';
import { ZodSchema } from 'zod';
import { BusinessError, ErrorCodes } from '../errors';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export interface RunLlmOpts<T> {
  /**
   * Task identifier (for routing, caching, logging).
   * Examples: 'parse-food', 'classify-message', 'generate-plan-training'.
   */
  taskKey: string;

  /**
   * Model: 'haiku' (cheap, fast), 'sonnet' (powerful, slower).
   */
  model: 'haiku' | 'sonnet';

  /**
   * System prompt (instructions).
   */
  system: string;

  /**
   * User messages.
   */
  messages: Anthropic.MessageParam[];

  /**
   * Output schema (Zod) for validation.
   */
  schema: ZodSchema<T>;

  /**
   * Tool definitions for structured output (optional).
   * If not provided, schema is used to validate raw output.
   */
  tools?: Anthropic.Tool[];

  /**
   * Max tokens for response (default 4096).
   */
  maxTokens?: number;

  /**
   * User ID for logging and quota tracking (optional).
   */
  userId?: string;
}

export interface RunLlmResult<T> {
  data: T;
  usage: TokenUsage;
  callId: string;
  cached: boolean;
}

/**
 * Model selection for pricing and performance.
 */
const MODEL_MAP = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-3-5-sonnet-20241022',
} as const;

/**
 * Pricing per 1M tokens (for cost calculation).
 */
const PRICING = {
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
} as const;

/**
 * Call LLM with automatic retry, validation, and logging.
 * 
 * Usage:
 *   const { data, usage } = await runLlm({
 *     taskKey: 'parse-food',
 *     model: 'haiku',
 *     system: 'You are a food parser...',
 *     messages: [{ role: 'user', content: 'Parsear "150g pollo"' }],
 *     schema: parseFoodSchema,
 *   });
 */
export async function runLlm<T>(
  opts: RunLlmOpts<T>
): Promise<RunLlmResult<T>> {
  const {
    taskKey,
    model,
    system,
    messages,
    schema,
    tools,
    maxTokens = 4096,
    userId,
  } = opts;

  const modelId = MODEL_MAP[model];
  const callId = generateCallId();
  const startTime = Date.now();
  const promptHash = createHash('sha256')
    .update(JSON.stringify({ system, messages }))
    .digest('hex')
    .slice(0, 64);

  try {
    // Check cache for deterministic tasks (optional, using memory cache for now)
    // TODO: implement Redis cache layer
    const cached = false;

    // Call Claude API
    const response = await client.messages.create(
      {
        model: modelId,
        max_tokens: maxTokens,
        system,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
      },
      { timeout: 30_000 }
    );

    // Extract data from response
    let outputText = '';
    let toolOutput: Record<string, unknown> | null = null;

    for (const block of response.content) {
      if (block.type === 'text') {
        outputText = block.text;
      } else if (block.type === 'tool_use') {
        toolOutput = block.input as Record<string, unknown>;
      }
    }

    // Validate output against schema
    const dataToValidate = toolOutput || outputText;
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      console.error(
        `[LLM] ${taskKey} validation failed`,
        result.error.issues
      );
      throw new BusinessError(
        `LLM output failed validation for ${taskKey}`,
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        500
      );
    }

    // Calculate cost
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costUsd = calculateCost(modelId, inputTokens, outputTokens);

    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      costUsd,
    };

    // Log call (insert into LlmCall table)
    const durationMs = Date.now() - startTime;
    logLlmCall({
      id: callId,
      taskKey,
      model,
      promptHash,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      status: 'success',
      userId,
    });

    return {
      data: result.data,
      usage,
      callId,
      cached,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log failure
    logLlmCall({
      id: callId,
      taskKey,
      model,
      promptHash,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs,
      status: 'error',
      errorMsg: error instanceof Error ? error.message : String(error),
      userId,
    });

    throw error;
  }
}

/**
 * Calculate cost in USD for API call.
 */
function calculateCost(
  modelId: keyof typeof PRICING,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[modelId];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Generate unique call ID.
 */
function generateCallId(): string {
  return `llm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Log LLM call to console and database.
 * TODO: persist to Prisma LlmCall model.
 */
function logLlmCall(data: {
  id: string;
  taskKey: string;
  model: string;
  promptHash?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  status: 'success' | 'error' | 'cached';
  errorMsg?: string;
  userId?: string;
}) {
  const level =
    data.status === 'success' ? 'debug' : data.status === 'cached' ? 'debug' : 'warn';

  console.log(
    `[LLM] ${data.id} ${data.taskKey} (${data.model}) - ${data.durationMs}ms - ${data.status}`,
    {
      tokens: `${data.inputTokens}+${data.outputTokens}`,
      cost: `$${data.costUsd.toFixed(6)}`,
      userId: data.userId,
      error: data.errorMsg,
    }
  );

  // Persist to Prisma (best-effort, do not throw)
  try {
    (prisma as any).llmCall
      .create({
        data: {
          id: data.id,
          userId: data.userId ?? null,
          taskKey: data.taskKey,
          model: data.model,
          promptHash: data.promptHash ?? '',
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          costUsd: new Prisma.Decimal(data.costUsd || 0),
          durationMs: data.durationMs,
          status: data.status,
          errorMsg: data.errorMsg ?? null,
        },
      })
      .catch((err: unknown) => console.warn('[LLM] Failed persisting LlmCall', err));
  } catch (err) {
    console.warn('[LLM] Prisma persistence error', err);
  }
}
