# Sistema de Evolución & Tracking de Volumen

## Descripción

Sistema MVP para rastrear evolución del atleta a través de:
- **Volumen por grupo muscular** (conteo de series)
- **Correlaciones** entre volumen, peso y adherencia
- **Sugerencias automáticas** basadas en reglas simples
- **Revisiones de planes** con frecuencia configurable

---

## Arquitectura

### Database Models

#### **ExerciseMuscleMapping**
Tabla estática que mapea nombres de ejercicios a músculos primarios y secundarios.

```prisma
model ExerciseMuscleMapping {
  id                 String   @id @default(cuid())
  exercise           String   @unique        // "Press de banca"
  primaryMuscle      String                  // "pecho"
  secondaryMuscles   Json?                   // ["triceps", "deltoides_anterior"]
  externalImageUrl   String?                 // Demo images
  externalVideoUrl   String?                 // Técnica video
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  @@index([primaryMuscle])
}
```

**Seed Data**: 69 ejercicios comunes con clasificación por músculo
- Movimientos compuestos (press, sentadilla, peso muerto, etc.)
- Ejercicios de aislamiento (curl, extensión, etc.)
- Ejercicios de núcleo

#### **EvolutionSetting** (Per-Athlete)
Configuración personal de evolución del atleta.

```prisma
model EvolutionSetting {
  id                    String   @id @default(cuid())
  athleteId             String   @unique
  
  // Músculos a monitorear
  muscleGroups          Json     @default("[]")     // ["pecho", "espalda", "pierna"]
  
  // Objetivos de volumen semanal por músculo
  volumeGoals           Json     @default("{}")     // { "pecho": [20, 25], "espalda": [25, 30] }
  
  // Sugerencias automáticas
  enableAutoSuggestions Boolean  @default(true)
  suggestionThreshold   Int      @default(15)       // % cambio para alertar
  
  // Gráficas habilitadas (para futuro UI)
  enabledCharts         Json     @default("{}")     // { "volumeByMuscle": true }
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  athlete               Athlete  @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@index([athleteId])
}
```

#### **Plan Model** (Extended)
Se añaden 2 campos para tracking de revisiones:

```prisma
model Plan {
  // ... campos existentes ...
  
  reviewFrequencyDays Int      @default(7)   // Coach configura cadencia
  lastReviewDate      DateTime?              // Última revisión ejecutada
}
```

#### **SessionLog & SetLog** (Enhanced)
Se añaden campos opcionales para tracking de músculos:

```prisma
model SessionLog {
  // ... campos existentes ...
  muscleTargets Json?   // ["pecho", "triceps"] - músculos trabajados
}

model SetLog {
  // ... campos existentes ...
  primaryMuscle String?  // "pecho", "espalda", etc. - llena automáticamente por lookup
}
```

---

## Funciones de Utilidad (`src/lib/evolution.ts`)

### `calculateWeeklyVolumeByMuscle(athleteId, weekStart, weekEnd)`
Calcula volumen (número de series) por grupo muscular en un período.

**Lógica**:
1. Obtener SessionLogs del atleta en rango
2. Para cada SetLog:
   - Buscar ejercicio en ExerciseMuscleMapping
   - Sumar 1 serie al músculo primario
   - Sumar 0.5 series a cada músculo secundario
3. Aplicar objetivos de volumen si existen
4. Retornar array ordenado por volumen desc

**Return**:
```ts
VolumeByMuscle[] {
  muscle: string
  volume: number           // Series totales
  targetMin?: number
  targetMax?: number
  progress: 'increase' | 'stable' | 'decrease'
}
```

### `getVolumeComparison(athleteId)`
Compara volumen semana actual vs. anterior.

**Lógica**:
1. Calcular volumen semana actual (dom-sab)
2. Calcular volumen semana anterior
3. Computar % de cambio para cada músculo

**Return**:
```ts
VolumeComparison {
  currentWeek: VolumeByMuscle[]
  previousWeek: VolumeByMuscle[]
  changes: Record<string, number>  // % cambio
}
```

### `generateAutoSuggestions(athleteId)`
Genera sugerencias basadas en reglas simples.

**Reglas** (MVP - sin citas académicas):
1. Si volumen < 80% del objetivo mínimo → **aumentar**
2. Si volumen > 130% del objetivo máximo → **reducir**
3. Si cambio > `suggestionThreshold` (default 15%) → **advertencia**

**Return**:
```ts
AutoSuggestion[] {
  muscle: string
  type: 'aumento' | 'reduccion' | 'advertencia' | 'mantenimiento'
  reason: string         // Descripción simple
  recommendation: string // Acción sugerida
}
```

### `analyzeCorrelations(athleteId)`
Calcula correlaciones de Pearson entre métricas.

**Métricas MVP**:
- Volumen ↔ Peso Promedio
- Adherencia (sesiones) ↔ Volumen

**Return**:
```ts
Correlation[] {
  metric1: string          // "peso", "volumen", "adherencia"
  metric2: string
  correlation: number      // -1 to 1
  strength: 'fuerte' | 'moderada' | 'débil'
}
```

### `markEvolutionReview(athleteId, planId)`
Marca revisión como completada (actualiza `Plan.lastReviewDate`).

---

## API Endpoints

Todos los endpoints requieren autenticación (`auth()`) y RBAC:
- **GET**: Coach O atleta mismo
- **PUT/POST**: Solo coach

### 1. **GET** `/api/athletes/[id]/evolution`
**Dashboard principal** - Resumen completo de evolución.

**Response**:
```json
{
  "athlete": {
    "id": "cuid",
    "fullName": "Juan Pérez"
  },
  "setting": { /* EvolutionSetting */ },
  "currentWeek": {
    "period": { "start": "2026-05-14", "end": "2026-05-20" },
    "volume": [ /* VolumeByMuscle[] */ ]
  },
  "comparison": {
    "changes": { "pecho": 15, "espalda": -5 }
  },
  "suggestions": [ /* AutoSuggestion[] */ ],
  "correlations": [ /* Correlation[] */ ],
  "review": {
    "active": { "id", "title", "reviewFrequencyDays", "lastReviewDate" },
    "needsReview": true
  }
}
```

### 2. **GET** `/api/athletes/[id]/evolution/volume-summary`
Volumen total y comparativas.

**Query Params**: (none)

**Response**:
```json
{
  "summary": {
    "currentWeek": {
      "start": "2026-05-14",
      "end": "2026-05-20",
      "totalVolume": 142
    },
    "previousWeek": {
      "start": "2026-05-07",
      "end": "2026-05-13",
      "totalVolume": 138
    },
    "percentageChange": 3,
    "trend": "up"
  },
  "byMuscle": [ /* VolumeByMuscle[] */ ]
}
```

### 3. **GET** `/api/athletes/[id]/evolution/volume-by-muscle`
Volumen detallado por grupo muscular con histórico.

**Query Params**:
- `weeksBack`: int (default: 0) - Semanas atrás a consultar

**Response**:
```json
{
  "period": {
    "start": "2026-05-14",
    "end": "2026-05-20",
    "weeksBack": 0
  },
  "muscles": [ /* VolumeByMuscle[] */ ],
  "comparison": {
    "currentWeek": [ /* VolumeByMuscle[] */ ],
    "previousWeek": [ /* VolumeByMuscle[] */ ],
    "changes": { "pecho": 15 }
  }
}
```

### 4. **GET** `/api/athletes/[id]/evolution/volume-by-exercise`
Volumen agregado por ejercicio individual (últimas 4 semanas).

**Response**:
```json
{
  "period": {
    "start": "2026-04-16",
    "end": "2026-05-14",
    "label": "4 semanas"
  },
  "exercises": [
    {
      "exercise": "Press de banca",
      "volume": 28,
      "sessions": 8,
      "avgLoadKg": 90.5,
      "avgReps": 7.2
    }
  ],
  "totalUniqueExercises": 12,
  "totalVolume": 156
}
```

### 5. **GET** `/api/athletes/[id]/evolution/correlations`
Análisis de correlaciones entre métricas.

**Response**:
```json
{
  "insights": {
    "description": "Análisis de correlaciones... (nota explicativa)"
  },
  "correlations": [ /* Correlation[] */ ],
  "recommendations": [
    {
      "metrics": "peso ↔ volumen",
      "correlation": "0.82",
      "action": "Aumentar ambos mantiene el progreso."
    }
  ]
}
```

### 6. **GET** `/api/athletes/[id]/evolution/suggestions`
Sugerencias automáticas agrupadas por tipo.

**Response**:
```json
{
  "summary": {
    "total": 3,
    "hasSuggestions": true,
    "priority": "media"
  },
  "byType": {
    "aumento": [ /* AutoSuggestion[] */ ],
    "reduccion": [],
    "advertencia": [ /* AutoSuggestion[] */ ],
    "mantenimiento": []
  },
  "all": [ /* AutoSuggestion[] */ ]
}
```

### 7. **PUT** `/api/athletes/[id]/evolution/settings`
Actualizar configuración de evolución del atleta.

**Body** (todos opcionales):
```json
{
  "muscleGroups": ["pecho", "espalda", "pierna"],
  "volumeGoals": {
    "pecho": [20, 25],
    "espalda": [25, 30]
  },
  "enableAutoSuggestions": true,
  "suggestionThreshold": 15,
  "enabledCharts": {
    "volumeByMuscle": true,
    "correlations": true
  }
}
```

**Response**:
```json
{
  "message": "Evolution settings updated",
  "setting": { /* EvolutionSetting */ }
}
```

**Autorizaciones**:
- Solo COACH del atleta puede actualizar
- Si no existe EvolutionSetting, se crea

### 8. **POST** `/api/athletes/[id]/evolution/review`
Marcar revisión de evolución como completada.

**Body**:
```json
{
  "planId": "cuid-del-plan"
}
```

**Response**:
```json
{
  "message": "Evolution review marked as completed",
  "plan": {
    "id": "cuid-del-plan",
    "lastReviewDate": "2026-05-14T10:30:00.000Z"
  }
}
```

**Autorizaciones**:
- Solo COACH del atleta
- Plan debe pertenecer al atleta

---

## Flujos de Negocio

### Flujo 1: Coach Configura Monitoreo
1. Coach accede a `/api/athletes/[id]/evolution/settings`
2. Define `muscleGroups` a monitorear
3. Establece `volumeGoals` por músculo
4. Configura `suggestionThreshold`
5. Sistema crea/actualiza EvolutionSetting

### Flujo 2: Atleta Registra Sesiones
1. Atleta completa SessionLog + SetLog
2. SetLog.exercise se mapea a ExerciseMuscleMapping (búsqueda por nombre)
3. Sistema calcula volumen automáticamente

### Flujo 3: Coach Revisa Evolución
1. Coach accede a `/api/athletes/[id]/evolution` (dashboard)
2. Ve volumen actual vs. objetivo
3. Lee sugerencias automáticas
4. Revisa correlaciones
5. Marca revisión con `POST .../evolution/review`
6. Actualiza `Plan.lastReviewDate`

### Flujo 4: Revisión Periódica
1. Coach establece `reviewFrequencyDays` en Plan (ej: 7 días)
2. Sistema calcula si `lastReviewDate + reviewFrequencyDays < hoy`
3. Dashboard indica "needsReview": true si aplica

---

## Consideraciones & Limitaciones (MVP)

✅ **Incluido**:
- Cálculo automático de volumen desde SessionLog
- Mapeo ejercicio → músculo primario + secundarios
- Sugerencias simples basadas en reglas
- Correlaciones básicas (Pearson)
- Revisiones periódicas configurable

❌ **No incluido** (Future):
- Gráficos avanzados (scatter plots, heatmaps)
- Machine Learning para predicciones
- Alertas en tiempo real
- Integración con APIs externas (ExerciseDB video/imágenes)
- Exportación de reportes
- A/B testing de variaciones

---

## Testing & Validación

### Seed Data
- 69 ejercicios con clasificación muscular completa
- Compuestos: press, sentadilla, peso muerto, dominadas
- Aislamiento: curl, extensión, elevación lateral
- Núcleo: crunch, plank, pallof press

### Ejemplo de Request
```bash
# Dashboard principal
curl -X GET "http://localhost:3000/api/athletes/athlete-id/evolution" \
  -H "Authorization: Bearer token"

# Volumen por músculo
curl -X GET "http://localhost:3000/api/athletes/athlete-id/evolution/volume-by-muscle?weeksBack=0" \
  -H "Authorization: Bearer token"

# Actualizar settings
curl -X PUT "http://localhost:3000/api/athletes/athlete-id/evolution/settings" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "muscleGroups": ["pecho", "espalda"],
    "volumeGoals": {"pecho": [20, 25]}
  }'

# Marcar revisión
curl -X POST "http://localhost:3000/api/athletes/athlete-id/evolution/review" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"planId": "plan-id"}'
```

---

## Stack Técnico

- **ORM**: Prisma (MySQL)
- **Framework**: Next.js 16 + TypeScript
- **Auth**: NextAuth.js v5
- **API Format**: REST (JSON)
- **Validación**: Schemas inline (POSTs)

---

## Próximos Pasos

1. **Frontend Components**:
   - EvolutionDashboard (resumen)
   - VolumeChart (gráfica semanal)
   - SettingsPanel (configuración)
   - ReviewModal (marcar revisión)

2. **Integraciones**:
   - ExerciseDB API (imágenes de ejercicios)
   - Webhooks para notificaciones de revisión

3. **Análisis Avanzado**:
   - Predicción de tendencias
   - Recomendaciones de variaciones de ejercicio

---

**Última actualización**: 14 May 2026  
**Status**: MVP completado ✅
