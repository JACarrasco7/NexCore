# Auditoría y Corrección: Sistema de Favoritos

**Estado:** En progreso  
**Fecha:** 18 mayo 2026  
**Objetivo:** Detectar inconsistencias y errores, asegurar escalabilidad

---

## Resumen Ejecutivo

El sistema de favoritos (ejercicios + alimentos) funciona **estructuralmente** pero tiene:
- **4 bugs críticos** (1 impide persistencia de favoritos)
- **2 race conditions** (estados inconsistentes con búsquedas rápidas)
- **Problemas de tipado/semántica** (no escalable)

**Total:** 12 issues resueltos sin refactors, 7 archivos modificados

---

## Fase 1: Bugs Críticos (Bloqueantes)

### 1.1 Profile: `handleAddExercise` y `handleAddFood` no persisten

**Archivo:** `src/app/athlete/profile/page.tsx`  
**Severidad:** 🔴 CRÍTICA  
**Problema:**
```typescript
// ❌ ACTUAL - Nunca llama al API
const handleAddExercise = (exerciseName: string) => {
  const exists = favExercises.some((f) => f.exerciseName === exerciseName)
  if (!exists) {
    const newFav: FavoriteExercise = {
      id: `ex_${Date.now()}`,  // ← ID falso, solo local
      exerciseName,
      addedAt: new Date().toISOString(),
    }
    setFavExercises([newFav, ...favExercises])
    setShowExerciseSearch(false)
  }
}
```

**Impacto:** Al recargar `/athlete/profile`, los favoritos desaparecen. No persisten en BD.

**Fix:** Llamar al POST del API antes de actualizar el estado.

---

### 1.2 Profile: Remove no valida respuesta HTTP

**Archivo:** `src/app/athlete/profile/page.tsx`  
**Severidad:** 🔴 CRÍTICA  
**Problema:**
```typescript
// ❌ ACTUAL - sin validar respuesta
const handleRemoveExercise = async (id: string, name: string) => {
  try {
    await fetch(`/api/favorites/exercises?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    setFavExercises(favExercises.filter((f) => f.id !== id))  // ← siempre se ejecuta
  } catch (err) {
    console.error('Error removing exercise:', err)
  }
}
```

**Impacto:** Si el DELETE falla (403, 500, network error), la UI muestra "eliminado" aunque siga en BD.

**Fix:** Validar `res.ok` antes de actualizar estado.

---

### 1.3 Nutrition Log: Timezone bug en comparación de "hoy"

**Archivo:** `src/app/athlete/nutrition/log/page.tsx`  
**Severidad:** 🔴 CRÍTICA  
**Problema:**
```typescript
// ❌ ACTUAL - retorna fecha UTC
const today = new Date().toISOString().split("T")[0]
// En Argentina (UTC-3) a las 20:00 → "2026-05-19" (UTC)
// Pero servidor guardó "2026-05-18T..." → NO coincide

const todayLogs = logs.filter((l) => l.loggedAt.startsWith(today))
// Resultado: comidas de la tarde no aparecen en "hoy"
```

**Impacto:** En zonas horarias negativas, comidas del atardecer aparecen en "mañana".

**Fix:** Usar `toLocaleDateString('en-CA')` para fecha local.

---

### 1.4 APIs: DELETE acepta strings vacíos

**Archivo:** `src/app/api/favorites/exercises/route.ts` + `src/app/api/favorites/foods/route.ts`  
**Severidad:** 🔴 CRÍTICA  
**Problema:**
```typescript
// ❌ ACTUAL - searchParams.get("") pasa la validación
const name = searchParams.get('name')
if (!name) {
  return NextResponse.json({ error: 'name query param required' }, { status: 400 })
}
// Pero `name = ""` (string vacío) pasa este check
```

**Impacto:** Si cliente envía `?name=&source=`, el DELETE se ejecuta sin filtro (aunque unique constraint lo protege).

**Fix:** Cambiar a `if (!name?.trim())`.

---

## Fase 2: Race Conditions + Bugs de Estado

### 2.1 ExerciseSearch: Fetch innecesarios en cada keystroke

**Archivo:** `src/components/exercise-search.tsx`  
**Severidad:** 🟡 ALTA  
**Problema:**
```typescript
// ❌ ACTUAL - fetch en cada cambio de query
useEffect(() => {
  if (!query.trim()) {
    setResults([])
    return
  }

  setLoading(true)
  fetch('/api/exercises/catalog')  // ← llama CADA keystroke
    .then((r) => r.json())
    .then((data) => {
      const allExercises = data.groups
        .flatMap((g: any) => g.exercises)
        .filter((ex: any) =>
          ex.name.toLowerCase().includes(query.toLowerCase()) ||
          ex.primaryMuscle.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
      setResults(allExercises)
    })
}, [query])  // ← efecto se re-ejecuta con cada query
```

**Impacto:** Un usuario que escribe "bench press" hace 11 requests innecesarios. El catálogo es **estático**.

**Fix:** Cargar catálogo al mount, filtrar localmente.

---

### 2.2 FoodSearch: Race condition sin AbortController

**Archivo:** `src/components/food-search.tsx`  
**Severidad:** 🟡 ALTA  
**Problema:**
```typescript
// ❌ ACTUAL - sin cancel de fetches anteriores
useEffect(() => {
  if (!query.trim()) {
    setResults([])
    return
  }

  setLoading(true)
  const url = `/api/food-catalog?action=search&query=${encodeURIComponent(
    query
  )}&provider=${provider}`

  fetch(url)  // ← Si usuario busca "a" → "ab" → "a" (borra):
    .then((r) => r.json())
    .then((data) => {
      // Fetch de "a" completa → sobrescribe resultado de "ab"
      setResults(...)
    })
}, [query, provider])
```

**Impacto:** Búsquedas rápidas pueden mostrar resultados desactualizados.

**Fix:** `AbortController` para cancelar requests pendientes.

---

### 2.3 FoodSearch: `toggleFavorite` no envía macros

**Archivo:** `src/components/food-search.tsx`  
**Severidad:** 🟡 ALTA  
**Problema:**
```typescript
// ❌ ACTUAL - POST sin macros
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    foodName,
    source,
    // ← falta: kcal, proteinG, carbsG, fatG
  }),
})
```

**Impacto:** El API soporta guardar macros en el favorito, pero se pierden. Luego, al usar el favorito en `/coach/nutrition`, los macros no están cacheados.

**Fix:** Incluir `kcal, proteinG, carbsG, fatG` del `FoodResult`.

---

## Fase 3: Semántica y Tipado

### 3.1 NutritionPreference: GET hace mutación

**Archivo:** `src/app/api/me/nutrition-preference/route.ts`  
**Severidad:** 🟠 MEDIA  
**Problema:**
```typescript
// ❌ ACTUAL - GET crea registro
export async function GET(req: NextRequest) {
  // ...
  let pref = athlete.nutritionPreference
  if (!pref) {
    pref = await prisma.nutritionPreference.create({
      data: {
        athleteId: athlete.id,
        dietType: 'closed',
      },
    })
  }
  return NextResponse.json({
    dietType: pref.dietType,
    athleteId: athlete.id,
  })
}
```

**Impacto:** Rompe semántica REST (GET no debería escribir). En concurrencia, puede fallar.

**Fix:** Retornar `{ dietType: 'closed' }` por defecto sin crear. POST/upsert se encarga de crear.

---

### 3.2 ExerciseSearch: Tipado con `any`

**Archivo:** `src/components/exercise-search.tsx`  
**Severidad:** 🟠 MEDIA  
**Problema:**
```typescript
// ❌ ACTUAL
const [results, setResults] = useState<any[]>([])
// ...
.then((data: any) => {
  const allExercises = data.groups
```

**Fix:** Interface `CatalogExercise { name: string; primaryMuscle: string }`.

---

### 3.3 FoodSearch: Tailwind deprecation

**Archivo:** `src/components/food-search.tsx`  
**Línea:** 184  
**Severidad:** 🟠 MEDIA  
**Problema:** `flex-shrink-0` deprecated en Tailwind v4.

**Fix:** Cambiar a `shrink-0`.

---

### 3.4 Profile: `handleAddFood(food: any)`

**Archivo:** `src/app/athlete/profile/page.tsx`  
**Severidad:** 🟠 MEDIA  
**Problema:**
```typescript
// ❌ ACTUAL
const handleAddFood = (food: any) => {
```

**Fix:** Usar tipo `FoodResult` de `food-search.tsx`.

---

## Fase 4: Escalabilidad (UX)

### 4.1 ExerciseSearch y FoodSearch: Click-outside no cierra dropdown

**Archivos:** `src/components/exercise-search.tsx`, `src/components/food-search.tsx`  
**Severidad:** 🟢 BAJA  
**Problema:** El dropdown permanece abierto al hacer click afuera del componente.

**Fix:** `useRef` + `mousedown` listener global.

---

## Implementación: Estado

| Fase | Issue | Archivo | Estado |
|------|-------|---------|--------|
| 1 | 1.1 - Persist add exercise | profile/page.tsx | ✅ DONE |
| 1 | 1.2 - Persist add food | profile/page.tsx | ✅ DONE |
| 1 | 1.3 - Validate remove HTTP | profile/page.tsx | ✅ DONE |
| 1 | 1.4 - Timezone fix | nutrition/log/page.tsx | ✅ DONE |
| 1 | 1.5 - String validation | exercises/route.ts + foods/route.ts | ✅ DONE |
| 2 | 2.1 - Catalog fetch optimization | exercise-search.tsx | ✅ DONE |
| 2 | 2.2 - Race condition | food-search.tsx | ✅ DONE |
| 2 | 2.3 - Include macros in POST | food-search.tsx | ✅ DONE |
| 3 | 3.1 - GET mutation fix | nutrition-preference/route.ts | ✅ DONE |
| 3 | 3.2 - Typing exercise | exercise-search.tsx | ✅ DONE |
| 3 | 3.3 - Tailwind fix | food-search.tsx | ✅ DONE |
| 3 | 3.4 - Typing food | profile/page.tsx | ✅ DONE |
| 4 | 4.1 - Click-outside | exercise-search.tsx + food-search.tsx | ✅ DONE |

---

## Verificación Final

- [ ] `/athlete/profile` → añadir ejercicio → recargar → persiste
- [ ] `/athlete/profile` → quitar con network error → no cambia UI
- [ ] `/athlete/nutrition/log` con zona -3h → "hoy" es fecha local
- [ ] `DELETE /api/favorites/exercises?name=` → 400
- [ ] ExerciseSearch → un único request al catálogo
- [ ] FoodSearch → guardar favorito → BD tiene macros
- [ ] Click afuera de dropdown → cierra

---

## Notas de Escalabilidad

- **Performance:** Optimizar fetches (1 request catálogo vs. N)
- **Concurrencia:** GET no debe mutar
- **UX:** Dropdowns deben responder a click-outside
- **Tipo-seguridad:** Todos los `any` tienen interfaces

