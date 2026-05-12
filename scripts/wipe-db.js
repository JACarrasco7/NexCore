/*
  scripts/wipe-db.js
  Borra todos los registros de las tablas principales usando Prisma Client
  Ejecutar: `node scripts/wipe-db.js`
*/

const path = require('path')
const dotenv = require('dotenv')

// Cargar env locales si existen
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function safeDelete(name, fn) {
  try {
    await fn()
    console.log(`Deleted: ${name}`)
  } catch (err) {
    console.warn(`Skip ${name}:`, (err && err.message) || err)
  }
}

async function main() {
  console.log('Wipe DB start. DATABASE_URL set:', !!process.env.DATABASE_URL)

  // Intentar desactivar comprobaciones FK (MySQL)
  try {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;')
  } catch (e) {
    console.warn('Could not disable FK checks (continuing):', e.message || e)
  }

  // Orden tomado de prisma/seed.ts — deleteMany en orden seguro
  await safeDelete('teamSettings', () => prisma.teamSettings.deleteMany())
  await safeDelete('teamPost', () => prisma.teamPost.deleteMany())
  await safeDelete('teamGoal', () => prisma.teamGoal.deleteMany())
  await safeDelete('teamPhase', () => prisma.teamPhase.deleteMany())
  await safeDelete('teamUserMembership', () => prisma.teamUserMembership.deleteMany())
  await safeDelete('teamMembership', () => prisma.teamMembership.deleteMany())
  await safeDelete('mealFood', () => prisma.mealFood.deleteMany())
  await safeDelete('meal', () => prisma.meal.deleteMany())
  await safeDelete('nutritionPlan', () => prisma.nutritionPlan.deleteMany())
  await safeDelete('dailyLog', () => prisma.dailyLog.deleteMany())
  await safeDelete('setLog', () => prisma.setLog.deleteMany())
  await safeDelete('sessionLog', () => prisma.sessionLog.deleteMany())
  await safeDelete('checkIn', () => prisma.checkIn.deleteMany())
  await safeDelete('exercisePrescription', () => prisma.exercisePrescription.deleteMany())
  await safeDelete('workoutSession', () => prisma.workoutSession.deleteMany())
  await safeDelete('plan', () => prisma.plan.deleteMany())
  await safeDelete('servicePlan', () => prisma.servicePlan.deleteMany())
  await safeDelete('notificationDelivery', () => prisma.notificationDelivery.deleteMany())
  await safeDelete('notification', () => prisma.notification.deleteMany())
  await safeDelete('documentSignature', () => prisma.documentSignature.deleteMany())
  await safeDelete('document', () => prisma.document.deleteMany())
  await safeDelete('pushSubscription', () => prisma.pushSubscription.deleteMany())
  await safeDelete('otpToken', () => prisma.otpToken.deleteMany())
  await safeDelete('account', () => prisma.account.deleteMany())
  await safeDelete('session', () => prisma.session.deleteMany())
  await safeDelete('verificationToken', () => prisma.verificationToken.deleteMany())
  await safeDelete('user', () => prisma.user.deleteMany())
  await safeDelete('athlete', () => prisma.athlete.deleteMany())
  await safeDelete('coach', () => prisma.coach.deleteMany())
  await safeDelete('team', () => prisma.team.deleteMany())

  // Reactivar FK checks
  try {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;')
  } catch (e) {
    // ignore
  }

  // Report counts
  const checks = ['user', 'athlete', 'coach', 'team']
  for (const c of checks) {
    try {
      const cnt = await prisma[c].count()
      console.log(`${c} count: ${cnt}`)
    } catch (err) {
      console.log(`${c} count: unknown (${(err && err.message) || err})`)
    }
  }

  console.log('Wipe DB finished.')
}

main()
  .catch((e) => {
    console.error('Wipe error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
