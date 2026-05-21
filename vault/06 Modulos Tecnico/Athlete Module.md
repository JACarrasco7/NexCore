# 👥 Módulo de Atletas (Athlete)

**Versión**: 1.0
**Fecha**: 14 de mayo de 2026
**Relación**: Con CoachSubscription (vía TeamBillingPlan)

---

## 🎯 Propósito

Centraliza todos los datos y procesos relacionados con atletas: perfiles, suscripciones a planes, consentimientos, mediciones corporales, fotos de progreso, métricas diarias, check-ins.

---

## 🗄️ Modelo Principal: Athlete

```prisma
model Athlete {
  id                   String             @id @default(cuid())
  userId               String             @unique
  coachId              String
  teamId               String?
  
  // Perfil
  fullName             String
  phone                String?
  phoneVerified        Boolean            @default(false)
  contactEmail         String?
  verificationMethod   VerificationMethod @default(EMAIL)
  
  // Objetivos y fases
  goal                 Goal               @default(VOLUMEN)
  phaseLabel           String             @default("Semana 1")
  
  // Cadencia de mediciones y reviews
  measurementCadence   TrackingCadence    @default(CHECKIN)
  measurementEveryDays Int?
  reviewCadence        ReviewCadence      @default(CHECKIN)
  reviewEveryDays      Int?
  
  // Notas y conexiones
  primaryComment       String?            @db.Text
  healthConnections    String?            @db.Text // JSON serializado
  
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  // RELACIONES
  user                    User                   @relation(...)
  coach                   Coach                  @relation(...)
  team                    Team?                  @relation(...)
  
  // Suscripciones y facturas
  subscriptions           AthleteSubscription[]  // Planes asignados
  
  // Métricas y seguimiento
  checkIns                CheckIn[]
  dailyLogs               DailyLog[]
  sessionLogs             SessionLog[]
  bodyMeasurements        BodyMeasurement[]
  progressPhotos          ProgressPhoto[]
  
  // Planes
  plans                   Plan[]
  nutritionPlans          NutritionPlan[]
  
  // Otros
  documents               Document[]
  nutritionLogs           NutritionLog[]
  exerciseNotes           ExerciseNote[]
  contextProfile          AthleteContextProfile?
  consents                AthleteConsent[]
  healthConnectionRecords HealthConnection[]
  documentSignatures      DocumentSignature[]
  
  @@index([coachId])
  @@index([teamId])
  @@index([contactEmail])
  @@index([teamId, createdAt])
  @@index([coachId, createdAt])
}
```

**Índices**: Optimizados para búsquedas por coach, equipo, email, y timeline

---

## 🔗 Enums del Módulo

```prisma
enum Goal {
  VOLUMEN      // Ganar masa muscular
  DEFINICION   // Bajar grasa / definirse
  FUERZA       // Aumentar fuerza máxima
}

enum TrackingCadence {
  CHECKIN      // Semanal (check-in)
  DAILY        // Diaria (daily log)
  CUSTOM       // Personalizada (cada N días)
}

enum ReviewCadence {
  CHECKIN      // Semanal
  BIWEEKLY     // Cada 2 semanas
  MONTHLY      // Mensual
  CUSTOM       // Personalizada
}

enum VerificationMethod {
  EMAIL        // Verificación por correo
  SMS          // Verificación por SMS
  LINK         // Link de verificación
}
```

---

## 📊 Modelos Relacionados

### CheckIn (Semanal)

Encuesta semanal donde el atleta reporta: peso, pasos, sueño, adherencia, sensaciones.

```prisma
model CheckIn {
  id           String   @id @default(cuid())
  athleteId    String
  weekLabel    String        // "Semana 1", "Semana 2", etc.
  date         DateTime @default(now())
  
  // Métricas
  weightKg     Float    @default(0)
  stepsAvg     Int      @default(0)      // Promedio de pasos esa semana
  sleepHours   Float    @default(0)      // Promedio de horas de sueño
  adherencePct Float    @default(0)      // % de adherencia (0-100)
  
  // Feedback
  sensations   String?  @db.Text         // Cómo se sintió (energía, ánimo, etc.)
  notes        String?  @db.Text         // Notas del atleta
  coachNote    String?  @db.Text         // Respuesta/feedback del coach
  
  createdAt    DateTime @default(now())
  athlete      Athlete  @relation(...)
  
  @@index([athleteId, weekLabel])
}
```

---

### DailyLog (Diario)

Registro diario de métricas corporales y vitales.

```prisma
model DailyLog {
  id         String   @id @default(cuid())
  athleteId  String
  date       DateTime @default(now())
  
  // Métricas
  weightKg   Float?   @default(0)
  steps      Int?     @default(0)
  sleepHours Float?   @default(0)
  waistCm    Float?                    // Circunferencia cintura
  bodyFatPct Float?                    // % grasa corporal
  
  // Notas
  notes      String?  @db.Text
  createdAt  DateTime @default(now())
  
  athlete    Athlete  @relation(...)
  @@index([athleteId, date])
}
```

---

### BodyMeasurement (Mediciones corporales)

Mediciones de perímetros corporales en puntos específicos.

```prisma
model BodyMeasurement {
  id        String   @id @default(cuid())
  athleteId String
  date      DateTime @default(now())
  
  // Circunferencias (cm)
  chestCm   Float?
  armCm     Float?
  forearmCm Float?
  waistCm   Float?
  hipsCm    Float?
  thighCm   Float?
  calfCm    Float?
  
  // Notas
  notes     String?  @db.Text
  createdAt DateTime @default(now())
  
  athlete   Athlete  @relation(...)
  @@index([athleteId, date])
}
```

---

### ProgressPhoto (Fotos de progreso)

Registro de fotos de progreso (frente, perfil, espalda, etc.).

```prisma
model ProgressPhoto {
  id        String   @id @default(cuid())
  athleteId String
  date      DateTime @default(now())
  
  // URL de foto (storage en public/uploads/progress-photos)
  photoUrl  String   @db.Text
  
  // Contexto
  view      String   // "frontal", "perfil", "espalda", "otro"
  notes     String?  @db.Text
  
  createdAt DateTime @default(now())
  athlete   Athlete  @relation(...)
  
  @@index([athleteId, date])
}
```

---

### AthleteConsent (Consentimientos y Privacy)

Registro de consentimientos (privacidad, fotos, conectar dispositivos).

```prisma
model AthleteConsent {
  id        String   @id @default(cuid())
  athleteId String
  
  // Consentimientos
  dataPrivacy    Boolean @default(false)
  photoSharing   Boolean @default(false)
  healthConnect  Boolean @default(false)
  garminConnect  Boolean @default(false)
  
  // Auditoría
  acceptedAt    DateTime?
  revokedAt     DateTime?
  version       Int      @default(1)      // Versión de términos
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  athlete       Athlete  @relation(...)
  @@unique([athleteId])
}
```

---

### AthleteContextProfile (Perfil de contexto)

Información contextual: experiencia en gym, disponibilidad, preferencias, limitaciones.

```prisma
model AthleteContextProfile {
  id        String   @id @default(cuid())
  athleteId String   @unique
  
  // Experiencia
  gymExperience String? // "principiante", "intermedio", "avanzado"
  yearsTraining Int?    // Años de experiencia
  
  // Disponibilidad
  hoursAvailablePerWeek Int?  // Horas disponibles para entrenar
  daysPerWeek           Int?  // Días que puede entrenar
  
  // Preferencias
  equipmentPreference   String? @db.Text // Máquinas vs. pesas, etc.
  musicPreference       Boolean @default(false) // Si le gusta música
  socialTraining        Boolean @default(false) // Si le gusta entrenar con otros
  
  // Limitaciones
  injuries              String? @db.Text // JSON array de lesiones
  disabilities          String? @db.Text // JSON array de discapacidades
  medicationsNotes      String? @db.Text // Medicaciones relevantes
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  athlete               Athlete  @relation(...)
}
```

---

### ExerciseNote (Notas sobre ejercicios específicos)

Notas técnicas del coach sobre ejecución de un ejercicio por el atleta.

```prisma
model ExerciseNote {
  id        String   @id @default(cuid())
  athleteId String
  
  // Ejercicio
  exercise  String   // "Press de banca", "Sentadilla", etc.
  
  // Feedback
  note      String   @db.Text  // Feedback técnico del coach
  date      DateTime @default(now())
  
  athlete   Athlete  @relation(...)
}
```

---

## 🔌 API Endpoints (Típicos)

### GET /api/athletes/[id]
Obtiene perfil completo del atleta

**Respuesta (200)**:
```json
{
  "id": "ath-123",
  "userId": "user-456",
  "fullName": "Juan Pérez García",
  "contactEmail": "juan@example.com",
  "phone": "+34612345678",
  "goal": "VOLUMEN",
  "phaseLabel": "Semana 4",
  "coachId": "coach-789",
  "teamId": "team-000",
  "subscriptions": [
    {
      "id": "sub-111",
      "teamBillingPlan": {
        "planName": "Plan Volumen 4 semanas",
        "price": 49.99
      },
      "status": "ACTIVE"
    }
  ]
}
```

---

### GET /api/athletes/[id]/checkIns
Lista check-ins del atleta (últimos 12 semanales)

**Query params**:
- `limit`: Número de registros (default 12)
- `weekLabel`: Filtrar por semana específica

---

### POST /api/athletes/[id]/checkIns
Atleta o coach crea un check-in

**Body**:
```json
{
  "weekLabel": "Semana 4",
  "weightKg": 82.5,
  "stepsAvg": 8500,
  "sleepHours": 7.5,
  "adherencePct": 95,
  "sensations": "Me siento fuerte y con buena energía",
  "notes": "Falta de sueño el viernes"
}
```

---

### GET /api/athletes/[id]/metrics
Agregado de métricas: últimas mediciones corporales, fotos, daily logs

**Respuesta (200)**:
```json
{
  "lastCheckIn": { ... },
  "lastDailyLog": { ... },
  "lastBodyMeasurement": { ... },
  "lastProgressPhoto": { ... },
  "weeklyWeightTrend": [82.0, 82.3, 82.5],
  "weeklyAdherenceTrend": [90, 92, 95]
}
```

---

### POST /api/athletes/[id]/progress-photos
Atleta sube foto de progreso

**Body** (multipart/form-data):
```
photo: File (image/jpeg, image/png)
view: "frontal" | "perfil" | "espalda" | "otro"
notes: "opcional"
```

**Respuesta (201)**:
```json
{
  "id": "photo-456",
  "photoUrl": "/uploads/progress-photos/ath-123/photo-456.jpg",
  "view": "frontal",
  "date": "2026-05-14T12:00:00Z"
}
```

---

### PUT /api/athletes/[id]
Actualiza perfil del atleta

**Body**:
```json
{
  "goal": "DEFINICION",
  "phaseLabel": "Fase 2: Definición",
  "primaryComment": "Foco en mantener masa muscular"
}
```

---

### GET /api/athletes/[id]/consents
Obtiene estado de consentimientos

**Respuesta (200)**:
```json
{
  "dataPrivacy": true,
  "photoSharing": false,
  "healthConnect": true,
  "garminConnect": false,
  "acceptedAt": "2026-05-01T10:00:00Z"
}
```

---

### PUT /api/athletes/[id]/consents
Atleta actualiza consentimientos

**Body**:
```json
{
  "photoSharing": true,
  "garminConnect": true
}
```

---

## 🔄 Flujos de Negocio Comunes

### Flujo 1: Onboarding de atleta

```
1. User crea cuenta (ATHLETE role)
   → POST /api/register

2. Coach invita atleta a equipo
   → POST /api/teams/[teamId]/invite-athletes

3. Atleta acepta invitación
   → PUT /api/athletes/[id]/accept-invitation
   → teamId se asigna

4. Coach asigna plan de entrenamiento
   → POST /api/teams/[teamId]/athlete-subscriptions

5. Atleta completa consentimientos
   → PUT /api/athletes/[id]/consents

6. Atleta completa perfil de contexto
   → POST /api/athletes/[id]/context-profile
```

### Flujo 2: Seguimiento semanal

```
1. Lunes: Atleta completa check-in
   → POST /api/athletes/[id]/checkIns

2. Durante la semana: Atleta registra daily logs
   → POST /api/athletes/[id]/daily-logs

3. Viernes: Atleta sube foto de progreso
   → POST /api/athletes/[id]/progress-photos

4. Coach revisa dashboard:
   → GET /api/athletes/[id]/metrics
   → Ve tendencias y puede dejar feedback
```

### Flujo 3: Fin de plan

```
1. Plan cumple su duración (4 semanas)
   → Automático o manual: DELETE /api/athlete-subscriptions/[id]

2. Coach crea nuevo plan
   → POST /api/teams/[teamId]/athlete-subscriptions (con otro plan)

3. Nueva factura se genera automáticamente
   → Invoice (entityType=ATHLETE, status=DRAFT)
```

---

## 🎯 Métricas Clave del Atleta

| Métrica | Origen | Frecuencia | Valor |
|---------|--------|-----------|-------|
| Peso | CheckIn, DailyLog | Semanal, Diaria | kg |
| Pasos | DailyLog | Diaria | promedio/semana |
| Sueño | CheckIn, DailyLog | Semanal, Diaria | horas |
| Adherencia | CheckIn | Semanal | % (0-100) |
| Perímetros | BodyMeasurement | Cada N semanas | cm (pecho, brazo, etc.) |
| Fotos | ProgressPhoto | Cada N semanas | URL |
| Ejercicios | SessionLog, ExerciseNote | Por sesión | sets, reps, RIR |

---

## 📝 Notas de Implementación

- **Relación coach**: Obligatoria (FK a Coach.id)
- **Relación team**: Opcional (un atleta puede no estar en equipo si es cliente privado)
- **Email de contacto**: Campo opcional pero recomendado (para notificaciones)
- **Consentimientos**: Se registran al crear AthleteConsent, incluyen versión de términos
- **Fotos de progreso**: Almacenadas en `/public/uploads/progress-photos/[athleteId]/`
- **Health Connections**: JSON serializado para compatibilidad futura con Garmin, Google Fit, Polar
- **Zona horaria**: Europe/Madrid (UTC+2)
- **Idioma**: es-ES (español por defecto)

---

## 🔐 Permisos

| Operación | COACH | ATHLETE | ADMIN |
|-----------|-------|---------|-------|
| Ver perfil propio | ✓ | ✓ | ✓ |
| Actualizar perfil | ✓ | ✓ | ✓ |
| Ver check-ins de atleta | ✓ | ✓ (propio) | ✓ |
| Crear check-in para atleta | ✓ | ✓ (propio) | ✓ |
| Ver métricas | ✓ | ✓ (propias) | ✓ |
| Subir fotos de progreso | ✓ | ✓ (propias) | ✓ |
| Actualizar consentimientos | | ✓ (propios) | |
| Asignar plan a atleta | ✓ (ADMIN) | | ✓ |
| Ver facturación de atleta | ✓ (ADMIN) | | ✓ |
