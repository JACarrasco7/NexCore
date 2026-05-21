import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { generatePlanTrainingSchema } from '../schemas';

/**
 * Generate a training plan draft using Sonnet.
 * Complex task that requires judgment and context.
 */

export const generatePlanTrainingPrompt = {
  system: `Eres un coach de entrenamiento experto en periodización y programación.
Tu tarea es generar un borrador de plan de entrenamiento basado en objetivo, historial y equipamiento del atleta.

Principios:
- Progresión lineal: aumentar peso/reps cada 1-2 semanas
- Volumen suficiente: 10-20 series/músculo/semana
- Frecuencia: 2-3 veces/semana por grupo muscular
- Variedad de ejercicios: 2-3 ejercicios/grupo muscular
- Recuperación: rest days cada 2-3 días

Estructura:
- Title: nombre descriptivo del bloque (ej. "Hipertrofia Upper/Lower")
- Block: ciclo periodizado (ej. "semana 1-4 prep", "semana 5-8 hipertrofia")
- Sessions: sesiones de la semana
  - dayIndex: día 0-6
  - title: nombre sesión
  - exercises: movimientos con sets/reps prescriptos
  
Output DEBE ser realista, específico, y ejecutable sin equipamiento exótico.
Responde SOLO con tool_use. No escribas nada más.`,

  tool: {
    name: 'generate_plan_training',
    description: 'Genera un borrador de plan de entrenamiento',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        block: { type: 'string' },
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dayIndex: { type: 'number' },
              title: { type: 'string' },
              notes: { type: 'string' },
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    sets: { type: 'number' },
                    reps: { type: 'string' },
                    notes: { type: 'string' },
                  },
                  required: ['name', 'sets', 'reps'],
                },
              },
            },
            required: ['dayIndex', 'title', 'exercises'],
          },
        },
        notes: { type: 'string' },
      },
      required: ['title', 'block', 'sessions'],
    },
  },
};
