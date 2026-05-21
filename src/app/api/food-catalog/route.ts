import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp, getRateLimitKey } from '@/lib/rate-limit'
import { badRequest, unauthorized, tooManyRequests } from '@/lib/api/error-response'
import {
  findFoodByName,
  getEquivalences,
  macrosForQuantity,
  searchFoodCatalog,
} from '@/lib/food-catalog'
import { isMfpConfigured, macrosForExternalQuantity, searchMfpFoods } from '@/lib/mfp-provider'
import {
  searchWgerFoodsBilingual,
  macrosForWgerFood,
  getWgerFoodById,
} from '@/lib/wger-food-provider'
import { getOFFProductByBarcode, macrosForOFFFood, searchOFFFoods } from '@/lib/off-provider'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return unauthorized()
  }

  // Rate limiting to prevent abuse of external food API proxies
  const clientIp = getClientIp(req.headers)
  const rateLimitKey = getRateLimitKey(clientIp, session.user.id)
  const { ok } = await checkRateLimit(rateLimitKey, 30, 60) // 30 req/min per user
  if (!ok) return tooManyRequests()

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'search'
  // provider: auto | mfp | off | wger | local
  // auto: mfp si configurado → OFF directo → wger → local
  const provider = searchParams.get('provider') ?? 'auto'
  const useWger = provider === 'wger' || provider === 'auto'
  const useOFF = provider === 'off' || provider === 'auto'
  const useMfp = (provider === 'mfp' || provider === 'auto') && isMfpConfigured()
  const forceMfp = provider === 'mfp'

  if (action === 'search') {
    const q = searchParams.get('q') ?? ''

    // 1. Intentar MFP si está configurado
    if (useMfp) {
      const externalResults = await searchMfpFoods(q)
      if (externalResults.length > 0) {
        return NextResponse.json({ source: 'MyFitnessPal', results: externalResults })
      }
    }

    if (forceMfp && !isMfpConfigured()) {
      return NextResponse.json({ source: 'MyFitnessPal (no configurado)', results: [] })
    }

    // 2. Open Food Facts directo — más campos, imágenes, barcode
    if (useOFF) {
      const offResults = await searchOFFFoods(q, 15)
      if (offResults.length > 0) {
        return NextResponse.json({ source: 'Open Food Facts', results: offResults })
      }
    }

    // 3. wger.de (Open Food Facts via wger) — fallback
    if (useWger) {
      const wgerResults = await searchWgerFoodsBilingual(q, 15)
      if (wgerResults.length > 0) {
        return NextResponse.json({ source: 'Open Food Facts (wger)', results: wgerResults })
      }
    }

    // 4. Catálogo local como fallback
    const results = searchFoodCatalog(q, 10)
    return NextResponse.json({ source: 'NEXUM-local', results })
  }

  // ── BARCODE ──────────────────────────────────────────────────────────────
  if (action === 'barcode') {
    const code = searchParams.get('code') ?? ''
    if (!code) {
      return badRequest("Parámetro 'code' requerido")
    }

    const item = await getOFFProductByBarcode(code)
    if (!item) {
      return NextResponse.json({ source: 'Open Food Facts', item: null }, { status: 404 })
    }

    const quantity = Number(searchParams.get('quantity') ?? 100)
    const qty = quantity > 0 ? quantity : 100
    return NextResponse.json({
      source: 'Open Food Facts',
      item,
      macros: macrosForOFFFood(item, qty),
    })
  }

  if (action === 'resolve') {
    const food = searchParams.get('food') ?? ''
    const foodId = searchParams.get('id') // wger ingredient ID
    const quantity = Number(searchParams.get('quantity') ?? 100)
    const qty = quantity > 0 ? quantity : 100

    // Resolver por ID de wger directamente
    if (foodId && (provider === 'wger' || provider === 'auto')) {
      const item = await getWgerFoodById(Number(foodId))
      if (item) {
        return NextResponse.json({
          source: 'Open Food Facts (wger)',
          item,
          macros: macrosForWgerFood(item, qty),
        })
      }
    }

    if (useMfp) {
      const externalResults = await searchMfpFoods(food)
      if (externalResults.length > 0) {
        const item = externalResults[0]
        return NextResponse.json({
          source: 'MyFitnessPal',
          item,
          macros: macrosForExternalQuantity(item, qty),
        })
      }
    }

    if (forceMfp && !isMfpConfigured()) {
      return NextResponse.json({ source: 'MyFitnessPal (no configurado)', item: null })
    }

    if (useWger) {
      const wgerResults = await searchWgerFoodsBilingual(food, 1)
      if (wgerResults.length > 0) {
        const item = wgerResults[0]
        return NextResponse.json({
          source: 'Open Food Facts (wger)',
          item,
          macros: macrosForWgerFood(item, qty),
        })
      }
    }

    const item = findFoodByName(food)
    if (!item) {
      return NextResponse.json({ source: 'NEXUM-local', item: null })
    }

    return NextResponse.json({
      source: 'NEXUM-local',
      item,
      macros: macrosForQuantity(item, qty),
    })
  }

  if (action === 'equivalences') {
    const food = searchParams.get('food') ?? ''
    const quantity = Number(searchParams.get('quantity') ?? 100)
    const qty = quantity > 0 ? quantity : 100

    if (useMfp) {
      const externalResults = await searchMfpFoods(food)
      if (externalResults.length > 1) {
        const base = externalResults[0]
        const baseKcal = Math.round((base.kcalPer100 * qty) / 100)
        const items = externalResults.slice(1, 5).map((x) => {
          const eqQty = Math.round((baseKcal / x.kcalPer100) * 100)
          return {
            name: x.name,
            quantity: eqQty,
            unit: x.unit,
            kcal: Math.round((x.kcalPer100 * eqQty) / 100),
          }
        })

        return NextResponse.json({
          source: 'MyFitnessPal',
          base: { name: base.name, quantity: qty, unit: base.unit, kcal: baseKcal },
          items,
        })
      }
    }

    if (forceMfp && !isMfpConfigured()) {
      return NextResponse.json({ source: 'MyFitnessPal (no configurado)', base: null, items: [] })
    }

    if (useWger) {
      const wgerResults = await searchWgerFoodsBilingual(food, 6)
      if (wgerResults.length > 1) {
        const base = wgerResults[0]
        const baseKcal = Math.round((base.kcalPer100 * qty) / 100)
        const items = wgerResults.slice(1, 5).map((x) => {
          const eqQty = Math.round((baseKcal / x.kcalPer100) * 100)
          return {
            name: x.name,
            quantity: eqQty,
            unit: 'g',
            kcal: Math.round((x.kcalPer100 * eqQty) / 100),
          }
        })

        return NextResponse.json({
          source: 'Open Food Facts (wger)',
          base: { name: base.name, quantity: qty, unit: 'g', kcal: baseKcal },
          items,
        })
      }
    }

    const result = getEquivalences(food, qty, 4)
    return NextResponse.json({ source: 'NEXUM-local', ...result })
  }

  return badRequest('Invalid action')
}
