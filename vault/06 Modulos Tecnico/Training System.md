# 💪 Sistema de Entrenamientos (Training System)

**Versión**: 1.0
**Fecha**: 14 de mayo de 2026
**Enfoque**: Planes, sesiones, ejercicios prescritos, registros de ejecución

---

## 🎯 Propósito

Sistema completo de gestión de entrenamientos: desde creación de planes por el coach hasta registro de sesiones ejecutadas por el atleta, incluyendo técnicas de intensidad, tempo, carga y feedback técnico.

---

## 🗄️ Modelos del Sistema

### 1. Plan (Plan de Entrenamiento)

```prisma
model Plan {
  id        String   @id @default(cuid())
  athleteId String
  coachId   String
  title     String        // "Plan Volumen - Semana 1", etc.
  weekLabel String        // "Semana 1", "Semana 2", etc.
  createdAt DateTime @default(now())
  deletedAt DateTime?      // Soft delete

  athlete     Athlete          @relation(...)
  coach       Coach            @relation(...)
  sessions    WorkoutSession[] // Sesiones de entrenamiento
  sessionLogs SessionLog[]     // Registros de ejecución
  
  @@index([athleteId, createdAt])
  @@index([coachId, createdAt])
}
```

**Estructura**: Plan → Sessions → Exercises (ExercisePrescription) → SetLogs (ejecución)

---

### 2. WorkoutSession (Sesión de Entrenamiento)

```prisma
model WorkoutSession {
  id     String   @id @default(cuid())
  planId String
  name   String           // "Push Day", "Pierna A", "Cardio 20min", etc.
  block  String   @default("Bloque importado")
  order  Int      @default(0) // Orden en el plan
  
  plan      Plan                   @relation(...)
  exercises ExercisePrescription[] // Ejercicios prescritos
  logs      SessionLog[]           // Ejecuciones de esta sesión
}
```

**Ejemplo**:
- Session 1: "Push Day" (orden 0)
- Session 2: "Pull Day" (orden 1)
- Session 3: "Leg Day" (orden 2)

---

### 3. ExercisePrescription (Ejercicio Prescrito)

**MODELO CORE**: Contiene toda la información técnica del ejercicio.

```prisma
model ExercisePrescription {
  id          String   @id @default(cuid())
  sessionId   String
  exercise    String          // "Press de banca", "Sentadilla", "Remo máquina", etc.
  
  // ─── Sets y reps básicos ─────────────────────────────────────
  sets        Int             // Número de series
  reps        String          // "6-8", "10-12", "AMRAP", "al fallo", etc.
  targetRir   String?         // "RPE 8", "2 reps al fallo", "RIR 1-2", etc.
  restSeconds Int?            // Descanso entre series (segundos)
  notes       String?         @db.Text // Notas generales
  
  // ─── Técnicas de intensidad ─────────────────────────────────
  technique       String?     // drop_set, rest_pause, myo_reps, super_set, 
                              // giant_set, cluster, tempo, pre_fatiga, 
                              // eccentrico, isometrico, amrap
  techniqueDetail String?     @db.Text // "2 drops: -20% cada una"
                                        // "Pausa 2s arriba, 3s abajo"
  
  // ─── Carga (load) ──────────────────────────────────────────
  loadKg      Float?          // Carga sugerida en kg
  loadNote    String?         // "75% 1RM", "RPE 8", "Módico", "Máximo"
  
  // ─── Tempo (velocidad de movimiento) ───────────────────────
  tempoEcc    Int?            // Fase excéntrica (segundos), ej: 3
  tempoPause  Int?            // Pausa en la posición baja (segundos), ej: 1
  tempoConc   Int?            // Fase concéntrica (segundos), ej: 1
  // Notación: TempoEcc-TempoConc-TempoPause, ej: "3-1-1" = 3s baja, 1s suba, 1s pausa
  
  // ─── Coach cues y progresión ────────────────────────────────
  coachCue        String?     @db.Text // "Codos 45°, no tocar pecho"
                                        // "Descender hasta 90° de codo"
  progressionNote String?     @db.Text // "Si >10 reps, +2.5kg próxima"
                                        // "Si RPE <7, aumentar tempo eccéntrico"
  videoUrl        String?              // URL a demo o técnica
  
  order           Int         @default(0) // Orden en la sesión
  
  session         WorkoutSession @relation(...)
}
```

**Ejemplo de Exercise Prescrito Completo**:

```json
{
  "exercise": "Sentadilla con barra",
  "sets": 4,
  "reps": "6-8",
  "targetRir": "RPE 8 (2 reps al fallo)",
  "restSeconds": 180,
  "technique": "cluster",
  "techniqueDetail": "2 clusters de 2 reps cada uno, 30s entre clusters",
  "loadKg": 140,
  "loadNote": "75% 1RM estimado",
  "tempoEcc": 2,
  "tempoPause": 1,
  "tempoConc": 1,
  "coachCue": "Profundidad paralela mínimo, core rígido",
  "progressionNote": "Si completas 8 en serie 4, +5kg próxima sesión"
}
```

---

### 4. SessionLog (Registro de Sesión Ejecutada)

```prisma
model SessionLog {
  id           String   @id @default(cuid())
  athleteId    String
  planId       String
  sessionId    String
  sessionName  String   // Copia del nombre de sesión (para auditoría)
  date         DateTime @default(now())
  
  // Métricas generales
  notes        String?  @db.Text // Feedback general: "Me sentí fuerte", etc.
  durationMin  Int?               // Duración de sesión (minutos)
  kcalBurned   Int?               // Calorías quemadas (estimado o tracker)
  heartRateAvg Int?               // FC promedio (de tracker)
  
  // Origen del dato
  source       String   @default("manual") // "manual", "garmin", "google_fit", 
                                            // "polar", "import"
  
  createdAt    DateTime @default(now())
  
  athlete      Athlete        @relation(...)
  plan         Plan           @relation(...)
  session      WorkoutSession @relation(...)
  sets         SetLog[]       // Series ejecutadas
}
```

---

### 5. SetLog (Serie Ejecutada)

```prisma
model SetLog {
  id            String   @id @default(cuid())
  sessionLogId  String
  exerciseIndex Int            // Índice del ejercicio en la sesión
  exercise      String         // Nombre del ejercicio (copia)
  setNumber     Int            // Serie 1, 2, 3, etc.
  
  // Ejecución real
  loadKg        Float   @default(0)  // Carga utilizada
  reps          Int     @default(0)  // Repeticiones completadas
  rir           Int     @default(0)  // Repeticiones en reserva (0-10)
  
  sessionLog    SessionLog @relation(...)
}
```

**Ejemplo de SetLog**:
```json
{
  "exercise": "Press de banca",
  "setNumber": 1,
  "loadKg": 100,
  "reps": 8,
  "rir": 2
}
```

---

### 6. ExerciseNote (Feedback Técnico del Coach)

```prisma
model ExerciseNote {
  id        String   @id @default(cuid())
  athleteId String
  exercise  String        // "Press de banca", etc.
  note      String   @db.Text // "Veo que abres mucho los codos"
  date      DateTime @default(now())
  
  athlete   Athlete  @relation(...)
}
```

---

## 🔌 API Endpoints

### Plans

#### POST /api/plans
Coach crea plan de entrenamiento para atleta

**Body**:
```json
{
  "athleteId": "ath-123",
  "title": "Plan Volumen - Semana 1 de 4",
  "weekLabel": "Semana 1",
  "sessions": [
    {
      "name": "Push Day",
      "order": 0,
      "exercises": [
        {
          "exercise": "Press de banca",
          "sets": 4,
          "reps": "6-8",
          "targetRir": "RPE 8",
          "restSeconds": 120,
          "loadKg": 100,
          "loadNote": "75% 1RM",
          "tempoEcc": 2,
          "tempoConc": 1,
          "coachCue": "Control excéntrico, no rebotar"
        }
      ]
    }
  ]
}
```

**Respuesta (201)**:
```json
{
  "id": "plan-123",
  "athleteId": "ath-123",
  "title": "Plan Volumen - Semana 1 de 4",
  "sessions": [
    {
      "id": "session-456",
      "name": "Push Day",
      "exercises": [...]
    }
  ]
}
```

---

#### GET /api/athletes/[id]/plans
Atleta ve sus planes (activos)

**Query params**:
- `status`: "active", "past"
- `limit`: Número de planes

**Respuesta (200)**:
```json
[
  {
    "id": "plan-123",
    "title": "Plan Volumen - Semana 1 de 4",
    "weekLabel": "Semana 1",
    "coach": { "displayName": "Carlos Pérez" },
    "sessions": [
      {
        "id": "session-456",
        "name": "Push Day",
        "exercises": [
          {
            "exercise": "Press de banca",
            "sets": 4,
            "reps": "6-8",
            "loadKg": 100
          }
        ]
      }
    ]
  }
]
```

---

#### GET /api/plans/[id]
Obtiene plan completo con toda la información técnica

---

#### PUT /api/plans/[id]
Coach actualiza plan

**Body**: Igual a POST (puede actualizar sesiones y ejercicios)

---

#### DELETE /api/plans/[id]
Coach elimina plan (soft delete)

---

### Workout Sessions

#### GET /api/plans/[planId]/sessions
Lista sesiones del plan

---

#### POST /api/plans/[planId]/sessions
Añade nueva sesión al plan

**Body**:
```json
{
  "name": "Pull Day",
  "order": 1,
  "exercises": [...]
}
```

---

### Exercise Prescriptions

#### GET /api/sessions/[sessionId]/exercises
Lista ejercicios prescritos de una sesión

---

#### POST /api/sessions/[sessionId]/exercises
Coach añade ejercicio a sesión

**Body**:
```json
{
  "exercise": "Remo máquina",
  "sets": 4,
  "reps": "8-10",
  "targetRir": "RPE 8",
  "restSeconds": 90,
  "technique": "drop_set",
  "techniqueDetail": "Un drop al final: -30% carga",
  "loadKg": 120,
  "tempoEcc": 2,
  "tempoConc": 1,
  "coachCue": "Escápula atrás, no hundir hombro",
  "progressionNote": "Si 10 reps en serie 3, +10kg próxima"
}
```

---

#### PUT /api/exercises/[exerciseId]
Coach actualiza prescripción de ejercicio

---

#### DELETE /api/exercises/[exerciseId]
Coach elimina ejercicio del plan

---

### Session Logs (Registro de Ejecución)

#### POST /api/session-logs
Atleta registra sesión de entrenamiento

**Body**:
```json
{
  "planId": "plan-123",
  "sessionId": "session-456",
  "date": "2026-05-14T17:30:00Z",
  "durationMin": 65,
  "kcalBurned": 450,
  "heartRateAvg": 135,
  "notes": "Me sentí muy fuerte hoy",
  "sets": [
    {
      "exerciseIndex": 0,
      "exercise": "Press de banca",
      "setNumber": 1,
      "loadKg": 100,
      "reps": 8,
      "rir": 2
    },
    {
      "exerciseIndex": 0,
      "exercise": "Press de banca",
      "setNumber": 2,
      "loadKg": 100,
      "reps": 7,
      "rir": 2
    }
  ]
}
```

**Respuesta (201)**:
```json
{
  "id": "log-789",
  "sessionName": "Push Day",
  "date": "2026-05-14T17:30:00Z",
  "sets": [...]
}
```

---

#### GET /api/athletes/[id]/session-logs
Atleta ve su historial de sesiones

**Query params**:
- `planId`: Filtrar por plan
- `limit`, `offset`: Paginación

**Respuesta (200)**:
```json
[
  {
    "id": "log-789",
    "sessionName": "Push Day",
    "date": "2026-05-14T17:30:00Z",
    "durationMin": 65,
    "notes": "Me sentí muy fuerte hoy",
    "sets": [...]
  }
]
```

---

#### GET /api/session-logs/[id]
Obtiene detalle de una sesión registrada

---

### Exercise Notes (Feedback del Coach)

#### POST /api/athletes/[id]/exercise-notes
Coach deja feedback técnico sobre un ejercicio

**Body**:
```json
{
  "exercise": "Press de banca",
  "note": "Veo que abres mucho los codos. Mantén 45° aprox. Revisa este video: [link]"
}
```

---

#### GET /api/athletes/[id]/exercise-notes
Atleta ve feedback técnico sobre sus ejercicios

---

## 🔄 Flujos Típicos

### Flujo 1: Coach crea plan

```
1. Coach ve que atleta está listo para nuevo plan
   → POST /api/plans
   → Define sesiones, ejercicios, técnicas, tempo

2. Coach personaliza por atleta:
   - Carga basada en estimaciones previas
   - Técnicas según nivel y objetivos
   - Tempo según experiencia

3. Coach guarda como template (opcional):
   → POST /api/coaches/[id]/training-templates
   → Para reutilizar en otros atletas
```

### Flujo 2: Atleta ejecuta plan

```
1. Lunes: Atleta ve sesión "Push Day"
   → GET /api/plans/[id]
   → Ve: ejercicios, series, reps, carga, tempo, cues

2. Atleta ejecuta sesión:
   - Press de banca: 4 series x 8 reps @ 100kg
   - Incline DB: 3 series x 10 reps @ 70kg
   - Flyes: 3 series x 12 reps, drop set último

3. Atleta registra sesión:
   → POST /api/session-logs
   → Ingresa carga real, reps, RIR, duración
```

### Flujo 3: Coach revisa progreso

```
1. Coach entra a dashboard atleta
   → Ver histórico de SessionLogs

2. Coach analiza:
   - ¿Está progresando (más reps o carga)?
   - ¿RIR está en rango (1-3)?
   - ¿Hay patrones de fatiga?

3. Coach deja feedback:
   → POST /api/athletes/[id]/exercise-notes
   → "Veo que baja el RIR en series tardías"

4. Coach ajusta plan:
   → PUT /api/plans/[id]
   → Aumenta carga, reduce técnicas, añade descanso

5. Coach crea nuevo plan para siguiente semana:
   → POST /api/plans (nuevo)
```

---

## 📊 Estructura de Datos Compleja

### Ejemplo: Plan PPL 4 semanas

```
Plan "PPL Volumen 4 semanas"
├── Session 1: "Push Day" (Lunes)
│   ├── Exercise 1: Press de banca (4x6-8, RPE 8, 120kg, 2-1 tempo)
│   ├── Exercise 2: Incline DB press (3x8-10, RPE 7)
│   └── Exercise 3: Machine Flyes (3x12-15, drop set, RPE 8)
├── Session 2: "Pull Day" (Miércoles)
│   ├── Exercise 1: Deadlift (4x5, RPE 9, 200kg)
│   └── Exercise 2: Remo máquina (4x8-10)
└── Session 3: "Leg Day" (Viernes)
    ├── Exercise 1: Sentadilla (4x6-8, RPE 8, cluster)
    └── Exercise 2: Leg Press (3x10-12)
```

**En BD**:
- 1 Plan record
- 3 WorkoutSession records (Push, Pull, Leg)
- 8 ExercisePrescription records
- Durante 4 semanas: ~12 SessionLog records (atleta ejecuta 3 sesiones/semana)
- ~96 SetLog records (8-9 series por sesión × 12 sesiones)

---

## 🔐 Validaciones

| Validación | Tipo | Error |
|-----------|------|-------|
| Coach == Atleta.coach | Ownership | 403 Forbidden |
| Plan debe tener ≥1 sesión | Business | 422 |
| Sesión debe tener ≥1 ejercicio | Business | 422 |
| SetLog.loadKg ≥ 0 | Schema | 400 |
| SetLog.reps ≥ 0 | Schema | 400 |
| SetLog.rir entre 0-10 | Schema | 400 |
| Tempo en formato válido | Format | 400 |
| Carga realista (< 500kg) | Business | 400 |

---

## 📝 Notas de Implementación

- **Tempo**: Notación "3-1-1" = Ecc(3s) - Conc(1s) - Pausa(1s)
- **RIR**: "Reps In Reserve" = Repeticiones que podrías haber hecho más
- **RPE**: "Rate of Perceived Exertion" (1-10, siendo 10 = al máximo)
- **Soft delete**: Plans tienen `deletedAt`, no se eliminan realmente
- **Auditoría**: SessionLog copia nombres para que cambios en Plan no afecten históricos
- **Índices**: Optimizados para búsquedas por (athleteId, date) y (planId, createdAt)

---

## 🎯 Casos de Uso Comunes

| Caso | Endpoint | Método |
|------|----------|--------|
| Ver mi plan de hoy | GET /api/athletes/[id]/plans | GET |
| Registrar sesión | POST /api/session-logs | POST |
| Ver mi historial | GET /api/athletes/[id]/session-logs | GET |
| Crear plan nuevo | POST /api/plans | POST |
| Actualizar ejercicio | PUT /api/exercises/[id] | PUT |
| Dejar feedback técnico | POST /api/athletes/[id]/exercise-notes | POST |
| Ver notas del coach | GET /api/athletes/[id]/exercise-notes | GET |
| Comparar sesiones | GET /api/session-logs?planId=... | GET |
