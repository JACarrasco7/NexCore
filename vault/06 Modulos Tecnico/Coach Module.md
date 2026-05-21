# 🏋️ Módulo de Coach

**Versión**: 1.0
**Fecha**: 14 de mayo de 2026
**Relación**: Gestión de atletas, equipos, planes, facturas

---

## 🎯 Propósito

Gestión completa de coaches: perfil, atletas asignados, equipos, planes de entrenamiento, planes de nutrición, templates, suscripciones a la APP, facturas y dashboard.

---

## 🗄️ Modelo Principal: Coach

```prisma
model Coach {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  displayName            String          // Nombre mostrado públicamente
  phone                  String?
  phoneVerified          Boolean  @default(false)
  phoneVerificationToken String?  @db.VarChar(255)
  bio                    String?  @db.Text
  
  // Trial
  createdAt              DateTime @default(now())
  trialStartsAt          DateTime @default(now())
  trialEndsAt            DateTime
  
  // RELACIONES
  user                   User                   @relation(...)
  athletes               Athlete[]              // Atletas directos
  plans                  Plan[]
  nutritionPlans         NutritionPlan[]
  nutritionTemplates     NutritionTemplate[]
  servicePlans           ServicePlan[]          // Legacy pero aún soportado
  documents              Document[]
  trainingTemplates      TrainingTemplate[]
  dashboardPresets       CoachDashboardPreset[]
  macroTargets           AthleteMacroTarget[]   @relation("MacroTargetUpdatedBy")
  
  @@index([userId])
}
```

---

## 🏢 Modelo: Team (Equipo del Coach)

```prisma
model Team {
  id                     String   @id @default(cuid())
  createdByUserId        String   // Coach que creó el equipo
  name                   String
  bio                    String?  @db.Text
  logoUrl                String?
  
  // Configuración de suscripción
  subscriptionPlan       String?  // STANDARD, PREMIUM, ENTERPRISE
  subscriptionStatus     String?  // TRIAL, ACTIVE, CANCELED
  subscriptionEndsAt     DateTime?
  
  // Configuración multitenant
  maxCoaches             Int      @default(5)
  maxAthletes            Int      @default(100)
  features               Json?    // Características habilitadas por plan
  
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  // RELACIONES
  createdByUser          User     @relation(...)
  members                TeamUserMembership[]   // Coaches y admins del equipo
  athletes               Athlete[]              // Atletas en el equipo
  billingPlans           TeamBillingPlan[]      // Planes que ofrece a atletas
  coachSubscriptions     CoachSubscription[]    // Suscripciones a APP
  invoices               Invoice[]
  documents              Document[]
  posts                  TeamPost[]
  dashboardLayouts       DashboardLayout[]
  notifications          Notification[]
  
  @@index([createdByUserId])
}
```

---

## 👨‍💼 Modelo: TeamUserMembership (RBAC del Equipo)

```prisma
model TeamUserMembership {
  id        String   @id @default(cuid())
  teamId    String
  userId    String
  role      TeamRole @default(MEMBER)  // ADMIN o MEMBER
  
  joinedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  
  team      Team     @relation(...)
  user      User     @relation(...)
  
  @@unique([teamId, userId])
  @@index([teamId, role])
}

enum TeamRole {
  ADMIN       // Acceso total: crear planes, asignar atletas, ver facturas
  MEMBER      // Acceso limitado: crear planes, ver sus atletas
}
```

**COACH_ADMIN**: TeamRole.ADMIN en un Team = Puede hacer todo

---

## 📋 Modelo: TeamBillingPlan

Ver [[Billing System.md#1-teambillingplan-plan-de-facturacion-del-equipo|Billing System - TeamBillingPlan]]

Define planes de facturación que el coach ofrece a sus atletas.

---

## 📊 Modelo: TrainingTemplate (Plantillas Reutilizables)

```prisma
model TrainingTemplate {
  id          String   @id @default(cuid())
  coachId     String
  name        String        // "PPL Template", "FullBody 4x/week", etc.
  description String?  @db.Text
  splitType   String?       // "PPL", "U/L", "FullBody", "Bro", "Custom"
  
  // Estructura del plan serializada (Plan + Sessions + Exercises)
  payload     Json          // { "weeks": [...], "sessions": [...], "exercises": [...] }
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  coach       Coach    @relation(...)
  
  @@index([coachId])
}
```

**Ejemplo de payload**:
```json
{
  "weeks": 4,
  "sessions": [
    {
      "name": "Push",
      "block": "Bloque importado",
      "exercises": [
        { "exercise": "Press de banca", "sets": 4, "reps": "6-8" },
        { "exercise": "Incline DB press", "sets": 3, "reps": "8-10" }
      ]
    }
  ]
}
```

---

## 🍎 Modelo: NutritionTemplate

```prisma
model NutritionTemplate {
  id        String   @id @default(cuid())
  coachId   String
  name      String        // "Macro bajas", "Cutting 2000 kcal", etc.
  
  // Estructura serializada
  meals     Json          // Array de MealDraft: [{ name, foods: [] }]
  
  createdAt DateTime @default(now())
  
  coach     Coach    @relation(...)
}
```

---

## 🔐 Modelo: CoachInvite (Invitaciones a Atletas)

```prisma
model CoachInvite {
  id               String    @id @default(cuid())
  teamId           String
  invitedEmail     String
  invitedByUserId  String
  token            String    @unique @db.VarChar(255)
  
  acceptedAt       DateTime?
  expiresAt        DateTime
  createdAt        DateTime  @default(now())
  
  team             Team      @relation(...)
  invitedByUser    User      @relation("CoachInvitesSent", ...)
  acceptedByUser   User?     @relation("CoachInvitesAccepted", ...)
  
  @@index([teamId, acceptedAt])
}
```

---

## 📈 Modelo: CoachDashboardPreset

Configuración personalizada del dashboard para cada coach.

```prisma
model CoachDashboardPreset {
  id          String   @id @default(cuid())
  coachId     String?
  athleteId   String?
  
  // Configuración de widgets
  layout      Json     // { "columns": 3, "widgets": [...] }
  theme       String?  // "light", "dark"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  coach       Coach?   @relation(...)
  athlete     Athlete? @relation(...)
}
```

---

## 🔌 API Endpoints Principales

### GET /api/coaches/[id]
Obtiene perfil del coach con estadísticas

**Respuesta (200)**:
```json
{
  "id": "coach-123",
  "userId": "user-456",
  "displayName": "Carlos Pérez",
  "bio": "Especialista en ganancia muscular",
  "trialEndsAt": "2026-06-13T12:00:00Z",
  "stats": {
    "totalAthletes": 15,
    "activeAthletes": 12,
    "totalPlans": 28,
    "templates": {
      "training": 5,
      "nutrition": 3
    }
  }
}
```

---

### GET /api/coaches/[id]/athletes
Lista todos los atletas del coach (sin filtro de equipo)

**Query params**:
- `status`: "active", "inactive"
- `limit`, `offset`: Paginación

**Respuesta (200)**:
```json
[
  {
    "id": "ath-123",
    "fullName": "Juan García",
    "goal": "VOLUMEN",
    "teamId": "team-456",
    "subscriptions": [
      {
        "id": "sub-789",
        "teamBillingPlan": { "planName": "Plan Volumen" },
        "status": "ACTIVE"
      }
    ]
  }
]
```

---

### POST /api/coaches/[id]/training-templates
Coach crea template de plan de entrenamiento

**Body**:
```json
{
  "name": "Push/Pull/Legs",
  "description": "Rutina clásica PPL",
  "splitType": "PPL",
  "payload": {
    "weeks": 4,
    "sessions": [
      {
        "name": "Push Day",
        "exercises": [
          { "exercise": "Press de banca", "sets": 4, "reps": "6-8" }
        ]
      }
    ]
  }
}
```

**Respuesta (201)**: Template creado

---

### GET /api/coaches/[id]/training-templates
Lista templates del coach

---

### POST /api/coaches/[id]/nutrition-templates
Coach crea template de plan de nutrición

**Body**:
```json
{
  "name": "Macro bajas - Cutting",
  "meals": [
    {
      "name": "Desayuno",
      "foods": [
        { "food": "Huevo (3)", "kcal": 155, "protein": 13 },
        { "food": "Pan tostado (1)", "kcal": 80, "carbs": 14 }
      ]
    }
  ]
}
```

---

### GET /api/coaches/[id]/nutrition-templates
Lista templates de nutrición del coach

---

### GET /api/teams/[teamId]
Obtiene información del equipo

**Respuesta (200)**:
```json
{
  "id": "team-456",
  "name": "Elite Fitness",
  "bio": "Gym especializado en fuerza",
  "maxAthletes": 50,
  "maxCoaches": 5,
  "members": [
    {
      "id": "membership-111",
      "user": { "name": "Carlos Pérez" },
      "role": "ADMIN"
    }
  ],
  "subscriptions": [
    {
      "id": "sub-222",
      "status": "ACTIVE",
      "trialEndsAt": "2026-06-13T12:00:00Z"
    }
  ]
}
```

---

### POST /api/teams
Coach crea nuevo equipo

**Body**:
```json
{
  "name": "Mi Equipo",
  "bio": "Descripción del equipo"
}
```

**Respuesta (201)**:
```json
{
  "id": "team-123",
  "name": "Mi Equipo",
  "createdByUserId": "user-456",
  "maxAthletes": 100,
  "maxCoaches": 5
}
```

---

### GET /api/teams/[teamId]/members
Lista miembros del equipo (otros coaches)

---

### POST /api/teams/[teamId]/invite-athletes
Coach invita atletas al equipo por email

**Body**:
```json
{
  "emails": ["athlete1@example.com", "athlete2@example.com"]
}
```

**Respuesta (201)**:
```json
{
  "invites": [
    {
      "id": "invite-123",
      "email": "athlete1@example.com",
      "token": "token-abc123",
      "expiresAt": "2026-05-21T12:00:00Z"
    }
  ]
}
```

---

### GET /api/teams/[teamId]/billing-plans
Lista planes de facturación que el equipo ofrece

**Respuesta (200)**:
```json
[
  {
    "id": "plan-123",
    "planName": "Plan Volumen 4 semanas",
    "price": 49.99,
    "currency": "EUR",
    "billingCycle": "MONTHLY",
    "maxAthletes": 10,
    "isActive": true
  }
]
```

---

### POST /api/teams/[teamId]/billing-plans
Coach crea nuevo plan de facturación

**Body**:
```json
{
  "planName": "Plan Definición 8 semanas",
  "description": "Plan enfocado en pérdida de grasa",
  "price": 79.99,
  "currency": "EUR",
  "billingCycle": "MONTHLY",
  "maxAthletes": 20
}
```

**Respuesta (201)**: Plan creado

---

### GET /api/teams/[teamId]/invoices
Lista todas las facturas del equipo (coach + atleta)

Ver [[Billing System.md#invoices|Billing System - Invoices]]

---

## 🔄 Flujos de Negocio Típicos

### Flujo 1: Crear Equipo y Suscribirse

```
1. Coach crea cuenta (COACH role)
   → POST /api/register

2. Coach crea equipo
   → POST /api/teams
   → Se asigna como ADMIN

3. Coach crea plan de facturación
   → POST /api/teams/[teamId]/billing-plans

4. Coach se suscribe a la APP
   → POST /api/teams/[teamId]/coach-subscriptions
   → Genera Invoice (DRAFT)

5. Coach paga factura
   → Stripe webhook o manual
   → Invoice.status = PAID
   → CoachSubscription.status = ACTIVE
```

### Flujo 2: Invitar Atletas y Asignar Plan

```
1. Coach invita atletas
   → POST /api/teams/[teamId]/invite-athletes
   → Se envía email con link

2. Atleta acepta invitación
   → Usa link con token
   → Se une al equipo

3. Coach asigna atleta a plan
   → POST /api/teams/[teamId]/athlete-subscriptions
   → Genera Invoice (DRAFT)

4. Coach marca como pagada
   → PUT /api/teams/[teamId]/invoices/[id]
   → Invoice.status = PAID

5. Atleta comienza plan
   → Acceso a entrenamientos y nutrición
```

### Flujo 3: Crear y Reutilizar Templates

```
1. Coach crea template de entrenamiento
   → POST /api/coaches/[id]/training-templates

2. Coach crea templates de nutrición
   → POST /api/coaches/[id]/nutrition-templates

3. Cuando asigna atleta a plan, puede:
   - Crear plan nuevo desde template
   - Personalizar y guardar como nuevo template
   - Reutilizar template exactamente igual
```

---

## 📊 Dashboard del Coach

**Widgets típicos**:
1. **Atletas activos**: Conteo y lista
2. **Check-ins pendientes**: Atletas que no han hecho check-in
3. **Adherencia promedio**: % de adherencia general
4. **Progreso en peso**: Gráfico de tendencia
5. **Facturas pendientes**: Invoice.status != PAID
6. **Suscripción de APP**: Estado del CoachSubscription
7. **Actividad reciente**: Últimos registros de atletas

---

## 🔐 Permisos y Validaciones

| Operación | COACH | ADMIN Equipo | COACH_MEMBER |
|-----------|-------|--------------|--------------|
| Ver su perfil | ✓ | ✓ | ✓ |
| Ver atletas propios | ✓ | ✓ | ✓ |
| Crear plan de entrenamiento | ✓ | ✓ | ✓ |
| Crear template | ✓ | ✓ | ✓ |
| Crear equipo | ✓ | | |
| Invitar atletas | ✓ (ADMIN) | ✓ | |
| Asignar plan a atleta | ✓ (ADMIN) | ✓ | |
| Ver facturas del equipo | ✓ (ADMIN) | ✓ | |
| Suscribirse a APP | ✓ (ADMIN) | ✓ | |
| Ver dashboard equipo | ✓ (ADMIN) | ✓ | |

---

## 📝 Notas de Implementación

- **Trial coach**: 30 días de prueba al crear CoachSubscription
- **Zona horaria**: Europe/Madrid (UTC+2)
- **Moneda**: EUR por defecto
- **Max atletas por equipo**: 100 por defecto, configurable por suscripción APP
- **Max coaches por equipo**: 5 por defecto, configurable por suscripción APP
- **Invitaciones**: Token válido por 7 días, expiración automática
- **Duplicados**: Validación única en (teamId, userId) para TeamUserMembership
- **Cascada de borrado**: Al eliminar Team, se eliminan: miembros, suscripciones, planes

---

## 🎯 Casos de Uso Comunes

| Caso | Endpoint | Método |
|------|----------|--------|
| Ver mis atletas | GET /api/coaches/[id]/athletes | GET |
| Ver estado de mis suscripciones | GET /api/teams/[teamId]/coach-subscriptions | GET |
| Crear nuevo plan de entreno | POST /api/plans | POST |
| Asignar plan a atleta | POST /api/teams/[teamId]/athlete-subscriptions | POST |
| Ver facturas pendientes | GET /api/teams/[teamId]/invoices?status=DRAFT | GET |
| Crear template de nutrición | POST /api/coaches/[id]/nutrition-templates | POST |
| Invitar coach a equipo | POST /api/teams/[teamId]/add-coach | POST |
| Actualizar dashboard | PUT /api/coaches/[id]/dashboard-preset | PUT |
