/**
 * Seed de datos de prueba para todos los atletas existentes.
 * Añade: DailyLogs, CheckIns, BodyMeasurements, SessionLogs+SetLogs,
 *        Plan+WorkoutSessions+ExercisePrescriptions, NutritionPlan+Meals+Foods
 *
 * Ejecutar: npx ts-node --project tsconfig.json prisma/seed-test-data.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function rnd(min: number, max: number, dec = 1): number {
  return +(Math.random() * (max - min) + min).toFixed(dec)
}

function rndInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Ejercicios por grupo muscular ───────────────────────────────────────────
const EXERCISE_POOL = [
  // Pecho
  { exercise: 'Press banca plano', muscle: 'Pecho', loadRange: [60, 100] },
  { exercise: 'Press banca inclinado', muscle: 'Pecho', loadRange: [50, 80] },
  { exercise: 'Aperturas cable', muscle: 'Pecho', loadRange: [12, 25] },
  // Espalda
  { exercise: 'Remo con barra', muscle: 'Espalda', loadRange: [60, 100] },
  { exercise: 'Jalón al pecho', muscle: 'Espalda', loadRange: [55, 80] },
  { exercise: 'Dominadas asistidas', muscle: 'Espalda', loadRange: [0, 20] },
  { exercise: 'Remo en polea', muscle: 'Espalda', loadRange: [40, 70] },
  // Hombro
  { exercise: 'Press militar con barra', muscle: 'Hombro', loadRange: [40, 70] },
  { exercise: 'Elevaciones laterales', muscle: 'Hombro', loadRange: [8, 18] },
  { exercise: 'Face pull', muscle: 'Hombro', loadRange: [15, 30] },
  // Bíceps
  { exercise: 'Curl con barra', muscle: 'Bíceps', loadRange: [25, 45] },
  { exercise: 'Curl martillo mancuernas', muscle: 'Bíceps', loadRange: [12, 22] },
  // Tríceps
  { exercise: 'Press francés con barra', muscle: 'Tríceps', loadRange: [30, 50] },
  { exercise: 'Pushdown en polea', muscle: 'Tríceps', loadRange: [20, 40] },
  // Pierna
  { exercise: 'Sentadilla con barra', muscle: 'Pierna', loadRange: [70, 130] },
  { exercise: 'Prensa de piernas', muscle: 'Pierna', loadRange: [100, 200] },
  { exercise: 'Extensión de cuádriceps', muscle: 'Pierna', loadRange: [40, 80] },
  { exercise: 'Curl femoral', muscle: 'Pierna', loadRange: [35, 65] },
  { exercise: 'Hip Thrust con barra', muscle: 'Pierna', loadRange: [80, 140] },
  { exercise: 'Peso muerto rumano', muscle: 'Pierna', loadRange: [60, 110] },
  // Core
  { exercise: 'Plancha frontal', muscle: 'Core', loadRange: [0, 0] },
  { exercise: 'Crunch en polea', muscle: 'Core', loadRange: [15, 35] },
] as const

type ExerciseDef = { exercise: string; loadRange: readonly [number, number] }

const SESSION_TEMPLATES: Array<{ name: string; exercises: ExerciseDef[] }> = [
  {
    name: 'Push (Pecho + Hombro + Tríceps)',
    exercises: [
      { exercise: 'Press banca plano', loadRange: [60, 100] },
      { exercise: 'Press banca inclinado', loadRange: [50, 80] },
      { exercise: 'Press militar con barra', loadRange: [40, 70] },
      { exercise: 'Elevaciones laterales', loadRange: [8, 18] },
      { exercise: 'Pushdown en polea', loadRange: [20, 40] },
    ],
  },
  {
    name: 'Pull (Espalda + Bíceps)',
    exercises: [
      { exercise: 'Remo con barra', loadRange: [60, 100] },
      { exercise: 'Jalón al pecho', loadRange: [55, 80] },
      { exercise: 'Remo en polea', loadRange: [40, 70] },
      { exercise: 'Curl con barra', loadRange: [25, 45] },
      { exercise: 'Curl martillo mancuernas', loadRange: [12, 22] },
    ],
  },
  {
    name: 'Piernas (Quad + Glúteos + Femoral)',
    exercises: [
      { exercise: 'Sentadilla con barra', loadRange: [70, 130] },
      { exercise: 'Prensa de piernas', loadRange: [100, 200] },
      { exercise: 'Extensión de cuádriceps', loadRange: [40, 80] },
      { exercise: 'Curl femoral', loadRange: [35, 65] },
      { exercise: 'Hip Thrust con barra', loadRange: [80, 140] },
    ],
  },
  {
    name: 'Full Body Potencia',
    exercises: [
      { exercise: 'Sentadilla con barra', loadRange: [70, 130] },
      { exercise: 'Press banca plano', loadRange: [60, 100] },
      { exercise: 'Remo con barra', loadRange: [60, 100] },
      { exercise: 'Press militar con barra', loadRange: [40, 70] },
      { exercise: 'Peso muerto rumano', loadRange: [60, 110] },
    ],
  },
]

// ─── Perfil de peso inicial por atleta ───────────────────────────────────────
const ATHLETE_PROFILES: Record<
  string,
  {
    startWeight: number
    bfPct: number
    waist: number
    hip: number
    chest: number
    arm: number
    quad: number
    calf: number
    glutes: number
    neck: number
  }
> = {
  'Marco Ruiz': {
    startWeight: 82,
    bfPct: 18,
    waist: 85,
    hip: 96,
    chest: 100,
    arm: 36,
    quad: 58,
    calf: 39,
    glutes: 98,
    neck: 40,
  },
  'Sara Leal': {
    startWeight: 64,
    bfPct: 24,
    waist: 72,
    hip: 95,
    chest: 88,
    arm: 29,
    quad: 52,
    calf: 36,
    glutes: 100,
    neck: 33,
  },
  'David Molina': {
    startWeight: 90,
    bfPct: 22,
    waist: 92,
    hip: 102,
    chest: 108,
    arm: 40,
    quad: 62,
    calf: 42,
    glutes: 104,
    neck: 43,
  },
  'Ana Torres': {
    startWeight: 58,
    bfPct: 26,
    waist: 68,
    hip: 92,
    chest: 84,
    arm: 27,
    quad: 50,
    calf: 35,
    glutes: 97,
    neck: 31,
  },
}

async function seedAthlete(
  athleteId: string,
  coachId: string | null,
  athleteName: string,
  weekOffset = 0 // para escalonar fechas entre atletas
) {
  const profile = ATHLETE_PROFILES[athleteName] ?? ATHLETE_PROFILES['Marco Ruiz']
  console.log(`\n  → Seeding ${athleteName} (${athleteId})...`)

  // ── 1. DailyLogs (90 días) ───────────────────────────────────────────────
  const existingDailyLogs = await prisma.dailyLog.count({ where: { athleteId } })
  if (existingDailyLogs < 20) {
    const dailyLogsData = Array.from({ length: 90 }, (_, i) => {
      const dayIdx = 89 - i
      const trend = dayIdx / 89 // 0 = más antiguo, 1 = más reciente
      const weightProgress = profile.startWeight + rnd(-0.5, 0.5)

      return {
        athleteId,
        date: daysAgo(dayIdx),
        weightKg: +(weightProgress + rnd(-0.5, 0.5)).toFixed(1),
        steps: rndInt(5000, 15000),
        sleepHours: +rnd(5.5, 8.5).toFixed(1),
      }
    })
    await prisma.dailyLog.createMany({ data: dailyLogsData, skipDuplicates: true })
    console.log(`    ✓ ${dailyLogsData.length} DailyLogs`)
  } else {
    console.log(`    ~ DailyLogs ya existen (${existingDailyLogs})`)
  }

  // ── 2. CheckIns (16 semanas) ─────────────────────────────────────────────
  const existingCheckIns = await prisma.checkIn.count({ where: { athleteId } })
  if (existingCheckIns < 5) {
    const sensationsPool = [
      'Me sentí con mucha energía esta semana',
      'Cansado pero cumplí todo',
      'Semana difícil en trabajo, costó entrenar',
      'Excelente semana, buen rendimiento',
      'Un poco de dolor de rodilla al final',
      'Todo correcto, sigo progresando',
      'Motivación alta, ganas de seguir',
      'Semana de estrés, afectó el sueño',
    ]
    const checkInsData = Array.from({ length: 16 }, (_, i) => {
      const weeksBack = 15 - i
      const trend = i / 15
      return {
        athleteId,
        weekLabel: `Semana ${i + 1}`,
        date: daysAgo(weeksBack * 7),
        weightKg: +(profile.startWeight + trend * 2 + rnd(-0.8, 0.8)).toFixed(1),
        adherencePct: +rnd(65, 98).toFixed(0),
        sleepHours: +rnd(5.5, 8.0).toFixed(1),
        stepsAvg: rndInt(6000, 12000),
        sensations: sensationsPool[i % sensationsPool.length],
      }
    })
    await prisma.checkIn.createMany({ data: checkInsData, skipDuplicates: true })
    console.log(`    ✓ ${checkInsData.length} CheckIns`)
  } else {
    console.log(`    ~ CheckIns ya existen (${existingCheckIns})`)
  }

  // ── 3. BodyMeasurements (10 mediciones mensuales) ───────────────────────
  const existingMeasurements = await prisma.bodyMeasurement.count({ where: { athleteId } })
  if (existingMeasurements < 4) {
    const measurementsData = Array.from({ length: 10 }, (_, i) => {
      const daysBack = (9 - i) * 28 // cada 4 semanas
      const trend = i / 9
      const bfDelta = profile.bfPct > 20 ? -trend * 3 : trend * 1.5 // si sobrepeso, baja; si bajo, sube
      const weightTrend = profile.startWeight + trend * 2.5 + rnd(-0.5, 0.5)
      return {
        athleteId,
        date: daysAgo(daysBack),
        weightKg: +weightTrend.toFixed(1),
        bodyFatPct: +(profile.bfPct + bfDelta + rnd(-0.5, 0.5)).toFixed(1),
        waistCm: +(profile.waist - trend * 2 + rnd(-0.5, 0.5)).toFixed(1),
        hipCm: +(profile.hip + trend * 1.5 + rnd(-0.5, 0.5)).toFixed(1),
        chestCm: +(profile.chest + trend * 2 + rnd(-0.5, 0.5)).toFixed(1),
        armCm: +(profile.arm + trend * 1.5 + rnd(-0.5, 0.5)).toFixed(1),
        quadCm: +(profile.quad + trend * 2 + rnd(-0.5, 0.5)).toFixed(1),
        calfCm: +(profile.calf + trend * 0.5 + rnd(-0.3, 0.3)).toFixed(1),
        glutesCm: +(profile.glutes + trend * 1.5 + rnd(-0.5, 0.5)).toFixed(1),
        neckCm: +(profile.neck + trend * 0.3 + rnd(-0.2, 0.2)).toFixed(1),
        notes: i === 9 ? 'Medición más reciente' : null,
      }
    })
    await prisma.bodyMeasurement.createMany({ data: measurementsData, skipDuplicates: true })
    console.log(`    ✓ ${measurementsData.length} BodyMeasurements`)
  } else {
    console.log(`    ~ BodyMeasurements ya existen (${existingMeasurements})`)
  }

  // ── 4. Plan de entrenamiento ─────────────────────────────────────────────
  const existingPlans = await prisma.plan.count({ where: { athleteId, deletedAt: null } })
  let planId: string
  let sessionIds: string[] = []

  if (existingPlans === 0) {
    const plan = await prisma.plan.create({
      data: {
        athleteId,
        coachId,
        title: 'Mesociclo Hipertrofia – PPL',
        sessions: {
          create: SESSION_TEMPLATES.map((t, order) => ({
            name: t.name,
            block: 'Bloque A',
            order,
            exercises: {
              create: t.exercises.map((ex, exOrder) => ({
                exercise: ex.exercise,
                sets: rndInt(3, 5),
                reps: `${rndInt(8, 12)}`,
                targetRir: `${rndInt(1, 3)}`,
                restSeconds: rndInt(90, 180),
                order: exOrder,
                loadKg: +rnd(ex.loadRange[0], ex.loadRange[1]).toFixed(0),
              })),
            },
          })),
        },
      },
      select: { id: true, sessions: { select: { id: true, name: true } } },
    })
    planId = plan.id
    sessionIds = plan.sessions.map((s) => s.id)
    console.log(`    ✓ Plan con ${SESSION_TEMPLATES.length} sesiones`)
  } else {
    const plan = await prisma.plan.findFirst({
      where: { athleteId, deletedAt: null },
      select: { id: true, sessions: { select: { id: true, name: true } } },
    })
    planId = plan!.id
    sessionIds = plan!.sessions.map((s) => s.id)
    console.log(`    ~ Plan ya existe (${planId})`)
  }

  // ── 5. SessionLogs + SetLogs (24 sesiones en 12 semanas) ────────────────
  const existingSessions = await prisma.sessionLog.count({ where: { athleteId } })
  if (existingSessions < 8 && sessionIds.length > 0) {
    const sessionLogs: Array<{
      athleteId: string
      planId: string
      sessionId: string
      sessionName: string
      date: Date
      durationMin: number
      kcalBurned: number
      heartRateAvg: number
      source: string
    }> = []
    const setLogsMap: Map<
      number,
      Array<{
        exerciseIndex: number
        exercise: string
        setNumber: number
        loadKg: number
        reps: number
        rir: number
      }>
    > = new Map()

    // 3 sesiones/semana durante 8 semanas = 24 sesiones
    let sessionIdx = 0
    for (let week = 7; week >= 0; week--) {
      const daysPerWeek = [6, 3, 1] // lunes, jueves, sábado de cada semana
      for (const dayInWeek of daysPerWeek) {
        const sessionTemplate = SESSION_TEMPLATES[sessionIdx % SESSION_TEMPLATES.length]
        const workoutSessionId = sessionIds[sessionIdx % sessionIds.length]
        const daysBack = week * 7 + dayInWeek
        const progressFactor = 1 + ((8 - week) / 8) * 0.12 // ~12% progresión total

        sessionLogs.push({
          athleteId,
          planId,
          sessionId: workoutSessionId,
          sessionName: sessionTemplate.name,
          date: daysAgo(daysBack),
          durationMin: rndInt(55, 90),
          kcalBurned: rndInt(280, 520),
          heartRateAvg: rndInt(130, 165),
          source: 'manual',
        })

        const sets: typeof setLogsMap extends Map<number, infer T> ? T : never = []
        sessionTemplate.exercises.forEach((ex, exIdx) => {
          const numSets = rndInt(3, 5)
          const baseLoad = rnd(ex.loadRange[0], ex.loadRange[1])
          for (let setN = 1; setN <= numSets; setN++) {
            sets.push({
              exerciseIndex: exIdx,
              exercise: ex.exercise,
              setNumber: setN,
              loadKg: +(baseLoad * progressFactor + rnd(-1, 1)).toFixed(1),
              reps: rndInt(8, 12),
              rir: rndInt(0, 3),
            })
          }
        })
        setLogsMap.set(sessionIdx, sets)
        sessionIdx++
      }
    }

    for (let i = 0; i < sessionLogs.length; i++) {
      const sl = await prisma.sessionLog.create({ data: sessionLogs[i] })
      const sets = setLogsMap.get(i) ?? []
      if (sets.length > 0) {
        await prisma.setLog.createMany({
          data: sets.map((s) => ({ ...s, sessionLogId: sl.id })),
        })
      }
    }
    console.log(`    ✓ ${sessionLogs.length} SessionLogs con sets`)
  } else {
    console.log(`    ~ SessionLogs ya existen (${existingSessions})`)
  }

  // ── 6. Plan Nutricional ──────────────────────────────────────────────────
  const existingNutrition = await prisma.nutritionPlan.count({
    where: { athleteId, deletedAt: null },
  })
  if (existingNutrition === 0) {
    const kcal = rndInt(2200, 3200)
    const proteinG = Math.round((kcal * 0.3) / 4)
    const fatG = Math.round((kcal * 0.25) / 9)
    const carbsG = Math.round((kcal - proteinG * 4 - fatG * 9) / 4)

    await prisma.nutritionPlan.create({
      data: {
        athleteId,
        coachId,
        title: 'Plan Hipertrofia – Volumen',
        phase: 'Volumen',
        kcalTarget: kcal,
        proteinG,
        carbsG,
        fatG,
        isActive: true,
        meals: {
          create: [
            {
              name: 'Desayuno',
              time: '08:00',
              order: 0,
              foods: {
                create: [
                  {
                    food: 'Avena',
                    quantity: 80,
                    unit: 'g',
                    kcal: 300,
                    proteinG: 10,
                    carbsG: 52,
                    fatG: 6,
                    order: 0,
                  },
                  {
                    food: 'Claras de huevo',
                    quantity: 200,
                    unit: 'ml',
                    kcal: 104,
                    proteinG: 22,
                    carbsG: 0,
                    fatG: 0,
                    order: 1,
                  },
                  {
                    food: 'Plátano',
                    quantity: 120,
                    unit: 'g',
                    kcal: 107,
                    proteinG: 1,
                    carbsG: 27,
                    fatG: 0,
                    order: 2,
                  },
                ],
              },
            },
            {
              name: 'Media mañana',
              time: '11:00',
              order: 1,
              foods: {
                create: [
                  {
                    food: 'Pechuga de pollo cocida',
                    quantity: 150,
                    unit: 'g',
                    kcal: 165,
                    proteinG: 36,
                    carbsG: 0,
                    fatG: 3,
                    order: 0,
                  },
                  {
                    food: 'Arroz blanco cocido',
                    quantity: 150,
                    unit: 'g',
                    kcal: 195,
                    proteinG: 4,
                    carbsG: 43,
                    fatG: 0,
                    order: 1,
                  },
                ],
              },
            },
            {
              name: 'Almuerzo',
              time: '14:00',
              order: 2,
              foods: {
                create: [
                  {
                    food: 'Salmón',
                    quantity: 200,
                    unit: 'g',
                    kcal: 416,
                    proteinG: 40,
                    carbsG: 0,
                    fatG: 28,
                    order: 0,
                  },
                  {
                    food: 'Patata cocida',
                    quantity: 200,
                    unit: 'g',
                    kcal: 160,
                    proteinG: 4,
                    carbsG: 37,
                    fatG: 0,
                    order: 1,
                  },
                  {
                    food: 'Brócoli',
                    quantity: 150,
                    unit: 'g',
                    kcal: 51,
                    proteinG: 4,
                    carbsG: 10,
                    fatG: 0,
                    order: 2,
                  },
                  {
                    food: 'AOVE',
                    quantity: 15,
                    unit: 'ml',
                    kcal: 135,
                    proteinG: 0,
                    carbsG: 0,
                    fatG: 15,
                    order: 3,
                  },
                ],
              },
            },
            {
              name: 'Pre-entreno',
              time: '17:30',
              order: 3,
              foods: {
                create: [
                  {
                    food: 'Whey protein',
                    quantity: 35,
                    unit: 'g',
                    kcal: 130,
                    proteinG: 26,
                    carbsG: 5,
                    fatG: 2,
                    order: 0,
                  },
                  {
                    food: 'Plátano',
                    quantity: 100,
                    unit: 'g',
                    kcal: 89,
                    proteinG: 1,
                    carbsG: 23,
                    fatG: 0,
                    order: 1,
                  },
                ],
              },
            },
            {
              name: 'Post-entreno / Cena',
              time: '20:30',
              order: 4,
              foods: {
                create: [
                  {
                    food: 'Pechuga de pollo',
                    quantity: 200,
                    unit: 'g',
                    kcal: 220,
                    proteinG: 48,
                    carbsG: 0,
                    fatG: 4,
                    order: 0,
                  },
                  {
                    food: 'Pasta integral cocida',
                    quantity: 120,
                    unit: 'g',
                    kcal: 168,
                    proteinG: 7,
                    carbsG: 33,
                    fatG: 2,
                    order: 1,
                  },
                  {
                    food: 'Queso cottage',
                    quantity: 100,
                    unit: 'g',
                    kcal: 98,
                    proteinG: 11,
                    carbsG: 4,
                    fatG: 4,
                    order: 2,
                  },
                ],
              },
            },
          ],
        },
      },
    })
    console.log(`    ✓ NutritionPlan con 5 comidas`)
  } else {
    console.log(`    ~ NutritionPlan ya existe`)
  }

  // ── 7. NutritionLogs (90 días de registros diarios) ─────────────────────
  const existingNutritionLogs = await prisma.nutritionLog.count({ where: { athleteId } })
  if (existingNutritionLogs < 10) {
    const MEAL_TEMPLATES = [
      { name: 'Desayuno', kcal: [280, 420], p: [22, 35], c: [35, 60], f: [5, 12] },
      { name: 'Media mañana', kcal: [180, 280], p: [28, 40], c: [20, 35], f: [3, 8] },
      { name: 'Almuerzo', kcal: [450, 700], p: [35, 55], c: [40, 70], f: [12, 25] },
      { name: 'Pre-entreno', kcal: [180, 300], p: [20, 32], c: [25, 45], f: [3, 8] },
      { name: 'Post-entreno', kcal: [400, 600], p: [40, 60], c: [45, 65], f: [8, 18] },
    ]
    // ~3-5 comidas/día, 90 días
    const logsData: Array<{
      athleteId: string
      mealName: string
      kcal: number
      proteinG: number
      carbsG: number
      fatG: number
      loggedAt: Date
    }> = []
    for (let day = 89; day >= 0; day--) {
      const d = daysAgo(day)
      // algunos días sin registro (realismo)
      if (Math.random() < 0.12) continue
      const mealsToday = rndInt(3, 5)
      for (let m = 0; m < mealsToday; m++) {
        const tmpl = MEAL_TEMPLATES[m % MEAL_TEMPLATES.length]
        const loggedAt = new Date(d)
        loggedAt.setHours(7 + m * 3 + rndInt(0, 1), rndInt(0, 59), 0, 0)
        logsData.push({
          athleteId,
          mealName: tmpl.name,
          kcal: rndInt(tmpl.kcal[0], tmpl.kcal[1]),
          proteinG: rnd(tmpl.p[0], tmpl.p[1]),
          carbsG: rnd(tmpl.c[0], tmpl.c[1]),
          fatG: rnd(tmpl.f[0], tmpl.f[1]),
          loggedAt,
        })
      }
    }
    await prisma.nutritionLog.createMany({ data: logsData, skipDuplicates: true })
    console.log(`    ✓ ${logsData.length} NutritionLogs`)
  } else {
    console.log(`    ~ NutritionLogs ya existen (${existingNutritionLogs})`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Iniciando seed de datos de prueba...\n')

  const athletes = await prisma.athlete.findMany({
    select: { id: true, coachId: true, fullName: true },
  })

  if (athletes.length === 0) {
    console.log('  ❌ No hay atletas en la BD. Crea atletas primero.')
    return
  }

  console.log(`  Atletas encontrados: ${athletes.map((a) => a.fullName).join(', ')}`)

  for (const athlete of athletes) {
    await seedAthlete(athlete.id, athlete.coachId, athlete.fullName)
  }

  console.log('\n✅ Seed completado.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
