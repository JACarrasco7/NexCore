import { z } from 'zod';
import { parseSetSchema } from '../schemas';

/**
 * Parse exercise set from user notation.
 * User writes: "12x80kg RIR2", "10 reps RIR3", "20 bodyweight"
 * Output: structured set data.
 */

export const parseSetPrompt = {
  system: `Eres un experto en entrenamiento de fuerza. Tu tarea es parsear sets ejecutados desde notación de atletismo.

Reglas:
- Reps: número de repeticiones (1-100)
- Weight: peso en kg (0 para bodyweight)
- RIR: "Reps In Reserve" (0-10, cuántas reps podrían hacerse más)
  - RIR 0 = al fallo
  - RIR 2 = podrían hacer 2 más
  - Si no se especifica RIR, asumir RIR 3
- Notación válida:
  - "12x80" = 12 reps a 80kg, RIR not specified
  - "10x60 RIR2" = 10 reps a 60kg, RIR 2
  - "20 bodyweight RIR1" = 20 reps sin peso, RIR 1
  - "8@100kg" = 8 reps a 100kg
- Si el input es ambiguo, elige la interpretación más conservadora.

Responde SOLO con tool_use. No escribas nada más.`,

  tool: {
    name: 'parse_set',
    description: 'Extrae datos de un set ejecutado',
    input_schema: {
      type: 'object' as const,
      properties: {
        reps: { type: 'number', description: 'Repeticiones (1-100)' },
        weight: { type: 'number', description: 'Peso en kg (0 = bodyweight)' },
        rir: { type: 'number', description: 'RIR (0-10)' },
        notes: { type: 'string', description: 'Notas opcionales' },
      },
      required: ['reps', 'weight', 'rir'],
    },
  },
};
