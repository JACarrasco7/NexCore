import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed data para ExerciseMuscleMapping
 * Mapeo de ejercicios a músculos primarios y secundarios
 * Usado por sistema de evolución/tracking de volumen
 */

const EXERCISE_MAPPING = [
  // ═══════════════════════════════════════════════════════════════════
  // MOVIMIENTOS COMPUESTOS - TREN SUPERIOR
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Press de banca',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['triceps', 'deltoides_anterior'],
  },
  {
    exercise: 'Press inclinado',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['deltoides_anterior', 'triceps'],
  },
  {
    exercise: 'Press declinado',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['triceps'],
  },
  {
    exercise: 'Press con mancuernas',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['triceps', 'deltoides_anterior'],
  },
  {
    exercise: 'Fondos en paralelas',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['triceps', 'deltoides_anterior'],
  },
  {
    exercise: 'Dominadas',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps', 'dorsales'],
  },
  {
    exercise: 'Dominadas agarre cerrado',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps', 'dorsales'],
  },
  {
    exercise: 'Remo con barra',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps', 'dorsales'],
  },
  {
    exercise: 'Remo con mancuerna',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps', 'dorsales'],
  },
  {
    exercise: 'Remo con máquina',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps', 'dorsales'],
  },
  {
    exercise: 'Jalón al pecho',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps', 'dorsales'],
  },
  {
    exercise: 'Jalón al pecho agarre cerrado',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps', 'dorsales'],
  },
  {
    exercise: 'Press militar',
    primaryMuscle: 'deltoides_anterior',
    secondaryMuscles: ['triceps', 'pecho'],
  },
  {
    exercise: 'Press militar con mancuernas',
    primaryMuscle: 'deltoides_anterior',
    secondaryMuscles: ['triceps'],
  },
  {
    exercise: 'Push press',
    primaryMuscle: 'deltoides_anterior',
    secondaryMuscles: ['cuadriceps', 'triceps'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // MOVIMIENTOS COMPUESTOS - TREN INFERIOR
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Sentadilla back squat',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos', 'espalda_baja', 'isquiotibiales'],
  },
  {
    exercise: 'Sentadilla front squat',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos', 'espalda_baja'],
  },
  {
    exercise: 'Sentadilla Goblet',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos', 'espalda_baja'],
  },
  {
    exercise: 'Sentadilla con mancuernas',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos', 'espalda_baja'],
  },
  {
    exercise: 'Peso muerto',
    primaryMuscle: 'espalda_baja',
    secondaryMuscles: ['gluteos', 'isquiotibiales', 'cuadriceps'],
  },
  {
    exercise: 'Peso muerto rumano',
    primaryMuscle: 'isquiotibiales',
    secondaryMuscles: ['gluteos', 'espalda_baja'],
  },
  {
    exercise: 'Peso muerto déficit',
    primaryMuscle: 'isquiotibiales',
    secondaryMuscles: ['espalda_baja', 'gluteos', 'pantorrilla'],
  },
  {
    exercise: 'Peso muerto con hexbar',
    primaryMuscle: 'espalda_baja',
    secondaryMuscles: ['cuadriceps', 'gluteos'],
  },
  {
    exercise: 'Sentadilla búlgara',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos'],
  },
  {
    exercise: 'Estocada',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos', 'isquiotibiales'],
  },
  {
    exercise: 'Estocada caminante',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos', 'isquiotibiales'],
  },
  {
    exercise: 'Hip thrust',
    primaryMuscle: 'gluteos',
    secondaryMuscles: ['cuadriceps', 'espalda_baja'],
  },
  {
    exercise: 'Sentadilla hack',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos'],
  },
  {
    exercise: 'Prensa de pierna',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: ['gluteos', 'isquiotibiales'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // EJERCICIOS DE AISLAMIENTO - PECHO
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Aperturas con mancuernas',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['deltoides_anterior'],
  },
  {
    exercise: 'Aperturas en máquina',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['deltoides_anterior'],
  },
  {
    exercise: 'Peck deck',
    primaryMuscle: 'pecho',
    secondaryMuscles: [],
  },
  {
    exercise: 'Cruces en polea',
    primaryMuscle: 'pecho',
    secondaryMuscles: ['deltoides_anterior'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // EJERCICIOS DE AISLAMIENTO - ESPALDA
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Jalón frontal',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps'],
  },
  {
    exercise: 'Jalón V',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps'],
  },
  {
    exercise: 'Remo máquina',
    primaryMuscle: 'espalda',
    secondaryMuscles: ['biceps'],
  },
  {
    exercise: 'Face pulls',
    primaryMuscle: 'deltoides_posterior',
    secondaryMuscles: ['espalda'],
  },
  {
    exercise: 'Reverse peck deck',
    primaryMuscle: 'deltoides_posterior',
    secondaryMuscles: ['espalda'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // EJERCICIOS DE AISLAMIENTO - HOMBROS
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Elevación lateral',
    primaryMuscle: 'deltoides_lateral',
    secondaryMuscles: [],
  },
  {
    exercise: 'Elevación frontal',
    primaryMuscle: 'deltoides_anterior',
    secondaryMuscles: [],
  },
  {
    exercise: 'Pajarita',
    primaryMuscle: 'deltoides_posterior',
    secondaryMuscles: [],
  },
  {
    exercise: 'Elevación en máquina',
    primaryMuscle: 'deltoides_lateral',
    secondaryMuscles: [],
  },

  // ═══════════════════════════════════════════════════════════════════
  // EJERCICIOS DE AISLAMIENTO - BRAZOS
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Curl con barra',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Curl inclinado',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Curl predicador',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Curl martillo',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['braquial'],
  },
  {
    exercise: 'Curl en máquina',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Curl en polea',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Extensión de triceps',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Extensión en polea',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Extensión sentado',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Dips en banco',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['pecho', 'deltoides_anterior'],
  },
  {
    exercise: 'Press de triceps cerrado',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Skull crushers',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
  },

  // ═══════════════════════════════════════════════════════════════════
  // EJERCICIOS DE AISLAMIENTO - PIERNA
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Extensión de cuadriceps',
    primaryMuscle: 'cuadriceps',
    secondaryMuscles: [],
  },
  {
    exercise: 'Curl de isquiotibiales',
    primaryMuscle: 'isquiotibiales',
    secondaryMuscles: [],
  },
  {
    exercise: 'Curl tumbado',
    primaryMuscle: 'isquiotibiales',
    secondaryMuscles: [],
  },
  {
    exercise: 'Abductor máquina',
    primaryMuscle: 'gluteos',
    secondaryMuscles: ['deltoides_lateral'],
  },
  {
    exercise: 'Aductor máquina',
    primaryMuscle: 'aductores',
    secondaryMuscles: [],
  },
  {
    exercise: 'Elevación de talones',
    primaryMuscle: 'pantorrilla',
    secondaryMuscles: [],
  },
  {
    exercise: 'Elevación de talones sentado',
    primaryMuscle: 'pantorrilla',
    secondaryMuscles: [],
  },
  {
    exercise: 'Elevación de talones en prensa',
    primaryMuscle: 'pantorrilla',
    secondaryMuscles: [],
  },

  // ═══════════════════════════════════════════════════════════════════
  // EJERCICIOS NÚCLEO
  // ═══════════════════════════════════════════════════════════════════
  {
    exercise: 'Crunch',
    primaryMuscle: 'abdominales',
    secondaryMuscles: [],
  },
  {
    exercise: 'Crunch máquina',
    primaryMuscle: 'abdominales',
    secondaryMuscles: [],
  },
  {
    exercise: 'Flexión abdominal',
    primaryMuscle: 'abdominales',
    secondaryMuscles: [],
  },
  {
    exercise: 'Cable woodchop',
    primaryMuscle: 'abdominales',
    secondaryMuscles: ['oblicuos'],
  },
  {
    exercise: 'Pallof press',
    primaryMuscle: 'abdominales',
    secondaryMuscles: ['oblicuos'],
  },
  {
    exercise: 'Dead bug',
    primaryMuscle: 'abdominales',
    secondaryMuscles: [],
  },
  {
    exercise: 'Plank',
    primaryMuscle: 'abdominales',
    secondaryMuscles: ['espalda_baja'],
  },
]

async function seedExerciseMapping() {
  try {
    console.log('🌱 Seeding ExerciseMuscleMapping...')

    // Delete existing data
    await prisma.exerciseMuscleMapping.deleteMany()
    console.log('   ✓ Tabla limpia')

    // Insert new data
    for (const mapping of EXERCISE_MAPPING) {
      await prisma.exerciseMuscleMapping.create({
        data: {
          exercise: mapping.exercise,
          primaryMuscle: mapping.primaryMuscle,
          secondaryMuscles: mapping.secondaryMuscles,
        },
      })
    }

    console.log(`   ✓ ${EXERCISE_MAPPING.length} ejercicios mapeados`)
    console.log('✅ ExerciseMuscleMapping seeded successfully')
  } catch (error) {
    console.error('❌ Error seeding ExerciseMuscleMapping:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedExerciseMapping()
