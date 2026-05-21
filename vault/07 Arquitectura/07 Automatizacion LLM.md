# 07 — Automatización con LLMs (Haiku / Sonnet 4.6)

Cómo preparar la app para que **modelos** ejecuten tareas (clasificación, generación, asistencia coach/atleta) de forma segura, barata y mantenible.

## Filosofía

- **Cada tarea LLM = un endpoint dedicado** con prompt versionado.
- **Haiku** para tareas baratas/altísimo volumen (clasificación, parseo, resúmenes cortos).
- **Sonnet 4.6** para tareas complejas (planificación de rutina, análisis longitudinal, generación de feedback experto).
- **Schema de salida obligatorio** (JSON tool use) — nada de "parsear texto libre".
- **Logs de cada interacción** en `LlmCall` para auditoría y mejora de prompts.

## Tareas candidatas

### Haiku (alto volumen, latencia baja)

| Tarea | Input | Output |
|---|---|---|
| Clasificar mensaje atleta | texto + contexto | `{intent: question|complaint|update|emergency, urgency: low|med|high}` |
| Parsear comida desde texto | "150g pollo, 100g arroz" | `[{food, grams}]` con resolución en `FoodCatalog` |
| Parsear set ejecutado | "12x80 RIR2" | `{reps, weight, rir}` |
| Resumen de check-in | texto + datos | bullets concisos |
| Sugerir tags a ejercicio | nombre + descripción | `{muscleGroups, equipment}` |
| Normalizar nombre ejercicio para deduplicar catálogo | string | `slug` canónico |
| Etiquetar urgencia notificación | payload | `{priority: 1-5}` |

### Sonnet 4.6 (complejo, juicio)

| Tarea | Input | Output |
|---|---|---|
| Generar borrador de plan training | objetivo + historial + máquinas | `TrainingPlan` draft (formato Zod) |
| Generar borrador plan nutrición | objetivos + restricciones | `NutritionPlan` draft |
| Análisis longitudinal de progreso | últimos 8 check-ins + sessions + nutrición | informe markdown + recomendaciones |
| Coach assistant chat | conversación + contexto atleta completo | respuesta + acciones sugeridas |
| Detectar inconsistencias (peso↓ + fuerza↑ con def) | series temporales | alertas explicadas |
| Reescribir feedback coach | nota cruda | nota empática profesional |

## Arquitectura técnica

### Capa de servicio LLM

```
src/lib/ai/
  client.ts            -- cliente Anthropic (httpx, retries, timeouts)
  router.ts            -- elige modelo según task
  prompts/
    classify-message.ts
    parse-food.ts
    parse-set.ts
    generate-plan-training.ts
    generate-plan-nutrition.ts
    analyze-progress.ts
    coach-assistant.ts
  schemas/             -- Zod de outputs
  tools/               -- tool definitions para tool_use
  logger.ts            -- persistir LlmCall
  cache.ts             -- cache por hash(input) → output
```

### Cliente base

```ts
// src/lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runLlm<T>(opts: {
  model: 'haiku' | 'sonnet';
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  schema: ZodSchema<T>;
  maxTokens?: number;
  userId?: string;
  taskKey: string;
}): Promise<{ data: T; usage: TokenUsage; callId: string }> {
  // 1. cache check por hash(system+messages+model)
  // 2. llamada API con retries (3, exp backoff)
  // 3. extraer tool_use output
  // 4. validar con schema
  // 5. persistir LlmCall
}
```

### Router de modelos

```ts
// src/lib/ai/router.ts
export const MODEL_MAP = {
  'classify-message': 'haiku',
  'parse-food': 'haiku',
  'parse-set': 'haiku',
  'normalize-exercise': 'haiku',
  'tag-exercise': 'haiku',
  'summarize-checkin': 'haiku',
  'generate-plan-training': 'sonnet',
  'generate-plan-nutrition': 'sonnet',
  'analyze-progress': 'sonnet',
  'coach-assistant': 'sonnet',
  'rewrite-feedback': 'sonnet',
} as const;
```

### Tabla de auditoría

```prisma
model LlmCall {
  id          String   @id @default(cuid())
  userId      String?
  taskKey     String   // 'classify-message', etc.
  model       String   // 'haiku' | 'sonnet'
  promptHash  String   @db.VarChar(64)
  inputTokens Int
  outputTokens Int
  costUsd     Decimal  @db.Decimal(10,6)
  durationMs  Int
  status      String   // 'success' | 'error' | 'cached'
  errorMsg    String?  @db.Text
  createdAt   DateTime @default(now())

  @@index([taskKey, createdAt])
  @@index([userId, createdAt])
}
```

### Cache

- Tareas deterministas/idempotentes (parse-food, normalize-exercise, tag-exercise): cache permanente por `hash(input)`.
- Tareas con contexto cambiante (generate-plan, analyze-progress): no cachear, o cache 1h.
- Store: Redis (Upstash) o tabla `LlmCache` con TTL.

## Patrón de prompt

Cada prompt vive en un archivo con:

```ts
// src/lib/ai/prompts/parse-food.ts
import { z } from 'zod';

export const parseFoodSchema = z.object({
  items: z.array(z.object({
    raw: z.string(),
    food: z.string(),
    grams: z.number().min(0),
    confidence: z.number().min(0).max(1),
  })),
});

export const parseFoodPrompt = {
  system: `Extraes ítems de comida con cantidad en gramos desde texto en español.
- Si la cantidad no está en gramos, conviértela usando porciones estándar.
- "1 plato de arroz" ≈ 200g cocido.
- Si no estás seguro, marca confidence < 0.6.
Devuelve SOLO via tool call.`,
  tool: {
    name: 'parse_food',
    description: 'Estructura los ítems de comida',
    input_schema: zodToJsonSchema(parseFoodSchema),
  },
  build: (input: string) => [{ role: 'user' as const, content: input }],
};
```

Endpoint:

```ts
// src/app/api/ai/parse-food/route.ts
export const POST = apiHandler({
  auth: 'session',
  handler: async (req, { session }) => {
    const { text } = await parseJsonOrError(req, z.object({ text: z.string().min(1).max(2000) }));
    const { data } = await runLlm({
      model: 'haiku',
      taskKey: 'parse-food',
      system: parseFoodPrompt.system,
      messages: parseFoodPrompt.build(text),
      tools: [parseFoodPrompt.tool],
      schema: parseFoodSchema,
      userId: session.user.id,
    });
    // Resolver con FoodCatalog
    const resolved = await foodService.matchToCatalog(data.items);
    return resolved;
  },
});
```

## Seguridad y control

- **Rate limit por usuario**: e.g. 30 calls/hora a Haiku, 10/hora a Sonnet.
- **Quota por team**: presupuesto USD mensual configurable.
- **Lista blanca de taskKeys**: no permitir prompts arbitrarios desde frontend.
- **Filtro PII**: no enviar email, teléfono, dirección a LLM salvo necesario.
- **Validación output**: si schema falla, reintentar con corrección automática (1 vez), luego error.

## UX de IA

- Botones claros: "Generar borrador con IA" → produce data **editable** antes de guardar.
- Indicador `IA` en cualquier campo generado.
- Atleta nunca recibe respuesta IA cruda en chat → siempre revisada por coach o marcada como "asistente IA".
- Mostrar coste/tokens en panel admin (opcional).

## Coach Assistant (Sonnet)

Endpoint conversacional con contexto completo del atleta:

```ts
// src/app/api/ai/coach-assistant/route.ts
- input: { athleteId, conversation: Message[] }
- contexto inyectado por sistema:
  - últimos 3 check-ins
  - plan training activo
  - plan nutrición activo
  - últimos 7 días de logs
  - notas del coach
- output: { reply: string, suggestedActions: [{ type, payload }] }
```

Acciones sugeridas (`type`):
- `update_plan_set` → coach revisa y confirma
- `send_message_to_athlete`
- `schedule_checkin`
- `create_nutrition_target`

**Coach siempre confirma** antes de ejecutar.

## Roadmap LLM por fases

| Fase | Tareas | Modelo |
|---|---|---|
| 1 | parse-food, parse-set, normalize-exercise | Haiku |
| 2 | classify-message, summarize-checkin, tag-exercise | Haiku |
| 3 | generate-plan-training (asistido), rewrite-feedback | Sonnet |
| 4 | analyze-progress, coach-assistant | Sonnet |

## Métricas a trackear

- Tokens por taskKey / día.
- Coste USD por team / mes.
- Tasa de aceptación (¿el coach guardó el output IA?).
- Latencia p50/p95.
- Errores de validación schema.

## Preparación inmediata (sin llamar al modelo aún)

1. Crear `src/lib/ai/` con esqueleto.
2. Añadir modelo `LlmCall` a Prisma.
3. Definir 2-3 schemas Zod de outputs piloto.
4. Wrapper `runLlm` con mock para tests.
5. Endpoint `/api/ai/parse-food` como prueba.
6. Variables env: `ANTHROPIC_API_KEY`, `LLM_MONTHLY_BUDGET_USD`.
