# 🏦 Sistema de Facturación (Billing System)

**Versión**: 1.0 (Post-Implementation)
**Fecha**: 14 de mayo de 2026
**Estado**: ✅ Implementado, ⏳ Stripe integration pending

---

## 📊 Modelo de Negocio

```
COACH PAGA A APP → CoachSubscription (La app cobra al coach)
     ↓
ATLETA PAGA A COACH → AthleteSubscription (El coach cobra al atleta)
     ↓
FACTURAS SE GENERAN AUTOMÁTICAMENTE
```

---

## 🗄️ Modelos de Base de Datos

### 1. TeamBillingPlan (Plan de Facturación del Equipo)

**Propósito**: Define planes ofrecidos por un coach a sus atletas

```prisma
model TeamBillingPlan {
  id           String   @id @default(cuid())
  teamId       String
  planName     String          // ej: "Plan Volumen 4 semanas"
  description  String?
  price        Float    @default(0)      // en EUR
  currency     String   @default("EUR")  // EUR, USD, GBP
  billingCycle String   @default("MONTHLY") // MONTHLY, YEARLY, ONE_TIME
  maxAthletes  Int?                      // null = unlimited, N = máximo de atletas
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  team                 Team                  @relation(...)
  coachSubscriptions   CoachSubscription[]   // Suscripción del coach a APP
  athleteSubscriptions AthleteSubscription[] // Atletas asignados a este plan
}
```

**Índices**: teamId, (teamId, isActive)

---

### 2. CoachSubscription (Suscripción Coach → APP)

**Propósito**: Coach paga a la APP por derecho a usar la plataforma

```prisma
model CoachSubscription {
  id                   String                  @id @default(cuid())
  teamId               String      // Equipo que se suscribe
  teamBillingPlanId    String      // Plan de suscripción (definen precio/ciclo)
  status               CoachSubscriptionStatus @default(TRIAL)
  
  // Stripe integration
  stripeSubscriptionId String?     @unique  // ID de suscripción en Stripe
  stripeCustomerId     String?               // ID de cliente Stripe
  
  // Trial y renovación
  trialEndsAt          DateTime    // 30 días desde creación
  renewalDate          DateTime?   // Próxima renovación
  autoRenewal          Boolean     @default(true)  // Auto-renovar tras trial/pago
  lastRenewalAt        DateTime?   // Última renovación
  cancelledAt          DateTime?   // Cuándo se canceló
  
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  team            Team            @relation(...)
  teamBillingPlan TeamBillingPlan @relation(...)
  invoices        Invoice[]       // Facturas generadas
  
  @@unique([teamId, teamBillingPlanId])  // Un coach no puede tener 2 suscripciones del mismo plan
  @@index([teamId, status])
  @@index([status, trialEndsAt])
  @@index([stripeSubscriptionId])
}
```

**Estados (CoachSubscriptionStatus)**:
- `TRIAL`: Período de prueba (30 días)
- `ACTIVE`: Suscripción activa y pagada
- `INACTIVE`: Suscripción inactiva (sin auto-renovación)
- `SUSPENDED`: Suspendida (falta pago)
- `EXPIRED`: Trial expiró sin convertirse a ACTIVE
- `CANCELLED`: Cancelada por el coach

**Flujo típico**: TRIAL → (30 días) → ACTIVE → ... → CANCELLED

---

### 3. AthleteSubscription (Atleta Asignado a Plan)

**Propósito**: Atleta es asignado a un plan de entrenamiento/nutrición del coach

```prisma
model AthleteSubscription {
  id                String                    @id @default(cuid())
  athleteId         String                    // Atleta asignado
  teamBillingPlanId String                    // Plan asignado
  
  // Estado
  status            AthleteSubscriptionStatus @default(ACTIVE)
  trialEndsAt       DateTime?                 // 30 días si TRIAL, null si ya pasó
  
  // Método de pago
  paymentMethod     AthletePaymentMethod     @default(MANUAL)  // MANUAL, STRIPE, CASH
  stripeSubscriptionId String?               // Si paga via Stripe
  manualRenewal     Boolean                  @default(false) // Coach decide renovación
  renewalDate       DateTime?                // Próxima renovación
  
  // Timeline
  startDate         DateTime                 @default(now())   // Cuándo empieza
  endDate           DateTime?                // Cuándo termina
  cancelledAt       DateTime?                // Cuándo se canceló
  
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt

  athlete         Athlete         @relation(...)
  teamBillingPlan TeamBillingPlan @relation(...)
  invoices        Invoice[]       // Facturas del atleta
  
  @@unique([athleteId, teamBillingPlanId])  // Un atleta no puede estar 2 veces en mismo plan
  @@index([athleteId, status])
  @@index([teamBillingPlanId, status])
  @@index([status, trialEndsAt])
}
```

**Estados (AthleteSubscriptionStatus)**:
- `TRIAL`: Período de prueba (30 días)
- `ACTIVE`: Activamente asignado al plan
- `INACTIVE`: No asignado (plan terminó)
- `CANCELED`: Cancelado

**Métodos de pago (AthletePaymentMethod)**:
- `MANUAL`: Coach gestiona pagos manualmente
- `STRIPE`: Pago automático via Stripe
- `CASH`: Pago en efectivo / transferencia manual

---

### 4. Invoice (Facturas)

**Propósito**: Registra facturas tanto para coaches como para atletas

```prisma
model Invoice {
  id         String            @id @default(cuid())
  entityType InvoiceEntityType // COACH o ATHLETE (polimórfico)
  
  // Referencias (una debe estar llena, otra NULL)
  coachSubscriptionId   String?               // Si es factura de coach
  athleteSubscriptionId String?               // Si es factura de atleta
  
  // Datos de factura
  amount        Float                         // Monto en moneda
  currency      String        @default("EUR") // EUR, USD, GBP
  status        InvoiceStatus @default(DRAFT) // Estado
  dueDate       DateTime                      // Fecha de vencimiento
  paidAt        DateTime?                     // Cuándo se pagó (null = impagada)
  
  // Auditoría
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  createdByUserId String?                     // Quién creó la factura
  
  coachSubscription   CoachSubscription?   @relation(...)
  athleteSubscription AthleteSubscription? @relation(...)
  createdByUser       User?                @relation("InvoicesCreatedBy", ...)
  
  @@index([entityType, status])
  @@index([dueDate, status])
  @@index([coachSubscriptionId])
  @@index([athleteSubscriptionId])
  @@index([createdAt])
}
```

**Estados (InvoiceStatus)**:
- `DRAFT`: Borrador (no enviada)
- `SENT`: Enviada al cliente
- `PAID`: Pagada
- `OVERDUE`: Vencida sin pagar
- `CANCELED`: Cancelada

**Entidades (InvoiceEntityType)**:
- `COACH`: Factura del coach a la APP
- `ATHLETE`: Factura del atleta al coach

---

## 🔗 Enums Completos

```prisma
enum CoachSubscriptionStatus {
  TRIAL
  ACTIVE
  INACTIVE
  SUSPENDED
  EXPIRED
  CANCELLED
}

enum AthleteSubscriptionStatus {
  TRIAL
  ACTIVE
  INACTIVE
  CANCELED
}

enum AthletePaymentMethod {
  MANUAL
  STRIPE
  CASH
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELED
}

enum InvoiceEntityType {
  COACH
  ATHLETE
}
```

---

## 🔌 API Endpoints

### CoachSubscriptions

#### GET /api/teams/[teamId]/coach-subscriptions
Lista todas las suscripciones de coach para un equipo

**Autenticación**: Requiere `COACH_ADMIN` (TeamRole.ADMIN)

**Respuesta (200)**:
```json
[
  {
    "id": "cuid-123",
    "teamId": "team-456",
    "teamBillingPlanId": "plan-789",
    "status": "ACTIVE",
    "trialEndsAt": "2026-05-20T12:00:00Z",
    "renewalDate": "2026-06-14T12:00:00Z",
    "autoRenewal": true,
    "teamBillingPlan": {
      "id": "plan-789",
      "planName": "Pro Plan",
      "price": 29.99,
      "currency": "EUR"
    }
  }
]
```

#### POST /api/teams/[teamId]/coach-subscriptions
Crea nueva suscripción de coach (30 días trial, genera factura DRAFT)

**Body**:
```json
{
  "teamBillingPlanId": "plan-789"
}
```

**Respuesta (201)**:
```json
{
  "id": "cuid-123",
  "status": "TRIAL",
  "trialEndsAt": "2026-06-13T12:00:00Z",
  "autoRenewal": true,
  "invoice": {
    "id": "inv-456",
    "status": "DRAFT",
    "amount": 29.99,
    "dueDate": "2026-06-13T12:00:00Z"
  }
}
```

**Validaciones**:
- Requiere `COACH_ADMIN`
- Plan debe existir en el equipo
- Equipo no debe tener otra suscripción del mismo plan

---

#### GET /api/teams/[teamId]/coach-subscriptions/[subscriptionId]
Obtiene una suscripción específica

**Respuesta (200)**: Igual a GET list

---

#### PUT /api/teams/[teamId]/coach-subscriptions/[subscriptionId]
Actualiza autoRenewal y status

**Body**:
```json
{
  "autoRenewal": false,
  "status": "INACTIVE"
}
```

**Respuesta (200)**: Suscripción actualizada

**Validaciones**:
- Requiere `COACH_ADMIN`
- Status debe ser válido

---

#### DELETE /api/teams/[teamId]/coach-subscriptions/[subscriptionId]
Cancela suscripción (soft delete con timestamp)

**Respuesta (204)**: Sin contenido

---

### AthleteSubscriptions

#### GET /api/teams/[teamId]/athlete-subscriptions
Lista todas las suscripciones de atletas para un equipo

**Respuesta (200)**:
```json
[
  {
    "id": "sub-123",
    "athleteId": "ath-456",
    "athlete": {
      "id": "ath-456",
      "fullName": "Juan Pérez"
    },
    "teamBillingPlanId": "plan-789",
    "teamBillingPlan": {
      "planName": "Plan Volumen",
      "price": 49.99
    },
    "status": "ACTIVE",
    "paymentMethod": "MANUAL",
    "trialEndsAt": "2026-05-20T12:00:00Z"
  }
]
```

#### POST /api/teams/[teamId]/athlete-subscriptions
Asigna atleta a un plan (crea factura DRAFT automáticamente)

**Body**:
```json
{
  "athleteId": "ath-456",
  "teamBillingPlanId": "plan-789"
}
```

**Respuesta (201)**:
```json
{
  "id": "sub-123",
  "status": "ACTIVE",
  "invoice": {
    "id": "inv-789",
    "status": "DRAFT",
    "amount": 49.99,
    "dueDate": "2026-06-13T12:00:00Z"
  }
}
```

**Validaciones**:
- Requiere `COACH_ADMIN`
- Atleta debe existir en el equipo
- Plan debe existir
- **CRÍTICO**: Si `plan.maxAthletes` está configurado, valida que no haya alcanzado el límite
- No puede haber otra suscripción (athleteId, planId) duplicada

---

#### GET /api/teams/[teamId]/athlete-subscriptions/[subscriptionId]
Obtiene una suscripción específica

---

#### PUT /api/teams/[teamId]/athlete-subscriptions/[subscriptionId]
Actualiza método de pago, renovación manual, estado

**Body**:
```json
{
  "paymentMethod": "STRIPE",
  "manualRenewal": true,
  "status": "INACTIVE"
}
```

**Respuesta (200)**: Suscripción actualizada

**Validaciones**:
- Requiere `COACH_ADMIN`
- Status debe ser: TRIAL, ACTIVE, INACTIVE, CANCELED

---

#### DELETE /api/teams/[teamId]/athlete-subscriptions/[subscriptionId]
Cancela suscripción (status=INACTIVE, cancelledAt=now)

**Respuesta (204)**

---

### Invoices

#### GET /api/teams/[teamId]/invoices
Lista todas las facturas del equipo (coach + atleta)

**Query params**:
- `status`: Filtrar por estado (DRAFT, SENT, PAID, OVERDUE, CANCELED)
- `entityType`: COACH o ATHLETE

**Respuesta (200)**:
```json
[
  {
    "id": "inv-123",
    "entityType": "ATHLETE",
    "amount": 49.99,
    "currency": "EUR",
    "status": "DRAFT",
    "dueDate": "2026-06-13T12:00:00Z",
    "paidAt": null,
    "athleteSubscription": {
      "athlete": { "fullName": "Juan Pérez" },
      "teamBillingPlan": { "planName": "Plan Volumen" }
    }
  }
]
```

#### POST /api/teams/[teamId]/invoices
Crea factura manualmente (normalmente se genera automáticamente)

**Body**:
```json
{
  "entityType": "ATHLETE",
  "athleteSubscriptionId": "sub-123"
}
```

**Respuesta (201)**: Factura creada (status=SENT, dueDate=30 días)

---

#### GET /api/teams/[teamId]/invoices/[invoiceId]
Obtiene factura específica con contexto completo

---

#### PUT /api/teams/[teamId]/invoices/[invoiceId]
Actualiza estado y marca como pagada

**Body**:
```json
{
  "status": "PAID",
  "paidAt": "2026-05-14T12:00:00Z"
}
```

**Respuesta (200)**: Factura actualizada

---

## 🔄 Flujos de Negocio

### Flujo 1: Coach se suscribe a la APP

```
1. POST /api/teams/[teamId]/coach-subscriptions
   → Crea CoachSubscription (status=TRIAL, trialEndsAt=+30 días)
   → Crea Invoice (entityType=COACH, status=DRAFT, amount=plan.price)

2. Coach recibe factura DRAFT (por email o dashboard)

3. Después de 30 días (automático o manual):
   → Trial expira
   → Si autoRenewal=true y pago completado:
      - status: TRIAL → ACTIVE
      - Crea nueva Invoice (siguiente ciclo)
   → Si no pagó:
      - status: TRIAL → EXPIRED
```

### Flujo 2: Coach asigna atleta a un plan

```
1. POST /api/teams/[teamId]/athlete-subscriptions
   → Valida maxAthletes (si está configurado)
   → Crea AthleteSubscription (status=ACTIVE, paymentMethod=MANUAL)
   → Crea Invoice (entityType=ATHLETE, status=DRAFT, amount=plan.price)

2. Atleta recibe factura DRAFT (por email o dashboard)

3. Coach marca como pagada (o automatizado via Stripe):
   → PUT /api/teams/[teamId]/invoices/[invoiceId]
   → status: DRAFT → PAID
   → paidAt: now

4. Si manualRenewal=true, cada ciclo:
   → Nueva Invoice se genera automáticamente
   → Ciclo se repite
```

### Flujo 3: Cancelación de suscripción

```
Coach:
DELETE /api/teams/[teamId]/coach-subscriptions/[id]
→ status: TRIAL/ACTIVE/... → CANCELLED
→ cancelledAt: now

Atleta:
DELETE /api/teams/[teamId]/athlete-subscriptions/[id]
→ status: ACTIVE/... → INACTIVE
→ cancelledAt: now
→ Plan leave efectivo: inmediato (sin período de salida)
```

---

## 🔐 Validaciones y Restricciones

| Validación | Tipo | Error |
|-----------|------|-------|
| Requiere COACH_ADMIN en todos endpoints | RBAC | 403 Forbidden |
| maxAthletes: contar subscripciones ACTIVE | Business | 422 Unprocessable Entity |
| Duplicado (athleteId, planId) | Unique | 409 Conflict |
| plan.isActive=true | Business | 422 Unprocessable Entity |
| status enum válido | Schema | 400 Bad Request |
| Suscripción debe existir para factura | FK | 404 Not Found |

---

## 💾 Generación Automática de Facturas

**Cuándo se genera una factura**:
1. ✅ POST /coach-subscriptions → DRAFT invoice
2. ✅ POST /athlete-subscriptions → DRAFT invoice

**Datos de la factura**:
```
amount = plan.price
currency = plan.currency
status = "DRAFT"
dueDate = now + 30 días
entityType = "COACH" o "ATHLETE"
createdByUserId = session.user.id
```

---

## ⏳ Próximos Pasos: Stripe Integration

**Pending**:
1. Crear Stripe Customer al crear CoachSubscription
2. Crear Stripe Subscription
3. Webhooks:
   - `invoice.payment_succeeded` → Invoice.status = PAID
   - `customer.subscription.trial_will_end` → Renovación automática
   - `customer.subscription.deleted` → status = CANCELLED

**Configuración**:
- Stripe API keys en .env
- Webhook endpoint: `/api/webhooks/stripe`
- Trial period sincronizado: 30 días (hardcoded)

---

## 📝 Notas de Implementación

- **Trial fijo**: 30 días = `now + 30 * 24 * 60 * 60 * 1000` ms
- **Zona horaria**: Europe/Madrid (UTC+2)
- **Moneda por defecto**: EUR
- **Auto-renovación por defecto**: `true` en CoachSubscription, `false` en AthleteSubscription
- **TypeScript**: Todos los enums y tipos generados automáticamente por Prisma
- **Base de datos**: MySQL con índices en: (teamId, status), (status, trialEndsAt), stripeSubscriptionId
