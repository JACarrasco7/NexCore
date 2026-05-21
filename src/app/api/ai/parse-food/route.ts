import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiHandler } from '@/lib/api/api-handler';
import { runLlm } from '@/lib/ai/client';
import { parseFoodSchema } from '@/lib/ai/schemas';
import { parseFoodPrompt } from '@/lib/ai/prompts/parse-food';
import { getModel } from '@/lib/ai/router';
import { okOne } from '@/lib/api/shape';
import { parseJsonOrError } from '@/lib/api/json-parser';

const requestSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const POST = apiHandler({
  auth: 'session',
  handler: async (ctx) => {
    const body = await parseJsonOrError(ctx.req);
    if (!body.ok) throw new Error(body.error.toString());

    const { text } = requestSchema.parse(body.data);
    const model = getModel('parse-food');

    const { data, usage } = await runLlm({
      taskKey: 'parse-food',
      model,
      system: parseFoodPrompt.system,
      messages: [{ role: 'user', content: text }],
      schema: parseFoodSchema,
      tools: [
        {
          name: parseFoodPrompt.tool.name,
          description: parseFoodPrompt.tool.description,
          input_schema: parseFoodPrompt.tool.input_schema as any,
        },
      ],
      userId: ctx.session?.user?.id,
    });

    return okOne({
      items: data.items,
      usage,
    });
  },
});
