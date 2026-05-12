import { PrismaClient, Goal } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Ejecutando seed...')

  // Cleanup all data
  await prisma.teamSettings.deleteMany()
  await prisma.teamPost.deleteMany()
  await prisma.teamGoal.deleteMany()
  await prisma.teamPhase.deleteMany()
  await prisma.teamUserMembership.deleteMany()
  await prisma.mealFood.deleteMany()
  await prisma.meal.deleteMany()
  await prisma.nutritionPlan.deleteMany()
  await prisma.dailyLog.deleteMany()
  await prisma.setLog.deleteMany()
  await prisma.sessionLog.deleteMany()
  await prisma.checkIn.deleteMany()
  await prisma.exercisePrescription.deleteMany()
  await prisma.workoutSession.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.servicePlan.deleteMany()
  await prisma.athlete.deleteMany()
  await prisma.coach.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.user.deleteMany()
  await prisma.team.deleteMany()

  console.log('   ✓ Base de datos limpia')

  const COACH_PASS = await bcrypt.hash('Adm1n', 10)
  const ATHLETE_PASS = await bcrypt.hash('Atleta123', 10)

  // Create Team with TeamSettings (multi-tenant)
  const team = await prisma.team.create({
    data: {
      name: 'NEXUM',
      slug: 'nexum',
      contractTemplate:
        '# Contrato Legal\n\nEste documento constituye un acuerdo vinculante entre NEXUM y el atleta registrado.',
      settings: {
        create: {
          displayName: 'NEXUM',
          locale: 'es-ES',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          contractVersion: '1.0',
          defaultCheckinDays: 7,
          defaultReviewDays: 7,
          features: {
            wall: true,
            healthConnections: true,
            nutrition: true,
            documents: true,
            photos: true,
            contract: true,
            emailVerification: true,
          },
        },
      },
    },
  })

  console.log(`   ✓ Team: ${team.name}`)

  // Create Coach
  const coachUser = await prisma.user.create({
    data: {
      email: 'carrasco@admin.es',
      name: 'Carrasco',
      passwordHash: COACH_PASS,
      role: 'COACH',
    },
  })

  const coach = await prisma.coach.create({
    data: {
      userId: coachUser.id,
      displayName: 'Carrasco',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
  })

  // Coach team membership
  await prisma.teamUserMembership.create({
    data: {
      teamId: team.id,
      userId: coachUser.id,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log(`   ✓ Coach: ${coachUser.email}`)

  // Create Athletes
  const athletes = []
  const athleteData = [
    {
      name: 'Marco Ruiz',
      email: 'marco@nexum.app',
      goal: Goal.VOLUMEN,
      phase: 'Acumulación S8',
      health: ['Apple Health', 'MyFitnessPal'],
    },
    {
      name: 'Sara Leal',
      email: 'sara@nexum.app',
      goal: Goal.DEFINICION,
      phase: 'Corte S4',
      health: ['Garmin Connect'],
    },
    {
      name: 'David Molina',
      email: 'david@nexum.app',
      goal: Goal.PEAK_WEEK,
      phase: 'Peak Week 1',
      health: [],
    },
    {
      name: 'Ana Torres',
      email: 'ana@nexum.app',
      goal: Goal.MANTENIMIENTO,
      phase: 'Base S2',
      health: ['Apple Health'],
    },
  ]

  for (const data of athleteData) {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: ATHLETE_PASS,
        role: 'ATHLETE',
      },
    })

    const athlete = await prisma.athlete.create({
      data: {
        userId: user.id,
        coachId: coach.id,
        teamId: team.id,
        fullName: data.name,
        goal: data.goal,
        phaseLabel: data.phase,
        healthConnections: JSON.stringify(data.health),
      },
    })

    // Athlete team membership
    await prisma.teamUserMembership.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: 'MEMBER',
        isActive: true,
      },
    })

    athletes.push(athlete)
    console.log(`   ✓ Atleta: ${data.name}`)
  }

  // Create Check-ins
  await prisma.checkIn.createMany({
    data: [
      {
        athleteId: athletes[0].id,
        weekLabel: 'Semana 8',
        weightKg: 85.1,
        stepsAvg: 8800,
        sleepHours: 7,
        adherencePct: 85,
        sensations: 'Fuerza estable, progresando en press banca.',
        date: new Date('2026-05-01'),
      },
      {
        athleteId: athletes[1].id,
        weekLabel: 'Semana 4',
        weightKg: 61.4,
        stepsAvg: 10800,
        sleepHours: 7,
        adherencePct: 85,
        sensations: 'Fuerza bajando un poco, esperado.',
        date: new Date('2026-05-01'),
      },
    ],
  })

  console.log(`   ✓ CheckIns creados`)

  console.log('\n✔ Seed completado.')
  console.log(`
ƒöæ Credenciales:
   Coach:   carrasco@admin.es  /  Adm1n
   Atleta:  marco@nexum.app  /  Atleta123
   Atleta:  sara@nexum.app   /  Atleta123
   Atleta:  david@nexum.app  /  Atleta123
   Atleta:  ana@nexum.app    /  Atleta123
  `)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
