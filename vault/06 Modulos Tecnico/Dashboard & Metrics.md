# 📊 Dashboard y Métricas (Dashboard & Metrics)

**Versión**: 1.0  
**Fecha**: 14 de mayo de 2026  
**Propósito**: Tracking de atletas, visualización de progreso, análisis

---

## 🎯 Propósito

Sistema de recopilación, agregación y visualización de métricas del atleta para coaches y atletas: peso, adherencia, desempeño, macros, sesiones, tendencias.

---

## 🗄️ Modelos de Métricas

### 1. CheckIn (Semanal)

**Frecuencia**: 1 por semana (idealmente lunes)  
**Datos**: Peso, pasos, sueño, adherencia, sensaciones

```prisma
model CheckIn {
  id           String   @id @default(cuid())
  athleteId    String
  weekLabel    String        // "Semana 1", "Semana 2", etc.
  date         DateTime @default(now())
  
  // Métricas
  weightKg     Float    @default(0)
  stepsAvg     Int      @default(0)      // Promedio esa semana
  sleepHours   Float    @default(0)      // Promedio horas
  adherencePct Float    @default(0)      // % (0-100)
  
  // Feedback
  sensations   String?  @db.Text // "Me siento fuerte", "Cansado", etc.
  notes        String?  @db.Text // Notas del atleta
  coachNote    String?  @db.Text // Respuesta del coach
  
  createdAt    DateTime @default(now())
  athlete      Athlete  @relation(...)
  
  @@index([athleteId, date])
}
```

---

### 2. DailyLog (Diario)

**Frecuencia**: 1 por día (opcional, atleta decide)  
**Datos**: Peso, pasos, sueño, medidas corporales

```prisma
model DailyLog {
  id         String   @id @default(cuid())
  athleteId  String
  date       DateTime @default(now())
  
  // Métricas diarias
  weightKg   Float?   @default(0)
  steps      Int?     @default(0)
  sleepHours Float?   @default(0)
  waistCm    Float?   // Perímetro cintura
  bodyFatPct Float?   // % grasa corporal
  
  // Notas
  notes      String?  @db.Text // "Comí fuera", "Entrenamiento fuerte", etc.
  
  createdAt  DateTime @default(now())
  athlete    Athlete  @relation(...)
  
  @@index([athleteId, date])
}
```

---

### 3. BodyMeasurement (Mediciones Corporales)

**Frecuencia**: Cada 2 semanas o mensual  
**Datos**: Perímetros corporales (pecho, brazo, cintura, pierna, etc.)

```prisma
model BodyMeasurement {
  id        String   @id @default(cuid())
  athleteId String
  date      DateTime @default(now())
  
  // Medidas en cm
  chestCm   Float?   // Pecho
  armCm     Float?   // Brazo (bíceps)
  forearmCm Float?   // Antebrazo
  waistCm   Float?   // Cintura
  hipsCm    Float?   // Cadera
  thighCm   Float?   // Muslo
  calfCm    Float?   // Pantorrilla
  
  notes     String?  @db.Text
  createdAt DateTime @default(now())
  
  athlete   Athlete  @relation(...)
  
  @@index([athleteId, date])
}
```

---

### 4. ProgressPhoto (Fotos de Progreso)

**Frecuencia**: Cada 2-4 semanas  
**Datos**: Fotos (frontal, lateral, trasera)

```prisma
model ProgressPhoto {
  id        String   @id @default(cuid())
  athleteId String
  date      DateTime @default(now())
  
  // URL de foto (almacenada en /public/uploads/progress-photos/)
  photoUrl  String   @db.Text
  
  // Contexto
  view      String   // "frontal", "lateral", "trasera", "otro"
  notes     String?  @db.Text
  
  createdAt DateTime @default(now())
  athlete   Athlete  @relation(...)
  
  @@index([athleteId, date])
}
```

---

## 📊 Agregados y Cálculos

### Peso (Weight Trend)

```typescript
// Últimas 12 semanas
const checkIns = await prisma.checkIn.findMany({
  where: { athleteId },
  orderBy: { date: 'desc' },
  take: 12
})

const weightTrend = checkIns
  .reverse()
  .map(c => c.weightKg)

// Cálculos
const avgWeight = weightTrend.reduce((a, b) => a + b) / weightTrend.length
const maxWeight = Math.max(...weightTrend)
const minWeight = Math.min(...weightTrend)
const trend = weightTrend[weightTrend.length - 1] - weightTrend[0]
// trend > 0 → ganancia
// trend < 0 → pérdida
```

---

### Adherencia (Compliance)

```typescript
// Calcular desde sesiones registradas vs plan
const plansInWeek = await prisma.plan.findMany({
  where: {
    athleteId,
    createdAt: { gte: weekStart }
  }
})

const sessionsPlanned = plansInWeek.reduce((sum, plan) => 
  sum + plan.sessions.length, 0)

const sessionsCompleted = await prisma.sessionLog.count({
  where: {
    athleteId,
    date: { gte: weekStart }
  }
})

const adherencePct = (sessionsCompleted / sessionsPlanned) * 100
```

---

### Fuerza (Strength Progression)

```typescript
// Comparar cargas de ejercicio específico entre sesiones

const exercise = "Press de banca"

const sessionLogs = await prisma.sessionLog.findMany({
  where: { athleteId },
  include: { sets: true }
})

// Filtrar sets del ejercicio
const benchSets = sessionLogs
  .flatMap(log => log.sets)
  .filter(set => set.exercise === exercise)
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

const maxLoadProgression = [
  benchSets[0]?.loadKg,
  ...benchSets.slice(-10).map(s => s.loadKg)
]

// trend = últimaCarga - primerasCarga
```

---

## 🔌 API Endpoints

### Dashboard Summary

#### GET /api/athletes/[id]/dashboard
Obtiene agregado completo del dashboard

**Respuesta (200)**:
```json
{
  "profile": {
    "fullName": "Juan Pérez",
    "goal": "VOLUMEN",
    "coachName": "Carlos García"
  },
  "currentWeek": {
    "weekLabel": "Semana 4",
    "checkIn": {
      "weightKg": 82.5,
      "stepsAvg": 8200,
      "sleepHours": 7.3,
      "adherencePct": 93
    }
  },
  "trends": {
    "weight": {
      "current": 82.5,
      "previous": 81.8,
      "trend": "+0.7kg",
      "average": 82.1,
      "data": [80.2, 80.5, 81.8, 82.5]
    },
    "adherence": {
      "average": 92,
      "data": [85, 88, 90, 93]
    },
    "strength": {
      "exercise": "Press de banca",
      "progression": [100, 102, 105, 107],
      "trend": "+7kg"
    }
  },
  "metrics": {
    "sessionsThisWeek": 3,
    "sessionsCompleted": 3,
    "totalPlans": 2,
    "activePlan": "Plan Volumen Semana 4"
  }
}
```

---

### Check-Ins

#### GET /api/athletes/[id]/check-ins
Lista check-ins del atleta

**Query params**:
- `limit`: Número de check-ins (default 12)
- `weekLabel`: Filtrar por semana

**Respuesta (200)**:
```json
[
  {
    "id": "checkin-123",
    "weekLabel": "Semana 4",
    "date": "2026-05-13T10:00:00Z",
    "weightKg": 82.5,
    "stepsAvg": 8200,
    "sleepHours": 7.3,
    "adherencePct": 93,
    "sensations": "Me siento fuerte",
    "notes": "Buen entrenamiento",
    "coachNote": "Excelente semana!"
  }
]
```

---

#### POST /api/athletes/[id]/check-ins
Atleta o coach crea check-in

**Body**:
```json
{
  "weekLabel": "Semana 4",
  "weightKg": 82.5,
  "stepsAvg": 8200,
  "sleepHours": 7.3,
  "adherencePct": 93,
  "sensations": "Me siento muy fuerte",
  "notes": "Pude agregar peso en press"
}
```

**Respuesta (201)**: Check-in creado

---

#### PUT /api/check-ins/[id]
Actualiza check-in (por atleta o coach)

**Body**: Igual a POST (campos opcionales)

---

### Daily Logs

#### GET /api/athletes/[id]/daily-logs
Atleta ve su registro diario

**Query params**:
- `dateFrom`, `dateTo`: Rango de fechas
- `limit`: Número de registros (default 30)

**Respuesta (200)**:
```json
[
  {
    "id": "log-123",
    "date": "2026-05-14",
    "weightKg": 82.4,
    "steps": 8500,
    "sleepHours": 7.5,
    "waistCm": 78,
    "bodyFatPct": 15.2,
    "notes": "Comí fuera, peso más alto"
  }
]
```

---

#### POST /api/athletes/[id]/daily-logs
Atleta registra datos del día

**Body**:
```json
{
  "date": "2026-05-14T09:00:00Z",
  "weightKg": 82.4,
  "steps": 8500,
  "sleepHours": 7.5,
  "waistCm": 78,
  "bodyFatPct": 15.2,
  "notes": "Comida familiar, subí de peso"
}
```

---

### Body Measurements

#### GET /api/athletes/[id]/body-measurements
Histórico de medidas corporales

**Query params**:
- `limit`: Últimas N mediciones (default 10)

**Respuesta (200)**:
```json
[
  {
    "id": "meas-123",
    "date": "2026-05-14",
    "chestCm": 98.5,
    "armCm": 35.2,
    "waistCm": 78,
    "hipsCm": 92,
    "thighCm": 54,
    "calfCm": 36,
    "notes": "Pecho creció 1cm"
  }
]
```

---

#### POST /api/athletes/[id]/body-measurements
Coach o atleta registra medidas

**Body**:
```json
{
  "chestCm": 98.5,
  "armCm": 35.2,
  "forearmCm": 28.5,
  "waistCm": 78,
  "hipsCm": 92,
  "thighCm": 54,
  "calfCm": 36,
  "notes": "Ganancia de perímetros"
}
```

---

### Progress Photos

#### GET /api/athletes/[id]/progress-photos
Lista fotos de progreso

**Respuesta (200)**:
```json
[
  {
    "id": "photo-123",
    "photoUrl": "/uploads/progress-photos/ath-123/photo-123.jpg",
    "view": "frontal",
    "date": "2026-05-14T09:00:00Z",
    "notes": "Veo cambios en el pecho"
  }
]
```

---

#### POST /api/athletes/[id]/progress-photos
Atleta sube foto de progreso

**Body** (multipart/form-data):
```
photo: File (image/jpeg, image/png, max 5MB)
view: "frontal" | "lateral" | "trasera" | "otro"
notes: "Opcional"
```

**Respuesta (201)**:
```json
{
  "id": "photo-456",
  "photoUrl": "/uploads/progress-photos/ath-123/photo-456.jpg",
  "view": "frontal",
  "date": "2026-05-14T09:00:00Z"
}
```

---

## 📈 Widgets del Dashboard (Coach)

### 1. Atletas Activos

```json
{
  "total": 15,
  "active": 12,
  "inactive": 3,
  "list": [
    { "name": "Juan Pérez", "status": "ACTIVE", "lastCheckIn": "2026-05-13" },
    { "name": "María García", "status": "ACTIVE", "lastCheckIn": "2026-05-12" }
  ]
}
```

---

### 2. Check-Ins Pendientes

```json
{
  "pending": 3,
  "athletes": [
    { "name": "Carlos Ruiz", "daysOverdue": 2 },
    { "name": "Ana López", "daysOverdue": 1 }
  ]
}
```

---

### 3. Adherencia Promedio

```json
{
  "average": 88.3,
  "trend": "+2.1%",
  "byAthlete": [
    { "name": "Juan Pérez", "adherence": 95 },
    { "name": "María García", "adherence": 82 }
  ]
}
```

---

### 4. Progreso en Peso

```json
{
  "avgWeightChange": "+1.5kg",
  "trend": "GANANCIA",
  "topProgressers": [
    { "name": "Juan Pérez", "change": "+3.2kg" },
    { "name": "Carlos Ruiz", "change": "+2.1kg" }
  ]
}
```

---

### 5. Facturas Pendientes

```json
{
  "pending": 5,
  "amount": 249.95,
  "invoices": [
    { "athleteName": "Juan Pérez", "amount": 49.99, "dueDate": "2026-05-20" }
  ]
}
```

---

## 🔐 Permisos

| Operación | COACH | ATHLETE | ADMIN |
|-----------|-------|---------|-------|
| Ver su dashboard | ✓ | ✓ | ✓ |
| Ver check-in propio | ✓ | ✓ | ✓ |
| Crear check-in propio | ✓ | ✓ | ✓ |
| Ver check-in de atleta | ✓ (es coach) | | ✓ |
| Ver daily logs propios | | ✓ | ✓ |
| Ver progress photos | | ✓ | ✓ |
| Subir photos | | ✓ | ✓ |
| Ver dashboard del equipo | ✓ (ADMIN) | | ✓ |
| Ver métricas de todos | ✓ (ADMIN) | | ✓ |

---

## 📝 Notas de Implementación

- **Peso en kg**: Almacenado como Float, precisión ±0.1kg
- **Perímetros en cm**: Float, precisión ±0.1cm
- **Adherencia %**: 0-100, calculada como (sesiones completadas / sesiones planeadas) × 100
- **Fotos**: Almacenadas en `/public/uploads/progress-photos/[athleteId]/`
- **Máximo tamaño foto**: 5MB
- **Formatos soportados**: JPEG, PNG
- **Índices**: Optimizados para (athleteId, date)
- **Blandos**: No hay soft deletes en métricas (son auditables)

---

## 🎯 Casos de Uso Comunes

| Caso | Endpoint | Método |
|------|----------|--------|
| Ver dashboard | GET /api/athletes/[id]/dashboard | GET |
| Hacer check-in semanal | POST /api/athletes/[id]/check-ins | POST |
| Registrar peso diario | POST /api/athletes/[id]/daily-logs | POST |
| Medir perímetros | POST /api/athletes/[id]/body-measurements | POST |
| Subir foto progreso | POST /api/athletes/[id]/progress-photos | POST |
| Ver tendencia peso | GET /api/athletes/[id]/dashboard | GET |
| Ver historial | GET /api/athletes/[id]/check-ins | GET |
| Coach revisa todos | GET /api/teams/[teamId]/dashboard | GET |

---

## 📊 Cálculos Típicos

### Tendencia de Peso (12 semanas)

```
Semana 1: 80.0 kg
Semana 2: 80.5 kg
Semana 3: 81.2 kg
Semana 4: 81.8 kg
...
Semana 12: 83.5 kg

Cambio total: +3.5 kg
Promedio: 81.7 kg
Tasa: +0.29 kg/semana
```

### Adherencia Semanal

```
Semana 4:
- Plan: 3 sesiones (Push, Pull, Leg)
- Completadas: 3
- Adherencia: 100%

Promedio últimas 4 semanas: (95 + 90 + 93 + 100) / 4 = 94.5%
```

---

## 🔗 Integración con Otros Módulos

- **CheckIn**: Datos que el atleta reporta semanalmente
- **SessionLog**: Se cuenta para calcular adherencia
- **NutritionPlan**: Se puede correlacionar con cambios de peso
- **TrainingPlan**: Progresión de fuerzas desde SetLog
- **AthleteSubscription**: Métricas disponibles si subscription está ACTIVE
- **CoachDashboardPreset**: Configuración de widgets que coach ve

---

## 🎨 Recomendaciones de UI

### Gráficos

1. **Línea**: Tendencia de peso (últimas 12 semanas)
2. **Barras**: Adherencia semanal (últimas 4 semanas)
3. **Barras**: Comparación de perímetros (antes/ahora)
4. **Sparkline**: Micrográficos en cards (peso, adherencia, etc.)

### Cards

1. **Current Stats**: Peso, pasos, sueño, adherencia (esta semana)
2. **Progress**: Cambio vs. semana anterior
3. **Trends**: Promedio, máximo, mínimo
4. **Alerts**: Check-in overdue, facturas pendientes, etc.

### Timeline

- Fotos de progreso en timeline visual
- Check-ins con notas del coach
- Cambios de planes

---

## 🚀 Features Futuros

- [ ] Sincronización con Garmin/Google Fit para pasos y sueño automático
- [ ] Predicciones de progreso basadas en datos históricos
- [ ] Alertas automáticas (peso fuera de rango, bajo sueño, etc.)
- [ ] Comparación inter-atletas (anónima)
- [ ] Reportes PDF de progreso mensual
- [ ] API para exportar datos (CSV, Excel)
- [ ] Integración con Apple Health
