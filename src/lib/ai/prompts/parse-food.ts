import { z } from 'zod';
import { parseFoodSchema } from '../schemas';

/**
 * Parse food items from user text input.
 * User writes: "150g pollo, 100g arroz, 1 plato ensalada"
 * Output: structured array with grams and confidence.
 */

export const parseFoodPrompt = {
  system: `Eres un experto en nutrición y parsing de alimentos. Tu tarea es extraer items de comida con cantidad en gramos desde texto en español.

Reglas:
- Convierte a gramos usando equivalencias estándar:
  - "1 plato arroz cocido" = ~200g
  - "1 pechuga pollo" = ~150g
  - "1 huevo" = ~50g
  - "1 vaso leche" = ~250ml = 250g
  - "1 cucharada aceite" = ~15g
  - "1 taza pasta cocida" = ~150g
- Si no tienes grams exactos, calcula basado en porciones.
- Marca confidence baja (0.3-0.6) si hay incertidumbre.
- Marca confidence alta (0.8-1.0) si es claro.
- Ignora palabras sin información nutricional.

Responde SOLO con tool_use. No escribas nada más.`,

  tool: {
    name: 'parse_food',
    description: 'Extrae items de comida con cantidad en gramos',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              raw: { type: 'string', description: 'Texto original' },
              food: { type: 'string', description: 'Nombre del alimento' },
              grams: { type: 'number', description: 'Gramos' },
              confidence: { type: 'number', description: 'Confianza 0-1' },
            },
            required: ['raw', 'food', 'grams', 'confidence'],
          },
        },
      },
      required: ['items'],
    },
  },
};
